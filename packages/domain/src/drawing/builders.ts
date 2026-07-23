/**
 * Sheet builders — turn a {@link DrawingSet} sheet plus the {@link Site} into a
 * `SheetPrimitive[]` scene (points). Each sheet is auto-composed from its NCS
 * type (0 index, 1 plans, 2 elevations, 3 sections, 5 details, 6 schedules) and
 * discipline (A architectural draws the building floor plan; C/V draw the site
 * plan). Everything projects through one fit/scale transform so SVG and PDF
 * match.
 */

import { bounds as boundsOf, centroid, distance, unionBounds } from "../spatial/geometry";
import { isSpatialElement } from "../spatial/primitives";
import { densifyBoundary } from "../spatial/curve";
import type { Bounds, Dimension, Point, Site } from "../spatial/types";
import type { RegionPlugin } from "../planning/regions";

import { doorSwing, openingJambs, roomArea, wallPolygon } from "../planning/building";
import type { BuildingModel } from "../planning/building";
import { elementColor } from "../planning/elementMeta";

import { resolveAlignment } from "../civil/alignment";
import { fullStations, offsetAlignmentPath, pointAtStation } from "../civil/alignment";

import { gridBubbleGeometry, revisionCloudBumps } from "./annotation";
import { sectionFrame } from "../survey/plss";
import { sectionGaze } from "./sheetview";
import { dimensionStyle, measureDimension } from "./dimension";

import { hatchForMaterial, hatchPattern } from "./hatch";
import {
  arrowHead,
  dimTick,
  flattenBands,
  hatchLines,
  INK,
  LIGHT,
  MUTED,
  northArrow,
  paperToPointsForSheet,
  type Pt,
  type SheetBand,
  type SheetPrimitive,
} from "./scene";

import { doorSchedule, finishSchedule, roomSchedule, windowSchedule } from "./schedule";
import type { ScheduleTable } from "./schedule";
import { collectSiteCurves } from "./platset";
import { curveSchedule } from "./schedule";
import { formatSheetNumber, resolveTitleBlock, sheetIndex } from "./sheet";
import type { DrawingSet, Sheet } from "./sheet";
import { printableArea, sheetDimensions } from "./sheetsize";

/** Paper geometry of a sheet in points. */
export interface SheetLayout {
  wPt: number;
  hPt: number;
  border: { x: number; y: number; w: number; h: number };
  drawArea: { x: number; y: number; w: number; h: number };
  titleRect: { x: number; y: number; w: number; h: number };
}

/** Compute a sheet's point geometry (border, title strip, drawing area). */
export function sheetLayout(sheet: Sheet, unit: "in" | "mm"): SheetLayout {
  const dim = sheetDimensions(sheet.size, sheet.orientation, unit);
  const wPt = paperToPointsForSheet(dim.w, unit);
  const hPt = paperToPointsForSheet(dim.h, unit);
  const printable = printableArea(sheet.size, sheet.orientation, unit);
  const bx = paperToPointsForSheet(printable.x, unit);
  const by = paperToPointsForSheet(printable.y, unit);
  const bw = paperToPointsForSheet(printable.w, unit);
  const bh = paperToPointsForSheet(printable.h, unit);
  // Title strip down the right edge, ~1.9in wide (clamped to 24% of width).
  const stripW = Math.min(paperToPointsForSheet(1.9, "in"), bw * 0.26);
  return {
    wPt,
    hPt,
    border: { x: bx, y: by, w: bw, h: bh },
    drawArea: { x: bx, y: by, w: bw - stripW - 6, h: bh },
    titleRect: { x: bx + bw - stripW, y: by, w: stripW, h: bh },
  };
}

/** A model→sheet projector fitting `bounds` into a point rect. */
interface Projector {
  project: (p: Point) => Pt;
  scalePt: number;
}

function fitProjector(
  rect: { x: number; y: number; w: number; h: number },
  b: Bounds,
  pad = 0.06,
): Projector {
  const bw = Math.max(b.maxX - b.minX, 1e-6);
  const bh = Math.max(b.maxY - b.minY, 1e-6);
  const iw = rect.w * (1 - pad * 2);
  const ih = rect.h * (1 - pad * 2);
  const s = Math.min(iw / bw, ih / bh);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const ox = rect.x + rect.w / 2;
  const oy = rect.y + rect.h / 2;
  return {
    project: (p) => ({ x: ox + (p.x - cx) * s, y: oy + (p.y - cy) * s }),
    scalePt: s,
  };
}

// --- content bounds ---------------------------------------------------------

