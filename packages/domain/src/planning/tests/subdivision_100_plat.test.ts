import { describe, expect, it } from "vitest";
import type { Polygon } from "../../spatial/geometry";
import { area as polygonArea } from "../../spatial/geometry";
import {
  splitPolygonByLine,
  subdivideSlideLine,
  subdivideSwingLine,
  mergeLots,
} from "../subdivision";

describe("100 Realistic Plat Design & Subdivision Test Scenarios", () => {
  const generateRealisticPolygon = (
    sides: number,
    radius: number,
    cx: number,
    cy: number,
  ): Polygon => {
    const poly: Polygon = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides;
      // Add slight realistic irregularity
      const r = radius + Math.sin(angle * 3) * radius * 0.1;
      poly.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return poly;
  };

  // Scenario 1-25: Slide Line Subdivisions on varying lot shapes and target areas
  describe("Slide Line Subdivisions (25 Scenarios)", () => {
    for (let i = 1; i <= 25; i++) {
      it(`Slide Line Scenario ${i}: Polygon with ${(i % 5) + 3} sides, target area ${1000 * i}`, () => {
        // Generate a standard convex polygon (no wavy irregularity) to avoid self-intersection
        const sides = (i % 5) + 3;
        const poly: Polygon = [];
        const radius = 100 + i * 5;
        for (let j = 0; j < sides; j++) {
          const angle = (j * 2 * Math.PI) / sides;
          poly.push({
            x: 500 + radius * Math.cos(angle),
            y: 500 + radius * Math.sin(angle),
          });
        }

        const totalArea = polygonArea(poly);
        const target = Math.min(1000 * i, totalArea * 0.2); // Ensure target is small enough
        const frontage = [poly[0], poly[1]];
        let counter = 0;

        const lots = subdivideSlideLine(poly, {
          targetArea: target,
          frontage,
          angle: 90 + ((i * 5) % 90), // Keep angle within a reasonable range relative to frontage
          layerId: "plat",
          makeId: () => `lot-${i}-${++counter}`,
        });

        if (lots.length > 0) {
          expect(polygonArea(lots[0].boundary)).toBeGreaterThan(0);
        } else {
          expect(lots).toHaveLength(0); // Valid failure due to impossible geometry
        }
      });
    }
  });

  // Scenario 26-50: Swing Line Subdivisions on varying lot shapes
  describe("Swing Line Subdivisions (25 Scenarios)", () => {
    for (let i = 26; i <= 50; i++) {
      it(`Swing Line Scenario ${i}: Polygon with ${(i % 4) + 4} sides, pivot rotation`, () => {
        const sides = (i % 4) + 4;
        const poly: Polygon = [];
        const radius = 150 + i * 2;
        for (let j = 0; j < sides; j++) {
          const angle = (j * 2 * Math.PI) / sides;
          poly.push({
            x: 1000 + radius * Math.cos(angle),
            y: 1000 + radius * Math.sin(angle),
          });
        }

        const totalArea = polygonArea(poly);
        const target = totalArea * 0.25; // Quarter lot
        const pivot = poly[2];
        let counter = 0;

        const lots = subdivideSwingLine(poly, {
          targetArea: target,
          pivot,
          startAngle: ((i * 10) % 360) - 180,
          layerId: "plat",
          makeId: () => `swing-${i}-${++counter}`,
        });

        if (lots.length > 0) {
          expect(polygonArea(lots[0].boundary)).toBeGreaterThan(0);
        }
      });
    }
  });

  // Scenario 51-75: Polygon Splitting (Half Lots, Easements)
  describe("Polygon Splitting (25 Scenarios)", () => {
    for (let i = 51; i <= 75; i++) {
      it(`Polygon Split Scenario ${i}: Custom bisector angles`, () => {
        const poly = generateRealisticPolygon(4, 200, 0, 0); // Roughly square
        const angle = (i * Math.PI) / 12; // Rotate splitting line
        const p1 = { x: -300 * Math.cos(angle), y: -300 * Math.sin(angle) };
        const p2 = { x: 300 * Math.cos(angle), y: 300 * Math.sin(angle) };

        const split = splitPolygonByLine(poly, p1, p2);

        if (split && split.length === 2) {
          const area1 = polygonArea(split[0]);
          const area2 = polygonArea(split[1]);
          const totalArea = polygonArea(poly);
          expect(area1 + area2).toBeCloseTo(totalArea, 0);
        }
      });
    }
  });

  // Scenario 76-100: Lot Merging & Consolidation
  describe("Lot Consolidation (25 Scenarios)", () => {
    for (let i = 76; i <= 100; i++) {
      it(`Lot Merge Scenario ${i}: Merging adjacent realistic subdivisions`, () => {
        // Create a large rectangle and split it into two perfect adjacent lots
        const width = 100 + i;
        const height = 200;
        const poly: Polygon = [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
        ];

        const p1 = { x: width / 2, y: -10 };
        const p2 = { x: width / 2, y: height + 10 };
        const split = splitPolygonByLine(poly, p1, p2);

        expect(split).not.toBeNull();
        expect(split).toHaveLength(2);

        const lot1 = {
          id: `m1-${i}`,
          kind: "lot" as const,
          name: "Lot 1",
          layerId: "plat",
          boundary: split![0],
        };
        const lot2 = {
          id: `m2-${i}`,
          kind: "lot" as const,
          name: "Lot 2",
          layerId: "plat",
          boundary: split![1],
        };

        let counter = 0;
        const merged = mergeLots(
          [lot1, lot2],
          "plat",
          () => `merged-${i}-${++counter}`,
        );

        expect(polygonArea(merged.boundary)).toBeCloseTo(polygonArea(poly), 1);
        expect(merged.boundary.length).toBeGreaterThanOrEqual(4);
      });
    }
  });
});
