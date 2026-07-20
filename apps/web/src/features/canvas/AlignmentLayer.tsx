import {
  formatStation,
  fullStations,
  offsetAlignmentPath,
  pointAtStation,
  resolveAlignment,
  type AlignmentOffset,
  type Point,
  type ResolvedAlignment,
  type Site,
} from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";

const CENTERLINE = "#b91c1c"; // survey-red centerline

/** Travel direction (unit vector) for an azimuth in the north=−Y frame. */
function dirFor(azimuthDeg: number): Point {
  const a = (azimuthDeg * Math.PI) / 180;
  return { x: Math.sin(a), y: -Math.cos(a) };
}

/** Sample a resolved alignment into a single centerline polyline. */
function centerlinePoints(r: ResolvedAlignment): Point[] {
  const pts: Point[] = [];
  for (const el of r.elements) {
    if (el.kind === "tangent") {
      if (pts.length === 0) pts.push(el.from);
      pts.push(el.to);
    } else {
      const c = el.curve;
      const steps = Math.max(2, Math.ceil(c.deltaDeg / 2));
      for (let i = 0; i <= steps; i++) {
        const ang = c.startAngle + (c.sweep * i) / steps;
        pts.push({ x: c.center.x + c.radius * Math.cos(ang), y: c.center.y + c.radius * Math.sin(ang) });
      }
    }
  }
  return pts;
}

/**
 * Renders the site's stationed horizontal alignments: a chain-dash centerline,
 * full-station ticks and labels, and PC/PT/POB/POE control points — the survey
 * baseline of a civil plan sheet.
 */
export function AlignmentLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const alignments = site.alignments;
  if (!alignments || alignments.length === 0) return null;

  return (
    <g className="pointer-events-none">
      {alignments.map((a) => {
        const r = resolveAlignment(a);
        if (!r) return null;

        const line = centerlinePoints(r).map((p) => worldToScreen(p, viewport));
        const poly = line.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ");

        // Choose a station interval that stays legible at the current zoom.
        const interval = viewport.zoom > 2 ? 50 : viewport.zoom > 0.6 ? 100 : 500;
        const stations = fullStations(r, interval);
        const tickHalf = 6;

        return (
          <g key={a.id}>
            {/* Parallel offset lines (edge of pavement, right-of-way, …). */}
            {(a.offsets ?? []).map((off, oi) => {
              const path = offsetAlignmentPath(r, off.distance).map((p) => worldToScreen(p, viewport));
              const style = offsetStyle(off);
              return (
                <polyline
                  key={oi}
                  points={path.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={style.stroke}
                  strokeWidth={style.width}
                  strokeDasharray={style.dash}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            <polyline
              points={poly}
              fill="none"
              stroke={CENTERLINE}
              strokeWidth={1.6}
              strokeDasharray="14 3 3 3"
              vectorEffect="non-scaling-stroke"
            />

            {/* Full-station ticks + labels. */}
            {stations.map((st, i) => {
              const at = pointAtStation(r, st);
              if (!at) return null;
              const s = worldToScreen(at.point, viewport);
              const d = dirFor(at.bearing);
              const perp = { x: -d.y, y: d.x };
              const showLabel = viewport.zoom > 1.2 || i % 2 === 0;
              return (
                <g key={st}>
                  <line
                    x1={s.x - perp.x * tickHalf}
                    y1={s.y - perp.y * tickHalf}
                    x2={s.x + perp.x * tickHalf}
                    y2={s.y + perp.y * tickHalf}
                    stroke={CENTERLINE}
                    strokeWidth={1}
                  />
                  {showLabel && (
                    <text
                      x={s.x + perp.x * (tickHalf + 3)}
                      y={s.y + perp.y * (tickHalf + 3)}
                      fontSize={8}
                      fill={CENTERLINE}
                      textAnchor="middle"
                      style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 2.5 }}
                    >
                      {formatStation(st)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Curve control points: PC / PT. */}
            {r.curves.map((c, i) => (
              <g key={`c${i}`}>
                {(["pc", "pt"] as const).map((key) => {
                  const p = worldToScreen(c[key], viewport);
                  const st = key === "pc" ? c.pcStation : c.ptStation;
                  return (
                    <g key={key}>
                      <circle cx={p.x} cy={p.y} r={2.6} fill="hsl(var(--canvas))" stroke={CENTERLINE} strokeWidth={1.3} />
                      {viewport.zoom > 0.8 && (
                        <text
                          x={p.x + 5}
                          y={p.y - 4}
                          fontSize={8.5}
                          fontWeight={700}
                          fill={CENTERLINE}
                          style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 2.5 }}
                        >
                          {key.toUpperCase()} {formatStation(st)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}

            {/* POB / POE and the baseline name. */}
            <ControlDot p={worldToScreen(r.pob, viewport)} label={`POB ${formatStation(r.startStation)}`} zoom={viewport.zoom} />
            <ControlDot p={worldToScreen(r.poe, viewport)} label={`POE ${formatStation(r.endStation)}`} zoom={viewport.zoom} />
            {viewport.zoom > 0.8 && line.length > 1 && (
              <text
                x={line[Math.floor(line.length / 2)].x}
                y={line[Math.floor(line.length / 2)].y - 12}
                fontSize={10}
                fontWeight={700}
                fill={CENTERLINE}
                textAnchor="middle"
                style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 3 }}
              >
                {a.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Drafting style for an alignment offset line by kind. */
function offsetStyle(off: AlignmentOffset): { stroke: string; width: number; dash?: string } {
  switch (off.kind) {
    case "pavement":
      return { stroke: "#334155", width: 1.2 };
    case "shoulder":
      return { stroke: "#64748b", width: 1, dash: "6 3" };
    case "row":
      return { stroke: "#7c3aed", width: 1.1, dash: "12 3 3 3" };
    case "ditch":
      return { stroke: "#92400e", width: 1, dash: "4 3" };
  }
}

function ControlDot({ p, label, zoom }: { p: Point; label: string; zoom: number }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={3.4} fill={CENTERLINE} stroke="hsl(var(--canvas))" strokeWidth={1.2} />
      {zoom > 0.7 && (
        <text
          x={p.x + 6}
          y={p.y + 3}
          fontSize={9}
          fontWeight={700}
          fill={CENTERLINE}
          style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 2.5 }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
