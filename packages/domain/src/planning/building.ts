/**
 * Building-interior model — the primitives an architectural floor plan is made
 * of: **levels**, **walls** (with thickness and height), **doors** and
 * **windows** hosted on walls, and **rooms** with finishes. A
 * {@link BuildingModel} references a footprint `Building` element by id and adds
 * the interior a plan/section/elevation needs. Geometry helpers derive wall
 * polygons, opening placements, and door swings; schedules are derived in
 * ./schedule.ts.
 *
 * Framework-agnostic. Coordinates are plan-space; north is −Y as elsewhere.
 */

import type { Point, Polygon } from "../spatial/geometry";
import { add, distance, normalize, scale, subtract } from "../spatial/geometry";
import { measuredArea, type AreaUnit, type SpatialContext } from "../spatial/spatial";

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

/** Standard interior/exterior wall types. */
export const WALL_TYPES: WallType[] = [
  { id: "ext-8", label: 'Exterior 8"', thickness: 8 / 12, material: "masonry" },
  { id: "ext-6", label: 'Exterior 6"', thickness: 6 / 12, material: "wood" },
  { id: "int-5", label: 'Interior 4-7/8"', thickness: 4.875 / 12, material: "wood" },
  { id: "int-3", label: 'Interior 3-5/8"', thickness: 3.625 / 12, material: "wood" },
];

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
interface OpeningBase {
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

/** The straight centreline direction (start→end) of a wall. */
export function wallDirection(wall: Wall): Point {
  const pts = wall.baseline;
  if (pts.length < 2) {return { x: 1, y: 0 };}
  const a = pts[0];
  const b = pts[pts.length - 1];
  return normalize(subtract(b, a));
}

/** The length of a wall along its baseline. */
export function wallLength(wall: Wall): number {
  let total = 0;
  for (let i = 1; i < wall.baseline.length; i++) {total += distance(wall.baseline[i - 1], wall.baseline[i]);}
  return total;
}

/**
 * The filled polygon of a wall: its baseline offset by ±thickness/2. Handles a
 * straight (2-point) baseline; polyline walls are offset segment-wise.
 */
export function wallPolygon(wall: Wall): Polygon {
  const pts = wall.baseline;
  if (pts.length < 2) {return [];}
  const half = wall.thickness / 2;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dir = normalize(subtract(next, prev));
    const n = { x: -dir.y, y: dir.x };
    left.push(add(pts[i], scale(n, half)));
    right.push(add(pts[i], scale(n, -half)));
  }
  return [...left, ...right.reverse()];
}

/** The point on a wall's baseline at an opening's offset. */
export function openingCenter(wall: Wall, opening: { offset: number }): Point {
  const dir = wallDirection(wall);
  return add(wall.baseline[0], scale(dir, opening.offset));
}

/** The two jamb points (opening edges) of a wall-hosted opening. */
export function openingJambs(wall: Wall, opening: { offset: number; width: number }): [Point, Point] {
  const dir = wallDirection(wall);
  const start = wall.baseline[0];
  const p1 = add(start, scale(dir, opening.offset - opening.width / 2));
  const p2 = add(start, scale(dir, opening.offset + opening.width / 2));
  return [p1, p2];
}

/** The door leaf line + swing-arc sample points for a hosted door. */
export function doorSwing(wall: Wall, door: Door): { hinge: Point; leafEnd: Point; arc: Point[] } {
  const dir = wallDirection(wall);
  const n = { x: -dir.y, y: dir.x };
  const [j1, j2] = openingJambs(wall, door);
  const hinge = door.swing === "L" ? j1 : j2;
  const along = door.swing === "L" ? dir : scale(dir, -1);
  // Leaf opens 90° from the wall toward the interior normal.
  const leafEnd = add(hinge, scale(n, door.width));
  const arc: Point[] = [];
  const startAng = Math.atan2(n.y, n.x);
  const endAng = Math.atan2(along.y, along.x);
  let sweep = endAng - startAng;
  while (sweep <= -Math.PI) {sweep += 2 * Math.PI;}
  while (sweep > Math.PI) {sweep -= 2 * Math.PI;}
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = startAng + (sweep * i) / steps;
    arc.push({ x: hinge.x + door.width * Math.cos(t), y: hinge.y + door.width * Math.sin(t) });
  }
  return { hinge, leafEnd, arc };
}

/** Room floor area in a real-world unit. */
export function roomArea(room: Room, spatial: SpatialContext, unit: AreaUnit = "sqft"): number {
  return measuredArea(room.boundary, spatial, unit);
}

/** All walls, doors, windows, rooms on a given level. */
export function levelContents(model: BuildingModel, levelId: string): {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  rooms: Room[];
} {
  const walls = model.walls.filter((w) => w.levelId === levelId);
  const wallIds = new Set(walls.map((w) => w.id));
  return {
    walls,
    doors: model.doors.filter((d) => wallIds.has(d.wallId)),
    windows: model.windows.filter((w) => wallIds.has(w.wallId)),
    rooms: model.rooms.filter((r) => r.levelId === levelId),
  };
}

/** Find a wall by id within a model. */
export function findWall(model: BuildingModel, wallId: string): Wall | undefined {
  return model.walls.find((w) => w.id === wallId);
}
