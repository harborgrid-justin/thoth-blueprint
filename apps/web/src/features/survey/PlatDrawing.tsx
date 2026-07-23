import * as React from "react";
import _ from "lodash";
import { Download, Edit3 } from "lucide-react";
import {
  boundaryEdges,
  buildableEnvelope,
  densifyBoundary,
  normalize,
  unitLabel,
  type SpatialElement,
  type SpatialContext,
  type SurveyReport,
} from "@thoth/domain";
import { Button } from "@/components/ui/button";
import { centroidPreferWasm } from "@/lib/geometryWasm";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";
import {
  INK,
  INK_MUTED,
  SHEET,
  W,
  H,
  M,
  niceNumber,
  fmt,
  dms,
  buildView,
  screenPair,
  offset,
  outwardNormal,
  slug,
} from "./helpers/platDrawingHelpers";

// A monochrome "paper" plat exhibit, drawn to engineering-drawing conventions:
// labelled metes-and-bounds courses, corner monuments with a Point of Beginning,
// interior angles, an area callout, a north arrow, a graphic scale, and a title
// block. Rendered on a white sheet so it reads as a drawing in any UI theme.

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
  const [mode, setMode] = React.useState<"handdrawn" | "cad">("handdrawn");
  const svgRef = React.useRef<SVGSVGElement>(null);
  const boundary = element.boundary;
  const u = unitLabel(spatial.units);

  // Fit to the densified outline so arcs that bulge past the vertices stay on-sheet.
  const view = React.useMemo(
    () => buildView(densifyBoundary(boundary, element.arcs, 4)),
    [boundary, element.arcs],
  );
  if (!view) {
    return (
      <div className={SURVEY_STYLES.cardSubtle + " p-6 text-center text-sm"}>
        This element needs at least three corners to draw a plat.
      </div>
    );
  }
  const { project, scalePx } = view;
  // Cut over to the WASM geometry core (falls back to the TS implementation
  // until it finishes loading, or if it ever errors) — see
  // apps/web/src/lib/geometryWasm.ts for the full rationale and equivalence
  // test, and crates/thoth-bindings/src/geometry.rs for the Rust side.
  const c = centroidPreferWasm(boundary);
  const cScreen = project(c);

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
    if (!svg) {
      return;
    }
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8"?>\n${source}`],
      {
        type: "image/svg+xml;charset=utf-8",
      },
    );
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
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Plat of Survey
          </h4>
          <div className="flex items-center rounded-md border border-border bg-muted p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("handdrawn")}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-semibold transition-colors ${
                mode === "handdrawn"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit3 className="h-3 w-3" /> Hand-Drawn Surveyor
            </button>
            <button
              type="button"
              onClick={() => setMode("cad")}
              className={`flex items-center gap-1 rounded px-2 py-0.5 font-semibold transition-colors ${
                mode === "cad"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Standard CAD
            </button>
          </div>
        </div>
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
          style={{ display: "block", background: mode === "handdrawn" ? "#faf8f5" : SHEET }}
          fontFamily={
            mode === "handdrawn"
              ? "'Architects Daughter', 'Patrick Hand', 'Comic Sans MS', cursive"
              : "ui-monospace, Menlo, Consolas, monospace"
          }
        >
          <defs>
            <filter id="plat-hand-sketch" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>

          <g filter={mode === "handdrawn" ? "url(#plat-hand-sketch)" : undefined}>
          {/* Sheet border */}
          <rect
            x={8}
            y={8}
            width={W - 16}
            height={H - 16}
            fill="none"
            stroke={INK}
            strokeWidth={1.5}
          />
          <rect
            x={13}
            y={13}
            width={W - 26}
            height={H - 26}
            fill="none"
            stroke={INK}
            strokeWidth={0.6}
          />

          {/* Setback / buildable envelope */}
          {envelope && (
            <polygon
              points={_.map(envelope, (p) => screenPair(project(p))).join(" ")}
              fill="none"
              stroke={INK_MUTED}
              strokeWidth={0.9}
              strokeDasharray="5 4"
            />
          )}

          {/* Boundary (arcs tessellated so curves render smoothly). */}
          <polygon
            points={_.map(densifyBoundary(boundary, element.arcs, 1), (p) =>
              screenPair(project(p)),
            ).join(" ")}
            fill={INK}
            fillOpacity={0.04}
            stroke={INK}
            strokeWidth={2.1}
            strokeLinejoin="round"
          />

          {/* Course labels: bearing + distance for lines, curve data for arcs. */}
          {_.map(boundaryEdges(boundary, element.arcs), (edge, i) => {
            const a = edge.from;
            const b = edge.to;
            const course = report.courses[i];
            const midWorld = edge.arc
              ? edge.arc.mid
              : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const out = outwardNormal(a, b, c);
            const pos = offset(project(midWorld), out, 16);
            let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
            if (angle > 90 || angle < -90) {
              angle += 180;
            }
            if (edge.arc && course.curve) {
              const cv = course.curve;
              return (
                <g key={`c${i}`}>
                  {/* Radius tick from the arc midpoint toward the center. */}
                  <line
                    x1={project(edge.arc.mid).x}
                    y1={project(edge.arc.mid).y}
                    x2={project(edge.arc.center).x}
                    y2={project(edge.arc.center).y}
                    stroke={INK_MUTED}
                    strokeWidth={0.6}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    fill={INK}
                    fontSize={9.5}
                  >
                    <tspan x={pos.x} dy={-2} fontWeight={700}>
                      {cv.label}
                    </tspan>
                    <tspan x={pos.x} dy={10} fill={INK_MUTED}>
                      {`R=${fmt(cv.radius)} L=${fmt(cv.arcLength)}`}
                    </tspan>
                  </text>
                </g>
              );
            }
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
          {_.map(report.angles, (ang, i) => {
            const v = project(boundary[i]);
            const dir = normalize({ x: cScreen.x - v.x, y: cScreen.y - v.y });
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
          {_.map(boundary, (p, i) => {
            const s = project(p);
            const dir = normalize({ x: s.x - cScreen.x, y: s.y - cScreen.y });
            const lp = { x: s.x + dir.x * 15, y: s.y + dir.y * 15 };
            const pob = i === 0;
            return (
              <g key={`m${i}`}>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={pob ? 4 : 3}
                  fill={SHEET}
                  stroke={INK}
                  strokeWidth={pob ? 1.8 : 1.3}
                />
                <circle cx={s.x} cy={s.y} r={1} fill={INK} />
                <text
                  x={lp.x}
                  y={lp.y + 3}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={700}
                  fill={INK}
                >
                  P{i + 1}
                </text>
                {pob && (
                  <text
                    x={lp.x}
                    y={lp.y + 13}
                    textAnchor="middle"
                    fontSize={7.5}
                    fill={INK_MUTED}
                  >
                    P.O.B.
                  </text>
                )}
              </g>
            );
          })}

          {/* Area callout at the centroid. */}
          <g textAnchor="middle" fill={INK}>
            <text
              x={cScreen.x}
              y={cScreen.y - 8}
              fontSize={9}
              letterSpacing={1}
              fill={INK_MUTED}
            >
              AREA
            </text>
            <text
              x={cScreen.x}
              y={cScreen.y + 6}
              fontSize={13}
              fontWeight={700}
            >
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
          </g>
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

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={INK} stroke={INK}>
      <path d="M0 34 L0 6" strokeWidth={1.2} />
      <path d="M0 0 L6 14 L0 9 L-6 14 Z" strokeWidth={0.6} />
      <text
        x={0}
        y={48}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        stroke="none"
      >
        N
      </text>
    </g>
  );
}

function GraphicScale({
  x,
  y,
  barPx,
  label,
}: {
  x: number;
  y: number;
  barPx: number;
  label: string;
}) {
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
      <rect
        x={x}
        y={top}
        width={width}
        height={boxH}
        fill="none"
        stroke={INK}
        strokeWidth={1.2}
      />
      <line
        x1={c1}
        y1={top}
        x2={c1}
        y2={top + boxH}
        stroke={INK}
        strokeWidth={0.8}
      />
      <line
        x1={c2}
        y1={top}
        x2={c2}
        y2={top + boxH}
        stroke={INK}
        strokeWidth={0.8}
      />

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
      <TitleRow
        x={c1 + 12}
        y={top + 18}
        k="Area"
        v={`${fmt(report.area.squareUnits, 0)} ${u}²`}
      />
      <TitleRow x={c1 + 12} y={top + 34} k="" v={areaSecondary} />
      <TitleRow
        x={c1 + 12}
        y={top + 52}
        k="Perimeter"
        v={`${fmt(report.perimeter)} ${u}`}
      />

      {/* Right cell: closure + notes */}
      <TitleRow
        x={c2 + 12}
        y={top + 18}
        k="Closure"
        v={report.record.precisionText}
      />
      <TitleRow
        x={c2 + 12}
        y={top + 34}
        k="Corners"
        v={String(element.boundary.length)}
      />
      <text x={c2 + 12} y={top + 54} fontSize={8} fill={INK_MUTED}>
        BEARINGS &amp; DISTANCES SHOWN
      </text>
    </g>
  );
}

function TitleRow({
  x,
  y,
  k,
  v,
}: {
  x: number;
  y: number;
  k: string;
  v: string;
}) {
  return (
    <text x={x} y={y} fontSize={9} fill={INK}>
      {k && <tspan fill={INK_MUTED}>{k}: </tspan>}
      <tspan fontWeight={600}>{v}</tspan>
    </text>
  );
}
