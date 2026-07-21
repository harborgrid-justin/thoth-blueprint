import type { Point } from "../../spatial/geometry";

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

/** Options controlling how the recorded plat values are rounded before closing. */
export interface RecordClosureOptions {
  /** Decimal places the recorded distances are rounded to (default 2). */
  distancePrecision?: number;
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

/** Area of a boundary reported in survey terms. */
export interface SurveyArea {
  /** Area in the plan's square unit (e.g. ft² or m²). */
  squareUnits: number;
  unitLabel: string;
  acres: number;
  hectares: number;
  squareMeters: number;
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
  areaByDmd: number;
  perimeter: number;
  perimeterMeters: number;
  units: string;
}
