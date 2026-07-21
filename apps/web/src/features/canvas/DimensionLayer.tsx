import {
  dimensionStyle,
  measureDimension,
  type DimArrow,
  type Dimension,
  type Point,
  type Site,
} from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";

const INK = "hsl(var(--foreground))";
const HALO = "hsl(var(--canvas))";

/**
 * A dimension terminator (arrowhead / tick / dot) drawn at the origin, oriented
 * along +X; callers translate and rotate to the projected placement. Follows the
 * dimension style's `arrow` convention.
 */
function Terminator({ arrow }: { arrow: DimArrow }) {
  switch (arrow) {
    case "tick":
      // Architectural 45° slash centred on the point.
      return <line x1={-4} y1={4} x2={4} y2={-4} stroke={INK} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />;
    case "dot":
      return <circle cx={0} cy={0} r={2.2} fill={INK} />;
    case "open":
      // Open (unfilled) arrowhead pointing along −X toward the point.
      return <path d="M8 -3 L0 0 L8 3" fill="none" stroke={INK} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />;
    case "arrow":
    default:
      // Filled arrowhead whose tip sits at the point, tail along +X.
      return <path d="M0 0 L9 -3 L9 3 Z" fill={INK} stroke="none" />;
  }
}

/**
 * Renders the site's dimension entities: witness/extension lines, the dimension
 * line, terminators, and the measured label. All geometry is measured in model
 * space by {@link measureDimension} and projected here.
 */
export function DimensionLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const dimensions = site.dimensions;
  if (!dimensions || dimensions.length === 0) {return null;}

  const project = (p: Point) => worldToScreen(p, viewport);
  const showLabels = viewport.zoom > 1.2;

  return (
    <g className="pointer-events-none">
      {dimensions.map((dim: Dimension) => {
        const style = dimensionStyle(dim.styleId);
        const m = measureDimension(dim, site.spatial);
        const g = m.geometry;

        const lines = g.lines.map(([a, b], i) => {
          const sa = project(a);
          const sb = project(b);
          return (
            <line
              key={i}
              x1={sa.x}
              y1={sa.y}
              x2={sb.x}
              y2={sb.y}
              stroke={INK}
              strokeWidth={0.9}
              vectorEffect="non-scaling-stroke"
            />
          );
        });

        const ticks = g.ticks.map((t, i) => {
          const s = project(t.at);
          // `dir` is a model-space unit vector; plan-y is screen-down, so screen
          // and model directions share sign — use the components directly.
          const angle = (Math.atan2(t.dir.y, t.dir.x) * 180) / Math.PI;
          return (
            <g key={`t${i}`} transform={`translate(${s.x} ${s.y}) rotate(${angle})`}>
              <Terminator arrow={style.arrow} />
            </g>
          );
        });

        const textEl = showLabels
          ? (() => {
              const s = project(g.textAt);
              return (
                <text
                  x={s.x}
                  y={s.y}
                  transform={`rotate(${g.textAngleDeg} ${s.x} ${s.y})`}
                  fontSize={10}
                  textAnchor="middle"
                  fill={INK}
                  style={{ paintOrder: "stroke", stroke: HALO, strokeWidth: 2.5 }}
                >
                  {m.label}
                </text>
              );
            })()
          : null;

        return (
          <g key={dim.id}>
            {lines}
            {ticks}
            {textEl}
          </g>
        );
      })}
    </g>
  );
}
