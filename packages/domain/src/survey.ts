/**
 * Survey functions for plats — the metes-and-bounds, bearing, closure, and
 * coordinate math a land surveyor needs to describe and check a boundary.
 *
 * Conventions
 * -----------
 * - **North is −Y, East is +X.** Plan coordinates increase downward on screen
 *   (like most 2D canvases), so survey north (up) is the −Y direction. Every
 *   function here uses this convention consistently; callers never mix it with
 *   the display transform.
 * - **Azimuth** is measured clockwise from north in [0, 360).
 * - **Bearing** is the surveyor's quadrant form (e.g. N45°30′15″E).
 * - Distances are in the plan's {@link Unit}; areas are reported in both the
 *   plan's square unit and acres.
 */

import { distance, signedArea, type Point, type Polygon } from "./geometry";
import {
  boundaryArea,
  boundaryEdges,
  boundaryPerimeter,
  type Arc,
  type EdgeArcs,
} from "./curve";
import type { SpatialContext, Unit } from "./spatial";
import { areaToSquareMeters, squareMetersTo, unitLabel } from "./spatial";

const DEG = 180 / Math.PI;

/** A direction in surveyor's quadrant bearing form. */
export interface QuadrantBearing {
  ns: "N" | "S";
  degrees: number;
  minutes: number;
  seconds: number;
  ew: "E" | "W";
  /** True for a cardinal direction (due N/S/E/W). */
  cardinal?: "N" | "S" | "E" | "W";
}

/** Azimuth clockwise from north (−Y), in degrees [0, 360), from `a` to `b`. */
export function azimuth(a: Point, b: Point): number {
  const east = b.x - a.x;
  const north = -(b.y - a.y);
  const deg = Math.atan2(east, north) * DEG;
  return (deg + 360) % 360;
}

/** Convert a decimal-degree angle into whole degrees/minutes/seconds with carry. */
export function toDms(angleDeg: number): { degrees: number; minutes: number; seconds: number } {
  const sign = angleDeg < 0 ? -1 : 1;
  let a = Math.abs(angleDeg);
  let degrees = Math.floor(a);
  let remMin = (a - degrees) * 60;
  let minutes = Math.floor(remMin);
  let seconds = Math.round((remMin - minutes) * 60);
  if (seconds >= 60) {
    seconds -= 60;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes -= 60;
    degrees += 1;
  }
  return { degrees: degrees * sign, minutes, seconds };
}

/** Convert an azimuth into a quadrant bearing. */
export function azimuthToBearing(az: number): QuadrantBearing {
  const a = ((az % 360) + 360) % 360;

  // Cardinal directions.
  if (approx(a, 0)) return { ns: "N", degrees: 0, minutes: 0, seconds: 0, ew: "E", cardinal: "N" };
  if (approx(a, 90)) return { ns: "N", degrees: 90, minutes: 0, seconds: 0, ew: "E", cardinal: "E" };
  if (approx(a, 180)) return { ns: "S", degrees: 0, minutes: 0, seconds: 0, ew: "E", cardinal: "S" };
  if (approx(a, 270)) return { ns: "N", degrees: 90, minutes: 0, seconds: 0, ew: "W", cardinal: "W" };

  let ns: "N" | "S";
  let ew: "E" | "W";
  let angle: number;
  if (a < 90) {
    ns = "N";
    ew = "E";
    angle = a;
  } else if (a < 180) {
    ns = "S";
    ew = "E";
    angle = 180 - a;
  } else if (a < 270) {
    ns = "S";
    ew = "W";
    angle = a - 180;
  } else {
    ns = "N";
    ew = "W";
    angle = 360 - a;
  }
  const { degrees, minutes, seconds } = toDms(angle);
  return { ns, degrees, minutes, seconds, ew };
}

/** Format a quadrant bearing as e.g. `N45°30′15″E`, or `Due North`. */
export function formatBearing(b: QuadrantBearing): string {
  if (b.cardinal) {
    return { N: "Due North", S: "Due South", E: "Due East", W: "Due West" }[b.cardinal];
  }
  const d = String(b.degrees).padStart(2, "0");
  const m = String(b.minutes).padStart(2, "0");
  const s = String(b.seconds).padStart(2, "0");
  return `${b.ns}${d}°${m}′${s}″${b.ew}`;
}

