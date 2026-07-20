import { gridBubbleGeometry, type Point, type Site } from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";

const GRID = "#64748b";
const INK = "#0f172a";
const HALO = "hsl(var(--canvas))";

/**
 * Renders structural/column grids: each gridline drawn with a centre line-type,
 * and a bubbled label (digit or letter) at its tagged ends — the datum a
 * structural or architectural plan references columns from.
 */
export function GridBubbleLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const gridLines = site.annotations?.gridLines;
  if (!gridLines || gridLines.length === 0) return null;

  const project = (p: Point) => worldToScreen(p, viewport);
  // Bubble stand-off in model units, so bubbles sit just clear of the line ends.
  const gap = 16;

  return (
    <g className="pointer-events-none">
      {gridLines.map((line) => {
        const a = project(line.from);
        const b = project(line.to);
        const bubbles = gridBubbleGeometry(line, gap);
        return (
          <g key={line.id}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={GRID}
              strokeWidth={0.9}
              strokeDasharray="10 2 2 2"
              vectorEffect="non-scaling-stroke"
            />
            {bubbles.map((bub, i) => {
              const c = project(bub.center);
              return (
                <g key={i}>
                  <circle cx={c.x} cy={c.y} r={11} fill={HALO} stroke={INK} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
                  <text x={c.x} y={c.y + 3.5} fontSize={11} fontWeight={700} textAnchor="middle" fill={INK}>
                    {bub.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