function siteBounds(site: Site): Bounds | null {
  const boxes: Bounds[] = [];
  for (const e of site.elements) {
    if (isSpatialElement(e)) {
      boxes.push(boundsOf(e.boundary));
    }
  }
  for (const m of site.monuments ?? []) {
    boxes.push({
      minX: m.position.x,
      minY: m.position.y,
      maxX: m.position.x,
      maxY: m.position.y,
    });
  }
  return boxes.length ? unionBounds(boxes) : null;
}

function buildingBounds(model: BuildingModel): Bounds | null {
  const pts: Point[] = [];
  for (const w of model.walls) {
    pts.push(...w.baseline);
  }
  for (const r of model.rooms) {
    pts.push(...r.boundary);
  }
  return pts.length ? boundsOf(pts) : null;
}

// --- the frame + title block -----------------------------------------------

function buildFrame(layout: SheetLayout): SheetPrimitive[] {
  const { wPt, hPt, border } = layout;
  return [
    {
      t: "rect",
      x: 6,
      y: 6,
      w: wPt - 12,
      h: hPt - 12,
      sw: 1.6,
      stroke: INK,
      fill: "#ffffff",
    },
    {
      t: "rect",
      x: border.x,
      y: border.y,
      w: border.w,
      h: border.h,
      sw: 0.8,
      stroke: INK,
    },
  ];
}

function buildTitleBlock(
  set: DrawingSet,
  sheet: Sheet,
  plugin: RegionPlugin,
  layout: SheetLayout,
  scaleLabel: string,
): SheetPrimitive[] {
  const r = layout.titleRect;
  const tb = resolveTitleBlock(set, sheet, scaleLabel);
  const out: SheetPrimitive[] = [
    { t: "rect", x: r.x, y: r.y, w: r.w, h: r.h, sw: 1, stroke: INK },
  ];
  const pad = 8;
  const firm =
    plugin.titleBlock.firmLines ?? set.titleBlockDefaults.firmLines ?? [];
  let y = r.y + 18;
  // Firm / project banner (top of strip).
  out.push({
    t: "text",
    at: { x: r.x + pad, y },
    text: set.titleBlockDefaults.projectName.toUpperCase(),
    size: 9,
    color: INK,
    weight: 700,
  });
  y += 12;
  for (const line of firm) {
    out.push({
      t: "text",
      at: { x: r.x + pad, y },
      text: line,
      size: 6.5,
      color: MUTED,
    });
    y += 9;
  }
  y += 4;
  out.push({
    t: "line",
    a: { x: r.x, y },
    b: { x: r.x + r.w, y },
    w: 0.6,
    color: INK,
  });
  y += 4;

  // The big sheet-number cell at the bottom of the strip.
  const numCellH = 54;
  const numTop = r.y + r.h - numCellH;
  out.push({
    t: "line",
    a: { x: r.x, y: numTop },
    b: { x: r.x + r.w, y: numTop },
    w: 1,
    color: INK,
  });
  out.push({
    t: "text",
    at: { x: r.x + r.w / 2, y: numTop + 22 },
    text: "SHEET",
    size: 6.5,
    color: MUTED,
    anchor: "middle",
  });
  out.push({
    t: "text",
    at: { x: r.x + r.w / 2, y: numTop + 42 },
    text: formatSheetNumber(sheet.number),
    size: 20,
    color: INK,
    anchor: "middle",
    weight: 700,
  });

  // Field rows between banner and number cell.
  const rows: [string, string][] = [
    ["SHEET TITLE", sheet.title],
    ["SCALE", scaleLabel],
    ["DATE", tb.date],
    ["DRAWN", tb.drawnBy ?? "—"],
    ["CHECKED", tb.checkedBy ?? "—"],
    ["PROJECT NO.", tb.projectNumber ?? "—"],
    ["SHEET", tb.sheetOf],
  ];
  const rowH = Math.min(22, (numTop - y - 4) / rows.length);
  for (const [label, value] of rows) {
    out.push({
      t: "text",
      at: { x: r.x + pad, y: y + 8 },
      text: label,
      size: 5.5,
      color: MUTED,
    });
    out.push({
      t: "text",
      at: { x: r.x + pad, y: y + 17 },
      text: value,
      size: 8,
      color: INK,
      weight: 600,
    });
    y += rowH;
    out.push({
      t: "line",
      a: { x: r.x, y },
      b: { x: r.x + r.w, y },
      w: 0.4,
      color: LIGHT,
    });
  }
  return out;
}

