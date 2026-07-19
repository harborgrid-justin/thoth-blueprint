/**
 * @thoth/domain — planning domain model for Thoth Blueprint.
 *
 * SCAFFOLD: this file sketches the intended shape of the model. The types below
 * are a starting point for Phase 1 (see ../../../docs/ROADMAP.md), not a finished
 * API. Keep this package framework-agnostic — no React, no server, no DB.
 *
 * Vocabulary mirrors ../../../docs/GLOSSARY.md.
 */

// ---------------------------------------------------------------------------
// Spatial foundation
// ---------------------------------------------------------------------------

/** Length units a plan can be expressed in. Attached explicitly — never implied. */
export type Unit = "meters" | "feet";

/**
 * A coordinate reference system identifier (e.g. an EPSG code such as
 * "EPSG:3857"). Every plan has one; geometry without a CRS is invalid.
 */
export type CRS = string;

/** The ratio of plan distance to real-world distance (e.g. 1 / 1000). */
export type Scale = number;

/** A single position, meaningful only together with a {@link SpatialContext}. */
export interface Point {
  x: number;
  y: number;
}

export type Polyline = Point[];
/** A closed ring of points describing an area (first point implicitly repeated). */
export type Polygon = Point[];

/** The spatial reference attached to all geometry in a plan. */
export interface SpatialContext {
  crs: CRS;
  units: Unit;
  scale: Scale;
}

/** A named, orderable grouping of elements that can be shown, hidden, or locked. */
export interface Layer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
}

// ---------------------------------------------------------------------------
// Planning primitives (placeholders — flesh out in Phase 1)
// ---------------------------------------------------------------------------

/** The overall area being planned; top-level container for spatial content. */
export interface Site {
  id: string;
  name: string;
  spatial: SpatialContext;
  layers: Layer[];
  // parcels, zones, landUses, infrastructure … added as the model grows.
}

/** A legally/conceptually distinct piece of land with a boundary. */
export interface Parcel {
  id: string;
  boundary: Polygon;
  layerId: string;
}

/** A subdivided unit of a parcel intended for a building or use. */
export interface Lot {
  id: string;
  parcelId: string;
  boundary: Polygon;
}

/** An area governed by planning rules (e.g. a zoning district). */
export interface Zone {
  id: string;
  boundary: Polygon;
  // allowed land uses, height limits, coverage rules … TBD.
}

/** The designated purpose of an area. */
export interface LandUse {
  id: string;
  category: string; // residential | commercial | park | civic | mixed-use | …
  boundary: Polygon;
}

// ---------------------------------------------------------------------------
// Rules & metrics (signatures only — implement with tests in Phase 1)
// ---------------------------------------------------------------------------

/**
 * Placeholder. Named tolerance for geometric comparisons — never use bare
 * magic numbers in area/overlap math.
 */
export const GEOMETRY_EPSILON = 1e-9;

/** TODO: compute the area of a polygon in the plan's units. */
export declare function area(polygon: Polygon, spatial: SpatialContext): number;

/** TODO: fraction of a parcel/zone covered by buildings/impervious area. */
export declare function coverage(/* … */): number;

/** TODO: divide a parcel into lots per frontage/area/access rules. */
export declare function subdivision(/* … */): Lot[];

export const __SCAFFOLD__ = true;
