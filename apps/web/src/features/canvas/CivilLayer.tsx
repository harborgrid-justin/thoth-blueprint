import type { ControlLine, Point, Site } from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";

interface Sample {
  point: Point;
  dir: Point;
  nrm: Point;
}

/** Evenly-spaced samples (point + direction + normal) along a screen polyline. */
function sampleAlong(pts: Point[], spacing: number): Sample[] {
  const res: Sample[] = [];
  if (pts.length < 2) return res;
  const segLen: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segLen.push(l);
    total += l;
  }
  let seg = 0;
  let segStart = 0;
  for (let d = 0; d <= total; d += spacing) {
    while (seg < segLen.length - 1 && d > segStart + segLen[seg]) {
      segStart += segLen[seg];
      seg += 1;
    }
    const l = segLen[seg] || 1;
    const a = pts[seg];
    const b = pts[seg + 1];
    const t = Math.min(1, Math.max(0, (d - segStart) / l));
    const dir = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
    res.push({
      point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
      dir,
      nrm: { x: -dir.y, y: dir.x },
    });
  }
  return res;
}

function polyPoints(pts: Point[]): string {
  return pts.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ");
}

/** Renders the site's civil/erosion-control lines with drafting symbology. */
export function CivilLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const lines = site.controlLines;
  if (!lines || lines.length === 0) return null;
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
  if (screen.length < 2) return null;

  switch (line.type) {
    case "silt-fence": {
      const posts = sampleAlong(screen, 15);
      return (
        <g>
          <polyline points={polyPoints(screen)} fill="none" stroke="#0f172a" strokeWidth={1.4} />
          {posts.map((s, i) => (
            <g key={i}>
              <line x1={s.point.x - s.nrm.x * 3} y1={s.point.y - s.nrm.y * 3} x2={s.point.x + s.nrm.x * 3} y2={s.point.y + s.nrm.y * 3} stroke="#0f172a" strokeWidth={1} />
              {/* Fabric triangle, alternating side. */}
              <path
                d={triangle(s, i % 2 === 0 ? 1 : -1)}
                fill="#0f172a"
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
          <polyline points={polyPoints(screen)} fill="none" stroke="#334155" strokeWidth={1.2} />
          {marks.map((s, i) => (
            <text key={i} x={s.point.x} y={s.point.y + 3} textAnchor="middle" fontSize={9} fill="#334155">
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
          <polyline points={polyPoints(screen)} fill="none" stroke="#92400e" strokeWidth={1.2} strokeDasharray="6 3" />
          {hach.map((s, i) => (
            <line key={i} x1={s.point.x} y1={s.point.y} x2={s.point.x + s.nrm.x * 5} y2={s.point.y + s.nrm.y * 5} stroke="#92400e" strokeWidth={0.9} />
          ))}
        </g>
      );
    }
    case "flow": {
      const arrows = sampleAlong(screen, 26);
      return (
        <g>
          <polyline points={polyPoints(screen)} fill="none" stroke="#0ea5e9" strokeWidth={1.1} strokeDasharray="7 4" />
          {arrows.slice(1).map((s, i) => (
            <path key={i} d={arrowhead(s)} fill="#0ea5e9" />
          ))}
        </g>
      );
    }
    default:
      return <polyline points={polyPoints(screen)} fill="none" stroke="#334155" strokeWidth={1.2} />;
  }
}

/** A small filled triangle (silt-fence fabric) on one side of a sample. */
function triangle(s: Sample, side: number): string {
  const base = 3.5;
  const h = 5;
  const bx = s.point.x + s.nrm.x * 0.5 * side;
  const by = s.point.y + s.nrm.y * 0.5 * side;
  const tip = { x: bx + s.nrm.x * h * side, y: by + s.nrm.y * h * side };
  const a = { x: bx - s.dir.x * base, y: by - s.dir.y * base };
  const b = { x: bx + s.dir.x * base, y: by + s.dir.y * base };
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)} L ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} Z`;
}

/** An arrowhead pointing along the sample's travel direction. */
function arrowhead(s: Sample): string {
  const size = 4;
  const tip = { x: s.point.x + s.dir.x * size, y: s.point.y + s.dir.y * size };
  const l = { x: s.point.x - s.dir.x * size + s.nrm.x * size * 0.7, y: s.point.y - s.dir.y * size + s.nrm.y * size * 0.7 };
  const r = { x: s.point.x - s.dir.x * size - s.nrm.x * size * 0.7, y: s.point.y - s.dir.y * size - s.nrm.y * size * 0.7 };
  return `M ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L ${l.x.toFixed(1)} ${l.y.toFixed(1)} L ${r.x.toFixed(1)} ${r.y.toFixed(1)} Z`;
}
