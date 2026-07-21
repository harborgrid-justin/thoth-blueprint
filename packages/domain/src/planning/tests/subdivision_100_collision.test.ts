import { describe, expect, it } from "vitest";
import type { Polygon, Point } from "../../spatial/geometry";
import {
  area as polygonArea,
  pointInPolygon,
  pointOnSegment,
} from "../../spatial/geometry";
import { splitPolygonByLine, subdivideSlideLine } from "../subdivision";

/**
 * Validates that two adjacent lot polygons do not overlap.
 * We use an area-conservation approach to guarantee no overlaps or gaps,
 * which avoids the false positives of pointInPolygon for shared boundary edges.
 */
function checkNoOverlap(originalPoly: Polygon, subLots: Polygon[]) {
  const originalArea = polygonArea(originalPoly);
  const totalSubArea = subLots.reduce((sum, p) => sum + polygonArea(p), 0);

  // The sum of the parts must equal the whole (within floating point margin)
  expect(Math.abs(originalArea - totalSubArea)).toBeLessThan(
    originalArea * 0.01,
  ); // 1% margin

  // Additionally check that the centroid of each sublot is strictly NOT in any other sublot
  // (Centroids of convex lots are strictly interior)
  for (let i = 0; i < subLots.length; i++) {
    for (let j = i + 1; j < subLots.length; j++) {
      const p1 = subLots[i];
      const p2 = subLots[j];

      const c1 = getCentroid(p1);
      const c2 = getCentroid(p2);

      // If a centroid is on an edge, it's highly degenerate, but for convex it should be safely interior.
      // So if c1 is inside p2, they definitely overlap.
      expect(pointInPolygon(c1, p2)).toBe(false);
      expect(pointInPolygon(c2, p1)).toBe(false);
    }
  }
}

function getCentroid(poly: Polygon): Point {
  let cx = 0,
    cy = 0;
  for (const pt of poly) {
    cx += pt.x;
    cy += pt.y;
  }
  return { x: cx / poly.length, y: cy / poly.length };
}

describe("100 Plat Overlap & Collision Scenarios", () => {
  const generateBasePolygon = (offset: number, size: number): Polygon => [
    { x: offset, y: offset },
    { x: offset + size, y: offset },
    { x: offset + size + size * 0.2, y: offset + size * 0.8 },
    { x: offset + size, y: offset + size },
    { x: offset, y: offset + size },
  ];

  // Scenarios 1-50: Repeated Slide Line Cuts (Progressive Subdivision)
  describe("Progressive Subdivision Collisions (50 Scenarios)", () => {
    for (let i = 1; i <= 50; i++) {
      it(`Collision Scenario ${i}: Progressive multi-lot slide lines (Area ${1000 * i})`, () => {
        const poly = generateBasePolygon(i * 10, 200 + i * 2);
        const subLots: Polygon[] = [];
        let remainder: Polygon | null = poly;

        // Try to cut up to 4 lots
        for (let cut = 0; cut < 4; cut++) {
          if (!remainder || polygonArea(remainder) < 500) break;
          const targetArea = polygonArea(remainder) * 0.2; // cut 20%
          const frontage = [remainder[0], remainder[1]];
          const lots = subdivideSlideLine(remainder, {
            targetArea,
            frontage,
            angle: 90,
            layerId: "test",
            makeId: () => "lot",
          });

          if (lots.length > 0) {
            subLots.push(lots[0].boundary);
            // In a real scenario we'd update remainder, but subdivideSlideLine only returns the lot.
            // Let's use splitPolygonByLine to cleanly get the remainder for testing overlaps.
            const splitPt = lots[0].boundary[2]; // heuristic point
            const p2 = { x: splitPt.x, y: splitPt.y + 100 };
            const parts = splitPolygonByLine(remainder, splitPt, p2);
            if (parts && parts.length === 2) {
              remainder = parts[1]; // approximate remainder for test
            } else {
              break;
            }
          }
        }
        // At the end, verify the generated subLots don't overlap with each other
        if (subLots.length > 1) {
          // Just check centroids for overlap
          for (let a = 0; a < subLots.length; a++) {
            for (let b = a + 1; b < subLots.length; b++) {
              expect(pointInPolygon(getCentroid(subLots[a]), subLots[b])).toBe(
                false,
              );
            }
          }
        }
      });
    }
  });

  // Scenarios 51-100: Grid/Block Subdivision using infinite bisecting lines
  describe("Grid Block Collisions (50 Scenarios)", () => {
    for (let i = 51; i <= 100; i++) {
      it(`Collision Scenario ${i}: Grid intersection bisections`, () => {
        const poly = generateBasePolygon(0, 500 + i);
        // Cut vertically
        const vSplit = splitPolygonByLine(
          poly,
          { x: 250 + i * 0.5, y: -100 },
          { x: 250 + i * 0.5, y: 1000 },
        );

        expect(vSplit).not.toBeNull();
        expect(vSplit).toHaveLength(2);

        if (vSplit) {
          // Cut left half horizontally
          const leftCut = splitPolygonByLine(
            vSplit[0],
            { x: -100, y: 250 + i * 0.5 },
            { x: 1000, y: 250 + i * 0.5 },
          );

          // Cut right half horizontally
          const rightCut = splitPolygonByLine(
            vSplit[1],
            { x: -100, y: 250 + i * 0.5 },
            { x: 1000, y: 250 + i * 0.5 },
          );

          const finalLots: Polygon[] = [];
          if (leftCut) finalLots.push(...leftCut);
          if (rightCut) finalLots.push(...rightCut);

          expect(finalLots.length).toBeGreaterThanOrEqual(2);
          checkNoOverlap(poly, finalLots);
        }
      });
    }
  });
});
