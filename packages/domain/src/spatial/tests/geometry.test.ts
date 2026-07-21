import { describe, expect, it } from "vitest";
import {
  area,
  bearing,
  bounds,
  centroid,
  distance,
  isValidPolygon,
  offsetPolygon,
  perimeter,
  pointInPolygon,
  signedArea,
  type Polygon,
} from "../geometry";

const unitSquare: Polygon = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe("area & perimeter", () => {
  it("computes the area of a square", () => {
    expect(area(unitSquare)).toBe(100);
  });

  it("is independent of winding order", () => {
    const cw = [...unitSquare].reverse();
    expect(area(cw)).toBe(100);
    expect(signedArea(unitSquare)).toBeGreaterThan(0);
    expect(signedArea(cw)).toBeLessThan(0);
  });

  it("computes the perimeter including the closing edge", () => {
    expect(perimeter(unitSquare)).toBe(40);
  });

  it("treats degenerate rings as zero area", () => {
    expect(
      area([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(0);
  });
});

describe("pointInPolygon", () => {
  it("returns true for interior points", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, unitSquare)).toBe(true);
  });

  it("returns false for exterior points", () => {
    expect(pointInPolygon({ x: 15, y: 5 }, unitSquare)).toBe(false);
    expect(pointInPolygon({ x: -1, y: 5 }, unitSquare)).toBe(false);
  });
});

describe("centroid & bounds", () => {
  it("computes the centroid of a square", () => {
    const c = centroid(unitSquare);
    expect(c.x).toBeCloseTo(5, 6);
    expect(c.y).toBeCloseTo(5, 6);
  });

  it("computes bounding boxes", () => {
    expect(bounds(unitSquare)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
    });
  });
});

describe("offsetPolygon", () => {
  it("insets a square inward by positive distance `d`", () => {
    const shrunk = offsetPolygon(unitSquare, 2)!;
    expect(area(shrunk)).toBeLessThan(area(unitSquare));
  });

  it("expands a square outward by negative distance `-d`", () => {
    const expanded = offsetPolygon(unitSquare, -2)!;
    expect(area(expanded)).toBeGreaterThan(area(unitSquare));
  });
});

describe("isValidPolygon", () => {
  it("accepts simple non-self-intersecting rings with ≥ 3 vertices", () => {
    expect(isValidPolygon(unitSquare)).toBe(true);
  });

  it("rejects degenerate rings", () => {
    expect(
      isValidPolygon([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(false);
  });
});