/** Convenience: quadrant bearing text directly from two points. */
export function bearingText(a: Point, b: Point): string {
  return formatBearing(azimuthToBearing(azimuth(a, b)));
}

/** The curve data a plat tabulates for an arc course. */
export interface CurveRecord {
  /** 1-based course number this curve belongs to. */
  courseIndex: number;
  /** Curve label on the plat, e.g. "C1". */
  label: string;
  /** Radius, plan units. */
  radius: number;
  /** Arc length, plan units. */
  arcLength: number;
  /** Central (delta) angle in decimal degrees, and as DMS. */
  delta: number;
  deltaDms: { degrees: number; minutes: number; seconds: number };
  /** Tangent distance (PC/PT to PI), plan units. */
  tangent: number;
  /** Long chord length, plan units. */
  chordLength: number;
  chordBearing: QuadrantBearing;
  chordBearingText: string;
  /** Direction the curve turns along the direction of travel. */
  direction: "left" | "right";
}

/** A single course (leg) of a metes-and-bounds traverse. */
export interface SurveyCourse {
  /** 1-based course number. */
  index: number;
  /** Straight line, or a circular arc (with {@link SurveyCourse.curve}). */
  type: "line" | "curve";
  from: Point;
  to: Point;
  /** Label of the corner the course leaves (e.g. "P1"). */
  fromLabel: string;
  toLabel: string;
  /** Azimuth of the course; for a curve this is the long-chord azimuth. */
  azimuth: number;
  bearing: QuadrantBearing;
  bearingText: string;
  /** Length in plan units; for a curve this is the chord (traverse) distance. */
  distance: number;
  /** Length in meters (spatially honest). */
  distanceMeters: number;
  /** Latitude (northing component) of the course, plan units. */
  latitude: number;
  /** Departure (easting component) of the course, plan units. */
  departure: number;
  /** Curve record when {@link SurveyCourse.type} is "curve". */
  curve?: CurveRecord;
}

/** Build the tabulated curve record for an arc course. */
function curveRecord(courseIndex: number, curveNo: number, from: Point, to: Point, arc: Arc): CurveRecord {
  const chordAz = azimuth(from, to);
  const delta = arc.delta * DEG;
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const u = { x: (to.x - from.x) / arc.chordLength, y: (to.y - from.y) / arc.chordLength };
  const r = { x: arc.center.x - mid.x, y: arc.center.y - mid.y };
  const direction: "left" | "right" = u.x * r.y - u.y * r.x > 0 ? "right" : "left";
  return {
    courseIndex,
    label: `C${curveNo}`,
    radius: arc.radius,
    arcLength: arc.arcLength,
    delta,
    deltaDms: toDms(delta),
    tangent: arc.tangent,
    chordLength: arc.chordLength,
    chordBearing: azimuthToBearing(chordAz),
    chordBearingText: formatBearing(azimuthToBearing(chordAz)),
    direction,
  };
}

/** Corner label for a 0-based vertex index (P1, P2, …). */
export function cornerLabel(index: number): string {
  return `P${index + 1}`;
}

/**
 * The metes-and-bounds courses of a closed boundary: one course per edge,
 * traversed in order. Straight edges carry a bearing and distance; curved edges
 * (per-edge `arcs` bulges) additionally carry a {@link CurveRecord}, and their
 * bearing/distance/latitude/departure describe the **long chord** — the value a
 * traverse closes on, exactly as a plat reports.
 */
export function polygonCourses(
  polygon: Polygon,
  spatial: SpatialContext,
  arcs?: EdgeArcs,
): SurveyCourse[] {
  const n = polygon.length;
  const courses: SurveyCourse[] = [];
  let curveNo = 0;
  for (const edge of boundaryEdges(polygon, arcs)) {
    const { from, to, index: i } = edge;
    const az = azimuth(from, to);
    const dist = distance(from, to);
    const bearing = azimuthToBearing(az);
    const rad = az / DEG;
    let curve: CurveRecord | undefined;
    if (edge.arc) {
      curveNo += 1;
      curve = curveRecord(i + 1, curveNo, from, to, edge.arc);
    }
    courses.push({
      index: i + 1,
      type: edge.arc ? "curve" : "line",
      from,
      to,
      fromLabel: cornerLabel(i),
      toLabel: cornerLabel((i + 1) % n),
      azimuth: az,
      bearing,
      bearingText: formatBearing(bearing),
      distance: dist,
      distanceMeters: dist * (spatial.units === "feet" ? 0.3048 : 1),
      latitude: Math.cos(rad) * dist,
      departure: Math.sin(rad) * dist,
      curve,
    });
  }
  return courses;
}

