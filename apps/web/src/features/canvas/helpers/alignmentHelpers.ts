import {
  type AlignmentOffset,
  type Point,
  type ResolvedAlignment,
} from "@thoth/domain";

export const CENTERLINE_COLOR = "#b91c1c"; // survey-red centerline

/** Travel direction (unit vector) for an azimuth in the north=−Y frame. */
export function dirFor(azimuthDeg: number): Point {
  const a = (azimuthDeg * Math.PI) / 180;
  return { x: Math.sin(a), y: -Math.cos(a) };
}

/** Sample a resolved alignment into a single centerline polyline. */
export function centerlinePoints(r: ResolvedAlignment): Point[] {
  const pts: Point[] = [];
  for (const el of r.elements) {
    if (el.kind === "tangent") {
      if (pts.length === 0) {
        pts.push(el.from);
      }
      pts.push(el.to);
    } else if (el.kind === "curve") {
      const c = el.curve;
      const steps = Math.max(2, Math.ceil(c.deltaDeg / 2));
      for (let i = 0; i <= steps; i++) {
        const ang = c.startAngle + (c.sweep * i) / steps;
        pts.push({
          x: c.center.x + c.radius * Math.cos(ang),
          y: c.center.y + c.radius * Math.sin(ang),
        });
      }
    }

  }
  return pts;
}

/** Drafting style for an alignment offset line by kind. */
export function offsetStyle(off: AlignmentOffset): {
  stroke: string;
  width: number;
  dash?: string;
} {
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
