import RAPIER from "@dimforge/rapier3d-compat";
import _ from "lodash";
import {
  isSpatialElement,
  boundsCenter,
  centroid,
  elevationAt,
  type Site,
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

  /**
   * Dirty flag: set to true by syncWorld so that the next checkCollisions call
   * actually steps the simulation. Avoids burning CPU every RAF tick for a
   * completely static world.
   */
  private needsStep = false;

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
    if (!this.initialized) {
      return;
    }

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
    if (!extent) {
      return;
    }

    const center = boundsCenter(extent);
    const terrain = buildTerrainModel(site);
    const surface = terrain.existing;

    // 1. Create Terrain Heightfield Collider
    if (surface) {
      const { cols, rows, cellSize, origin, heights } = surface;

      // Compute the actual elevation range after exaggeration for correct scale.y.
      // Rapier normalises the heightfield to [0,1] in Y, then scales by scale.y,
      // so scale.y must equal the full exaggerated elevation span.
      const minH = _.min(heights) ?? 0;
      const maxH = _.max(heights) ?? 0;
      const elevRange = Math.max(1e-3, maxH - minH) * exaggeration;

      // Rapier expects heights as a flat Float32Array normalised to [0, 1].
      // The scale vector carries the actual physical dimensions, so the
      // heights must NOT be pre-multiplied by exaggeration.
      const floatHeights = new Float32Array(
        heights.map((h) => (h - minH) / (maxH - minH || 1e-3)),
      );

      const width = (cols - 1) * cellSize;
      const depth = (rows - 1) * cellSize;
      const scale = { x: width, y: elevRange, z: depth };

      try {
        const terrainShape = RAPIER.ColliderDesc.heightfield(
          rows - 1,
          cols - 1,
          floatHeights,
          scale,
        );

        // Terrain is a fixed rigid body — it never moves.
        const bodyDesc = RAPIER.RigidBodyDesc.fixed();
        const offsetX = origin.x + width / 2 - center.x;
        const offsetZ = origin.y + depth / 2 - center.y;
        bodyDesc.setTranslation(offsetX, minH * exaggeration, offsetZ);

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
      if (el.kind !== "building" || !isSpatialElement(el)) {
        continue;
      }

      const boundary = el.boundary;
      if (boundary.length < 3) {
        continue;
      }

      // Extract footprint elevations conforming to terrain at centroid
      const bldgCentroid = centroid(boundary);
      const elev = surface
        ? elevationAt(surface, bldgCentroid) * exaggeration
        : 0;
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
          // Sensor colliders on dynamic bodies with locked DOF: dynamic bodies stay
          // awake and participate in Rapier's narrow-phase intersection detection,
          // unlike kinematic/fixed bodies which may be skipped or sleeping.
          // Locking all translations and rotations makes them effectively immovable
          // while still triggering intersection pair events.
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

    // Step immediately after building the world so intersection pairs are
    // registered in the broad phase — Rapier requires at least one step before
    // intersectionPair() can return true for newly added colliders.
    this.world.step();
    // Mark dirty so checkCollisions will step once more on the first call,
    // ensuring contact pairs from any subsequent geometry are also captured.
    this.needsStep = true;
  }

  /**
   * Run collision checks across all building colliders.
   * Returns a set of element IDs currently in collision.
   * Only steps the physics simulation when the world has changed (needsStep flag).
   */
  checkCollisions(): Set<string> {
    const collidingIds = new Set<string>();
    if (!this.initialized) {
      return collidingIds;
    }

    // Only step when something has actually changed — avoids wasting CPU every
    // animation frame for a completely static scene.
    if (this.needsStep) {
      this.world.step();
      this.needsStep = false;
    }

    const buildingColliders = Array.from(this.colliders.entries()).filter(
      ([id]) => id !== "terrain",
    );

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

  /**
   * Cast a downward ray from above the given (x, z) world-space coordinate and
   * return the Y elevation where it first contacts the terrain, or null if the
   * terrain heightfield collider is not present.
   *
   * This API surface is provided for future use by UI snapping tools (e.g.
   * snapping elements to the terrain surface).
   */
  raycastElevation(x: number, z: number): number | null {
    if (!this.initialized) {
      return null;
    }
    const terrainCollider = this.colliders.get("terrain");
    if (!terrainCollider) {
      return null;
    }

    const rayOrigin = { x, y: 100000, z };
    const rayDir = { x: 0, y: -1, z: 0 };
    const maxToi = 200000;
    const solid = true;

    const hit = this.world.castRay(
      new RAPIER.Ray(rayOrigin, rayDir),
      maxToi,
      solid,
      undefined,
      undefined,
      terrainCollider,
    );

    if (hit === null) {
      return null;
    }
    return rayOrigin.y + rayDir.y * hit.timeOfImpact;
  }
}
