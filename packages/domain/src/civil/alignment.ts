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

import _ from "lodash";
import {
  type Point,
  add,
  subtract as sub,
  scale as mul,
  length as len,
  normalize as norm,
  dot,
  cross as crossz,
} from "../spatial/geometry";
import type {
  AlignmentPI,
  AlignmentOffset,
  HorizontalAlignment,
  AlignmentCurve,
  AlignmentElement,
  ResolvedAlignment,
  DesignSpeedCheckResult,
} from "./types/alignment";
import { DEGREE_OF_CURVE_CONST, formatStation, azimuthOf } from "./common";

export { formatStation };
export type {
  AlignmentPI,
  AlignmentOffset,
  HorizontalAlignment,
  AlignmentCurve,
  AlignmentElement,
  ResolvedAlignment,
  DesignSpeedCheckResult,
};

// --- resolve ---------------------------------------------------------------

/**
 * Resolve an alignment into its traveled centerline, curve table, and
 * continuous stationing. Interior PIs whose radius fits between their neighbors
 * become circular curves; otherwise the PI is a simple angle point.
 */
export function resolveAlignment(alignment: HorizontalAlignment): ResolvedAlignment | null {
  const pis = alignment.pis;
  if (pis.length < 2) {return null;}

  // Resolve a curve at each interior PI (when a radius is set and it fits).
  const curves: (AlignmentCurve | null)[] = pis.map(() => null);
  for (let i = 1; i < pis.length - 1; i++) {
    const R = pis[i].radius ?? 0;
    if (R <= 0) {continue;}
    const pi = pis[i].point;
    const back = norm(sub(pi, pis[i - 1].point)); // direction of travel into the PI
    const fwd = norm(sub(pis[i + 1].point, pi)); // direction of travel out of the PI
    const cosD = Math.max(-1, Math.min(1, dot(back, fwd)));
    const delta = Math.acos(cosD);
    if (delta < 1e-6 || Math.PI - delta < 1e-6) {continue;} // straight or reversal
    const tangent = R * Math.tan(delta / 2);
    // Tangent must fit within both adjacent tangent lengths.
    const backLen = len(sub(pi, pis[i - 1].point));
    const fwdLen = len(sub(pis[i + 1].point, pi));
    if (tangent > backLen - 1e-6 || tangent > fwdLen - 1e-6) {continue;}

    const pc = sub(pi, mul(back, tangent));
    const pt = add(pi, mul(fwd, tangent));
    // Center is offset from PC, perpendicular to the back tangent, toward the turn.
    let nrm = { x: -back.y, y: back.x };
    if (dot(nrm, fwd) < 0) {nrm = { x: -nrm.x, y: -nrm.y };}
    const center = add(pc, mul(nrm, R));
    // In the north=−Y frame, a clockwise turn (crossz > 0) curves to the right.
    const turn = crossz(back, fwd);
    const direction: "left" | "right" = turn > 0 ? "right" : "left";

    const startAngle = Math.atan2(pc.y - center.y, pc.x - center.x);
    const endAngle = Math.atan2(pt.y - center.y, pt.x - center.x);
    let sweep = endAngle - startAngle;
    // Normalize the sweep to (-π, π] safely without unbounded loops.
    sweep = Math.atan2(Math.sin(sweep), Math.cos(sweep));
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
  const elements = resolved.elements;
  if (elements.length === 0) {return null;}
  let low = 0;
  let high = elements.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const el = elements[mid];
    if (station < el.beginStation - 1e-6) {
      high = mid - 1;
    } else if (station > el.endStation + 1e-6) {
      low = mid + 1;
    } else {
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
      const sign = c.sweep >= 0 ? 1 : -1;
      const dir = { x: -Math.sin(ang) * sign, y: Math.cos(ang) * sign };
      return { point, bearing: azimuthOf(dir) };
    }
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
      const ang = Math.atan2(toP.y, toP.x);
      // Clamp the angle to the swept arc.
      const a0 = c.startAngle;
      const a1 = c.startAngle + c.sweep;
      const lo = Math.min(a0, a1);
      const hi = Math.max(a0, a1);
      let clamped = ang;
      // Bring ang near the arc range before clamping.
      while (clamped < lo - Math.PI) {clamped += 2 * Math.PI;}
      while (clamped > hi + Math.PI) {clamped -= 2 * Math.PI;}
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
  if (total <= 0) {return out;}
  for (let i = 0; i <= samples; i++) {
    const at = pointAtStation(resolved, resolved.startStation + (total * i) / samples);
    if (!at) {continue;}
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
  for (let s = first; s <= resolved.endStation + 1e-6; s += interval) {out.push(s);}
  return out;
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
    if (speed <= 15) {return 50;}
    if (speed <= 25) {return 150;}
    if (speed <= 35) {return 350;}
    if (speed <= 45) {return 600;}
    if (speed <= 55) {return 1000;}
    return 1600; // 65 mph or above
  };

  const sortedZones = _.orderBy(alignment.designSpeeds ?? [], ["station"], ["desc"]);
  const getSpeedAtStation = (station: number): number => {
    const zone = sortedZones.find((z) => station >= z.station);
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

