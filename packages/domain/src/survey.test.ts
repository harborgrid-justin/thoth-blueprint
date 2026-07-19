import { describe, expect, it } from "vitest";
import { defaultSpatialContext } from "./spatial";
import type { Polygon } from "./geometry";
import {
  azimuth,
  azimuthToBearing,
  bearingText,
  boundaryCoordinates,
  formatBearing,
  legalDescription,
  polygonCourses,
  surveyReport,
  toDms,
  traverseClosure,
} from "./survey";

// A 100×100 square. Screen Y increases downward, so survey north is −Y.
const square: Polygon = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];
const spatial = defaultSpatialContext(); // meters

describe("azimuth & bearing", () => {
  it("measures azimuth clockwise from north (−Y)", () => {
    expect(azimuth({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(0); // due north (up)
    expect(azimuth({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(90); // due east
    expect(azimuth({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(180); // due south (down)
    expect(azimuth({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(270); // due west
  });

  it("formats quadrant bearings", () => {
    expect(bearingText({ x: 0, y: 0 }, { x: 10, y: -10 })).toBe("N45°00′00″E");
    expect(bearingText({ x: 0, y: 0 }, { x: 10, y: 10 })).toBe("S45°00′00″E");
  });

  it("labels cardinal directions", () => {
    expect(formatBearing(azimuthToBearing(0))).toBe("Due North");
    expect(formatBearing(azimuthToBearing(90))).toBe("Due East");
    expect(formatBearing(azimuthToBearing(180))).toBe("Due South");
    expect(formatBearing(azimuthToBearing(270))).toBe("Due West");
  });

  it("converts decimal degrees to DMS with carry", () => {
    expect(toDms(45.25)).toEqual({ degrees: 45, minutes: 15, seconds: 0 });
    expect(toDms(30.50833333)).toEqual({ degrees: 30, minutes: 30, seconds: 30 });
  });
});

describe("courses & closure", () => {
  it("produces one course per edge with correct bearings", () => {
    const courses = polygonCourses(square, spatial);
    expect(courses).toHaveLength(4);
    expect(courses.map((c) => c.bearingText)).toEqual([
      "Due East",
      "Due South",
      "Due West",
      "Due North",
    ]);
    expect(courses.every((c) => Math.abs(c.distance - 100) < 1e-9)).toBe(true);
  });

  it("closes exactly for a polygon-derived traverse", () => {
    const closure = traverseClosure(polygonCourses(square, spatial));
    expect(closure.linearMisclosure).toBeLessThan(1e-6);
    expect(closure.precisionText).toBe("Exact (closed)");
    expect(closure.perimeter).toBeCloseTo(400);
  });
});

describe("coordinates & report", () => {
  it("assigns positive local northing/easting", () => {
    const coords = boundaryCoordinates(square);
    expect(coords[0]).toMatchObject({ label: "P1", easting: 5000, northing: 5000 });
    expect(coords[2]).toMatchObject({ label: "P3", easting: 5100, northing: 4900 });
  });

  it("reports area in survey units and acres", () => {
    const report = surveyReport(square, spatial);
    expect(report.area.squareMeters).toBeCloseTo(10000);
    expect(report.area.acres).toBeCloseTo(2.471, 2);
  });
});

describe("legal description", () => {
  it("reads as a metes-and-bounds description", () => {
    const text = legalDescription(square, spatial, { tractName: "Lot 1", context: "Test Subdivision" });
    expect(text).toContain("BEGINNING at the Point of Beginning");
    expect(text).toContain("thence Due East");
    expect(text).toContain("the POINT OF BEGINNING");
    expect(text).toContain("acres");
    expect(text).toContain("Test Subdivision");
  });
});
