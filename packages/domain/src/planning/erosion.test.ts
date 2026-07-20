import { describe, it, expect } from "vitest";
import type { Site } from "../spatial/types.js";
import { defaultSpatialContext } from "../spatial/spatial.js";
import { ErosionSimulator } from "./erosion.js";

describe("Erosion Control & Hydrology Simulation Engine", () => {
  it("should run erosion simulation and record timeline frames", () => {
    const site: Site = {
      id: "site-1",
      name: "Erosion Test Site",
      spatial: defaultSpatialContext(),
      layers: [],
      elements: [
        {
          id: "fence-1",
          name: "Silt Fence South",
          layerId: "layer-civil",
          kind: "curtainwall",
          boundary: [
            { x: 10, y: 35 },
            { x: 90, y: 35 },
          ],
          width: 80,
          height: 1.0,
        },
      ],
    };

    const sim = new ErosionSimulator(site);
    const frames = sim.runSimulation(5); // run 5 steps for quick test

    expect(frames.length).toBe(5);
    expect(frames[0].step).toBe(0);
    expect(frames[0].heights.length).toBe(2500);

    // Verify some particles were generated
    expect(frames[0].particles.length).toBeGreaterThan(0);

    // Verify soil loss statistics exist
    expect(frames[4].totalWaterRunoffLiters).toBeGreaterThan(0);
  });
});
