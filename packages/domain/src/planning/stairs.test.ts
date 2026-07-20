import { describe, it, expect } from "vitest";
import { calculateStairGeometry } from "./stairs.js";
import type { Stair } from "../spatial/types.js";

describe("Stairs Geometry Calculation Engine", () => {
  const mockBoundary = [
    { x: 0, y: 0 },
    { x: 3.0, y: 0 },
    { x: 3.0, y: 1.0 },
    { x: 0, y: 1.0 },
  ];

  it("should calculate straight stairs riser counts and material volumes", () => {
    const stair: Stair = {
      id: "stair-1",
      kind: "stair",
      name: "Main Straight Stair",
      layerId: "architectural",
      boundary: mockBoundary,
      stairType: "straight",
      width: 1.0,
      height: 3.0, // 3m rise height
      riserHeightLimit: 0.18, // 18cm riser limit
      treadDepthLimit: 0.28,
      landingSlabThickness: 0.15,
      treadSlabThickness: 0.12,
      stringerWidth: 0.05,
    };

    const results = calculateStairGeometry(stair);

    // risers = ceil(3.0 / 0.18) = 17
    expect(results.riserCount).toBe(17);
    expect(results.actualRiserHeight).toBeCloseTo(3.0 / 17, 4);
    expect(results.treadCount).toBe(16);
    expect(results.concreteVolumeCuM).toBeGreaterThan(0);
    expect(results.timberBoardFeet).toBeGreaterThan(0);

    // Annotation lists
    expect(results.stringerCenterlines.length).toBe(2);
    expect(results.arrowPath.length).toBe(2); // Start to End
    expect(results.balusterAnchors.length).toBe(16); // 1 per tread
    expect(results.breakLine.length).toBe(2); // Left to right cut
  });

  it("should calculate spiral stairs tread wedge lines and winder wiggles", () => {
    const stair: Stair = {
      id: "stair-2",
      kind: "stair",
      name: "Spiral Escape Stair",
      layerId: "architectural",
      boundary: mockBoundary,
      stairType: "spiral",
      width: 0.9,
      height: 2.8,
      radius: 1.2,
      totalRotation: 270,
      riserHeightLimit: 0.18,
      treadDepthLimit: 0.28,
    };

    const results = calculateStairGeometry(stair);

    expect(results.riserCount).toBe(16); // ceil(2.8 / 0.18) = 16
    expect(results.treadCount).toBe(15);
    expect(results.stringerCenterlines.length).toBe(2); // Inner and outer stringers
    expect(results.treadLines.length).toBe(15);
    expect(results.balusterAnchors.length).toBe(15);
  });

  it("should calculate U-shaped stairs flight splits and direction arrows", () => {
    const stair: Stair = {
      id: "stair-3",
      kind: "stair",
      name: "Standard U Stair",
      layerId: "architectural",
      boundary: mockBoundary,
      stairType: "u-shape",
      width: 0.9,
      height: 3.2,
      uShapeOffset: 0.15,
      flightCount: 2,
      intermediateLandingLength: 1.0,
      riserHeightLimit: 0.18,
      treadDepthLimit: 0.28,
    };

    const results = calculateStairGeometry(stair);

    expect(results.riserCount).toBe(18); // ceil(3.2 / 0.18) = 18
    expect(results.treadCount).toBe(17);
    expect(results.stringerCenterlines.length).toBe(4); // 2 flights * 2 stringers
    expect(results.arrowPath.length).toBe(3); // Up-flight 1 -> Landing loop -> Flight 2 down
  });

  it("should trigger safety clearance limits warning on ceiling conflict", () => {
    const stair: Stair = {
      id: "stair-4",
      kind: "stair",
      name: "Low Clearance Stair",
      layerId: "architectural",
      boundary: mockBoundary,
      stairType: "straight",
      width: 1.0,
      height: 3.0,
      riserHeightLimit: 0.18,
      treadDepthLimit: 0.28,
      overheadClearanceLimit: 2.03, // 6'8"
      ceilingElevation: 4.5, // 4.5m ceiling - 3m rise = 1.5m clearance < 2.03m!
    };

    const results = calculateStairGeometry(stair);
    expect(results.warnings.length).toBeGreaterThan(0);
    expect(results.warnings[0]).toContain("Overhead clearance height");
  });
});
