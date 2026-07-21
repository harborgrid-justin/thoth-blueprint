import type { Point, Polygon } from "../../spatial/geometry";

/** A building storey/level. */
export interface Level {
  id: string;
  name: string;
  /** Finished-floor elevation in plan units. */
  elevation: number;
  /** Floor-to-floor height in plan units. */
  height: number;
}

/** A wall type (assembly) — its nominal thickness and a material key. */
export interface WallType {
  id: string;
  label: string;
  thickness: number;
  material?: string;
}

/** A wall segment on a level. */
export interface Wall {
  id: string;
  levelId: string;
  /** Wall centreline: two points (straight) or a polyline. */
  baseline: Point[];
  /** Wall thickness in plan units. */
  thickness: number;
  /** Wall height in plan units. */
  height: number;
  typeId?: string;
  layerId?: string;
}

/** Base of a wall-hosted opening. */
export interface OpeningBase {
  id: string;
  wallId: string;
  /** Distance from the wall's start along its baseline, plan units. */
  offset: number;
  width: number;
  height: number;
  mark: string;
}

/** A door hosted on a wall. */
export interface Door extends OpeningBase {
  swing: "L" | "R";
  leaf: "single" | "double" | "sliding" | "overhead";
}

/** A window hosted on a wall. */
export interface Window extends OpeningBase {
  /** Sill height above finished floor, plan units. */
  sill: number;
}

/** A room bounded by a polygon, with finishes. */
export interface Room {
  id: string;
  levelId: string;
  boundary: Polygon;
  name: string;
  number: string;
  floorFinish?: string;
  baseFinish?: string;
  wallFinish?: string;
  ceilingFinish?: string;
  /** Ceiling height, plan units. */
  ceilingHeight?: number;
}

/** The interior model for one footprint building. */
export interface BuildingModel {
  id: string;
  /** The footprint `Building` element this interior belongs to. */
  buildingId: string;
  levels: Level[];
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
}
