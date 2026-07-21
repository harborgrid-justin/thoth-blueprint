import { describe, expect, it } from "vitest";
import {
  area as polygonArea,
  distance,
  type Point,
  type Polygon,
} from "../geometry";
import {
  boundaryArea,
  boundaryPerimeter,
  bulgeToArc,
  densifyArc,
  densifyBoundary,
  edgeBulge,
  hasArcs,
} from "../curve";

const S: Point = { x: 0, y: 0 };
const E: Point = { x: 10, y: 0 };

describe("bulgeToArc", () => {
  it("resolves a semicircle (bulge = 1)", () => {
    const arc = bulgeToArc(S, E, 1)!;
    expect(arc.radius).toBeCloseTo(5, 9);
    expect(arc.center.x).toBeCloseTo(5, 9);
    expect(arc.center.y).toBeCloseTo(0, 9);
    expect(arc.delta).toBeCloseTo(Math.PI, 9);
    expect(arc.arcLength).toBeCloseTo(Math.PI * 5, 9);
    expect(arc.chordLength).toBeCloseTo(10, 9);
    // The mid-arc point is one radius from the center.
    expect(distance(arc.mid, arc.center)).toBeCloseTo(5, 9);
  });

  it("resolves a quarter circle and its tangent", () => {
    const bulge = Math.tan(Math.PI / 8); // Δ = 90°
    const arc = bulgeToArc(S, E, bulge)!;
    expect(arc.delta).toBeCloseTo(Math.PI / 2, 9);
    // R = chord / (2 sin(Δ/2)) = 10 / (2 sin45°) = 7.0710678…
    expect(arc.radius).toBeCloseTo(10 / (2 * Math.sin(Math.PI / 4)), 9);
    // Tangent = R tan(Δ/2) = R tan45° = R.
    expect(arc.tangent).toBeCloseTo(arc.radius, 9);
  });

  it("flips the bulge side with the sign", () => {
    const up = bulgeToArc(S, E, 0.5)!;
    const down = bulgeToArc(S, E, -0.5)!;
    expect(up.center.y).toBeLessThan(0);
    expect(down.center.y).toBeGreaterThan(0);
  });
});

describe("densifyBoundary", () => {
  it("densifies curved edges into polyline points", () => {
    const poly: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const arcs = { "0": 1 }; // Semicircle on edge 0
    const points = densifyBoundary(poly, arcs, 4);
    // Edge 0 gives 4 arc points; 3 remaining straight edges give 3 points = 7.
    expect(points.length).toBeGreaterThan(5);
  });

  it("leaves straight boundaries unchanged", () => {
    const poly: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(densifyBoundary(poly)).toEqual(poly);
  });
});

describe("boundaryArea & boundaryPerimeter", () => {
  it("matches straight polygon area when no arcs are defined", () => {
    const poly: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(boundaryArea(poly)).toBe(100);
    expect(boundaryPerimeter(poly)).toBe(40);
  });

  it("adds circular segment area for outward bulges", () => {
    const poly: Polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const arcs = { "0": -1 }; // Semicircle bulging outward
    const semiArea = (Math.PI * 5 * 5) / 2;
    expect(boundaryArea(poly, arcs)).toBeCloseTo(100 + semiArea, 6);
  });
});
