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

import _ from "lodash";
import { vec2 } from "gl-matrix";
import {
  distance,
  signedArea,
  type Point,
  type Polygon,
} from "../spatial/geometry";
import {
  boundaryArea,
  boundaryEdges,
  boundaryPerimeter,
  type Arc,
  type EdgeArcs,
} from "../spatial/curve";
import type { SpatialContext, Unit } from "../spatial/spatial";
import {
  areaToSquareMeters,
  squareMetersTo,
  unitLabel,
} from "../spatial/spatial";
import federalData from "../planning/geoid/data/federalReference.json";

const defaultSurvey = (federalData.standards as any).survey;

const DEG = 180 / Math.PI;

/** Travel direction (unit vector) for an azimuth in the north=−Y frame. */
export function dirFor(azimuthDeg: number): Point {
  const a = (azimuthDeg * Math.PI) / 180;
  return { x: Math.sin(a), y: -Math.cos(a) };
}

import type {
  QuadrantBearing,
  CurveRecord,
  SurveyCourse,
  TraverseClosure,
  RecordClosureOptions,
  CornerCoordinate,
  CoordinateBasis,
  SurveyArea,
  CornerAngle,
  SurveyReport,
} from "./types/survey";

import {
  azimuth,
  toDms,
  azimuthToBearing,
  formatBearing,
  bearingText,
  bearingToAzimuth,
} from "./common/bearing";

export type {
  QuadrantBearing,
  CurveRecord,
  SurveyCourse,
  TraverseClosure,
  RecordClosureOptions,
  CornerCoordinate,
  CoordinateBasis,
  SurveyArea,
  CornerAngle,
  SurveyReport,
};

export {
  azimuth,
  toDms,
  azimuthToBearing,
  formatBearing,
  bearingText,
  bearingToAzimuth,
};

/** Build the tabulated curve record for an arc course. */
function curveRecord(
  courseIndex: number,
  curveNo: number,
  from: Point,
  to: Point,
  arc: Arc,
): CurveRecord {
  const chordAz = azimuth(from, to);
  const delta = arc.delta * DEG;
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const u = {
    x: (to.x - from.x) / arc.chordLength,
    y: (to.y - from.y) / arc.chordLength,
  };
  const r = { x: arc.center.x - mid.x, y: arc.center.y - mid.y };
  const direction: "left" | "right" =
    u.x * r.y - u.y * r.x > 0 ? "right" : "left";
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

/** Check how well a set of courses closes back on the Point of Beginning. */
export function traverseClosure(courses: SurveyCourse[]): TraverseClosure {
  const perimeter = _.sumBy(courses, "distance");
  const latitudeError = _.sumBy(courses, "latitude");
  const departureError = _.sumBy(courses, "departure");
  const linearMisclosure = vec2.len(
    vec2.fromValues(latitudeError, departureError),
  );
  const precision =
    linearMisclosure < 1e-9 ? Infinity : perimeter / linearMisclosure;
  const precisionText =
    precision === Infinity || precision > 1e6
      ? "Exact (closed)"
      : `1:${Math.round(precision).toLocaleString()}`;
  return {
    perimeter,
    latitudeError,
    departureError,
    linearMisclosure,
    precision,
    precisionText,
  };
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
  if (n < 3) {
    return polygon.map(() => 0);
  }
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
    let interior = ccw ? 180 - turn : 180 + turn;
    interior = ((interior % 360) + 360) % 360;
    if (interior === 0 && Math.abs(turn) > 179.9) {
      interior = 360;
    }
    angles.push(interior);
  }
  return angles;
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
  const linearMisclosure = vec2.len(
    vec2.fromValues(latitudeError, departureError),
  );
  const precision =
    linearMisclosure < 1e-9 ? Infinity : perimeter / linearMisclosure;
  const precisionText =
    precision === Infinity || precision > 1e6
      ? "Exact (closed)"
      : `1:${Math.round(precision).toLocaleString()}`;
  return {
    perimeter,
    latitudeError,
    departureError,
    linearMisclosure,
    precision,
    precisionText,
  };
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
    dmd =
      i === 0
        ? courses[i].departure
        : dmd + courses[i - 1].departure + courses[i].departure;
    doubleArea += dmd * courses[i].latitude;
  }
  return Math.abs(doubleArea / 2);
}

/**
 * Survey coordinates for each corner. Uses an assumed local datum: Easting
 * grows with +X and Northing with north (−Y), offset by a false origin so
 * values stay positive (a common local-coordinate convention on plats).
 */
export function boundaryCoordinates(
  polygon: Polygon,
  basis: CoordinateBasis = {},
): CornerCoordinate[] {
  const falseEasting = basis.falseEasting ?? defaultSurvey?.falseEasting ?? 5000;
  const falseNorthing = basis.falseNorthing ?? defaultSurvey?.falseNorthing ?? 5000;
  return polygon.map((point, index) => ({
    index,
    label: cornerLabel(index),
    easting: point.x + falseEasting,
    northing: -point.y + falseNorthing,
    point,
  }));
}