/** Result of a traverse-closure computation. */
export interface TraverseClosure {
  perimeter: number;
  /** Residual sum of latitudes (should be ~0 for a closed traverse). */
  latitudeError: number;
  /** Residual sum of departures (should be ~0 for a closed traverse). */
  departureError: number;
  /** Linear misclosure = hypot(latitudeError, departureError), plan units. */
  linearMisclosure: number;
  /** Precision ratio denominator: perimeter / misclosure (Infinity if exact). */
  precision: number;
  /** Human text, e.g. "1:14,200" or "Exact (closed)". */
  precisionText: string;
}

/** Check how well a set of courses closes back on the Point of Beginning. */
export function traverseClosure(courses: SurveyCourse[]): TraverseClosure {
  const perimeter = courses.reduce((s, c) => s + c.distance, 0);
  const latitudeError = courses.reduce((s, c) => s + c.latitude, 0);
  const departureError = courses.reduce((s, c) => s + c.departure, 0);
  const linearMisclosure = Math.hypot(latitudeError, departureError);
  const precision = linearMisclosure < 1e-9 ? Infinity : perimeter / linearMisclosure;
  const precisionText =
    precision === Infinity || precision > 1e6
      ? "Exact (closed)"
      : `1:${Math.round(precision).toLocaleString()}`;
  return { perimeter, latitudeError, departureError, linearMisclosure, precision, precisionText };
}

/**
 * Interior angle (in decimal degrees) at each vertex of a simple polygon,
 * index-aligned with `polygon`. Handles convex and reflex (concave) corners:
 * the returned angles sum to exactly (n − 2) × 180° for any simple ring,
 * independent of winding order. This is the angular record a plat carries at
 * each monument.
 */
export function interiorAngles(polygon: Polygon): number[] {
  const n = polygon.length;
  if (n < 3) return polygon.map(() => 0);
  const ccw = signedArea(polygon) > 0;
  const angles: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = polygon[(i - 1 + n) % n];
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];
    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    // Signed deflection (turn) from the incoming to the outgoing course.
    const turn = Math.atan2(d1x * d2y - d1y * d2x, d1x * d2x + d1y * d2y) * DEG;
    const interior = (((ccw ? 180 - turn : 180 + turn) % 360) + 360) % 360;
    angles.push(interior);
  }
  return angles;
}

/**
 * Azimuth (degrees clockwise from north) reconstructed from a quadrant bearing.
 * The exact inverse of {@link azimuthToBearing}, used to close a traverse from
 * the *recorded* (rounded) bearings actually printed on the plat.
 */
export function bearingToAzimuth(b: QuadrantBearing): number {
  if (b.cardinal) return { N: 0, E: 90, S: 180, W: 270 }[b.cardinal];
  const angle = b.degrees + b.minutes / 60 + b.seconds / 3600;
  if (b.ns === "N" && b.ew === "E") return angle;
  if (b.ns === "S" && b.ew === "E") return 180 - angle;
  if (b.ns === "S" && b.ew === "W") return 180 + angle;
  return 360 - angle; // N…W
}

/** Options controlling how the recorded plat values are rounded before closing. */
export interface RecordClosureOptions {
  /** Decimal places the recorded distances are rounded to (default 2). */
  distancePrecision?: number;
}

/**
 * Traverse closure computed from the **recorded** bearings and distances — i.e.
 * the rounded values actually written on the plat (bearings to the whole
 * second, distances to `distancePrecision`). Unlike {@link traverseClosure}
 * (which closes a coordinate-derived traverse and is therefore always exact),
 * this reveals the real misclosure a field crew would find if they staked the
 * plat exactly as drawn. This is the precision figure a plat should report.
 */
