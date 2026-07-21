import { describe, expect, it } from "vitest";
import type { Polygon } from "../../spatial/geometry";
import {
  subdivideSlideLine,
  subdivideSwingLine,
  mergeLots,
} from "../subdivision";

describe("Plat Design Boundary & Error Validation", () => {
  const validSquare: Polygon = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]; // Area: 10000

  const smallSquare: Polygon = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
  ]; // Area: 4

  describe("Slide Line Boundary Restrictions", () => {
    it("should throw error when target area exceeds total parcel area", () => {
      expect(() => {
        subdivideSlideLine(validSquare, {
          targetArea: 15000,
          frontage: [validSquare[0], validSquare[1]],
          layerId: "test",
          makeId: () => "lot",
        });
      }).toThrowError(
        /target area \(15000\.00\) exceeds total parcel area \(10000\.00\)/,
      );
    });

    it("should throw error when target area is zero or negative", () => {
      expect(() => {
        subdivideSlideLine(validSquare, {
          targetArea: -100,
          frontage: [validSquare[0], validSquare[1]],
          layerId: "test",
          makeId: () => "lot",
        });
      }).toThrowError("Invalid target area: must be greater than 0.");

      expect(() => {
        subdivideSlideLine(validSquare, {
          targetArea: 0,
          frontage: [validSquare[0], validSquare[1]],
          layerId: "test",
          makeId: () => "lot",
        });
      }).toThrowError("Invalid target area: must be greater than 0.");
    });

    it("should throw error when parcel area is too small to subdivide", () => {
      expect(() => {
        subdivideSlideLine(smallSquare, {
          targetArea: 2,
          frontage: [smallSquare[0], smallSquare[1]],
          layerId: "test",
          makeId: () => "lot",
        });
      }).toThrowError("Parcel area is too small to subdivide.");
    });

    it("should throw error for invalid frontage", () => {
      expect(() => {
        subdivideSlideLine(validSquare, {
          targetArea: 5000,
          frontage: [validSquare[0]], // Only 1 point
          layerId: "test",
          makeId: () => "lot",
        });
      }).toThrowError("Invalid frontage: must contain at least 2 points.");
    });
  });

  describe("Swing Line Boundary Restrictions", () => {
    it("should throw error when target area exceeds total parcel area", () => {
      expect(() => {
        subdivideSwingLine(validSquare, {
          targetArea: 15000,
          pivot: validSquare[2],
          layerId: "test",
          makeId: () => "lot",
        });
      }).toThrowError(
        /target area \(15000\.00\) exceeds total parcel area \(10000\.00\)/,
      );
    });

    it("should throw error when target area is zero or negative", () => {
      expect(() => {
        subdivideSwingLine(validSquare, {
          targetArea: -500,
          pivot: validSquare[2],
          layerId: "test",
          makeId: () => "lot",
        });
      }).toThrowError("Invalid target area: must be greater than 0.");
    });

    it("should throw error for invalid polygon boundaries (less than 3 points)", () => {
      const lineBoundary: Polygon = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ];
      expect(() => {
        subdivideSwingLine(lineBoundary, {
          targetArea: 5000,
          pivot: validSquare[2],
          layerId: "test",
          makeId: () => "lot",
        });
      }).toThrowError("Invalid boundary: must contain at least 3 points.");
    });
  });

  describe("Lot Merging Errors", () => {
    it("should throw error when no lots are provided", () => {
      expect(() => mergeLots([], "test", () => "merged")).toThrowError(
        "No lots provided for merge",
      );
    });

    it("should throw error when lots do not share an adjacent boundary", () => {
      const lot1 = {
        id: "1",
        kind: "lot" as const,
        name: "l1",
        layerId: "test",
        boundary: validSquare,
      };
      const nonAdjacentSquare = [
        { x: 200, y: 200 },
        { x: 300, y: 200 },
        { x: 300, y: 300 },
        { x: 200, y: 300 },
      ];
      const lot2 = {
        id: "2",
        kind: "lot" as const,
        name: "l2",
        layerId: "test",
        boundary: nonAdjacentSquare,
      };

      expect(() =>
        mergeLots([lot1, lot2], "test", () => "merged"),
      ).toThrowError("Cannot merge disjoint lots: boundaries do not connect");
    });
  });
});
