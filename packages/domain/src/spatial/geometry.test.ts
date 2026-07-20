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
} from "./geometry";

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
    expect(area([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
    expect(isValidPolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
    expect(isValidPolygon(unitSquare)).toBe(true);
  });
});

describe("centroid & bounds", () => {
  it("places the centroid of a square at its center", () => {
    const c = centroid(unitSquare);
    expect(c.x).toBeCloseTo(5);
    expect(c.y).toBeCloseTo(5);
  });

  it("computes an axis-aligned bounding box", () => {
    expect(bounds(unitSquare)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
  });
});

describe("pointInPolygon", () => {
  it("detects interior points", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, unitSquare)).toBe(true);
  });

  it("detects exterior points", () => {
    expect(pointInPolygon({ x: 15, y: 5 }, unitSquare)).toBe(false);
  });

  it("treats boundary points as inside", () => {
    expect(pointInPolygon({ x: 0, y: 5 }, unitSquare)).toBe(true);
  });
});

describe("offsetPolygon (setbacks)", () => {
  it("insets a square uniformly", () => {
    const inset = offsetPolygon(unitSquare, 2);
    expect(inset).not.toBeNull();
    expect(area(inset!)).toBeCloseTo(36); // 6 x 6
  });

  it("returns null when the inset collapses the ring", () => {
    expect(offsetPolygon(unitSquare, 10)).toBeNull();
  });
});

describe("distance & bearing", () => {
  it("computes euclidean distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("reports north as 0 degrees", () => {
    expect(bearing({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(0);
    expect(bearing({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
  });
});
