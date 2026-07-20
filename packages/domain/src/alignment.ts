/**
 * Horizontal roadway alignment and stationing — the survey/civil math behind a
 * DOT plan sheet (baselines like `R/L USH 8 EB` with stations `1760+43.32`,
 * curve points `PC`/`PT`, tangents, and curve data).
 *
 * An alignment is defined by the **PI method**: a chain of Points of
 * Intersection (PIs); each interior PI may carry a circular curve of a given
 * radius, fitted tangent to the two intersecting tangents. From that we resolve
 * the traveled centerline (tangent → curve → tangent …), continuous stationing,
 * and the curve data a plan sheet tabulates (T, L, Δ, E, M, degree of curve,
 * long chord). All math is analytic and exact.
 *
 * Conventions match the rest of the platform: north is −Y, east is +X; azimuth
 * is clockwise from north in [0, 360). Distances/stations are in plan units.
 */

import { type Point } from "./geometry";

/** Degrees a 100-unit arc subtends at radius R (arc definition of degree of curve). */
const DEGREE_OF_CURVE_CONST = (100 * 180) / Math.PI; // 5729.5779… for 100-ft stations

/** A Point of Intersection on an alignment; interior PIs may carry a curve. */
export interface AlignmentPI {
  point: Point;
  /** Circular curve radius at this PI, plan units; 0/undefined ⇒ no curve. */
  radius?: number;
}

/** A parallel offset line carried alongside an alignment (pavement edge, R/W…). */
export interface AlignmentOffset {
  /** Signed offset, plan units; + is right of travel, − is left. */
  distance: number;
  kind: "pavement" | "shoulder" | "row" | "ditch";
  label?: string;
}

/** A horizontal alignment definition (the PI chain + its start station). */
export interface HorizontalAlignment {
  id: string;
  name: string;
  pis: AlignmentPI[];
  /** Station at the Point of Beginning (start), plan units (e.g. feet). */
  startStation: number;
  /** Parallel offset lines to generate (edge of pavement, right-of-way, …). */
  offsets?: AlignmentOffset[];
  /** Default Design Speed in mph (e.g. 45) */
  designSpeed?: number;
  /** Station-specific design speeds (e.g., zones) */
  designSpeeds?: { station: number; speed: number }[];
}

/** Resolved circular curve at a PI, with the values a plan sheet lists. */
export interface AlignmentCurve {
  piIndex: number;
  pi: Point;
  /** Point of Curvature (tangent-to-curve) and Point of Tangency (curve-to-tangent). */
  pc: Point;
  pt: Point;
  center: Point;
  radius: number;
  /** Central (deflection) angle, radians and degrees. */
  delta: number;
  deltaDeg: number;
  /** Tangent distance T = R·tan(Δ/2). */
  tangent: number;
  /** Curve (arc) length L = R·Δ. */
  length: number;
  /** External distance E = R(sec(Δ/2) − 1). */
  external: number;
  /** Middle ordinate M = R(1 − cos(Δ/2)). */
  middleOrdinate: number;
  /** Long chord = 2R·sin(Δ/2). */
  chord: number;
  /** Degree of curve (arc definition), degrees per 100 units. */
  degreeOfCurve: number;
  /** Which way the curve turns along the direction of travel. */
  direction: "left" | "right";
  pcStation: number;
  /** Ahead station of the PI, measured along the back tangent (PC + T). */
  piStation: number;
  ptStation: number;
  /** Azimuth of the long chord, degrees clockwise from north. */
  chordBearing: number;
  /** Signed swept angle start→end (radians). */
  sweep: number;
  startAngle: number;
}

/** One element of the traveled centerline: a tangent run or a circular curve. */
export type AlignmentElement =
  | {
      kind: "tangent";
      from: Point;
      to: Point;
      beginStation: number;
      endStation: number;
      length: number;
      /** Azimuth of the tangent, degrees clockwise from north. */
      bearing: number;
    }
  | { kind: "curve"; curve: AlignmentCurve; beginStation: number; endStation: number };

/** A fully-resolved alignment: traveled elements, curve table, and extents. */
export interface ResolvedAlignment {
  name: string;
  elements: AlignmentElement[];
  curves: AlignmentCurve[];
  startStation: number;
  endStation: number;
  length: number;
  pob: Point;
  poe: Point;
}