function buildRevisionBlock(
  sheet: Sheet,
  layout: SheetLayout,
): SheetPrimitive[] {
  if (!sheet.revisions.length) {
    return [];
  }
  const r = layout.titleRect;
  const h = 12 + sheet.revisions.length * 10;
  const top = r.y + r.h - 54 - h - 6;
  const out: SheetPrimitive[] = [
    { t: "rect", x: r.x, y: top, w: r.w, h, sw: 0.6, stroke: INK },
    {
      t: "text",
      at: { x: r.x + 4, y: top + 9 },
      text: "REVISIONS",
      size: 6,
      color: MUTED,
      weight: 700,
    },
  ];
  let y = top + 20;
  for (const rev of sheet.revisions) {
    out.push({
      t: "circle",
      c: { x: r.x + 10, y: y - 3 },
      r: 5,
      sw: 0.6,
      stroke: INK,
    });
    out.push({
      t: "text",
      at: { x: r.x + 10, y: y - 1 },
      text: String(rev.delta),
      size: 6,
      color: INK,
      anchor: "middle",
      weight: 700,
    });
    out.push({
      t: "text",
      at: { x: r.x + 20, y: y },
      text: `${rev.date}  ${rev.description}`.slice(0, 34),
      size: 6,
      color: INK,
    });
    y += 10;
  }
  return out;
}

// --- shared drawing of site model into a projector -------------------------

function drawFramework(
  site: Site,
  project: (p: Point) => Pt,
): SheetPrimitive[] {
  const out: SheetPrimitive[] = [];
  let frame: ReturnType<typeof sectionFrame> | null = null;
  if (site.landLot?.nwCorner) {
    const side = site.plss?.sectionSide ?? 2640;
    frame = sectionFrame(site.landLot.nwCorner, side);
  } else if (site.plss?.sectionNwCorner && site.plss.sectionSide) {
    frame = sectionFrame(site.plss.sectionNwCorner, site.plss.sectionSide);
  }
  if (!frame) {
    return out;
  }
  const [nw, ne, se, sw] = [frame.nw, frame.ne, frame.se, frame.sw].map(
    project,
  );
  out.push({
    t: "polygon",
    pts: [nw, ne, se, sw],
    stroke: MUTED,
    w: 1,
    dash: [14, 4, 3, 4],
  });
  return out;
}

function drawSitePlan(
  site: Site,
  project: (p: Point) => Pt,
  _areaUnit: RegionPlugin["defaults"]["areaUnit"],
): SheetPrimitive[] {
  const out: SheetPrimitive[] = [...drawFramework(site, project)];

  for (const el of site.elements) {
    if (!isSpatialElement(el)) {
      continue;
    }
    const ring = densifyBoundary(el.boundary, el.arcs, 2).map(project);
    const cat = el.kind === "landuse" ? el.category : undefined;
    const color = elementColor(el.kind, cat);
    const isEsmt = el.kind === "easement";
    out.push({
      t: "polygon",
      pts: ring,
      fill: color,
      fillOpacity: isEsmt ? 0.05 : el.kind === "building" ? 0.5 : 0.14,
      stroke: isEsmt ? MUTED : INK,
      w: el.kind === "parcel" ? 1.2 : 0.8,
      dash: isEsmt ? [6, 3, 2, 3] : el.kind === "zone" ? [5, 3] : undefined,
    });
    const hatchId =
      el.hatchId ??
      hatchForMaterial(el.kind === "landuse" ? el.category : el.kind);
    const hp = hatchId ? hatchPattern(hatchId) : undefined;
    if (hp && !isEsmt) {
      out.push(...hatchLines(ring, hp));
    }
  }

  // Lot/parcel labels.
  for (const el of site.elements) {
    if (el.kind !== "lot" && el.kind !== "parcel") {
      continue;
    }
    if (!isSpatialElement(el)) {
      continue;
    }
    const c = project(centroid(el.boundary));
    out.push({
      t: "text",
      at: { x: c.x, y: c.y },
      text: el.name,
      size: 6,
      color: INK,
      anchor: "middle",
      weight: 700,
    });
  }

  // Alignments: offsets + centreline + station ticks.
  for (const a of site.alignments ?? []) {
    const r = resolveAlignment(a);
    if (!r) {
      continue;
    }
    for (const off of a.offsets ?? []) {
      const path = offsetAlignmentPath(r, off.distance).map(project);
      out.push({
        t: "polyline",
        pts: path,
        color: off.kind === "row" ? "#7c3aed" : "#334155",
        w: 0.7,
        dash: off.kind === "row" ? [8, 2, 2, 2] : undefined,
      });
    }
    const cl: Pt[] = [];
    for (const el of r.elements) {
      if (el.kind === "tangent") {
        if (cl.length === 0) {
          cl.push(project(el.from));
        }
        cl.push(project(el.to));
      } else if (el.kind === "curve") {
        const c = el.curve;

        const steps = Math.max(2, Math.ceil(c.deltaDeg / 3));
        for (let i = 0; i <= steps; i++) {
          const ang = c.startAngle + (c.sweep * i) / steps;
          cl.push(
            project({
              x: c.center.x + c.radius * Math.cos(ang),
              y: c.center.y + c.radius * Math.sin(ang),
            }),
          );
        }
      }
    }
    out.push({
      t: "polyline",
      pts: cl,
      color: "#b91c1c",
      w: 1.1,
      dash: [12, 3, 3, 3],
    });
    for (const st of fullStations(r, 100)) {
      const at = pointAtStation(r, st);
      if (!at) {
        continue;
      }
      const s = project(at.point);
      out.push({ t: "circle", c: s, r: 1.2, fill: "#b91c1c" });
    }
  }

  // Monuments (simple glyphs) + POB.
  for (const m of site.monuments ?? []) {
    const s = project(m.position);
    if (
      m.type === "iron-rod" ||
      m.type === "iron-pipe" ||
      m.type === "rebar-cap"
    ) {
      out.push({
        t: "circle",
        c: s,
        r: 2,
        sw: 0.8,
        stroke: INK,
        fill: m.status === "set" ? INK : "#ffffff",
      });
    } else {
      out.push({
        t: "rect",
        x: s.x - 2,
        y: s.y - 2,
        w: 4,
        h: 4,
        sw: 0.8,
        stroke: INK,
        fill: m.status === "set" ? INK : "#ffffff",
      });
    }
  }
  return out;
}

