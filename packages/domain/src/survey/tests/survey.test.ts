import { describe, expect, it } from "vitest";
import { defaultSpatialContext } from "../../spatial/spatial";
import type { Polygon } from "../../spatial/geometry";
import { area as polygonArea } from "../../spatial/geometry";
import {
  azimuth,
  azimuthToBearing,
  bearingText,
  bearingToAzimuth,
  boundaryCoordinates,
  dmdArea,
  formatBearing,
  interiorAngles,
  legalDescription,
  polygonCourses,
  recordClosure,
  surveyReport,
  toDms,
  traverseClosure,
  parseBearing,
  adjustTraverse,
} from "../survey";

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
    expect(toDms(30.50833333)).toEqual({
      degrees: 30,
      minutes: 30,
      seconds: 30,
    });
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

  it("closes the recorded (rounded) traverse", () => {
    const record = recordClosure(polygonCourses(square, spatial));
    expect(record.precisionText).toBe("Exact (closed)");
    // A tract with non-round geometry still closes tightly from rounded record.
    const tri: Polygon = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 40, y: 70 },
    ];
    const rec = recordClosure(polygonCourses(tri, spatial));
    expect(rec.linearMisclosure).toBeLessThan(0.05);
    expect(rec.perimeter).toBeGreaterThan(0);
  });
});

// An L-shaped tract exercises a reflex (concave) corner.
const ell: Polygon = [
  { x: 0, y: 0 },
  { x: 60, y: 0 },
  { x: 60, y: 40 },
  { x: 30, y: 40 },
  { x: 30, y: 80 },
  { x: 0, y: 80 },
];

describe("interior angles", () => {
  it("gives 90° at every corner of a square", () => {
    const angles = interiorAngles(square);
    angles.forEach((a) => expect(a).toBeCloseTo(90, 6));
    expect(angles.reduce((s, a) => s + a, 0)).toBeCloseTo(360, 6);
  });

  it("sums to (n−2)·180° and finds the reflex corner on a concave tract", () => {
    const angles = interiorAngles(ell);
    expect(angles.reduce((s, a) => s + a, 0)).toBeCloseTo(
      (ell.length - 2) * 180,
      6,
    );
    const reflex = angles.filter((a) => a > 180);
    expect(reflex).toHaveLength(1);
    expect(reflex[0]).toBeCloseTo(270, 6);
  });
});

describe("bearing ↔ azimuth round-trip", () => {
  it("recovers the azimuth from a quadrant bearing", () => {
    for (const az of [15.5, 100.25, 210.9, 355.1, 44.999]) {
      expect(bearingToAzimuth(azimuthToBearing(az))).toBeCloseTo(az, 3);
    }
  });
});

describe("DMD area cross-check", () => {
  it("agrees with the shoelace area independently", () => {
    for (const poly of [square, ell]) {
      const dmd = dmdArea(polygonCourses(poly, spatial));
      expect(dmd).toBeCloseTo(polygonArea(poly), 6);
    }
  });
});

describe("full report", () => {
  it("carries angles, record closure, and a verified DMD area", () => {
    const report = surveyReport(ell, spatial);
    expect(report.anglesSum).toBeCloseTo(report.anglesExpected, 6);
    expect(report.anglesExpected).toBe(720);
    expect(report.areaByDmd).toBeCloseTo(report.area.squareUnits, 4);
    expect(report.areaByDmd).toBeCloseTo(3600, 4);
    expect(report.record.linearMisclosure).toBeGreaterThanOrEqual(0);
  });
});

describe("coordinates & report", () => {
  it("assigns positive local northing/easting", () => {
    const coords = boundaryCoordinates(square);
    expect(coords[0]).toMatchObject({
      label: "P1",
      easting: 5000,
      northing: 5000,
    });
    expect(coords[2]).toMatchObject({
      label: "P3",
      easting: 5100,
      northing: 4900,
    });
  });

  it("reports area in survey units and acres", () => {
    const report = surveyReport(square, spatial);
    expect(report.area.squareMeters).toBeCloseTo(10000);
    expect(report.area.acres).toBeCloseTo(2.471, 2);
  });
});