// --- vector helpers --------------------------------------------------------

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}
function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}
function mul(a: Point, k: number): Point {
  return { x: a.x * k, y: a.y * k };
}
function len(a: Point): number {
  return Math.hypot(a.x, a.y);
}
function norm(a: Point): Point {
  const l = len(a);
  return l < 1e-12 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}
function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}
/** z of the 2D cross product. */
function crossz(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

/** Azimuth (deg clockwise from north, north = −Y) of direction `d`. */
function azimuthOf(d: Point): number {
  const deg = (Math.atan2(d.x, -d.y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

// --- resolve ---------------------------------------------------------------

/**
 * Resolve an alignment into its traveled centerline, curve table, and
 * continuous stationing. Interior PIs whose radius fits between their neighbors
 * become circular curves; otherwise the PI is a simple angle point.
 */
export function resolveAlignment(alignment: HorizontalAlignment): ResolvedAlignment | null {
  const pis = alignment.pis;
  if (pis.length < 2) return null;

  // Resolve a curve at each interior PI (when a radius is set and it fits).
  const curves: (AlignmentCurve | null)[] = pis.map(() => null);
  for (let i = 1; i < pis.length - 1; i++) {
    const R = pis[i].radius ?? 0;
    if (R <= 0) continue;
    const pi = pis[i].point;
    const back = norm(sub(pi, pis[i - 1].point)); // direction of travel into the PI
    const fwd = norm(sub(pis[i + 1].point, pi)); // direction of travel out of the PI
    const cosD = Math.max(-1, Math.min(1, dot(back, fwd)));
    const delta = Math.acos(cosD);
    if (delta < 1e-6 || Math.PI - delta < 1e-6) continue; // straight or reversal
    const tangent = R * Math.tan(delta / 2);
    // Tangent must fit within both adjacent tangent lengths.
    const backLen = len(sub(pi, pis[i - 1].point));
    const fwdLen = len(sub(pis[i + 1].point, pi));
    if (tangent > backLen - 1e-6 || tangent > fwdLen - 1e-6) continue;

    const pc = sub(pi, mul(back, tangent));
    const pt = add(pi, mul(fwd, tangent));
    // Center is offset from PC, perpendicular to the back tangent, toward the turn.
    let nrm = { x: -back.y, y: back.x };
    if (dot(nrm, fwd) < 0) nrm = { x: -nrm.x, y: -nrm.y };
    const center = add(pc, mul(nrm, R));
    // In the north=−Y frame, a clockwise turn (crossz > 0) curves to the right.
    const turn = crossz(back, fwd);
    const direction: "left" | "right" = turn > 0 ? "right" : "left";

    const startAngle = Math.atan2(pc.y - center.y, pc.x - center.x);
    const endAngle = Math.atan2(pt.y - center.y, pt.x - center.x);
    let sweep = endAngle - startAngle;
    // Normalize the sweep to match the curve direction and magnitude Δ.
    while (sweep <= -Math.PI) sweep += 2 * Math.PI;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    if (Math.abs(Math.abs(sweep) - delta) > 1e-4) {
      sweep = Math.sign(sweep || 1) * delta;
    }

    curves[i] = {
      piIndex: i,
      pi,
      pc,
      pt,
      center,
      radius: R,
      delta,
      deltaDeg: (delta * 180) / Math.PI,
      tangent,
      length: R * delta,
      external: R * (1 / Math.cos(delta / 2) - 1),
      middleOrdinate: R * (1 - Math.cos(delta / 2)),
      chord: 2 * R * Math.sin(delta / 2),
      degreeOfCurve: DEGREE_OF_CURVE_CONST / R,
      direction,
      pcStation: 0, // filled during stationing
      piStation: 0,
      ptStation: 0,
      chordBearing: azimuthOf(norm(sub(pt, pc))),
      sweep,
      startAngle,
    };
  }

  // Walk the path, emitting tangents and curves and accumulating stations.
  const elements: AlignmentElement[] = [];
  const resolvedCurves: AlignmentCurve[] = [];
  let station = alignment.startStation;
  let cursor = pis[0].point; // current traveled position (POB, then each PT)

  for (let i = 1; i < pis.length; i++) {
    const curve = i < pis.length - 1 ? curves[i] : null;
    const tangentEnd = curve ? curve.pc : pis[i].point;
    const segLen = len(sub(tangentEnd, cursor));
    if (segLen > 1e-9) {
      const dir = norm(sub(tangentEnd, cursor));
      elements.push({
        kind: "tangent",
        from: cursor,
        to: tangentEnd,
        beginStation: station,
        endStation: station + segLen,
        length: segLen,
        bearing: azimuthOf(dir),
      });
      station += segLen;
    }
    if (curve) {
      curve.pcStation = station;
      curve.piStation = station + curve.tangent;
      curve.ptStation = station + curve.length;
      elements.push({
        kind: "curve",
        curve,
        beginStation: station,
        endStation: station + curve.length,
      });
      station += curve.length;
      resolvedCurves.push(curve);
      cursor = curve.pt;
    } else {
      cursor = pis[i].point;
    }
  }

  return {
    name: alignment.name,
    elements,
    curves: resolvedCurves,
    startStation: alignment.startStation,
    endStation: station,
    length: station - alignment.startStation,
    pob: pis[0].point,
    poe: cursor,
  };
}

/** Total traveled length of a resolved alignment, plan units. */
export function alignmentLength(resolved: ResolvedAlignment): number {
  return resolved.length;
}

/** Point and heading at a given station (or null if outside the range). */
export function pointAtStation(
  resolved: ResolvedAlignment,
  station: number,
): { point: Point; bearing: number } | null {
  for (const el of resolved.elements) {
    if (station < el.beginStation - 1e-6 || station > el.endStation + 1e-6) continue;
    if (el.kind === "tangent") {
      const t = (station - el.beginStation) / Math.max(1e-9, el.length);
      return {
        point: { x: el.from.x + (el.to.x - el.from.x) * t, y: el.from.y + (el.to.y - el.from.y) * t },
        bearing: el.bearing,
      };
    }
    const c = el.curve;
    const frac = (station - el.beginStation) / Math.max(1e-9, c.length);
    const ang = c.startAngle + c.sweep * frac;
    const point = { x: c.center.x + c.radius * Math.cos(ang), y: c.center.y + c.radius * Math.sin(ang) };
    // Tangent heading is perpendicular to the radius, in the sweep direction.
    const sign = c.sweep >= 0 ? 1 : -1;
    const dir = { x: -Math.sin(ang) * sign, y: Math.cos(ang) * sign };
    return { point, bearing: azimuthOf(dir) };
  }
  return null;
}

/** Station/offset of a point relative to the alignment (offset +right/−left of travel). */
export function stationOffsetOfPoint(
  resolved: ResolvedAlignment,
  p: Point,
): { station: number; offset: number; side: "left" | "right" | "on" } {
  let best = { station: resolved.startStation, offset: Infinity, side: "on" as "left" | "right" | "on" };
  let bestAbs = Infinity;

  for (const el of resolved.elements) {
    if (el.kind === "tangent") {
      const ab = sub(el.to, el.from);
      const l2 = dot(ab, ab);
      let t = l2 < 1e-12 ? 0 : dot(sub(p, el.from), ab) / l2;
      t = Math.max(0, Math.min(1, t));
      const foot = add(el.from, mul(ab, t));
      const d = len(sub(p, foot));
      if (d < bestAbs) {
        bestAbs = d;
        const dir = norm(ab);
        const side = crossz(dir, sub(p, foot));
        best = {
          station: el.beginStation + t * el.length,
          offset: d,
          side: Math.abs(side) < 1e-9 ? "on" : side > 0 ? "right" : "left",
        };
      }
    } else {
      const c = el.curve;
      const toP = sub(p, c.center);
      let ang = Math.atan2(toP.y, toP.x);
      // Clamp the angle to the swept arc.
      const a0 = c.startAngle;
      const a1 = c.startAngle + c.sweep;
      const lo = Math.min(a0, a1);
      const hi = Math.max(a0, a1);
      let clamped = ang;
      // Bring ang near the arc range before clamping.
      while (clamped < lo - Math.PI) clamped += 2 * Math.PI;
      while (clamped > hi + Math.PI) clamped -= 2 * Math.PI;
      clamped = Math.max(lo, Math.min(hi, clamped));
      const foot = { x: c.center.x + c.radius * Math.cos(clamped), y: c.center.y + c.radius * Math.sin(clamped) };
      const d = len(sub(p, foot));
      if (d < bestAbs) {
        bestAbs = d;
        const frac = c.sweep === 0 ? 0 : (clamped - c.startAngle) / c.sweep;
        const sign = c.sweep >= 0 ? 1 : -1;
        const dir = { x: -Math.sin(clamped) * sign, y: Math.cos(clamped) * sign };
        const side = crossz(dir, sub(p, foot));
        best = {
          station: el.beginStation + frac * c.length,
          offset: d,
          side: Math.abs(side) < 1e-9 ? "on" : side > 0 ? "right" : "left",
        };
      }
    }
  }
  return best;
}

/**
 * A parallel offset line of the alignment centerline (edge of pavement, R/W,
 * ditch, …): the centerline sampled and displaced by `offset` along the right
 * normal (+ right of travel, − left). Concentric through curves.
 */
export function offsetAlignmentPath(
  resolved: ResolvedAlignment,
  offset: number,
  samples = 120,
): Point[] {
  const out: Point[] = [];
  const total = resolved.length;
  if (total <= 0) return out;
  for (let i = 0; i <= samples; i++) {
    const at = pointAtStation(resolved, resolved.startStation + (total * i) / samples);
    if (!at) continue;
    const rad = (at.bearing * Math.PI) / 180;
    const dir = { x: Math.sin(rad), y: -Math.cos(rad) }; // travel direction
    const nrm = { x: -dir.y, y: dir.x }; // right of travel
    out.push({ x: at.point.x + nrm.x * offset, y: at.point.y + nrm.y * offset });
  }
  return out;
}

/** Full-station values at multiples of `interval` within the alignment range. */
export function fullStations(resolved: ResolvedAlignment, interval = 100): number[] {
  const out: number[] = [];
  const first = Math.ceil(resolved.startStation / interval) * interval;
  for (let s = first; s <= resolved.endStation + 1e-6; s += interval) out.push(s);
  return out;
}

/**
 * Format a station value in engineer's notation, e.g. 176043.32 → "1760+43.32".
 * The value is split into whole hundreds and the remainder.
 */
export function formatStation(value: number, precision = 2): string {
  const neg = value < 0;
  const v = Math.abs(value);
  const sta = Math.floor(v / 100 + 1e-9);
  const plus = (v - sta * 100).toFixed(precision).padStart(precision + 3, "0");
  return `${neg ? "-" : ""}${sta}+${plus}`;
}

export interface DesignSpeedCheckResult {
  piIndex: number;
  station: number;
  curveRadius: number;
  requiredRadius: number;
  designSpeed: number;
  isViolation: boolean;
  message: string;
}

/**
 * Validates alignment curve radii against AASHTO design speed standards.
 * Minimum radius values for eMax=6% crown rate.
 */
export function validateAlignmentDesignSpeed(
  alignment: HorizontalAlignment,
  resolved: ResolvedAlignment
): DesignSpeedCheckResult[] {
  const defaultSpeed = alignment.designSpeed ?? 35;
  const checks: DesignSpeedCheckResult[] = [];

  const getMinRadius = (speed: number): number => {
    if (speed <= 15) return 50;
    if (speed <= 25) return 150;
    if (speed <= 35) return 350;
    if (speed <= 45) return 600;
    if (speed <= 55) return 1000;
    return 1600; // 65 mph or above
  };

  const getSpeedAtStation = (station: number): number => {
    const zones = alignment.designSpeeds ?? [];
    const zone = [...zones].sort((a, b) => b.station - a.station).find((z) => station >= z.station);
    return zone ? zone.speed : defaultSpeed;
  };

  for (const curve of resolved.curves) {
    const station = curve.pcStation;
    const speed = getSpeedAtStation(station);
    const minRad = getMinRadius(speed);
    const radius = curve.radius;

    const isViolation = radius < minRad;
    checks.push({
      piIndex: curve.piIndex,
      station,
      curveRadius: radius,
      requiredRadius: minRad,
      designSpeed: speed,
      isViolation,
      message: isViolation
        ? `Curve at station ${formatStation(station)} has radius ${radius.toFixed(1)} which is less than AASHTO minimum of ${minRad} for design speed ${speed} mph.`
        : `Curve at station ${formatStation(station)} satisfies design standards.`
    });
  }

  return checks;
}

