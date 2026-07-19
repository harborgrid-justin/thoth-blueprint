import * as React from "react";
import { Download } from "lucide-react";
import {
  buildableEnvelope,
  centroid,
  bounds as boundsOf,
  unitLabel,
  type Point,
  type SpatialElement,
  type SpatialContext,
  type SurveyReport,
} from "@thoth/domain";
import { Button } from "@/components/ui/button";

// A monochrome "paper" plat exhibit, drawn to engineering-drawing conventions:
// labelled metes-and-bounds courses, corner monuments with a Point of Beginning,
// interior angles, an area callout, a north arrow, a graphic scale, and a title
// block. Rendered on a white sheet so it reads as a drawing in any UI theme.

const INK = "#0f172a";
const INK_MUTED = "#475569";
const SHEET = "#ffffff";

const W = 800;
const H = 620;
const M = { left: 76, right: 76, top: 58, bottom: 128 };
const CW = W - M.left - M.right;
const CH = H - M.top - M.bottom;

function niceNumber(value: number): number {
  if (value <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  const r = value / mag;
  return (r >= 5 ? 5 : r >= 2 ? 2 : 1) * mag;
}

function fmt(v: number, digits = 2): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function dms(a: { degrees: number; minutes: number; seconds: number }): string {
  const d = String(Math.abs(a.degrees));
  const m = String(a.minutes).padStart(2, "0");
  const s = String(a.seconds).padStart(2, "0");
  return `${d}°${m}′${s}″`;
}

export function PlatDrawing({
  element,
  spatial,
  report,
  siteName,
}: {
  element: SpatialElement;
  spatial: SpatialContext;
  report: SurveyReport;
  siteName: string;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const boundary = element.boundary;
  const u = unitLabel(spatial.units);

  const view = React.useMemo(() => buildView(boundary), [boundary]);
  if (!view) {
    return (
      <div className="rounded-md border border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
        This element needs at least three corners to draw a plat.
      </div>
    );
  }
  const { project, scalePx } = view;
  const c = centroid(boundary);
  const cScreen = project(c);
  const n = boundary.length;

  // Setback / buildable envelope for a lot, drawn as an interior offset line.
  const envelope =
    element.kind === "lot" && element.setback && element.setback > 0
      ? buildableEnvelope(element)
      : null;

  // Graphic scale: a round distance in plan units drawn to the correct length.
  const targetPx = 150;
  const scaleUnits = niceNumber(targetPx / scalePx);
  const scaleBarPx = scaleUnits * scalePx;

  const areaLine1 = `${fmt(report.area.squareUnits, 0)} ${u}²`;
  const areaLine2 =
    spatial.units === "feet"
      ? `${report.area.acres.toFixed(3)} AC`
      : `${report.area.hectares.toFixed(3)} ha`;

  function exportSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(element.name)}-plat.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Plat of Survey
        </h4>
        <Button variant="outline" size="sm" onClick={exportSvg}>
          <Download className="h-4 w-4" /> Drawing (SVG)
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", background: SHEET }}
          fontFamily="ui-monospace, Menlo, Consolas, monospace"
        >
          {/* Sheet border */}
          <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke={INK} strokeWidth={1.5} />
          <rect x={13} y={13} width={W - 26} height={H - 26} fill="none" stroke={INK} strokeWidth={0.6} />

          {/* Setback / buildable envelope */}
          {envelope && (
            <polygon
              points={envelope.map((p) => screenPair(project(p))).join(" ")}
              fill="none"
              stroke={INK_MUTED}
              strokeWidth={0.9}
              strokeDasharray="5 4"
            />
          )}

          {/* Boundary */}
          <polygon
            points={boundary.map((p) => screenPair(project(p))).join(" ")}
            fill={INK}
            fillOpacity={0.04}
            stroke={INK}
            strokeWidth={2.1}
            strokeLinejoin="round"
          />

          {/* Course labels: bearing + distance, offset outward, along each edge. */}
          {boundary.map((a, i) => {
            const b = boundary[(i + 1) % n];
            const course = report.courses[i];
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const out = outwardNormal(a, b, c);
            const pos = offset(project(mid), out, 15);
            let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            if (angle > 90 || angle < -90) angle += 180;
            return (
              <text
                key={`c${i}`}
                x={pos.x}
                y={pos.y}
                transform={`rotate(${angle} ${pos.x} ${pos.y})`}
                textAnchor="middle"
                fill={INK}
                fontSize={10}
              >
                <tspan x={pos.x} dy={-2} fontWeight={600}>
                  {course.bearingText}
                </tspan>
                <tspan x={pos.x} dy={11} fill={INK_MUTED}>
                  {`L${i + 1}  ${fmt(course.distance)} ${u}`}
                </tspan>
              </text>
            );
          })}

          {/* Interior angle labels, offset inward toward the centroid. */}
          {report.angles.map((ang, i) => {
            const v = project(boundary[i]);
            const dir = unit({ x: cScreen.x - v.x, y: cScreen.y - v.y });
            const pos = { x: v.x + dir.x * 26, y: v.y + dir.y * 26 };
            return (
              <text
                key={`a${i}`}
                x={pos.x}
                y={pos.y + 3}
                textAnchor="middle"
                fill={INK_MUTED}
                fontSize={8}
              >
                {dms(ang.dms)}
              </text>
            );
          })}

          {/* Corner monuments + labels; the first corner is the Point of Beginning. */}
          {boundary.map((p, i) => {
            const s = project(p);
            const dir = unit({ x: s.x - cScreen.x, y: s.y - cScreen.y });
            const lp = { x: s.x + dir.x * 15, y: s.y + dir.y * 15 };
            const pob = i === 0;
            return (
              <g key={`m${i}`}>
                <circle cx={s.x} cy={s.y} r={pob ? 4 : 3} fill={SHEET} stroke={INK} strokeWidth={pob ? 1.8 : 1.3} />
                <circle cx={s.x} cy={s.y} r={1} fill={INK} />
                <text x={lp.x} y={lp.y + 3} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={INK}>
                  P{i + 1}
                </text>
                {pob && (
                  <text x={lp.x} y={lp.y + 13} textAnchor="middle" fontSize={7.5} fill={INK_MUTED}>
                    P.O.B.
                  </text>
                )}
              </g>
            );
          })}

          {/* Area callout at the centroid. */}
          <g textAnchor="middle" fill={INK}>
            <text x={cScreen.x} y={cScreen.y - 8} fontSize={9} letterSpacing={1} fill={INK_MUTED}>
              AREA
            </text>
            <text x={cScreen.x} y={cScreen.y + 6} fontSize={13} fontWeight={700}>
              {areaLine1}
            </text>
            <text x={cScreen.x} y={cScreen.y + 20} fontSize={11}>
              {areaLine2}
            </text>
          </g>

          <NorthArrow x={W - M.right + 20} y={M.top + 6} />
          <GraphicScale
            x={M.left}
            y={H - M.bottom + 6}
            barPx={scaleBarPx}
            label={`${scaleUnits.toLocaleString()} ${u}`}
          />

          <TitleBlock
            element={element}
            siteName={siteName}
            report={report}
            u={u}
            areaSecondary={areaLine2}
          />
        </svg>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Bearings are quadrant (grid) bearings; distances are horizontal, in plan
        units. All courses are straight lines (no curves). Coordinate area is
        cross-checked by the Double Meridian Distance method
        {` (${fmt(report.areaByDmd, 2)} ${u}²)`}.
      </p>
    </div>
  );
}