export function surveyArea(
  polygon: Polygon,
  spatial: SpatialContext,
  arcs?: EdgeArcs,
): SurveyArea {
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
    anglesSum: _.sum(angleDegrees),
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
      lines.push(
        `thence ${c.bearingText}, a distance of ${fmt(c.distance)} ${u} to ${to};`,
      );
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
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format a degrees/minutes/seconds triple as e.g. 90°00′00″. */
export function formatDms(a: {
  degrees: number;
  minutes: number;
  seconds: number;
}): string {
  const d = String(Math.abs(a.degrees));
  const m = String(a.minutes).padStart(2, "0");
  const s = String(a.seconds).padStart(2, "0");
  return `${d}°${m}′${s}″`;
}

/** Parse a quadrant bearing string into a QuadrantBearing object. */
export function parseBearing(text: string): QuadrantBearing {
  const s = text.trim().toUpperCase().replace(/\s+/g, " ");

  // Check for cardinal directions
  if (s === "DUE NORTH" || s === "DUE N" || s === "N") {
    return {
      ns: "N",
      degrees: 0,
      minutes: 0,
      seconds: 0,
      ew: "E",
      cardinal: "N",
    };
  }
  if (s === "DUE SOUTH" || s === "DUE S" || s === "S") {
    return {
      ns: "S",
      degrees: 0,
      minutes: 0,
      seconds: 0,
      ew: "E",
      cardinal: "S",
    };
  }
  if (s === "DUE EAST" || s === "DUE E" || s === "E") {
    return {
      ns: "N",
      degrees: 90,
      minutes: 0,
      seconds: 0,
      ew: "E",
      cardinal: "E",
    };
  }
  if (s === "DUE WEST" || s === "DUE W" || s === "W") {
    return {
      ns: "N",
      degrees: 90,
      minutes: 0,
      seconds: 0,
      ew: "W",
      cardinal: "W",
    };
  }

  // Matches formats: "N 45-30-15 E", "N45.5E", "N 45°30'15\" E"
  const regex =
    /^([NS])\s*(\d+(?:\.\d+)?)(?:\s*[°\-\s]\s*(\d+)?(?:\s*[′'\-\s]\s*(\d+)?(?:″|""|'|")?)?)?\s*([EW])$/;
  const match = s.match(regex);
  if (!match) {
    throw new Error(`Invalid quadrant bearing format: ${text}`);
  }

  const ns = match[1] as "N" | "S";
  const val = parseFloat(match[2]);
  const ew = match[5] as "E" | "W";

  if (val < 0 || val > 90) {
    throw new Error(`Angle value must be between 0 and 90 degrees: ${text}`);
  }

  if (match[3] === undefined && match[4] === undefined) {
    // Decimal degrees
    const { degrees, minutes, seconds } = toDms(val);
    return { ns, degrees, minutes, seconds, ew };
  } else {
    const degrees = Math.floor(val);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    const seconds = match[4] ? parseInt(match[4], 10) : 0;
    return { ns, degrees, minutes, seconds, ew };
  }
}

/** Result of an adjusted traverse computation. */
export interface AdjustedTraverse {
  courses: SurveyCourse[];
  closureBefore: TraverseClosure;
  closureAfter: TraverseClosure;
}

/** Adjust a traverse using either Compass (Bowditch) or Transit rules to close the linear error. */
export function adjustTraverse(
  courses: SurveyCourse[],
  method: "compass" | "transit" = "compass",
): AdjustedTraverse {
  const closureBefore = traverseClosure(courses);
  const n = courses.length;
  if (n === 0 || closureBefore.linearMisclosure < 1e-9) {
    return {
      courses: courses.slice(),
      closureBefore,
      closureAfter: closureBefore,
    };
  }

  const totalLat = closureBefore.latitudeError;
  const totalDep = closureBefore.departureError;
  const totalDist = closureBefore.perimeter;
  const sumAbsLat = _.sumBy(courses, (c) => Math.abs(c.latitude));
  const sumAbsDep = _.sumBy(courses, (c) => Math.abs(c.departure));

  const adjustedCourses: SurveyCourse[] = [];
  let currentPoint = { ...courses[0].from };

  for (let i = 0; i < n; i++) {
    const c = courses[i];
    let dLat: number;
    let dDep: number;

    if (method === "compass") {
      dLat = -totalLat * (c.distance / totalDist);
      dDep = -totalDep * (c.distance / totalDist);
    } else {
      dLat =
        sumAbsLat < 1e-9 ? 0 : -totalLat * (Math.abs(c.latitude) / sumAbsLat);
      dDep =
        sumAbsDep < 1e-9 ? 0 : -totalDep * (Math.abs(c.departure) / sumAbsDep);
    }

    const adjLat = c.latitude + dLat;
    const adjDep = c.departure + dDep;

    // Calculate new target point. Recall North is -Y, East is +X
    const nextPoint = {
      x: currentPoint.x + adjDep,
      y: currentPoint.y - adjLat,
    };

    const adjV = vec2.fromValues(adjDep, adjLat);
    const dist = vec2.len(adjV);
    const az = (Math.atan2(adjV[0], adjV[1]) * DEG + 360) % 360;
    const bearing = azimuthToBearing(az);

    adjustedCourses.push({
      index: c.index,
      type: c.type,
      from: { ...currentPoint },
      to: { ...nextPoint },
      fromLabel: c.fromLabel,
      toLabel: c.toLabel,
      azimuth: az,
      bearing,
      bearingText: formatBearing(bearing),
      distance: dist,
      distanceMeters:
        c.distance < 1e-9 ? 0 : dist * (c.distanceMeters / c.distance),
      latitude: adjLat,
      departure: adjDep,
      curve: c.curve,
    });

    currentPoint = nextPoint;
  }

  // Guarantee topological closure on the final point back to P0
  if (n > 0) {
    adjustedCourses[n - 1].to = { ...courses[0].from };
  }

  const closureAfter = traverseClosure(adjustedCourses);
  return { courses: adjustedCourses, closureBefore, closureAfter };
}