export function recordClosure(
  courses: SurveyCourse[],
  options: RecordClosureOptions = {},
): TraverseClosure {
  const factor = Math.pow(10, options.distancePrecision ?? 2);
  let latitudeError = 0;
  let departureError = 0;
  let perimeter = 0;
  for (const c of courses) {
    const dist = Math.round(c.distance * factor) / factor;
    const rad = bearingToAzimuth(c.bearing) / DEG;
    perimeter += dist;
    latitudeError += Math.cos(rad) * dist;
    departureError += Math.sin(rad) * dist;
  }
  const linearMisclosure = Math.hypot(latitudeError, departureError);
  const precision = linearMisclosure < 1e-9 ? Infinity : perimeter / linearMisclosure;
  const precisionText =
    precision === Infinity || precision > 1e6
      ? "Exact (closed)"
      : `1:${Math.round(precision).toLocaleString()}`;
  return { perimeter, latitudeError, departureError, linearMisclosure, precision, precisionText };
}

/**
 * Area of a boundary by the **Double Meridian Distance** method, computed from
 * the courses' latitudes and departures. This is mathematically independent of
 * the shoelace formula used by {@link surveyArea}, so agreement between the two
 * is a rigorous cross-check that the coordinate geometry is self-consistent.
 * Returned in plan units².
 */
export function dmdArea(courses: SurveyCourse[]): number {
  let dmd = 0;
  let doubleArea = 0;
  for (let i = 0; i < courses.length; i++) {
    dmd = i === 0 ? courses[i].departure : dmd + courses[i - 1].departure + courses[i].departure;
    doubleArea += dmd * courses[i].latitude;
  }
  return Math.abs(doubleArea / 2);
}

/** A boundary corner as survey coordinates (northing/easting). */
export interface CornerCoordinate {
  index: number;
  label: string;
  northing: number;
  easting: number;
  point: Point;
}

export interface CoordinateBasis {
  /** False easting/northing so local coordinates stay positive. */
  falseEasting?: number;
  falseNorthing?: number;
}

/**
 * Survey coordinates for each corner. Uses an assumed local datum: Easting
 * grows with +X and Northing with north (−Y), offset by a false origin so
 * values stay positive (a common local-coordinate convention on plats).
 */
export function boundaryCoordinates(polygon: Polygon, basis: CoordinateBasis = {}): CornerCoordinate[] {
  const falseEasting = basis.falseEasting ?? 5000;
  const falseNorthing = basis.falseNorthing ?? 5000;
  return polygon.map((point, index) => ({
    index,
    label: cornerLabel(index),
    easting: point.x + falseEasting,
    northing: -point.y + falseNorthing,
    point,
  }));
}

/** Area of a boundary reported in survey terms. */
export interface SurveyArea {
  /** Area in the plan's square unit (e.g. ft² or m²). */
  squareUnits: number;
  unitLabel: string;
  acres: number;
  hectares: number;
  squareMeters: number;
}

export function surveyArea(polygon: Polygon, spatial: SpatialContext, arcs?: EdgeArcs): SurveyArea {
  const sqm = areaToSquareMeters(boundaryArea(polygon, arcs), spatial);
  const factor = spatial.units === "feet" ? 0.09290304 : 1;
  return {
    squareUnits: sqm / factor,
    unitLabel: `${unitLabel(spatial.units)}²`,
    acres: squareMetersTo(sqm, "acres"),
    hectares: squareMetersTo(sqm, "hectares"),
    squareMeters: sqm,
  };
}

/** The interior angle at a boundary corner, for the plat's angular record. */
export interface CornerAngle {
  index: number;
  label: string;
  /** Interior angle in decimal degrees. */
  interior: number;
  /** Interior angle as whole degrees/minutes/seconds. */
  dms: { degrees: number; minutes: number; seconds: number };
}

/** A complete survey/plat report for one boundary. */
export interface SurveyReport {
  courses: SurveyCourse[];
  /** The curve table — one record per arc course, empty for straight tracts. */
  curves: CurveRecord[];
  /** Whether the boundary contains any circular-arc courses. */
  hasCurves: boolean;
  /** Coordinate (geometric) closure — exact for a coordinate-derived traverse. */
  closure: TraverseClosure;
  /** Closure of the traverse as **recorded** (rounded bearings/distances). */
  record: TraverseClosure;
  coordinates: CornerCoordinate[];
  /** Interior angle at each corner; `anglesSum` should equal `anglesExpected`. */
  angles: CornerAngle[];
  anglesSum: number;
  anglesExpected: number;
  area: SurveyArea;
  /**
   * Area of the **chord traverse** by the Double Meridian Distance method — an
   * independent cross-check of the coordinate geometry. It equals `area` for a
   * straight tract; for a curved tract it omits the circular-segment areas
   * captured by `area`, and their difference is the net segment area.
   */
  areaByDmd: number;
  perimeter: number;
  perimeterMeters: number;
  units: Unit;
}