// --- geometry helpers ------------------------------------------------------

interface View {
  project(p: Point): Point;
  scalePx: number;
}

function buildView(boundary: Point[]): View | null {
  if (boundary.length < 3) return null;
  const bb = boundsOf(boundary);
  const bw = Math.max(bb.maxX - bb.minX, 1e-6);
  const bh = Math.max(bb.maxY - bb.minY, 1e-6);
  const scalePx = Math.min(CW / bw, CH / bh);
  const offsetX = M.left + (CW - bw * scalePx) / 2 - bb.minX * scalePx;
  const offsetY = M.top + (CH - bh * scalePx) / 2 - bb.minY * scalePx;
  return {
    scalePx,
    // Plan north is −Y and SVG y grows downward, so north is up with no flip.
    project: (p) => ({ x: p.x * scalePx + offsetX, y: p.y * scalePx + offsetY }),
  };
}

function screenPair(p: Point): string {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

function unit(v: Point): Point {
  const len = Math.hypot(v.x, v.y);
  return len < 1e-9 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

function offset(p: Point, dir: Point, px: number): Point {
  return { x: p.x + dir.x * px, y: p.y + dir.y * px };
}

/** Unit normal of edge a→b that points away from the polygon centroid. */
function outwardNormal(a: Point, b: Point, c: Point): Point {
  const e = unit({ x: b.x - a.x, y: b.y - a.y });
  let nrm = { x: -e.y, y: e.x };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (nrm.x * (mid.x - c.x) + nrm.y * (mid.y - c.y) < 0) nrm = { x: -nrm.x, y: -nrm.y };
  return nrm;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tract";
}

// --- sheet furniture -------------------------------------------------------

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={INK} stroke={INK}>
      <path d="M0 34 L0 6" strokeWidth={1.2} />
      <path d="M0 0 L6 14 L0 9 L-6 14 Z" strokeWidth={0.6} />
      <text x={0} y={48} textAnchor="middle" fontSize={11} fontWeight={700} stroke="none">
        N
      </text>
    </g>
  );
}