// --- building floor plan ----------------------------------------------------

function drawFloorPlan(
  site: Site,
  model: BuildingModel,
  project: (p: Point) => Pt,
): SheetPrimitive[] {
  const out: SheetPrimitive[] = [];
  const level = model.levels[0];
  const walls = model.walls.filter((w) => !level || w.levelId === level.id);
  const wallIds = new Set(walls.map((w) => w.id));

  // Room fills + tags.
  for (const room of model.rooms) {
    if (level && room.levelId !== level.id) {
      continue;
    }
    const ring = room.boundary.map(project);
    out.push({
      t: "polygon",
      pts: ring,
      fill: "#f1f5f9",
      fillOpacity: 0.6,
      stroke: LIGHT,
      w: 0.4,
    });
  }
  // Wall poché.
  for (const w of walls) {
    const pg = wallPolygon(w).map(project);
    out.push({
      t: "polygon",
      pts: pg,
      fill: INK,
      fillOpacity: 0.85,
      stroke: INK,
      w: 0.4,
    });
  }
  // Doors: jamb gap (white) + swing.
  for (const d of model.doors) {
    if (!wallIds.has(d.wallId)) {
      continue;
    }
    const w = walls.find((x) => x.id === d.wallId);
    if (!w) {
      continue;
    }
    const [j1, j2] = openingJambs(w, d);
    out.push({
      t: "line",
      a: project(j1),
      b: project(j2),
      w: 2,
      color: "#ffffff",
    });
    const sw = doorSwing(w, d);
    out.push({
      t: "line",
      a: project(sw.hinge),
      b: project(sw.leafEnd),
      w: 0.6,
      color: INK,
    });
    out.push({ t: "polyline", pts: sw.arc.map(project), color: INK, w: 0.4 });
  }
  // Windows: double glazing line.
  for (const wn of model.windows) {
    if (!wallIds.has(wn.wallId)) {
      continue;
    }
    const w = walls.find((x) => x.id === wn.wallId);
    if (!w) {
      continue;
    }
    const [j1, j2] = openingJambs(w, wn);
    out.push({
      t: "line",
      a: project(j1),
      b: project(j2),
      w: 1.4,
      color: "#0284c7",
    });
  }
  // Room tags.
  for (const room of model.rooms) {
    if (level && room.levelId !== level.id) {
      continue;
    }
    const c = project(centroid(room.boundary));
    out.push({
      t: "text",
      at: { x: c.x, y: c.y },
      text: room.name,
      size: 6,
      color: INK,
      anchor: "middle",
      weight: 700,
    });
    out.push({
      t: "text",
      at: { x: c.x, y: c.y + 8 },
      text: `${room.number} · ${roomArea(room, site.spatial, "sqft").toFixed(0)} SF`,
      size: 5,
      color: MUTED,
      anchor: "middle",
    });
  }
  return out;
}

// --- dimensions, grids, annotations projected into a view ------------------