/** Compute the full survey report for a boundary, honoring any curved edges. */
export function surveyReport(
  polygon: Polygon,
  spatial: SpatialContext,
  arcs?: EdgeArcs,
): SurveyReport {
  const courses = polygonCourses(polygon, spatial, arcs);
  const perimeter = boundaryPerimeter(polygon, arcs);
  const angleDegrees = interiorAngles(polygon);
  const angles: CornerAngle[] = angleDegrees.map((interior, i) => ({
    index: i,
    label: cornerLabel(i),
    interior,
    dms: toDms(interior),
  }));
  const curves = courses.filter((c) => c.curve).map((c) => c.curve!);
  return {
    courses,
    curves,
    hasCurves: curves.length > 0,
    closure: traverseClosure(courses),
    record: recordClosure(courses, { distancePrecision: 2 }),
    coordinates: boundaryCoordinates(polygon),
    angles,
    anglesSum: angleDegrees.reduce((s, a) => s + a, 0),
    anglesExpected: (polygon.length - 2) * 180,
    area: surveyArea(polygon, spatial, arcs),
    areaByDmd: dmdArea(courses),
    perimeter,
    perimeterMeters: perimeter * (spatial.units === "feet" ? 0.3048 : 1),
    units: spatial.units,
  };
}

export interface LegalDescriptionOptions {
  /** Name/heading of the tract being described. */
  tractName?: string;
  /** Larger context (e.g. subdivision or site name). */
  context?: string;
}

/**
 * Generate a metes-and-bounds legal description for a boundary — the narrative
 * form a plat and deed carry ("BEGINNING at… thence… to the POINT OF BEGINNING").
 */
export function legalDescription(
  polygon: Polygon,
  spatial: SpatialContext,
  options: LegalDescriptionOptions = {},
  arcs?: EdgeArcs,
): string {
  const report = surveyReport(polygon, spatial, arcs);
  const u = unitLabel(spatial.units);
  const pob = report.coordinates[0];
  const lines: string[] = [];

  const heading = options.tractName ?? "the tract";
  const context = options.context ? ` situated in ${options.context}` : "";
  lines.push(
    `A parcel of land${context}, being ${heading}, more particularly described as follows:`,
  );
  lines.push("");
  lines.push(
    `BEGINNING at the Point of Beginning (${pob.label}), having local coordinates ` +
      `N ${fmt(pob.northing)}, E ${fmt(pob.easting)};`,
  );
  for (const c of report.courses) {
    const last = c.index === report.courses.length;
    const to = last ? "the POINT OF BEGINNING" : `corner ${c.toLabel}`;
    if (c.curve) {
      const cv = c.curve;
      lines.push(
        `thence along a curve to the ${cv.direction} having a radius of ${fmt(cv.radius)} ${u}, ` +
          `an arc length of ${fmt(cv.arcLength)} ${u}, a central angle of ${formatDms(cv.deltaDms)}, ` +
          `and a long chord bearing ${cv.chordBearingText} for ${fmt(cv.chordLength)} ${u} to ${to};`,
      );
    } else {
      lines.push(`thence ${c.bearingText}, a distance of ${fmt(c.distance)} ${u} to ${to};`);
    }
  }
  lines.push("");
  lines.push(
    `Containing ${fmt(report.area.squareUnits)} ${u}² (${report.area.acres.toFixed(3)} acres), ` +
      `more or less. Traverse closure: ${report.closure.precisionText}.`,
  );
  return lines.join("\n");
}

function fmt(v: number): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format a degrees/minutes/seconds triple as e.g. 90°00′00″. */
export function formatDms(a: { degrees: number; minutes: number; seconds: number }): string {
  const d = String(Math.abs(a.degrees));
  const m = String(a.minutes).padStart(2, "0");
  const s = String(a.seconds).padStart(2, "0");
  return `${d}°${m}′${s}″`;
}

function approx(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}
