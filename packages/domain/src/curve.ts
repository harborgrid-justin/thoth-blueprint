/**
 * Circular-arc geometry for boundaries — the curve half of real survey and
 * civil geometry. An edge of a ring may be a straight line or a circular arc.
 *
 * Arcs are encoded per edge as a **bulge** (the DXF/LandXML convention):
 *
 *   bulge = tan(Δ / 4)
 *
 * where Δ is the arc's included (central) angle and the sign selects the side
 * the arc bulges relative to the chord. A bulge of 0 is a straight line. This
 * single number, with the edge's two endpoints, determines the arc exactly, so
 * boundaries stay a plain vertex ring plus an optional bulge per edge.
 *
 * All math here is analytic and exact; tessellation (`densifyArc`) is only for
 * display. Coordinates are plan-space; real-world meaning comes from the
 * accompanying {@link SpatialContext}.
 */

import { GEOMETRY_EPSILON, type Point, type Polygon } from "./geometry";

/** A fully-resolved circular arc between two boundary vertices. */
export interface Arc {
  center: Point;
  /** Radius (always positive), plan units. */
  radius: number;
  /** Included (central) angle magnitude, radians (0 < Δ < 2π). */
  delta: number;
  /** Signed swept angle start→end, radians; sign encodes CCW(+)/CW(−). */
  sweep: number;
  /** Chord length (straight distance between endpoints), plan units. */
  chordLength: number;
  /** Arc length = R·Δ, plan units. */
  arcLength: number;
  /** Tangent distance (PC/PT to PI) = R·tan(Δ/2); Infinity at Δ = π. */
  tangent: number;
  /** Mid-ordinate (chord-to-arc offset at midpoint) = R(1 − cos(Δ/2)). */
  midOrdinate: number;
  /** The point at the middle of the arc. */
  mid: Point;
  /** Whether the swept direction is counter-clockwise (sweep > 0). */
  ccw: boolean;
}

/** Per-edge bulges keyed by edge index (edge i runs vertex i → vertex i+1). */
export type EdgeArcs = Record<string, number>;

/** The bulge of edge `i`, or 0 (straight) when absent or non-finite. */
export function edgeBulge(arcs: EdgeArcs | undefined, i: number): number {
  if (!arcs) return 0;
  const b = arcs[String(i)];
  return typeof b === "number" && Number.isFinite(b) ? b : 0;
}

/** Unit-normal to the chord direction (rotated +90°). */
function chordNormal(a: Point, b: Point, len: number): Point {
  return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
}

/**
 * Resolve the arc for edge `a`→`b` with the given `bulge`. Returns `null` for a
 * zero/degenerate bulge or a zero-length chord (treat those edges as straight).
 */
export function bulgeToArc(a: Point, b: Point, bulge: number): Arc | null {
  if (!Number.isFinite(bulge) || Math.abs(bulge) < GEOMETRY_EPSILON) return null;
  const chordLength = Math.hypot(b.x - a.x, b.y - a.y);
  if (chordLength < GEOMETRY_EPSILON) return null;

  const t = Math.abs(bulge);
  const delta = 4 * Math.atan(t); // included angle magnitude
  const radius = (chordLength * (1 + t * t)) / (4 * t);
  const halfChord = chordLength / 2;

  const n = chordNormal(a, b, chordLength);
  const bulgeDir = { x: n.x * Math.sign(bulge), y: n.y * Math.sign(bulge) };
  const midOrdinate = radius * (1 - Math.cos(delta / 2));
  const chordMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const mid = {
    x: chordMid.x + bulgeDir.x * midOrdinate,
    y: chordMid.y + bulgeDir.y * midOrdinate,
  };

  // Center lies on the perpendicular bisector; the apothem flips side between a
  // minor arc (|b|<1) and a major arc (|b|>1).
  const apothem = Math.sqrt(Math.max(0, radius * radius - halfChord * halfChord));
  const centerDir = -Math.sign(bulge) * Math.sign(1 - t * t);
  const center = {
    x: chordMid.x + n.x * centerDir * apothem,
    y: chordMid.y + n.y * centerDir * apothem,
  };

  // Sweep direction is fixed by the mid-arc point (which lies on the arc).
  const angA = Math.atan2(a.y - center.y, a.x - center.x);
  const angM = Math.atan2(mid.y - center.y, mid.x - center.x);
  const stepToMid = normalizeSigned(angM - angA);
  const sweep = Math.sign(stepToMid) * delta;

  return {
    center,
    radius,
    delta,
    sweep,
    chordLength,
    arcLength: radius * delta,
    tangent: Math.abs(delta - Math.PI) < GEOMETRY_EPSILON ? Infinity : radius * Math.tan(delta / 2),
    midOrdinate,
    mid,
    ccw: sweep > 0,
  };
}