function drawDimensions(
  site: Site,
  project: (p: Point) => Pt,
): SheetPrimitive[] {
  const out: SheetPrimitive[] = [];
  for (const dim of site.dimensions ?? []) {
    const m = measureDimension(dim as Dimension, site.spatial);
    const style = dimensionStyle((dim as Dimension).styleId);
    for (const [a, b] of m.geometry.lines) {
      out.push({ t: "line", a: project(a), b: project(b), w: 0.4, color: INK });
    }
    for (const tk of m.geometry.ticks) {
      const at = project(tk.at);
      const dir = { x: tk.dir.x, y: tk.dir.y };
      if (style.arrow === "tick") {
        out.push(dimTick(at, dir, 3));
      } else {
        out.push(arrowHead(at, dir, 4));
      }
    }
    const t = project(m.geometry.textAt);
    out.push({
      t: "text",
      at: t,
      text: m.label,
      size: 5.5,
      color: INK,
      anchor: "middle",
      angle: m.geometry.textAngleDeg,
    });
  }
  return out;
}

function drawGridBubbles(
  site: Site,
  project: (p: Point) => Pt,
): SheetPrimitive[] {
  const out: SheetPrimitive[] = [];
  for (const g of site.annotations?.gridLines ?? []) {
    out.push({
      t: "line",
      a: project(g.from),
      b: project(g.to),
      w: 0.5,
      color: "#64748b",
      dash: [10, 2, 2, 2],
    });
    for (const bub of gridBubbleGeometry(g, 6)) {
      const c = project(bub.center);
      out.push({ t: "circle", c, r: 8, sw: 0.7, stroke: INK, fill: "#ffffff" });
      out.push({
        t: "text",
        at: { x: c.x, y: c.y + 3 },
        text: bub.label,
        size: 7,
        color: INK,
        anchor: "middle",
        weight: 700,
      });
    }
  }
  return out;
}

function drawMarks(site: Site, project: (p: Point) => Pt): SheetPrimitive[] {
  const out: SheetPrimitive[] = [];
  const ann = site.annotations;
  if (!ann) {
    return out;
  }
  for (const sm of ann.sectionMarks ?? []) {
    const [a, b] = sm.atLine.map(project) as [Pt, Pt];
    out.push({ t: "line", a, b, w: 1.4, color: INK, dash: [12, 3, 3, 3] });
    const gaze = sectionGaze(sm);
    for (const end of [a, b]) {
      out.push({
        t: "circle",
        c: end,
        r: 9,
        sw: 0.9,
        stroke: INK,
        fill: "#ffffff",
      });
      out.push({
        t: "text",
        at: { x: end.x, y: end.y + 3 },
        text: sm.tag,
        size: 8,
        color: INK,
        anchor: "middle",
        weight: 700,
      });
      out.push(
        arrowHead({ x: end.x + gaze.x * 14, y: end.y + gaze.y * 14 }, gaze, 5),
      );
    }
  }
  for (const dm of ann.detailMarks ?? []) {
    const c = project(dm.center);
    const edge = project({ x: dm.center.x + dm.radius, y: dm.center.y });
    const rr = distance(edge, c);
    out.push({
      t: "circle",
      c,
      r: rr,
      sw: 0.8,
      stroke: INK,
      fill: "transparent",
      fillOpacity: 0,
    });
    out.push({
      t: "circle",
      c: { x: c.x + rr + 12, y: c.y - rr },
      r: 9,
      sw: 0.9,
      stroke: INK,
      fill: "#ffffff",
    });
    out.push({
      t: "text",
      at: { x: c.x + rr + 12, y: c.y - rr + 3 },
      text: dm.tag,
      size: 8,
      color: INK,
      anchor: "middle",
      weight: 700,
    });
  }
  for (const ml of ann.matchLines ?? []) {
    const [a, b] = ml.atLine.map(project) as [Pt, Pt];
    out.push({
      t: "line",
      a,
      b,
      w: 1.6,
      color: "#b91c1c",
      dash: [16, 3, 3, 3],
    });
    out.push({
      t: "text",
      at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 4 },
      text: `MATCH LINE — SEE ${ml.adjoiningSheet}`,
      size: 6,
      color: "#b91c1c",
      anchor: "middle",
      weight: 700,
    });
  }
  for (const rc of ann.revisionClouds ?? []) {
    const apexes = revisionCloudBumps(rc, 6).map(project);
    out.push({
      t: "polyline",
      pts: apexes,
      color: "#b91c1c",
      w: 0.8,
      close: true,
    });
    const first = project(rc.boundary[0]);
    out.push({
      t: "polygon",
      pts: [
        { x: first.x, y: first.y - 6 },
        { x: first.x + 6, y: first.y + 4 },
        { x: first.x - 6, y: first.y + 4 },
      ],
      fill: "#b91c1c",
      stroke: "#b91c1c",
      w: 0.3,
    });
    out.push({
      t: "text",
      at: { x: first.x, y: first.y + 3 },
      text: String(rc.delta),
      size: 6,
      color: "#ffffff",
      anchor: "middle",
      weight: 700,
    });
  }
  return out;
}

// --- viewport frame + title bubble -----------------------------------------

