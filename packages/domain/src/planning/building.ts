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
import {
  measuredArea,
  type AreaUnit,
  type SpatialContext,
} from "../spatial/spatial";

import type {
  Level,
  WallType,
  Wall,
  OpeningBase,
  Door,
  Window,
  Room,
  BuildingModel,
} from "./types/building";

export type {
  Level,
  WallType,
  Wall,
  OpeningBase,
  Door,
  Window,
  Room,
  BuildingModel,
};

import { globalPartsDb } from "../parts";

/** Standard interior/exterior wall types loaded from Global Parts Database. */
export const WALL_TYPES: WallType[] = globalPartsDb.getWallTypes();

/** The straight centreline direction (start→end) of a wall. */
export function wallDirection(wall: Wall): Point {
  const pts = wall.baseline;
  if (pts.length < 2) {
    return { x: 1, y: 0 };
  }
  const a = pts[0];
  const b = pts[pts.length - 1];
  return normalize(subtract(b, a));
}

/** The length of a wall along its baseline. */
export function wallLength(wall: Wall): number {
  let total = 0;
  for (let i = 1; i < wall.baseline.length; i++) {
    total += distance(wall.baseline[i - 1], wall.baseline[i]);
  }
  return total;
}

/**
 * The filled polygon of a wall: its baseline offset by ±thickness/2. Handles a
 * straight (2-point) baseline; polyline walls are offset segment-wise.
 */
export function wallPolygon(wall: Wall): Polygon {
  const pts = wall.baseline;
  if (pts.length < 2) {
    return [];
  }
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
export function openingJambs(
  wall: Wall,
  opening: { offset: number; width: number },
): [Point, Point] {
  const dir = wallDirection(wall);
  const start = wall.baseline[0];
  const p1 = add(start, scale(dir, opening.offset - opening.width / 2));
  const p2 = add(start, scale(dir, opening.offset + opening.width / 2));
  return [p1, p2];
}

/** The door leaf line + swing-arc sample points for a hosted door. */
export function doorSwing(
  wall: Wall,
  door: Door,
): { hinge: Point; leafEnd: Point; arc: Point[] } {
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
  while (sweep <= -Math.PI) {
    sweep += 2 * Math.PI;
  }
  while (sweep > Math.PI) {
    sweep -= 2 * Math.PI;
  }
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = startAng + (sweep * i) / steps;
    arc.push({
      x: hinge.x + door.width * Math.cos(t),
      y: hinge.y + door.width * Math.sin(t),
    });
  }
  return { hinge, leafEnd, arc };
}

/** Room floor area in a real-world unit. */
export function roomArea(
  room: Room,
  spatial: SpatialContext,
  unit: AreaUnit = "sqft",
): number {
  return measuredArea(room.boundary, spatial, unit);
}

/** All walls, doors, windows, rooms on a given level. */
export function levelContents(
  model: BuildingModel,
  levelId: string,
): {
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
export function findWall(
  model: BuildingModel,
  wallId: string,
): Wall | undefined {
  return model.walls.find((w) => w.id === wallId);
}

/** Resolve a WallType from GlobalPartsDatabase by ID, falling back to default. */
export function resolveWallType(typeId: string): WallType {
  const wallTypes = globalPartsDb.getWallTypes();
  const found = wallTypes.find((w) => w.id === typeId);
  if (found) {
    return found;
  }
  const part = globalPartsDb.getPart(typeId);
  if (part) {
    return {
      id: part.id,
      label: part.name,
      thickness: part.dimensions?.thickness ?? 0.5,
      material: (part.properties?.material as any) || "wood",
    };
  }
  return { id: "ext-6", label: 'Exterior 6"', thickness: 0.5, material: "wood" };
}

/** Retrieve all door specifications registered in GlobalPartsDatabase. */
export function getBuildingDoorsFromCatalog() {
  return globalPartsDb.getPartsBySubcategory("doors");
}

/** Retrieve all window specifications registered in GlobalPartsDatabase. */
export function getBuildingWindowsFromCatalog() {
  return globalPartsDb.getPartsBySubcategory("windows");
}

/** Instantiate a Wall primitive using a part specification from GlobalPartsDatabase. */
export function createWallFromPart(
  partId: string,
  baseline: Point[],
  levelId: string,
  height = 9,
): Wall {
  const wallType = resolveWallType(partId);
  return {
    id: `wall-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    levelId,
    typeId: wallType.id,
    baseline,
    thickness: wallType.thickness,
    height,
  };
}

/** Instantiate a hosted Door primitive using a part specification from GlobalPartsDatabase. */
export function createDoorFromPart(
  partId: string,
  wallId: string,
  offset: number,
  swing: "L" | "R" = "L",
): Door {
  const part = globalPartsDb.getPart(partId);
  const width = part?.dimensions?.width ?? 3.0;
  const height = part?.dimensions?.height ?? 6.6667;
  return {
    id: `door-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    wallId,
    offset,
    width,
    height,
    mark: part?.sku || "D-101",
    swing,
    leaf: "single",
  };
}

/** Instantiate a hosted Window primitive using a part specification from GlobalPartsDatabase. */
export function createWindowFromPart(
  partId: string,
  wallId: string,
  offset: number,
  sillHeight = 3.0,
): Window {
  const part = globalPartsDb.getPart(partId);
  const width = part?.dimensions?.width ?? 3.0;
  const height = part?.dimensions?.height ?? 4.0;
  return {
    id: `window-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    wallId,
    offset,
    width,
    height,
    mark: part?.sku || "W-101",
    sill: sillHeight,
  };
}
