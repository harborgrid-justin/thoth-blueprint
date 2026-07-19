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

import { area as polygonArea, distance, perimeter as polygonPerimeter, type Point, type Polygon } from "./geometry";
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

/** A single course (leg) of a metes-and-bounds traverse. */
export interface SurveyCourse {
  /** 1-based course number. */
  index: number;
  from: Point;
  to: Point;
  /** Label of the corner the course leaves (e.g. "P1"). */
  fromLabel: string;
  toLabel: string;
  azimuth: number;
  bearing: QuadrantBearing;
  bearingText: string;
  /** Length in plan units. */
  distance: number;
  /** Length in meters (spatially honest). */
  distanceMeters: number;
  /** Latitude (northing component) of the course, plan units. */
  latitude: number;
  /** Departure (easting component) of the course, plan units. */
  departure: number;
}

/** Corner label for a 0-based vertex index (P1, P2, …). */
export function cornerLabel(index: number): string {
  return `P${index + 1}`;
}

/**
 * The metes-and-bounds courses of a closed boundary: one course per edge,
 * traversed in order, each with bearing, distance, latitude, and departure.
 */
export function polygonCourses(polygon: Polygon, spatial: SpatialContext): SurveyCourse[] {
  const n = polygon.length;
  const courses: SurveyCourse[] = [];
  for (let i = 0; i < n; i++) {
    const from = polygon[i];
    const to = polygon[(i + 1) % n];
    const az = azimuth(from, to);
    const dist = distance(from, to);
    const bearing = azimuthToBearing(az);
    const rad = az / DEG;
    courses.push({
      index: i + 1,
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

export function surveyArea(polygon: Polygon, spatial: SpatialContext): SurveyArea {
  const sqm = areaToSquareMeters(polygonArea(polygon), spatial);
  const factor = spatial.units === "feet" ? 0.09290304 : 1;
  return {
    squareUnits: sqm / factor,
    unitLabel: `${unitLabel(spatial.units)}²`,
    acres: squareMetersTo(sqm, "acres"),
    hectares: squareMetersTo(sqm, "hectares"),
    squareMeters: sqm,
  };
}

/** A complete survey/plat report for one boundary. */
export interface SurveyReport {
  courses: SurveyCourse[];
  closure: TraverseClosure;
  coordinates: CornerCoordinate[];
  area: SurveyArea;
  perimeter: number;
  perimeterMeters: number;
  units: Unit;
}

/** Compute the full survey report for a boundary. */
export function surveyReport(polygon: Polygon, spatial: SpatialContext): SurveyReport {
  const courses = polygonCourses(polygon, spatial);
  const perimeter = polygonPerimeter(polygon);
  return {
    courses,
    closure: traverseClosure(courses),
    coordinates: boundaryCoordinates(polygon),
    area: surveyArea(polygon, spatial),
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
): string {
  const report = surveyReport(polygon, spatial);
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
    lines.push(
      `thence ${c.bearingText}, a distance of ${fmt(c.distance)} ${u} to ${
        last ? "the POINT OF BEGINNING" : `corner ${c.toLabel}`
      };`,
    );
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

function approx(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}
