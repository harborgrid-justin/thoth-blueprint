/**
 * Planning rules — buildable envelopes from setbacks, simple subdivision, and
 * compliance checks against zoning constraints. These operate on the
 * primitives and share the geometry/metric functions so results are consistent
 * everywhere the model runs.
 */

import _ from "lodash";
import type { Point, Polygon } from "../spatial/geometry";
import { area as polygonArea, bounds, offsetPolygon, pointInPolygon } from "../spatial/geometry";
import type { Building, Lot, Site, Zone } from "../spatial/primitives";

/**
 * The buildable envelope of a lot: its boundary inset by the lot's setback.
 * Returns `null` if the setback consumes the whole lot.
 */
export function buildableEnvelope(lot: Lot): Polygon | null {
  const setback = lot.setback ?? 0;
  if (setback <= 0) return lot.boundary.slice();
  return offsetPolygon(lot.boundary, setback);
}

/** Buildable area of a lot in plan units² after applying its setback. */
export function buildableArea(lot: Lot): number {
  const envelope = buildableEnvelope(lot);
  return envelope ? polygonArea(envelope) : 0;
}

/** Options controlling a simple grid subdivision of a parcel-like boundary. */
export interface SubdivisionOptions {
  /** Number of columns of lots. */
  columns: number;
  /** Number of rows of lots. */
  rows: number;
  /** Gap between lots in plan units (interpreted as internal ROW/spacing). */
  gap?: number;
  /** Layer the produced lots are placed on. */
  layerId: string;
  /** Generator for new lot ids. */
  makeId: () => string;
  /** Optional setback stamped onto each produced lot. */
  setback?: number;
}

/**
 * Divide a boundary into a grid of lots. This is a pragmatic first-pass
 * subdivision (bounding-box grid clipped to the boundary by centroid test),
 * not a survey-grade metes-and-bounds subdivision — adequate for early
 * feasibility sketches.
 */
export function subdivideGrid(boundary: Polygon, options: SubdivisionOptions): Lot[] {
  const { columns, rows, gap = 0, layerId, makeId, setback } = options;
  if (columns < 1 || rows < 1) return [];

  const box = bounds(boundary);
  const totalW = box.maxX - box.minX;
  const totalH = box.maxY - box.minY;
  const cellW = (totalW - gap * (columns - 1)) / columns;
  const cellH = (totalH - gap * (rows - 1)) / rows;
  if (cellW <= 0 || cellH <= 0) return [];

  const lots: Lot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const x0 = box.minX + c * (cellW + gap);
      const y0 = box.minY + r * (cellH + gap);
      const cell: Polygon = [
        { x: x0, y: y0 },
        { x: x0 + cellW, y: y0 },
        { x: x0 + cellW, y: y0 + cellH },
        { x: x0, y: y0 + cellH },
      ];
      const center: Point = { x: x0 + cellW / 2, y: y0 + cellH / 2 };
      if (!pointInPolygon(center, boundary)) continue;
      lots.push({
        id: makeId(),
        kind: "lot",
        name: `Lot ${lots.length + 1}`,
        layerId,
        boundary: cell,
        setback,
      });
    }
  }
  return lots;
}

/** The severity of a compliance finding. */
export type ComplianceSeverity = "error" | "warning" | "info";

/** A single result from checking a plan against its constraints. */
export interface ComplianceFinding {
  severity: ComplianceSeverity;
  code: string;
  message: string;
  /** The element the finding concerns, if any. */
  elementId?: string;
}

/**
 * Check buildings against the coverage/FAR/height limits of the zones that
 * contain them. A building is attributed to a zone when its centroid lies
 * within the zone boundary.
 */
export function checkCompliance(site: Site): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const zones = site.elements.filter((e): e is Zone => e.kind === "zone");
  const buildings = site.elements.filter((e): e is Building => e.kind === "building");
  const lots = site.elements.filter((e): e is Lot => e.kind === "lot");

  for (const building of buildings) {
    const footprint = polygonArea(building.boundary);
    const center = centroidOf(building.boundary);

    const zone = zones.find((z) => pointInPolygon(center, z.boundary));
    if (zone) {
      const lot = lots.find((l) => pointInPolygon(center, l.boundary));
      const lotArea = lot ? polygonArea(lot.boundary) : undefined;

      if (zone.maxCoverage != null && lotArea && lotArea > 0) {
        const cov = footprint / lotArea;
        if (cov > zone.maxCoverage + 1e-6) {
          findings.push({
            severity: "error",
            code: "coverage.exceeded",
            message: `${building.name} covers ${(cov * 100).toFixed(0)}% of its lot; zone ${zone.designation} allows ${(zone.maxCoverage * 100).toFixed(0)}%.`,
            elementId: building.id,
          });
        }
      }

      if (zone.maxFar != null && lotArea && lotArea > 0) {
        const far = (footprint * Math.max(1, building.storeys)) / lotArea;
        if (far > zone.maxFar + 1e-6) {
          findings.push({
            severity: "error",
            code: "far.exceeded",
            message: `${building.name} FAR ${far.toFixed(2)} exceeds zone ${zone.designation} limit of ${zone.maxFar.toFixed(2)}.`,
            elementId: building.id,
          });
        }
      }

      if (zone.maxHeight != null && building.height != null && building.height > zone.maxHeight) {
        findings.push({
          severity: "error",
          code: "height.exceeded",
          message: `${building.name} height ${building.height} exceeds zone ${zone.designation} limit of ${zone.maxHeight}.`,
          elementId: building.id,
        });
      }

      if (zone.allowedUses.length > 0 && building.use && !zone.allowedUses.includes(building.use)) {
        findings.push({
          severity: "warning",
          code: "use.disallowed",
          message: `${building.name} use "${building.use}" is not permitted in zone ${zone.designation}.`,
          elementId: building.id,
        });
      }
    }
  }

  for (const lot of lots) {
    const envelope = buildableEnvelope(lot);
    if (lot.setback != null && lot.setback > 0 && !envelope) {
      findings.push({
        severity: "warning",
        code: "setback.consumesLot",
        message: `${lot.name} setback of ${lot.setback} leaves no buildable area.`,
        elementId: lot.id,
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      code: "compliant",
      message: "No zoning conflicts detected.",
    });
  }

  return findings;
}

function centroidOf(polygon: Polygon): Point {
  const n = polygon.length;
  if (n === 0) return { x: 0, y: 0 };
  const sum = _.reduce(polygon, (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}
