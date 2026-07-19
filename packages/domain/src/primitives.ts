/**
 * Planning primitives — the first-class domain objects that make Thoth Blueprint
 * domain-native rather than shape-native. Every spatial object carries a real
 * {@link Polygon} boundary and lives on a {@link Layer}; the {@link Site} and its
 * {@link SpatialContext} give those coordinates real-world meaning.
 *
 * Vocabulary mirrors docs/GLOSSARY.md.
 */

import type { Point, Polygon, Polyline } from "./geometry";
import { boundaryArea, boundaryPerimeter, type EdgeArcs } from "./curve";
import type { HorizontalAlignment } from "./alignment";
import type { SurveyMonument } from "./monument";
import type { TownshipRange } from "./plss";
import type { SpatialContext } from "./spatial";
import type { LandUseCategory } from "./landuse";
import type { InfrastructureNetwork } from "./network";

/** The kinds of planning elements a plan can contain. */
export type ElementKind =
  | "region"
  | "parcel"
  | "block"
  | "lot"
  | "zone"
  | "landuse"
  | "building"
  | "row"
  | "easement"
  | "openspace"
  | "water"
  | "planting"
  | "grade"
  | "tree"
  | "spot"
  | "note";

/** Element kinds represented by a single point rather than a boundary. */
export const POINT_ELEMENT_KINDS = new Set<ElementKind>(["note", "tree", "spot"]);

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
  /** Closed boundary ring in plan coordinates (arc endpoints when curved). */
  boundary: Polygon;
  /**
   * Optional per-edge circular-arc bulges (DXF convention; edge i runs vertex
   * i → i+1). Absent or empty means every edge is a straight line. See
   * {@link EdgeArcs} and `./curve`.
   */
  arcs?: EdgeArcs;
}

/**
 * A large-scale land division above the parcel — used to organize very large
 * holdings (an estate, a homestead, a whole planned territory) into management
 * areas before parcels are drawn.
 */
export interface Region extends ElementBase {
  kind: "region";
  regionType?: "estate" | "district" | "watershed" | "reserve" | "agricultural" | "settlement";
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

/** A body of water — a landscape and drainage feature. */
export interface WaterBody extends ElementBase {
  kind: "water";
  waterType?: "lake" | "pond" | "river" | "stream" | "wetland" | "reservoir";
}

/** A landscaped / vegetated area (lawn, forest, garden, crop, meadow). */
export interface PlantingArea extends ElementBase {
  kind: "planting";
  plantingType?: "lawn" | "forest" | "garden" | "orchard" | "crop" | "meadow";
  /** Estimated canopy/cover fraction (0–1) for landscape metrics. */
  canopyCover?: number;
}

/** A grading region: land reshaped to a target elevation (a pad, terrace, or basin). */
export interface GradeRegion extends ElementBase {
  kind: "grade";
  /** Finished-grade elevation in plan units. */
  targetElevation: number;
  method?: "flat" | "terrace";
}

/** A free-form annotation anchored on the canvas. */
export interface PlanNote {
  id: string;
  kind: "note";
  layerId: string;
  text: string;
  position: Point;
}

/** A single tree/shrub as a point, with a canopy radius for coverage math. */
export interface Tree {
  id: string;
  kind: "tree";
  layerId: string;
  position: Point;
  species?: string;
  /** Canopy radius in plan units. */
  canopyRadius: number;
}

/** A surveyed spot elevation / benchmark — a control point for the terrain surface. */
export interface SpotElevationPoint {
  id: string;
  kind: "spot";
  layerId: string;
  position: Point;
  /** Elevation in plan units. */
  z: number;
  label?: string;
}

/** Any spatial planning element (everything carrying a boundary polygon). */
export type SpatialElement =
  | Region
  | Parcel
  | Block
  | Lot
  | Zone
  | LandUse
  | Building
  | RightOfWay
  | Easement
  | OpenSpace
  | WaterBody
  | PlantingArea
  | GradeRegion;

/** Any point-based element (anchored at a position, no boundary). */
export type PointElement = PlanNote | Tree | SpotElevationPoint;

/** Any element that can appear in a plan. */
export type PlanElement = SpatialElement | PointElement;

/** The overall area being planned; top-level container for spatial content. */
export interface Site {
  id: string;
  name: string;
  spatial: SpatialContext;
  layers: Layer[];
  elements: PlanElement[];
  /** Road and utility networks serving the site. */
  networks?: InfrastructureNetwork[];
  /** Stationed horizontal alignments (roadway/civil baselines). */
  alignments?: HorizontalAlignment[];
  /** Survey monuments (control) depicted on the plat. */
  monuments?: SurveyMonument[];
  /**
   * Public Land Survey System framework this plat is tied to (Township/Range),
   * with the controlling section and its northwest corner in plan coordinates.
   */
  plss?: {
    townshipRange: TownshipRange;
    section: number;
    /** Plan-coordinate NW corner and side length of the controlling section. */
    sectionNwCorner?: Point;
    sectionSide?: number;
  };
}

/** Type guard: does this element carry a spatial boundary? */
export function isSpatialElement(element: PlanElement): element is SpatialElement {
  return !POINT_ELEMENT_KINDS.has(element.kind);
}

/** Type guard: is this a point-anchored element? */
export function isPointElement(element: PlanElement): element is PointElement {
  return POINT_ELEMENT_KINDS.has(element.kind);
}

/** Exact plan-unit area of a spatial element, honoring any curved edges. */
export function regionArea(element: SpatialElement): number {
  return boundaryArea(element.boundary, element.arcs);
}

/** Exact plan-unit perimeter of a spatial element, honoring any curved edges. */
export function regionPerimeter(element: SpatialElement): number {
  return boundaryPerimeter(element.boundary, element.arcs);
}

/** The anchor position of any element (centroid for spatial, position for points). */
export function elementPosition(element: PlanElement): Point {
  if (isPointElement(element)) return element.position;
  const b = element.boundary;
  const sum = b.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / b.length, y: sum.y / b.length };
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
