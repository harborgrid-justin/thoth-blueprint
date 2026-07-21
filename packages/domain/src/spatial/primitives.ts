import _ from "lodash";
import type { Point } from "./geometry";
import { boundaryArea, boundaryPerimeter } from "./curve";
import {
  type ElementKind,
  type Layer,
  type ElementBase,
  type Region,
  type Parcel,
  type Block,
  type Lot,
  type Zone,
  type LandUse,
  type Building,
  type RightOfWay,
  type Easement,
  type OpenSpace,
  type WaterBody,
  type PlantingArea,
  type GradeRegion,
  type PlanNote,
  type Tree,
  type SpotElevationPoint,
  type SpatialElement,
  type PointElement,
  type PlanElement,
  type Site,
  type Stair,
  type CurtainWall,
  type CurtainWallGrid,
  type DoorElement,
  type WindowElement,
  type RoofElement,
  type Dormer,
} from "./types.js";

// Re-export type definitions for downstream consumers
export type {
  ElementKind,
  Layer,
  ElementBase,
  Region,
  Parcel,
  Block,
  Lot,
  Zone,
  LandUse,
  Building,
  RightOfWay,
  Easement,
  OpenSpace,
  WaterBody,
  PlantingArea,
  GradeRegion,
  PlanNote,
  Tree,
  SpotElevationPoint,
  SpatialElement,
  PointElement,
  PlanElement,
  Site,
  Stair,
  CurtainWall,
  CurtainWallGrid,
  DoorElement,
  WindowElement,
  RoofElement,
  Dormer,
};

/** Element kinds represented by a single point rather than a boundary. */
export const POINT_ELEMENT_KINDS = new Set<ElementKind>([
  "note",
  "tree",
  "spot",
]);

/** Type guard: is this a point-anchored element? */
export function isPointElement(element: PlanElement): element is PointElement {
  return POINT_ELEMENT_KINDS.has(element.kind);
}

/** Type guard: does this element carry a spatial boundary? */
export function isSpatialElement(
  element: PlanElement,
): element is SpatialElement {
  return !isPointElement(element);
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
  if (isPointElement(element)) {
    return element.position;
  }
  const b = element.boundary;
  const sum = _.reduce(b, (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
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
