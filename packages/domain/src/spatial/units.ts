import { azimuth, azimuthToBearing, formatBearing } from "../survey/survey";
import { areaUnitLabel, METERS_PER_UNIT, unitLabel } from "./spatial";
import type { AreaUnit, Point, SpatialContext, Unit } from "./types";

/**
 * Display-unit helpers for spatial context and readouts.
 */

/** Length-unit display preference: follow the plan, or force meters/feet. */
export type LengthUnitPref = "auto" | "meters" | "feet";

/** Angle/bearing display format: surveyor DMS bearing, or decimal-degree azimuth. */
export type AngleFormat = "dms" | "dd";

/** Cursor coordinate readout format: plan x/y, or survey northing/easting. */
export type CoordFormat = "xy" | "survey";

/** Resolve the concrete length unit a readout should use given the plan + pref. */
export function resolveLengthUnit(
  spatial: SpatialContext,
  pref: LengthUnitPref,
): Unit {
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
  if (format === "survey") {
    return `N ${(-p.y).toFixed(digits)} · E ${x}`;
  }
  return `x ${x} · y ${y}`;
}

/**
 * Format the direction from `a` to `b` as either a surveyor quadrant bearing
 * (e.g. `N45°30′15″E`) or a decimal-degree azimuth clockwise from north.
 */
export function formatDirection(
  a: Point,
  b: Point,
  format: AngleFormat,
): string {
  const az = azimuth(a, b);
  if (format === "dd") {
    return `${az.toFixed(1)}°`;
  }
  return formatBearing(azimuthToBearing(az));
}

/** Format a number with thousands separators and fixed fractional digits. */
export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Format an area value with its unit label, choosing digits by magnitude. */
export function formatArea(value: number, unit: AreaUnit): string {
  const digits = unit === "acres" || unit === "hectares" ? 2 : 0;
  return `${formatNumber(value, digits)} ${areaUnitLabel(unit)}`;
}

/** Format a 0–1 fraction as a percentage. */
export function formatPercent(fraction: number, digits = 0): string {
  return `${formatNumber(fraction * 100, digits)}%`;
}

/** Format a ratio like FAR to two decimals. */
export function formatRatio(value: number): string {
  return value.toFixed(2);
}

/** Relative time label for a timestamp (e.g. "3 hours ago"). */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins} min ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  return new Date(iso).toLocaleDateString();
}

/** A safe filename slug from a plan/element name. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "export"
  );
}
