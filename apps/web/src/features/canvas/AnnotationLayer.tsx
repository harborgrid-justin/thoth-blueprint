import {
  distance,
  revisionCloudBumps,
  sectionGaze,
  type Point,
  type Site,
} from "@thoth/domain";
import { worldToScreen, type Viewport } from "./helpers/viewport";

const INK = "hsl(var(--foreground))";
const RED = "#b91c1c";
const HALO = "hsl(var(--canvas))";

/** A tag bubble with a centred label, drawn at a screen point. */
export function SectionBubble({ x, y, r = 11, label, sub }: { x: number; y: number; r?: number; label: string; sub?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={HALO} stroke={INK} strokeWidth={1.1} vectorEffect="non-scaling-stroke" />
      {sub != null ? (
        <>
          <line x1={x - r} y1={y} x2={x + r} y2={y} stroke={INK} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
          <text x={x} y={y - 2} fontSize={9} fontWeight={700} textAnchor="middle" fill={INK}>{label}</text>
          <text x={x} y={y + 8} fontSize={7} textAnchor="middle" fill={INK}>{sub}</text>
        </>
      ) : (
        <text x={x} y={y + 3.5} fontSize={10} fontWeight={700} textAnchor="middle" fill={INK}>{label}</text>
      )}
    </g>
  );
}

/**
 * Renders drafting reference marks: section cuts, elevation marks, detail
 * callouts, match lines, revision clouds, and keynote tags — the symbology that
 * cross-references one sheet's view to another.
 */
export function AnnotationLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const ann = site.annotations;
  if (!ann) {return null;}
  const project = (p: Point) => worldToScreen(p, viewport);
  const keynoteNumber = (id: string) => ann.keynotes?.find((k) => k.id === id)?.number ?? "?";

  return (
    <g className="pointer-events-none">
      {/* Section cut lines + end bubbles + gaze arrows. */}
      {(ann.sectionMarks ?? []).map((sm) => {
        const a = project(sm.atLine[0]);
        const b = project(sm.atLine[1]);
        const gaze = sectionGaze(sm);
        return (
          <g key={sm.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={1.6} strokeDasharray="12 3 3 3" vectorEffect="non-scaling-stroke" />
            {[a, b].map((end, i) => (
              <g key={i}>
                <SectionBubble x={end.x} y={end.y} label={sm.tag} sub={sm.targetSheet} />
                <line x1={end.x} y1={end.y} x2={end.x + gaze.x * 16} y2={end.y + gaze.y * 16} stroke={INK} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                <path d="M0 0 L-7 -3 L-7 3 Z" fill={INK} transform={`translate(${end.x + gaze.x * 16} ${end.y + gaze.y * 16}) rotate(${(Math.atan2(gaze.y, gaze.x) * 180) / Math.PI})`} />
              </g>
            ))}
          </g>
        );
      })}

      {/* Elevation marks: a bubble with a triangular pointer. */}
      {(ann.elevationMarks ?? []).map((em) => {
        const p = project(em.position);
        const ang = (Math.atan2(em.gaze.y, em.gaze.x) * 180) / Math.PI;
        return (
          <g key={em.id}>
            <path d="M0 0 L10 -6 L10 6 Z" fill={HALO} stroke={INK} strokeWidth={1} transform={`translate(${p.x} ${p.y}) rotate(${ang})`} />
            <SectionBubble x={p.x - em.gaze.x * 13} y={p.y - em.gaze.y * 13} label={em.tag} sub={em.targetSheet} />
          </g>
        );
      })}

      {/* Detail callouts: a dashed circle + a leader to a tag. */}
      {(ann.detailMarks ?? []).map((dm) => {
        const c = project(dm.center);
        const edge = project({ x: dm.center.x + dm.radius, y: dm.center.y });
        const rr = distance(edge, c);
        const tag = { x: c.x + rr + 16, y: c.y - rr };
        return (
          <g key={dm.id}>
            <circle cx={c.x} cy={c.y} r={rr} fill="none" stroke={INK} strokeWidth={1.1} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
            <line x1={c.x + rr * 0.7} y1={c.y - rr * 0.7} x2={tag.x} y2={tag.y} stroke={INK} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
            <SectionBubble x={tag.x} y={tag.y} label={dm.tag} sub={dm.targetSheet} />
          </g>
        );
      })}

      {/* Match lines. */}
      {(ann.matchLines ?? []).map((ml) => {
        const a = project(ml.atLine[0]);
        const b = project(ml.atLine[1]);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={ml.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={RED} strokeWidth={1.8} strokeDasharray="16 3 3 3" vectorEffect="non-scaling-stroke" />
            <text x={mx} y={my - 5} fontSize={9} fontWeight={700} textAnchor="middle" fill={RED} style={{ paintOrder: "stroke", stroke: HALO, strokeWidth: 2.5 }}>
              MATCH LINE — SEE {ml.adjoiningSheet}
            </text>
          </g>
        );
      })}

      {/* Revision clouds + delta tags. */}
      {(ann.revisionClouds ?? []).map((rc) => {
        const apexes = revisionCloudBumps(rc, 10).map(project);
        const pts = apexes.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        const first = project(rc.boundary[0]);
        return (
          <g key={rc.id}>
            <polyline points={`${pts} ${apexes.length ? `${apexes[0].x},${apexes[0].y}` : ""}`} fill="none" stroke={RED} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
            <path d={`M0 -8 L8 5 L-8 5 Z`} fill={RED} transform={`translate(${first.x} ${first.y})`} />
            <text x={first.x} y={first.y + 4} fontSize={8} fontWeight={700} textAnchor="middle" fill="#ffffff">{rc.delta}</text>
          </g>
        );
      })}

      {/* Keynote tags (hexagon bubble + number + optional leader). */}
      {(ann.keynoteTags ?? []).map((kt) => {
        const p = project(kt.position);
        const lead = kt.leaderTo ? project(kt.leaderTo) : null;
        return (
          <g key={kt.id}>
            {lead && <line x1={p.x} y1={p.y} x2={lead.x} y2={lead.y} stroke={INK} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />}
            <path d="M0 -10 L9 -5 L9 5 L0 10 L-9 5 L-9 -5 Z" fill={HALO} stroke={INK} strokeWidth={1.1} transform={`translate(${p.x} ${p.y})`} vectorEffect="non-scaling-stroke" />
            <text x={p.x} y={p.y + 3.5} fontSize={9} fontWeight={700} textAnchor="middle" fill={INK}>{keynoteNumber(kt.keynoteId)}</text>
          </g>
        );
      })}
    </g>
  );
}
