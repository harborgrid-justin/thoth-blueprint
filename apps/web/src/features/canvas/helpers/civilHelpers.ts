import { sampleAlong, type Point, type Sample } from "@thoth/domain";

export { sampleAlong, type Sample };

export function polyPoints(pts: Point[]): string {
  return pts.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ");
}

/** A small filled triangle (silt-fence fabric) on one side of a sample. */
export function triangle(s: Sample, side: number): string {
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
export function arrowhead(s: Sample): string {
  const size = 4;
  const tip = { x: s.point.x + s.dir.x * size, y: s.point.y + s.dir.y * size };
  const l = {
    x: s.point.x - s.dir.x * size + s.nrm.x * size * 0.7,
    y: s.point.y - s.dir.y * size + s.nrm.y * size * 0.7,
  };
  const r = {
    x: s.point.x - s.dir.x * size - s.nrm.x * size * 0.7,
    y: s.point.y - s.dir.y * size - s.nrm.y * size * 0.7,
  };
  return `M ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L ${l.x.toFixed(1)} ${l.y.toFixed(1)} L ${r.x.toFixed(1)} ${r.y.toFixed(1)} Z`;
}
