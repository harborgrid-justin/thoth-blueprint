import { describe, it, expect } from "vitest";
import type { Site } from "../spatial/types.js";
import { defaultSpatialContext } from "../spatial/spatial.js";
import { ErosionSimulator, auditErosionCompliance } from "./erosion.js";

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
    expect(frames[0].particles.length).toBeGreaterThan(0);
    expect(frames[4].totalWaterRunoffLiters).toBeGreaterThan(0);
  });

  it("should detect erosion control standards compliance violations", () => {
    // 1. Site with no barriers (MS-4 error) and road with no entrance (MS-15 error)
    const site1: Site = {
      id: "site-violating",
      name: "Violating Site",
      spatial: defaultSpatialContext(),
      layers: [],
      elements: [],
      networks: [
        {
          id: "road-1",
          name: "Main Access Road",
          kind: "road",
          nodes: [{ id: "n1", point: { x: 0, y: 0 } }, { id: "n2", point: { x: 20, y: 10 } }],
          edges: [{ id: "e1", from: "n1", to: "n2" }],
        },
      ],
    };

    const findings = auditErosionCompliance(site1);
    expect(findings.some((f) => f.code === "erosion.perimeter.missing")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.entrance.missing")).toBe(true);
  });
});
