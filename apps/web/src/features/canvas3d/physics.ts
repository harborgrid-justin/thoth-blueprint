import RAPIER from "@dimforge/rapier3d-compat";
import {
  isSpatialElement,
  boundsCenter,
  type Site,
  type Point,
  type ElevationGrid,
} from "@thoth/domain";
import { buildTerrainModel, siteExtent } from "@/features/terrain/terrainModel";

/**
 * A client-side physics and collision manager powered by Rapier3D (WebAssembly).
 * Manages the physics representation of the terrain and plan elements, providing
 * high-performance raycasting, elevation conforming, and layout overlap detection.
 */
export class ThothPhysicsEngine {
  private world: RAPIER.World;
  private colliders: Map<string, RAPIER.Collider> = new Map();
  private elementIdsByHandle: Map<number, string> = new Map();
  private initialized = false;

  private constructor() {
    // Zero gravity since CAD layouts are static, constraint-based systems
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  }

  /** Asynchronously initialize Rapier WASM and create engine instance */
  static async create(): Promise<ThothPhysicsEngine> {
    await RAPIER.init();
    const engine = new ThothPhysicsEngine();
    engine.initialized = true;
    return engine;
  }

  /** Synchronize the physics world with the current plan state */
  syncWorld(site: Site, exaggeration: number): void {
    if (!this.initialized) {return;}

    // Clear existing colliders and their rigid bodies to prevent memory leaks in WASM
    for (const collider of this.colliders.values()) {
      const body = collider.parent();
      if (body) {
        this.world.removeRigidBody(body);
      } else {
        this.world.removeCollider(collider, false);
      }
    }
    this.colliders.clear();
    this.elementIdsByHandle.clear();

    const extent = siteExtent(site);
    if (!extent) {return;}

    const center = boundsCenter(extent);
    const terrain = buildTerrainModel(site);
    const surface = terrain.existing;

    // 1. Create Terrain Heightfield Collider
    if (surface) {
      const { cols, rows, cellSize, origin, heights } = surface;
      
      // Rapier expects heights as a flat Float32Array in row-major order
      const floatHeights = new Float32Array(heights.map((h) => h * exaggeration));
      
      const width = (cols - 1) * cellSize;
      const depth = (rows - 1) * cellSize;
      const scale = { x: width, y: 1.0, z: depth };

      try {
        const terrainShape = RAPIER.ColliderDesc.heightfield(
          rows - 1,
          cols - 1,
          floatHeights,
          scale
        );
        
        // Setup fixed rigid body for terrain
        const bodyDesc = RAPIER.RigidBodyDesc.fixed();
        const offsetX = origin.x + width / 2 - center.x;
        const offsetZ = origin.y + depth / 2 - center.y;
        bodyDesc.setTranslation(offsetX, 0, offsetZ);

        const body = this.world.createRigidBody(bodyDesc);
        const terrainCollider = this.world.createCollider(terrainShape, body);

        this.colliders.set("terrain", terrainCollider);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to build terrain heightfield collider:", err);
      }
    }

    // 2. Create Building Footprint Colliders
    for (const el of site.elements) {
      if (el.kind !== "building" || !isSpatialElement(el)) {continue;}

      const boundary = el.boundary;
      if (boundary.length < 3) {continue;}

      // Extract footprint elevations conforming to terrain at centroid
      const centroid = polygonCentroid(boundary);
      const elev = surface ? elevationAtLocal(surface, centroid) * exaggeration : 0;
      const storeys = Math.max(1, el.storeys);
      const height = (el.height ?? storeys * 3.2) * exaggeration;

      // Build 3D box vertex array representing extruded footprint
      const vertices = new Float32Array(boundary.length * 2 * 3);
      boundary.forEach((p, idx) => {
        const tx = p.x - center.x;
        const tz = p.y - center.y;

        // Bottom vertices
        vertices[idx * 3] = tx;
        vertices[idx * 3 + 1] = elev;
        vertices[idx * 3 + 2] = tz;

        // Top vertices
        const offset = boundary.length * 3;
        vertices[offset + idx * 3] = tx;
        vertices[offset + idx * 3 + 1] = elev + height;
        vertices[offset + idx * 3 + 2] = tz;
      });

      try {
        const shape = RAPIER.ColliderDesc.convexHull(vertices);
        if (shape) {
          shape.setSensor(true);
          const bodyDesc = RAPIER.RigidBodyDesc.dynamic();
          const body = this.world.createRigidBody(bodyDesc);
          body.lockTranslations(true, true);
          body.lockRotations(true, true);
          const collider = this.world.createCollider(shape, body);
          
          this.colliders.set(el.id, collider);
          this.elementIdsByHandle.set(collider.handle, el.id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to create collider for building ${el.id}:`, err);
      }
    }
  }

  /**
   * Run collision checks across all building colliders.
   * Returns a set of element IDs currently in collision.
   */
  checkCollisions(): Set<string> {
    const collidingIds = new Set<string>();
    if (!this.initialized) {return collidingIds;}

    // Step the physics simulation to update contact/intersection pairs
    this.world.step();

    const buildingColliders = Array.from(this.colliders.entries())
      .filter(([id]) => id !== "terrain");

    for (let i = 0; i < buildingColliders.length; i++) {
      const [idA, colA] = buildingColliders[i]!;
      for (let j = i + 1; j < buildingColliders.length; j++) {
        const [idB, colB] = buildingColliders[j]!;

        // Check if shapes intersect
        const intersects = this.world.intersectionPair(colA, colB);
        if (intersects) {
          collidingIds.add(idA);
          collidingIds.add(idB);
        }
      }
    }

    return collidingIds;
  }
}

// --- Local Helpers for Terrain elevation conforming ----------------------

function polygonCentroid(poly: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const p of poly) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / poly.length, y: cy / poly.length };
}

function elevationAtLocal(grid: ElevationGrid, p: Point): number {
  const { origin, cellSize, cols, rows, heights } = grid;
  const c = (p.x - origin.x) / cellSize;
  const r = (p.y - origin.y) / cellSize;

  const c0 = Math.floor(c);
  const r0 = Math.floor(r);
  const c1 = c0 + 1;
  const r1 = r0 + 1;

  if (c0 < 0 || c1 >= cols || r0 < 0 || r1 >= rows) {
    return heights[Math.max(0, Math.min(heights.length - 1, Math.round(r) * cols + Math.round(c)))] || 0;
  }

  const h00 = heights[r0 * cols + c0] || 0;
  const h10 = heights[r0 * cols + c1] || 0;
  const h01 = heights[r1 * cols + c0] || 0;
  const h11 = heights[r1 * cols + c1] || 0;

  const tx = c - c0;
  const ty = r - r0;

  // Bilinear interpolation
  return (1 - tx) * (1 - ty) * h00 +
         tx * (1 - ty) * h10 +
         (1 - tx) * ty * h01 +
         tx * ty * h11;
}
