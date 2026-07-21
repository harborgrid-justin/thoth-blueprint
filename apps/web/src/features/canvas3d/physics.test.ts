import { describe, it, expect } from "vitest";
import { ThothPhysicsEngine } from "./physics.js";
import {
  type Site,
  type PlanElement,
  defaultSpatialContext,
} from "@thoth/domain";

describe("Rapier3D Physics Engine Integration", () => {
  it("should initialize Rapier3D and construct a physics world", async () => {
    const engine = await ThothPhysicsEngine.create();
    expect(engine).toBeDefined();

    const collisions = engine.checkCollisions();
    expect(collisions.size).toBe(0);
  });

  it("should detect overlaps between colliding buildings in 3D space", async () => {
    const engine = await ThothPhysicsEngine.create();

    // Create a mock site with overlapping buildings
    const elements: PlanElement[] = [
      {
        id: "bldg-1",
        kind: "building",
        name: "Building A",
        layerId: "layer-buildings",
        boundary: [
          { x: 10, y: 10 },
          { x: 30, y: 10 },
          { x: 30, y: 30 },
          { x: 10, y: 30 },
        ],
        storeys: 2,
        height: 8,
        dwellingUnits: 1,
        use: "residential",
      },
      {
        id: "bldg-2",
        kind: "building",
        name: "Building B (Overlapping A)",
        layerId: "layer-buildings",
        boundary: [
          { x: 25, y: 25 },
          { x: 45, y: 25 },
          { x: 45, y: 45 },
          { x: 25, y: 45 },
        ],
        storeys: 1,
        height: 4,
        dwellingUnits: 1,
        use: "commercial",
      },
      {
        id: "bldg-3",
        kind: "building",
        name: "Building C (Safe)",
        layerId: "layer-buildings",
        boundary: [
          { x: 100, y: 100 },
          { x: 120, y: 100 },
          { x: 120, y: 120 },
          { x: 100, y: 120 },
        ],
        storeys: 1,
        height: 4,
        dwellingUnits: 1,
        use: "commercial",
      },
    ];

    const site: Site = {
      id: "site-test",
      name: "Physics test site",
      spatial: defaultSpatialContext(),
      layers: [],
      elements,
    };

    engine.syncWorld(site, 1.0);

    const collisions = engine.checkCollisions();
    expect(collisions.size).toBe(2);
    expect(collisions.has("bldg-1")).toBe(true);
    expect(collisions.has("bldg-2")).toBe(true);
    expect(collisions.has("bldg-3")).toBe(false);
  });
});
