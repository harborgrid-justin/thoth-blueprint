import {
  azimuth,
  azimuthToBearing,
  formatBearing,
  METERS_PER_UNIT,
  unitLabel,
  type Point,
  type SpatialContext,
  type Unit,
} from "@thoth/domain";

/**
 * Display-unit helpers for the workspace. These honor the user's display
 * preferences (see {@link import("@/store/prefsStore")}) without ever mutating
 * the plan's own {@link SpatialContext}: geometry keeps its plan units; only the
 * readout changes. This is the spatially-honest way to satisfy `FE-PREFS-*`.
 */

/** Length-unit display preference: follow the plan, or force meters/feet. */
export type LengthUnitPref = "auto" | "meters" | "feet";

/** Angle/bearing display format: surveyor DMS bearing, or decimal-degree azimuth. */
export type AngleFormat = "dms" | "dd";

/** Cursor coordinate readout format: plan x/y, or survey northing/easting. */
export type CoordFormat = "xy" | "survey";

/** Resolve the concrete length unit a readout should use given the plan + pref. */
export function resolveLengthUnit(spatial: SpatialContext, pref: LengthUnitPref): Unit {
  return pref === "auto" ? spatial.units : pref;
}

/**
 * Format a plan-unit length in the user's preferred display unit. `planLength`
 * is in the plan's own units; it is converted through meters so the displayed
 * value is spatially correct regardless of the display unit chosen.
 */
export function formatLength(
  planLength: number,
  spatial: SpatialContext,
  pref: LengthUnitPref,
  digits = 1,
): string {
  const meters = planLength * METERS_PER_UNIT[spatial.units];
  const unit = resolveLengthUnit(spatial, pref);
  const value = meters / METERS_PER_UNIT[unit];
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${unitLabel(unit)}`;
}

/**
 * Format a point for the cursor readout. Survey format follows the platform's
 * convention (north is −Y, east is +X); plan format is raw canvas x/y.
 */
export function formatCoord(p: Point, format: CoordFormat, digits = 1): string {
  const x = p.x.toFixed(digits);
  const y = p.y.toFixed(digits);
  if (format === "survey") return `N ${(-p.y).toFixed(digits)} · E ${x}`;
  return `x ${x} · y ${y}`;
}

/**
 * Format the direction from `a` to `b` as either a surveyor quadrant bearing
 * (e.g. `N45°30′15″E`) or a decimal-degree azimuth clockwise from north.
 */
export function formatDirection(a: Point, b: Point, format: AngleFormat): string {
  const az = azimuth(a, b);
  if (format === "dd") return `${az.toFixed(1)}°`;
  return formatBearing(azimuthToBearing(az));
}