describe("curved tract", () => {
  // The 100×100 square's edge 0 becomes a semicircle bulging outward (−y).
  const arcs = { "0": -1 };
  const SEMI = (Math.PI * 50 * 50) / 2; // radius-50 semicircle

  it("reports the curve table and arc-aware area/perimeter", () => {
    const report = surveyReport(square, spatial, arcs);
    expect(report.hasCurves).toBe(true);
    expect(report.curves).toHaveLength(1);
    const c = report.curves[0];
    expect(c.label).toBe("C1");
    expect(c.radius).toBeCloseTo(50, 6);
    expect(c.delta).toBeCloseTo(180, 6);
    expect(c.arcLength).toBeCloseTo(Math.PI * 50, 6);

    // Area includes the semicircle; perimeter uses the arc length, not the chord.
    expect(report.area.squareUnits).toBeCloseTo(10000 + SEMI, 3);
    expect(report.perimeter).toBeCloseTo(300 + Math.PI * 50, 6);

    // The chord-traverse DMD area omits the segment; the gap is the segment area.
    expect(report.area.squareUnits - report.areaByDmd).toBeCloseTo(SEMI, 3);
  });

  it("describes the curve in the legal description", () => {
    const text = legalDescription(
      square,
      spatial,
      { tractName: "Lot 7" },
      arcs,
    );
    expect(text).toContain("along a curve to the");
    expect(text).toContain("radius of");
    expect(text).toContain("arc length of");
  });
});

describe("legal description", () => {
  it("reads as a metes-and-bounds description", () => {
    const text = legalDescription(square, spatial, {
      tractName: "Lot 1",
      context: "Test Subdivision",
    });
    expect(text).toContain("BEGINNING at the Point of Beginning");
    expect(text).toContain("thence Due East");
    expect(text).toContain("the POINT OF BEGINNING");
    expect(text).toContain("acres");
    expect(text).toContain("Test Subdivision");
  });
});

describe("bearing parsing", () => {
  it("parses cardinal directions", () => {
    expect(parseBearing("Due North")).toEqual({
      ns: "N",
      degrees: 0,
      minutes: 0,
      seconds: 0,
      ew: "E",
      cardinal: "N",
    });
    expect(parseBearing("N")).toEqual({
      ns: "N",
      degrees: 0,
      minutes: 0,
      seconds: 0,
      ew: "E",
      cardinal: "N",
    });
    expect(parseBearing("Due West")).toEqual({
      ns: "N",
      degrees: 90,
      minutes: 0,
      seconds: 0,
      ew: "W",
      cardinal: "W",
    });
  });

  it("parses standard quadrant bearings", () => {
    expect(parseBearing("N 45-30-15 E")).toEqual({
      ns: "N",
      degrees: 45,
      minutes: 30,
      seconds: 15,
      ew: "E",
    });
    expect(parseBearing("S45.5W")).toEqual({
      ns: "S",
      degrees: 45,
      minutes: 30,
      seconds: 0,
      ew: "W",
    });
    expect(parseBearing("N 45°30'15\" E")).toEqual({
      ns: "N",
      degrees: 45,
      minutes: 30,
      seconds: 15,
      ew: "E",
    });
  });

  it("throws on invalid bearings", () => {
    expect(() => parseBearing("Invalid")).toThrow();
    expect(() => parseBearing("N 100 E")).toThrow(); // Val cannot exceed 90
  });
});