function viewportTitle(
  rect: { x: number; y: number; w: number; h: number },
  num: number | undefined,
  title: string,
  scale: string,
): SheetPrimitive[] {
  const out: SheetPrimitive[] = [];
  const y = rect.y + rect.h + 4;
  if (num != null) {
    out.push({
      t: "circle",
      c: { x: rect.x + 10, y: y + 8 },
      r: 9,
      sw: 1,
      stroke: INK,
      fill: "#ffffff",
    });
    out.push({
      t: "text",
      at: { x: rect.x + 10, y: y + 11 },
      text: String(num),
      size: 9,
      color: INK,
      anchor: "middle",
      weight: 700,
    });
  }
  out.push({
    t: "text",
    at: { x: rect.x + 24, y: y + 8 },
    text: title.toUpperCase(),
    size: 8,
    color: INK,
    weight: 700,
  });
  out.push({
    t: "text",
    at: { x: rect.x + 24, y: y + 17 },
    text: `SCALE: ${scale}`,
    size: 6,
    color: MUTED,
  });
  out.push({
    t: "line",
    a: { x: rect.x, y: y + 20 },
    b: { x: rect.x + Math.min(rect.w, 160), y: y + 20 },
    w: 1,
    color: INK,
  });
  return out;
}

// --- schedules --------------------------------------------------------------

function drawScheduleTable(
  table: ScheduleTable,
  x: number,
  y: number,
  w: number,
): { prims: SheetPrimitive[]; height: number } {
  const out: SheetPrimitive[] = [];
  const rowH = 14;
  const headH = 16;
  const cols = table.columns;
  const colW = w / cols.length;
  out.push({
    t: "text",
    at: { x, y: y - 4 },
    text: table.title.toUpperCase(),
    size: 8,
    color: INK,
    weight: 700,
  });
  out.push({
    t: "rect",
    x,
    y,
    w,
    h: headH,
    sw: 0.6,
    stroke: INK,
    fill: "#e2e8f0",
  });
  cols.forEach((c, i) => {
    out.push({
      t: "text",
      at: { x: x + i * colW + 4, y: y + 11 },
      text: c.label,
      size: 6,
      color: INK,
      weight: 700,
    });
    if (i > 0) {
      out.push({
        t: "line",
        a: { x: x + i * colW, y },
        b: { x: x + i * colW, y: y + headH + table.rows.length * rowH },
        w: 0.4,
        color: LIGHT,
      });
    }
  });
  table.rows.forEach((row, ri) => {
    const ry = y + headH + ri * rowH;
    out.push({ t: "rect", x, y: ry, w, h: rowH, sw: 0.3, stroke: LIGHT });
    cols.forEach((c, i) => {
      const v = String(row[c.key] ?? "");
      const anchor =
        c.align === "right" ? "end" : c.align === "center" ? "middle" : "start";
      const tx =
        c.align === "right"
          ? x + (i + 1) * colW - 4
          : c.align === "center"
            ? x + i * colW + colW / 2
            : x + i * colW + 4;
      out.push({
        t: "text",
        at: { x: tx, y: ry + 10 },
        text: v,
        size: 6,
        color: INK,
        anchor,
      });
    });
  });
  return { prims: out, height: headH + table.rows.length * rowH + 24 };
}

function schedulesFor(site: Site): ScheduleTable[] {
  const tables: ScheduleTable[] = [];
  const model = site.buildingModels?.[0];
  if (model) {
    tables.push(
      doorSchedule(model),
      windowSchedule(model),
      roomSchedule(model, site.spatial),
      finishSchedule(model),
    );
  }
  const curves = collectSiteCurves(site);
  if (curves.length) {
    tables.push(curveSchedule(curves));
  }
  return tables;
}

// --- index sheet ------------------------------------------------------------

