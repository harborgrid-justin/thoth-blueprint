import { describe, it, expect } from "vitest";
import type { RoofElement } from "../../spatial/types.js";
import { calculateRoofGeometry } from "../roof.js";

describe("Roof Design Calculations Engine", () => {
  it("should calculate gable roof properties, pitch factors, and true surface area", () => {
    const roof: RoofElement = {
      id: "roof-1",
      name: "Residential Gable Roof",
      layerId: "layer-roofs",
      kind: "roof",
      roofType: "gable",
      pitch: 8, // 8:12 pitch
      boundary: [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
        { x: 12, y: 10 },
        { x: 0, y: 10 },
      ],
      overhang: 0.3,
      soffitWidth: 0.3,
      soffitVents: true,
      thickness: 0.2,
      shingleMaterial: "asphalt",
    };

    const res = calculateRoofGeometry(roof);
    expect(res.pitchAngleRad).toBeCloseTo(0.588, 3); // atan(8/12)
    expect(res.slopeFactor).toBeCloseTo(1.20185, 4); // sqrt(1 + (8/12)^2)
    expect(res.planAreaSqm).toBe(120);
    expect(res.trueAreaSqm).toBeCloseTo(144.22, 1);
    expect(res.ridgeLine.length).toBe(2);
    expect(res.warnings.length).toBe(0); // pitch is >= 3
  });

  it("should compute hip roof details and verify rafter counts", () => {
    const roof: RoofElement = {
      id: "roof-2",
      name: "Hip Roof Style",
      layerId: "layer-roofs",
      kind: "roof",
      roofType: "hip",
      pitch: 6, // 6:12
      boundary: [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
        { x: 12, y: 10 },
        { x: 0, y: 10 },
      ],
    };

    const res = calculateRoofGeometry(roof);
    expect(res.hipLines.length).toBe(4);
    expect(res.rafterLines.length).toBeGreaterThan(0);
    expect(res.warnings.length).toBe(0);
  });

  it("should flag low pitch and insufficient ventilation warnings", () => {
    const flatRoof: RoofElement = {
      id: "roof-3",
      name: "Flat Roof Vent Warn",
      layerId: "layer-roofs",
      kind: "roof",
      roofType: "flat",
      pitch: 1.5, // low pitch
      boundary: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      soffitVents: false, // no soffit vents -> insufficient vent area
    };

    const res = calculateRoofGeometry(flatRoof);
    expect(res.warnings.length).toBeGreaterThan(0); // low pitch warning
    expect(res.ventilationWarnings.length).toBeGreaterThan(0); // insufficient venting warning
  });
});
