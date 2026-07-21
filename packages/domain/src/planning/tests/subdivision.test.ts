import { describe, expect, it } from "vitest";
import type { Polygon } from "../../spatial/geometry";
import { area as polygonArea } from "../../spatial/geometry";
import type { Lot } from "../../spatial/primitives";
import {
  splitPolygonByLine,
  subdivideSlideLine,
  subdivideSwingLine,
  mergeLots,
} from "../subdivision";

describe("Subdivision Engine", () => {
  const square: Polygon = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it("splits a polygon by a line", () => {
    const p1 = { x: 50, y: 0 };
    const p2 = { x: 50, y: 100 };
    const split = splitPolygonByLine(square, p1, p2);
    expect(split).not.toBeNull();
    expect(split).toHaveLength(2);
    expect(polygonArea(split![0])).toBeCloseTo(5000);
    expect(polygonArea(split![1])).toBeCloseTo(5000);
  });

  it("subdivides a parcel using Slide Line", () => {
    const frontage = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    let idCounter = 0;
    const makeId = () => `lot-${++idCounter}`;

    const lots = subdivideSlideLine(square, {
      targetArea: 3000,
      frontage,
      angle: 90,
      layerId: "lot-layer",
      makeId,
    });

    expect(lots).toHaveLength(1);
    expect(polygonArea(lots[0].boundary)).toBeCloseTo(3000, 1);
    const xs = lots[0].boundary.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(30, 1);
  });

  it("subdivides a parcel using Swing Line", () => {
    const pivot = { x: 0, y: 100 };
    let idCounter = 0;
    const makeId = () => `lot-${++idCounter}`;

    const lots = subdivideSwingLine(square, {
      targetArea: 2500,
      pivot,
      startAngle: -90,
      layerId: "lot-layer",
      makeId,
    });

    expect(lots).toHaveLength(1);
    expect(polygonArea(lots[0].boundary)).toBeCloseTo(2500, 1);
  });

  it("merges adjacent lots by boundary dissolution", () => {
    const lot1: Lot = {
      id: "l1",
      kind: "lot",
      name: "Lot 1",
      layerId: "lot-layer",
      boundary: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 100 },
        { x: 0, y: 100 },
      ],
    };
    const lot2: Lot = {
      id: "l2",
      kind: "lot",
      name: "Lot 2",
      layerId: "lot-layer",
      boundary: [
        { x: 50, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 50, y: 100 },
      ],
    };

    let idCounter = 0;
    const makeId = () => `lot-${++idCounter}`;
    const merged = mergeLots([lot1, lot2], "lot-layer", makeId);
    expect(polygonArea(merged.boundary)).toBeCloseTo(10000);

    const xs = merged.boundary.map((p) => p.x);
    const ys = merged.boundary.map((p) => p.y);
    expect(Math.max(...xs)).toBe(100);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...ys)).toBe(100);
    expect(Math.min(...ys)).toBe(0);
  });
});