/** Normalize an angle to (−π, π]. */
function normalizeSigned(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a <= -Math.PI) a += 2 * Math.PI;
  if (a > Math.PI) a -= 2 * Math.PI;
  return a;
}

/**
 * Signed area contribution of edge `a`→`b` when it is the arc `arc`, via
 * Green's theorem: ½·[Cx(by − ay) − Cy(bx − ax) + R²·sweep]. Summed with the
 * shoelace terms of straight edges, this gives the exact signed area of a
 * ring that mixes lines and arcs.
 */
export function arcAreaTerm(a: Point, b: Point, arc: Arc): number {
  return (
    0.5 *
    (arc.center.x * (b.y - a.y) - arc.center.y * (b.x - a.x) + arc.radius * arc.radius * arc.sweep)
  );
}

/**
 * Tessellate the arc `a`→`b` (bulge) into points, at roughly `degPerStep`
 * spacing. Returns the intermediate points **excluding both endpoints**, ready
 * to splice between the ring vertices.
 */
export function densifyArc(a: Point, b: Point, bulge: number, degPerStep = 2): Point[] {
  const arc = bulgeToArc(a, b, bulge);
  if (!arc) return [];
  const steps = Math.max(2, Math.ceil((arc.delta * (180 / Math.PI)) / degPerStep));
  const angA = Math.atan2(a.y - arc.center.y, a.x - arc.center.x);
  const points: Point[] = [];
  for (let i = 1; i < steps; i++) {
    const ang = angA + (arc.sweep * i) / steps;
    points.push({
      x: arc.center.x + arc.radius * Math.cos(ang),
      y: arc.center.y + arc.radius * Math.sin(ang),
    });
  }
  return points;
}

/** An edge of a boundary ring: a straight line, or a resolved circular arc. */
export interface BoundaryEdge {
  index: number;
  from: Point;
  to: Point;
  bulge: number;
  /** Resolved arc when the edge is curved; `null` when straight. */
  arc: Arc | null;
}

/** The ordered edges of a ring, each tagged straight or arc. */
export function boundaryEdges(boundary: Polygon, arcs?: EdgeArcs): BoundaryEdge[] {
  const n = boundary.length;
  const edges: BoundaryEdge[] = [];
  for (let i = 0; i < n; i++) {
    const from = boundary[i];
    const to = boundary[(i + 1) % n];
    const bulge = edgeBulge(arcs, i);
    edges.push({ index: i, from, to, bulge, arc: bulge ? bulgeToArc(from, to, bulge) : null });
  }
  return edges;
}

/** `true` if any edge of the ring is a circular arc. */
export function hasArcs(boundary: Polygon, arcs?: EdgeArcs): boolean {
  if (!arcs) return false;
  return boundaryEdges(boundary, arcs).some((e) => e.arc !== null);
}

/**
 * The ring densified into a plain polygon, with every arc tessellated. Used for
 * rendering, hit-testing, and any consumer that needs straight segments. When
 * the ring has no arcs, returns a copy of the original vertices.
 */
export function densifyBoundary(boundary: Polygon, arcs?: EdgeArcs, degPerStep = 2): Polygon {
  if (!arcs) return boundary.slice();
  const out: Point[] = [];
  for (const edge of boundaryEdges(boundary, arcs)) {
    out.push(edge.from);
    if (edge.arc) out.push(...densifyArc(edge.from, edge.to, edge.bulge, degPerStep));
  }
  return out;
}

/** Exact area of a ring that may mix straight and arc edges, plan units². */
export function boundaryArea(boundary: Polygon, arcs?: EdgeArcs): number {
  const n = boundary.length;
  if (n < 3) return 0;
  let signed = 0;
  for (const edge of boundaryEdges(boundary, arcs)) {
    const { from: a, to: b, arc } = edge;
    signed += arc ? arcAreaTerm(a, b, arc) : (a.x * b.y - b.x * a.y) / 2;
  }
  return Math.abs(signed);
}

/** Exact perimeter of a ring that may mix straight and arc edges, plan units. */
export function boundaryPerimeter(boundary: Polygon, arcs?: EdgeArcs): number {
  let total = 0;
  for (const edge of boundaryEdges(boundary, arcs)) {
    total += edge.arc
      ? edge.arc.arcLength
      : Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y);
  }
  return total;
}
