import { formatPLSSShort, sectionFrame, type Site } from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";

const PLSS_INK = "#475569";

/**
 * Renders the Public Land Survey System framework the plat is tied to: the
 * controlling section boundary, its quarter-section lines (the section center
 * cross), corner ticks, and the Township/Range label.
 */
export function PlssLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const plss = site.plss;
  if (!plss?.sectionNwCorner || !plss.sectionSide) return null;

  const f = sectionFrame(plss.sectionNwCorner, plss.sectionSide);
  const p = (pt: { x: number; y: number }) => worldToScreen(pt, viewport);
  const nw = p(f.nw);
  const ne = p(f.ne);
  const sw = p(f.sw);
  const se = p(f.se);

  return (
    <g className="pointer-events-none">
      {/* Section boundary. */}
      <polygon
        points={[nw, ne, se, sw].map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke={PLSS_INK}
        strokeWidth={1.6}
        strokeDasharray="18 4 4 4"
        vectorEffect="non-scaling-stroke"
      />
      {/* Quarter-section lines (center cross). */}
      <line x1={p(f.north).x} y1={p(f.north).y} x2={p(f.south).x} y2={p(f.south).y} stroke={PLSS_INK} strokeWidth={0.8} strokeDasharray="10 6" />
      <line x1={p(f.west).x} y1={p(f.west).y} x2={p(f.east).x} y2={p(f.east).y} stroke={PLSS_INK} strokeWidth={0.8} strokeDasharray="10 6" />

      {/* Section-corner ticks. */}
      {[f.nw, f.ne, f.sw, f.se].map((c, i) => {
        const s = p(c);
        return <rect key={i} x={s.x - 3} y={s.y - 3} width={6} height={6} fill={PLSS_INK} />;
      })}

      {viewport.zoom > 0.4 && (
        <text
          x={p(f.center).x}
          y={p(f.center).y - 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={PLSS_INK}
          style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 3 }}
        >
          {formatPLSSShort(plss.townshipRange, plss.section)}
        </text>
      )}
    </g>
  );
}
