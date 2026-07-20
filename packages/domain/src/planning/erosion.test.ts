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

    const sim = new ErosionSimulator(site, "sand");
    const frames = sim.runSimulation(5);

    expect(frames.length).toBe(5);
    expect(frames[0].step).toBe(0);
    expect(frames[0].heights.length).toBe(2500);
    expect(frames[0].particles.length).toBeGreaterThan(0);
  });

  it("should detect erosion control standards compliance violations", () => {
    const site1: Site = {
      id: "site-violating",
      name: "Violating Site",
      spatial: defaultSpatialContext(),
      layers: [],
      elements: [
        {
          id: "ditch-1",
          name: "Erodible Earth Ditch Channel",
          layerId: "layer-civil",
          kind: "grade",
          boundary: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          slope: 0.15, // 15% slope - steep
        } as any,
      ],
      controlLines: [
        {
          id: "fence-1",
          type: "silt-fence",
          path: [
            { x: 10, y: 10 },
            { x: 90, y: 10 },
          ],
          gradient: 0.40, // 40% slope behind fence
          slopeLength: 120, // 120ft slope length
        } as any,
      ],
      civilSymbols: [
        {
          id: "sock-1",
          type: "erosion-bale",
          position: { x: 50, y: 20 },
          label: "8-inch compost filter sock",
          gradient: 0.40, // too steep for 8" sock
          diameter: 8,
        } as any,
        {
          id: "inlet-1",
          type: "inlet-protection",
          position: { x: 60, y: 60 },
          subtype: "curb",
          overflowGapPresent: false, // missing overflow gap
        } as any,
        {
          id: "basin-1",
          type: "silt-basin",
          position: { x: 80, y: 80 },
          drainageArea: 2.0, // 2 acres
          capacityCuYd: 150, // requires 268 cu yd
          hasFairclothSkimmer: false,
          lengthWidthRatio: 1.2,
          spillwayCapacity: 5.0,
          hasTrashRack: false,
          wetStorageDepth: 1.0,
        } as any,
      ],
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

    // Verify all targeted standards findings are caught correctly
    expect(findings.some((f) => f.code === "erosion.flow.excessive")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.tc.tooShort")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.shear.exceeded")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.sock.slopeExceeded")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.inlet.overflowGapMissing")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.fence.upgradeRequired")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.basin.undersized")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.basin.skimmerMissing")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.basin.ratioTooLow")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.spillway.inadequate")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.basin.trashRackMissing")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.basin.depthTooShallow")).toBe(true);
    expect(findings.some((f) => f.code === "erosion.entrance.missing")).toBe(true);
  });
});