describe("traverse adjustments", () => {
  it("closes an open traverse using Compass (Bowditch) Rule", () => {
    // Construct manual courses with a 2-unit departure gap (ends at 2,0 instead of 0,0)
    const courses: SurveyCourse[] = [
      {
        index: 1,
        type: "line",
        from: { x: 0, y: 0 },
        to: { x: 100, y: 0 },
        fromLabel: "P1",
        toLabel: "P2",
        azimuth: 90,
        bearing: {
          ns: "N",
          degrees: 90,
          minutes: 0,
          seconds: 0,
          ew: "E",
          cardinal: "E",
        },
        bearingText: "Due East",
        distance: 100,
        distanceMeters: 100,
        latitude: 0,
        departure: 100,
      },
      {
        index: 2,
        type: "line",
        from: { x: 100, y: 0 },
        to: { x: 100, y: 100 },
        fromLabel: "P2",
        toLabel: "P3",
        azimuth: 180,
        bearing: {
          ns: "S",
          degrees: 0,
          minutes: 0,
          seconds: 0,
          ew: "E",
          cardinal: "S",
        },
        bearingText: "Due South",
        distance: 100,
        distanceMeters: 100,
        latitude: -100,
        departure: 0,
      },
      {
        index: 3,
        type: "line",
        from: { x: 100, y: 100 },
        to: { x: 0, y: 100 },
        fromLabel: "P3",
        toLabel: "P4",
        azimuth: 270,
        bearing: {
          ns: "N",
          degrees: 90,
          minutes: 0,
          seconds: 0,
          ew: "W",
          cardinal: "W",
        },
        bearingText: "Due West",
        distance: 100,
        distanceMeters: 100,
        latitude: 0,
        departure: -100,
      },
      {
        index: 4,
        type: "line",
        from: { x: 0, y: 100 },
        to: { x: 2, y: 0 },
        fromLabel: "P4",
        toLabel: "P1",
        azimuth: 0,
        bearing: {
          ns: "N",
          degrees: 0,
          minutes: 0,
          seconds: 0,
          ew: "E",
          cardinal: "N",
        },
        bearingText: "Due North",
        distance: 100,
        distanceMeters: 100,
        latitude: 100,
        departure: 2,
      },
    ];

    const closureBefore = traverseClosure(courses);
    expect(closureBefore.linearMisclosure).toBeGreaterThan(1);
    expect(closureBefore.precisionText).not.toBe("Exact (closed)");

    const adjusted = adjustTraverse(courses, "compass");
    expect(adjusted.closureAfter.linearMisclosure).toBeLessThan(1e-9);
    expect(adjusted.closureAfter.precisionText).toBe("Exact (closed)");
    expect(adjusted.courses[adjusted.courses.length - 1].to).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("closes an open traverse using Transit Rule", () => {
    // Construct manual courses with a 2-unit latitude gap (ends at 0,-2 instead of 0,0)
    const courses: SurveyCourse[] = [
      {
        index: 1,
        type: "line",
        from: { x: 0, y: 0 },
        to: { x: 100, y: 0 },
        fromLabel: "P1",
        toLabel: "P2",
        azimuth: 90,
        bearing: {
          ns: "N",
          degrees: 90,
          minutes: 0,
          seconds: 0,
          ew: "E",
          cardinal: "E",
        },
        bearingText: "Due East",
        distance: 100,
        distanceMeters: 100,
        latitude: 0,
        departure: 100,
      },
      {
        index: 2,
        type: "line",
        from: { x: 100, y: 0 },
        to: { x: 100, y: 100 },
        fromLabel: "P2",
        toLabel: "P3",
        azimuth: 180,
        bearing: {
          ns: "S",
          degrees: 0,
          minutes: 0,
          seconds: 0,
          ew: "E",
          cardinal: "S",
        },
        bearingText: "Due South",
        distance: 100,
        distanceMeters: 100,
        latitude: -100,
        departure: 0,
      },
      {
        index: 3,
        type: "line",
        from: { x: 100, y: 100 },
        to: { x: 0, y: 100 },
        fromLabel: "P3",
        toLabel: "P4",
        azimuth: 270,
        bearing: {
          ns: "N",
          degrees: 90,
          minutes: 0,
          seconds: 0,
          ew: "W",
          cardinal: "W",
        },
        bearingText: "Due West",
        distance: 100,
        distanceMeters: 100,
        latitude: 0,
        departure: -100,
      },
      {
        index: 4,
        type: "line",
        from: { x: 0, y: 100 },
        to: { x: 0, y: -2 },
        fromLabel: "P4",
        toLabel: "P1",
        azimuth: 0,
        bearing: {
          ns: "N",
          degrees: 0,
          minutes: 0,
          seconds: 0,
          ew: "E",
          cardinal: "N",
        },
        bearingText: "Due North",
        distance: 102,
        distanceMeters: 102,
        latitude: 102,
        departure: 0,
      },
    ];

    const adjusted = adjustTraverse(courses, "transit");
    expect(adjusted.closureAfter.linearMisclosure).toBeLessThan(1e-9);
    expect(adjusted.closureAfter.precisionText).toBe("Exact (closed)");
    expect(adjusted.courses[adjusted.courses.length - 1].to).toEqual({
      x: 0,
      y: 0,
    });
  });
});