function GraphicScale({ x, y, barPx, label }: { x: number; y: number; barPx: number; label: string }) {
  const segs = 4;
  const seg = barPx / segs;
  return (
    <g transform={`translate(${x} ${y})`}>
      <text x={0} y={-8} fontSize={8} letterSpacing={1} fill={INK_MUTED}>
        GRAPHIC SCALE
      </text>
      {Array.from({ length: segs }).map((_, i) => (
        <rect
          key={i}
          x={i * seg}
          y={0}
          width={seg}
          height={7}
          fill={i % 2 === 0 ? INK : SHEET}
          stroke={INK}
          strokeWidth={0.8}
        />
      ))}
      <text x={0} y={20} fontSize={8} textAnchor="middle" fill={INK}>
        0
      </text>
      <text x={barPx} y={20} fontSize={8} textAnchor="middle" fill={INK}>
        {label}
      </text>
    </g>
  );
}

function TitleBlock({
  element,
  siteName,
  report,
  u,
  areaSecondary,
}: {
  element: SpatialElement;
  siteName: string;
  report: SurveyReport;
  u: string;
  areaSecondary: string;
}) {
  const top = H - 92;
  const boxH = 72;
  const x = 40;
  const width = W - 80;
  const c1 = x + width * 0.44;
  const c2 = x + width * 0.72;
  return (
    <g>
      <rect x={x} y={top} width={width} height={boxH} fill="none" stroke={INK} strokeWidth={1.2} />
      <line x1={c1} y1={top} x2={c1} y2={top + boxH} stroke={INK} strokeWidth={0.8} />
      <line x1={c2} y1={top} x2={c2} y2={top + boxH} stroke={INK} strokeWidth={0.8} />

      {/* Left cell: title */}
      <text x={x + 12} y={top + 20} fontSize={12} fontWeight={700} fill={INK}>
        PLAT OF SURVEY
      </text>
      <text x={x + 12} y={top + 38} fontSize={11} fill={INK}>
        {element.name}
      </text>
      <text x={x + 12} y={top + 54} fontSize={9} fill={INK_MUTED}>
        {siteName}
      </text>

      {/* Middle cell: metrics */}
      <TitleRow x={c1 + 12} y={top + 18} k="Area" v={`${fmt(report.area.squareUnits, 0)} ${u}²`} />
      <TitleRow x={c1 + 12} y={top + 34} k="" v={areaSecondary} />
      <TitleRow x={c1 + 12} y={top + 52} k="Perimeter" v={`${fmt(report.perimeter)} ${u}`} />

      {/* Right cell: closure + notes */}
      <TitleRow x={c2 + 12} y={top + 18} k="Closure" v={report.record.precisionText} />
      <TitleRow x={c2 + 12} y={top + 34} k="Corners" v={String(element.boundary.length)} />
      <text x={c2 + 12} y={top + 54} fontSize={8} fill={INK_MUTED}>
        BEARINGS &amp; DISTANCES SHOWN
      </text>
    </g>
  );
}

function TitleRow({ x, y, k, v }: { x: number; y: number; k: string; v: string }) {
  return (
    <text x={x} y={y} fontSize={9} fill={INK}>
      {k && <tspan fill={INK_MUTED}>{k}: </tspan>}
      <tspan fontWeight={600}>{v}</tspan>
    </text>
  );
}