function buildIndexSheet(
  set: DrawingSet,
  site: Site,
  layout: SheetLayout,
): SheetPrimitive[] {
  const out: SheetPrimitive[] = [];
  const a = layout.drawArea;
  out.push({
    t: "text",
    at: { x: a.x + 12, y: a.y + 26 },
    text: set.name.toUpperCase(),
    size: 18,
    color: INK,
    weight: 700,
  });
  out.push({
    t: "text",
    at: { x: a.x + 12, y: a.y + 44 },
    text: set.titleBlockDefaults.location ?? "",
    size: 9,
    color: MUTED,
  });

  // Sheet index table (left half).
  const rows = sheetIndex(set);
  const tblX = a.x + 12;
  let y = a.y + 74;
  out.push({
    t: "text",
    at: { x: tblX, y: y - 6 },
    text: "SHEET INDEX",
    size: 10,
    color: INK,
    weight: 700,
  });
  out.push({
    t: "rect",
    x: tblX,
    y,
    w: a.w * 0.44,
    h: 16,
    sw: 0.6,
    stroke: INK,
    fill: "#e2e8f0",
  });
  out.push({
    t: "text",
    at: { x: tblX + 4, y: y + 11 },
    text: "NO.",
    size: 6.5,
    color: INK,
    weight: 700,
  });
  out.push({
    t: "text",
    at: { x: tblX + 60, y: y + 11 },
    text: "SHEET TITLE",
    size: 6.5,
    color: INK,
    weight: 700,
  });
  y += 16;
  for (const r of rows) {
    out.push({
      t: "rect",
      x: tblX,
      y,
      w: a.w * 0.44,
      h: 13,
      sw: 0.3,
      stroke: LIGHT,
    });
    out.push({
      t: "text",
      at: { x: tblX + 4, y: y + 9 },
      text: r.number,
      size: 6.5,
      color: INK,
      weight: 600,
    });
    out.push({
      t: "text",
      at: { x: tblX + 60, y: y + 9 },
      text: r.title,
      size: 6.5,
      color: INK,
    });
    y += 13;
  }

  // Key map (right half): a fitted site thumbnail.
  const b = siteBounds(site);
  if (b) {
    const kmRect = {
      x: a.x + a.w * 0.5,
      y: a.y + 74,
      w: a.w * 0.46,
      h: a.h * 0.6,
    };
    out.push({
      t: "rect",
      x: kmRect.x,
      y: kmRect.y,
      w: kmRect.w,
      h: kmRect.h,
      sw: 0.8,
      stroke: INK,
    });
    out.push({
      t: "text",
      at: { x: kmRect.x, y: kmRect.y - 6 },
      text: "KEY MAP",
      size: 10,
      color: INK,
      weight: 700,
    });
    const pr = fitProjector(kmRect, b, 0.08);
    out.push(...drawSitePlan(site, pr.project, "acres"));
    for (const ml of site.annotations?.matchLines ?? []) {
      const [p, q] = ml.atLine.map(pr.project) as [Pt, Pt];
      out.push({
        t: "line",
        a: p,
        b: q,
        w: 1.2,
        color: "#b91c1c",
        dash: [10, 3, 3, 3],
      });
    }
  }
  return out;
}

// --- the top-level sheet composer ------------------------------------------

/** Build the full primitive scene for one sheet. */
export function buildSheetScene(
  set: DrawingSet,
  sheet: Sheet,
  site: Site,
  plugin: RegionPlugin,
): SheetBand[] {
  const unit = plugin.sheetStandards?.unit ?? "in";
  const layout = sheetLayout(sheet, unit);
  const scaleLabel = sheet.scaleId === "as-shown" ? "AS SHOWN" : sheet.scaleId;
  const bands: SheetBand[] = [];
  bands.push({ name: "frame", prims: buildFrame(layout) });

  const areaUnit = plugin.defaults.areaUnit;
  const content: SheetPrimitive[] = [];
  const a = layout.drawArea;

  if (sheet.number.type === 0) {
    content.push(...buildIndexSheet(set, site, layout));
  } else if (sheet.number.type === 6) {
    // Schedules laid out in two columns.
    const tables = schedulesFor(site);
    const colW = (a.w - 24) / 2;
    let x = a.x + 8;
    let y = a.y + 24;
    let col = 0;
    for (const tbl of tables) {
      const { prims, height } = drawScheduleTable(tbl, x, y, colW);
      content.push(...prims);
      y += height + 12;
      if (y > a.y + a.h - 60 && col === 0) {
        col = 1;
        x = a.x + 16 + colW;
        y = a.y + 24;
      }
    }
  } else if (
    sheet.number.discipline === "A" &&
    (sheet.number.type === 1 || sheet.number.type === 4) &&
    site.buildingModels?.length
  ) {
    const model = site.buildingModels[0];
    const b = buildingBounds(model);
    if (b) {
      const pr = fitProjector(a, b, 0.1);
      content.push(...drawFloorPlan(site, model, pr.project));
      content.push(...drawDimensions(site, pr.project));
      content.push(...drawGridBubbles(site, pr.project));
      content.push(...drawMarks(site, pr.project));
      content.push(
        ...viewportTitle(
          { x: a.x + 8, y: a.y + 8, w: a.w - 16, h: a.h - 40 },
          sheet.viewportIds.length ? 1 : undefined,
          `${model.levels[0]?.name ?? "LEVEL 1"} FLOOR PLAN`,
          scaleLabel,
        ),
      );
      content.push(...northArrow({ x: a.x + a.w - 30, y: a.y + 16 }, 30));
    }
  } else if (sheet.number.type === 2 || sheet.number.type === 3) {
    content.push(...buildBuildingViews(site, sheet, layout, scaleLabel));
  } else {
    // Default: site plan (civil / survey / landscape / general plans).
    const b = siteBounds(site);
    if (b) {
      const pr = fitProjector(a, b, 0.08);
      content.push(...drawSitePlan(site, pr.project, areaUnit));
      content.push(...drawDimensions(site, pr.project));
      content.push(...drawMarks(site, pr.project));
      content.push(
        ...viewportTitle(
          { x: a.x + 8, y: a.y + 8, w: a.w - 16, h: a.h - 40 },
          sheet.viewportIds.length ? 1 : undefined,
          sheet.title,
          scaleLabel,
        ),
      );
      content.push(...northArrow({ x: a.x + a.w - 30, y: a.y + 16 }, 30));
    }
  }

  bands.push({ name: "content", prims: content });
  bands.push({
    name: "title",
    prims: buildTitleBlock(set, sheet, plugin, layout, scaleLabel),
  });
  bands.push({ name: "revisions", prims: buildRevisionBlock(sheet, layout) });
  return bands;
}

