/**
 * Planning primitives — the first-class domain objects that make Thoth Blueprint
 * domain-native rather than shape-native. Every spatial object carries a real
 * {@link Polygon} boundary and lives on a {@link Layer}; the {@link Site} and its
 * {@link SpatialContext} give those coordinates real-world meaning.
 *
 * Vocabulary mirrors docs/GLOSSARY.md.
 */

import type { Point, Polygon, Polyline } from "./geometry";
import type { SpatialContext } from "./spatial";
import type { LandUseCategory } from "./landuse";

/** The kinds of planning elements a plan can contain. */
export type ElementKind =
  | "parcel"
  | "block"
  | "lot"
  | "zone"
  | "landuse"
  | "building"
  | "row"
  | "easement"
  | "openspace"
  | "note";

/** A named, orderable grouping of elements that can be shown, hidden, or locked. */
export interface Layer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
  /** Optional color hint for elements drawn on this layer. */
  color?: string;
}

/** Fields shared by every spatial planning element. */
export interface ElementBase {
  id: string;
  kind: ElementKind;
  name: string;
  layerId: string;
  /** Closed boundary ring in plan coordinates. */
  boundary: Polygon;
}

/** A legally or conceptually distinct piece of land — the fundamental unit. */
export interface Parcel extends ElementBase {
  kind: "parcel";
  /** Optional assessor/parcel identifier. */
  apn?: string;
}

/** An area bounded by rights-of-way that contains lots (parcel → block → lot). */
export interface Block extends ElementBase {
  kind: "block";
  parcelId?: string;
}

/** A subdivided unit of a parcel/block intended for a building or use. */
export interface Lot extends ElementBase {
  kind: "lot";
  parcelId?: string;
  blockId?: string;
  /** Required minimum distance from each boundary to a building, in plan units. */
  setback?: number;
}

/** An area governed by planning rules (e.g. a zoning district). */
export interface Zone extends ElementBase {
  kind: "zone";
  /** A zoning designation code, e.g. "R-1", "C-2", "MU". */
  designation: string;
  /** Land uses permitted within the zone. */
  allowedUses: LandUseCategory[];
  /** Maximum building coverage as a fraction of lot area (0–1). */
  maxCoverage?: number;
  /** Maximum floor area ratio. */
  maxFar?: number;
  /** Maximum building height in plan units. */
  maxHeight?: number;
  /** Minimum setback from boundaries in plan units. */
  minSetback?: number;
}

/** The designated purpose of an area, allocated across the site. */
export interface LandUse extends ElementBase {
  kind: "landuse";
  category: LandUseCategory;
}

/** A structure represented by a 2D footprint on a lot. */
export interface Building extends ElementBase {
  kind: "building";
  lotId?: string;
  /** Number of storeys; multiplies footprint area into gross floor area. */
  storeys: number;
  /** Height in plan units (informational; storeys drive floor-area math). */
  height?: number;
  /** Dwelling units contained, for density metrics. */
  dwellingUnits?: number;
  use?: LandUseCategory;
}

/** Land reserved for streets, paths, or utilities — typically public. */
export interface RightOfWay extends ElementBase {
  kind: "row";
  /** Centerline of the ROW, if modeled linearly. */
  centerline?: Polyline;
  /** Nominal width in plan units. */
  width?: number;
}

/** An area encumbering a parcel/lot that restricts building. */
export interface Easement extends ElementBase {
  kind: "easement";
  purpose?: "utility" | "access" | "drainage" | "other";
}

/** Unbuilt land reserved as open space (distinct from a "park" land use). */
export interface OpenSpace extends ElementBase {
  kind: "openspace";
  /** Whether this open space is a public dedication. */
  dedicated?: boolean;
}

/** A free-form annotation anchored on the canvas. */
export interface PlanNote {
  id: string;
  kind: "note";
  layerId: string;
  text: string;
  position: Point;
}

/** Any spatial planning element (everything except free notes). */
export type SpatialElement =
  | Parcel
  | Block
  | Lot
  | Zone
  | LandUse
  | Building
  | RightOfWay
  | Easement
  | OpenSpace;

/** Any element that can appear in a plan. */
export type PlanElement = SpatialElement | PlanNote;

/** The overall area being planned; top-level container for spatial content. */
export interface Site {
  id: string;
  name: string;
  spatial: SpatialContext;
  layers: Layer[];
  elements: PlanElement[];
}

/** Type guard: does this element carry a spatial boundary? */
export function isSpatialElement(element: PlanElement): element is SpatialElement {
  return element.kind !== "note";
}

/** Narrow a plan element to a specific kind. */
export function isKind<K extends PlanElement["kind"]>(
  element: PlanElement,
  kind: K,
): element is Extract<PlanElement, { kind: K }> {
  return element.kind === kind;
}

/** All spatial elements in a site. */
export function spatialElements(site: Site): SpatialElement[] {
  return site.elements.filter(isSpatialElement);
}

/** Elements belonging to a given layer. */
export function elementsOnLayer(site: Site, layerId: string): PlanElement[] {
  return site.elements.filter((e) => e.layerId === layerId);
}

/** Find an element by id. */
export function findElement(site: Site, id: string): PlanElement | undefined {
  return site.elements.find((e) => e.id === id);
}
