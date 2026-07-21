import { type ControlLine, type Point, type Site } from "@thoth/domain";
import { worldToScreen, type Viewport } from "./helpers/viewport";
import {
  arrowhead,
  polyPoints,
  sampleAlong,
  triangle,
} from "./helpers/civilHelpers";

/** Renders the site's civil/erosion-control lines with drafting symbology. */
export function CivilLayer({
  site,
  viewport,
}: {
  site: Site;
  viewport: Viewport;
}) {
  const lines = site.controlLines;
  if (!lines || lines.length === 0) {
    return null;
  }
  const project = (p: Point) => worldToScreen(p, viewport);
  return (
    <g className="pointer-events-none">
      {lines.map((line) => (
        <ControlLineShape key={line.id} line={line} project={project} />
      ))}
    </g>
  );
}

/** One control line drawn with its drafting symbol, in the given projection. */
export function ControlLineShape({
  line,
  project,
}: {
  line: ControlLine;
  project: (p: Point) => Point;
}) {
  const screen = line.path.map(project);
  if (screen.length < 2) {
    return null;
  }

  switch (line.type) {
    case "silt-fence": {
      const posts = sampleAlong(screen, 15);
      return (
        <g>
          <polyline
            points={polyPoints(screen)}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth={1.4}
          />
          {posts.map((s, i) => (
            <g key={i}>
              <line
                x1={s.point.x - s.nrm.x * 3}
                y1={s.point.y - s.nrm.y * 3}
                x2={s.point.x + s.nrm.x * 3}
                y2={s.point.y + s.nrm.y * 3}
                stroke="hsl(var(--foreground))"
                strokeWidth={1}
              />
              {/* Fabric triangle, alternating side. */}
              <path
                d={triangle(s, i % 2 === 0 ? 1 : -1)}
                fill="hsl(var(--foreground))"
                opacity={0.8}
              />
            </g>
          ))}
        </g>
      );
    }
    case "construction-fence": {
      const marks = sampleAlong(screen, 16);
      return (
        <g>
          <polyline
            points={polyPoints(screen)}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.2}
          />
          {marks.map((s, i) => (
            <text
              key={i}
              x={s.point.x}
              y={s.point.y + 3}
              textAnchor="middle"
              fontSize={9}
              fill="hsl(var(--muted-foreground))"
            >
              ✕
            </text>
          ))}
        </g>
      );
    }
    case "tree-line": {
      const bumps = sampleAlong(screen, 11);
      // Scalloped canopy edge (a run of arcs bulging to one side).
      let d = `M ${bumps[0]?.point.x.toFixed(1)} ${bumps[0]?.point.y.toFixed(1)}`;
      for (let i = 1; i < bumps.length; i++) {
        const p = bumps[i].point;
        d += ` A 6 6 0 0 1 ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      }
      return (
        <g>
          <path d={d} fill="none" stroke="#15803d" strokeWidth={1.3} />
        </g>
      );
    }
    case "slope-intercept": {
      const hach = sampleAlong(screen, 12);
      return (
        <g>
          <polyline
            points={polyPoints(screen)}
            fill="none"
            stroke="#92400e"
            strokeWidth={1.2}
            strokeDasharray="6 3"
          />
          {hach.map((s, i) => (
            <line
              key={i}
              x1={s.point.x}
              y1={s.point.y}
              x2={s.point.x + s.nrm.x * 5}
              y2={s.point.y + s.nrm.y * 5}
              stroke="#92400e"
              strokeWidth={0.9}
            />
          ))}
        </g>
      );
    }
    case "flow": {
      const arrows = sampleAlong(screen, 26);
      return (
        <g>
          <polyline
            points={polyPoints(screen)}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={1.1}
            strokeDasharray="7 4"
          />
          {arrows.slice(1).map((s, i) => (
            <path key={i} d={arrowhead(s)} fill="#0ea5e9" />
          ))}
        </g>
      );
    }
    default:
      return (
        <polyline
          points={polyPoints(screen)}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1.2}
        />
      );
  }
}