/** Elevation / section views built from the building model's extents. */
function buildBuildingViews(
  site: Site,
  sheet: Sheet,
  layout: SheetLayout,
  scaleLabel: string,
): SheetPrimitive[] {
  const out: SheetPrimitive[] = [];
  const model = site.buildingModels?.[0];
  const a = layout.drawArea;
  if (!model || !model.levels.length) {
    return out;
  }
  const b = buildingBounds(model);
  if (!b) {
    return out;
  }
  const isSection = sheet.number.type === 3;
  const widthModel = b.maxX - b.minX;
  const totalH = model.levels.reduce(
    (mx: number, l: { elevation: number; height: number }) => Math.max(mx, l.elevation + l.height),
    0,
  );
  // One elevation per drawing, stacked in the drawing area.
  const count = isSection ? 1 : 2;
  const cellH = (a.h - 40) / count;
  for (let i = 0; i < count; i++) {
    const rect = {
      x: a.x + 16,
      y: a.y + 12 + i * cellH,
      w: a.w - 40,
      h: cellH - 30,
    };
    const s = Math.min(
      (rect.w * 0.85) / Math.max(widthModel, 1e-6),
      (rect.h * 0.8) / Math.max(totalH, 1e-6),
    );
    const ox = rect.x + rect.w / 2 - (widthModel * s) / 2;
    const groundY = rect.y + rect.h - 10;
    // Ground line.
    out.push({
      t: "line",
      a: { x: rect.x, y: groundY },
      b: { x: rect.x + rect.w, y: groundY },
      w: 1.2,
      color: INK,
    });
    // Building box per level.
    for (const lvl of model.levels) {
      const y0 = groundY - (lvl.elevation + lvl.height) * s;
      const y1 = groundY - lvl.elevation * s;
      out.push({
        t: "rect",
        x: ox,
        y: y0,
        w: widthModel * s,
        h: y1 - y0,
        sw: 1,
        stroke: INK,
        fill: isSection ? "#f1f5f9" : "#ffffff",
      });
      out.push({
        t: "line",
        a: { x: ox - 12, y: y1 },
        b: { x: ox + widthModel * s + 12, y: y1 },
        w: 0.4,
        color: LIGHT,
        dash: [4, 2],
      });
      out.push({
        t: "text",
        at: { x: ox - 16, y: y1 + 3 },
        text: lvl.name,
        size: 5.5,
        color: MUTED,
        anchor: "end",
      });
    }
    // Windows drawn on the front elevation as rectangles (approximate).
    if (!isSection) {
      model.windows.forEach((_win: any, wi: number) => {
        const wx =
          ox + ((wi + 1) / (model.windows.length + 1)) * widthModel * s;
        const wy = groundY - (model.levels[0].elevation + 3) * s;
        out.push({
          t: "rect",
          x: wx - 6,
          y: wy - 10,
          w: 12,
          h: 14,
          sw: 0.6,
          stroke: "#0284c7",
        });
      });
    }
    out.push(
      ...viewportTitle(
        rect,
        i + 1,
        isSection
          ? `BUILDING SECTION ${String.fromCharCode(65 + i)}`
          : `${["FRONT", "SIDE"][i]} ELEVATION`,
        scaleLabel,
      ),
    );
  }
  return out;
}

/** Convenience: build and flatten a sheet to a flat primitive list. */
export function buildSheetPrimitives(
  set: DrawingSet,
  sheet: Sheet,
  site: Site,
  plugin: RegionPlugin,
): SheetPrimitive[] {
  return flattenBands(buildSheetScene(set, sheet, site, plugin));
}
