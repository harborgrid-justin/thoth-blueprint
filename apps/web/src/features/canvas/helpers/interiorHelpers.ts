import { type Point } from "@thoth/domain";

export function toPath(pts: Point[], project: (p: Point) => Point): string {
  return (
    pts
      .map((p, i) => {
        const s = project(p);
        return `${i === 0 ? "M" : "L"}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}
