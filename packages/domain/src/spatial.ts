/**
 * Spatial foundation: units, coordinate reference systems, scale, and the
 * {@link SpatialContext} attached to every plan. Spatial explicitness is a
 * core principle — geometry never travels without this context.
 */

import type { Polygon, Polyline } from "./geometry";
import { area as polygonArea, perimeter as polygonPerimeter, polylineLength } from "./geometry";

/** Length units a plan can be expressed in. Attached explicitly — never implied. */
export type Unit = "meters" | "feet";

/**
 * A coordinate reference system identifier, typically an EPSG code such as
 * "EPSG:3857" (Web Mercator) or "EPSG:4326" (WGS84 lon/lat). Every plan has one;
 * geometry without a CRS is invalid.
 */
export type CRS = string;

/** The ratio of plan distance to real-world distance (e.g. 1 / 1000). */
export type Scale = number;

/** The spatial reference attached to all geometry in a plan. */
export interface SpatialContext {
  crs: CRS;
  units: Unit;
  scale: Scale;
}

/** Units in which an area metric can be reported. */
export type AreaUnit = "sqm" | "sqft" | "acres" | "hectares" | "sqkm" | "sqmi";

/** Meters per one unit of the given length {@link Unit}. */
export const METERS_PER_UNIT: Record<Unit, number> = {
  meters: 1,
  feet: 0.3048,
};

/** Square meters per one square {@link AreaUnit}. */
export const SQM_PER_AREA_UNIT: Record<AreaUnit, number> = {
  sqm: 1,
  sqft: 0.09290304,
  acres: 4046.8564224,
  hectares: 10000,
  sqkm: 1_000_000,
  sqmi: 2_589_988.110336,
};

const DEFAULT_CRS: CRS = "EPSG:3857";

/** A sensible default spatial context (Web Mercator, meters, 1:1). */
export function defaultSpatialContext(overrides: Partial<SpatialContext> = {}): SpatialContext {
  return { crs: DEFAULT_CRS, units: "meters", scale: 1, ...overrides };
}

/** Convert a length between two units. */
export function convertLength(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  return (value * METERS_PER_UNIT[from]) / METERS_PER_UNIT[to];
}

/** Convert a raw plan-unit length into meters using the context's units. */
export function lengthToMeters(planLength: number, spatial: SpatialContext): number {
  return planLength * METERS_PER_UNIT[spatial.units];
}

/** Convert a raw plan-unit area (units²) into square meters. */
export function areaToSquareMeters(planArea: number, spatial: SpatialContext): number {
  const factor = METERS_PER_UNIT[spatial.units];
  return planArea * factor * factor;
}

/** Convert a square-meter area into the requested {@link AreaUnit}. */
export function squareMetersTo(sqm: number, unit: AreaUnit): number {
  return sqm / SQM_PER_AREA_UNIT[unit];
}

/**
 * Area of a polygon expressed in a real-world {@link AreaUnit}, honoring the
 * plan's units. This is the spatially-honest way to measure a drawn ring.
 */
export function measuredArea(
  polygon: Polygon,
  spatial: SpatialContext,
  unit: AreaUnit = "sqm",
): number {
  const sqm = areaToSquareMeters(polygonArea(polygon), spatial);
  return squareMetersTo(sqm, unit);
}

/** Perimeter of a polygon in meters, honoring the plan's units. */
export function measuredPerimeter(polygon: Polygon, spatial: SpatialContext): number {
  return lengthToMeters(polygonPerimeter(polygon), spatial);
}

/** Length of a polyline in meters, honoring the plan's units. */
export function measuredLength(line: Polyline, spatial: SpatialContext): number {
  return lengthToMeters(polylineLength(line), spatial);
}

/** Human label for a length unit. */
export function unitLabel(unit: Unit): string {
  return unit === "meters" ? "m" : "ft";
}

/** Human label for an area unit. */
export function areaUnitLabel(unit: AreaUnit): string {
  switch (unit) {
    case "sqm":
      return "m²";
    case "sqft":
      return "ft²";
    case "acres":
      return "ac";
    case "hectares":
      return "ha";
    case "sqkm":
      return "km²";
    case "sqmi":
      return "mi²";
  }
}
