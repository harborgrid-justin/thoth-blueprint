import { describe, expect, it } from "vitest";
import { area as polygonArea } from "../../spatial/geometry";
import {
  aliquotRect,
  formatAliquot,
  formatPLSS,
  formatPLSSShort,
  nominalAliquotAcres,
  sectionColRow,
  sectionCornerName,
  sectionFrame,
  type TownshipRange,
} from "../plss";

// A section with its NW corner at the origin; north is −Y, so the SW corner is
// at +Y. Use a 4-unit side for easy quartering.
const NW = { x: 0, y: 0 };
const SIDE = 4;

describe("sectionFrame", () => {
  it("locates corners with north = −Y", () => {
    const f = sectionFrame(NW, SIDE);
    expect(f.ne).toEqual({ x: 4, y: 0 });
    expect(f.sw).toEqual({ x: 0, y: 4 });
    expect(f.se).toEqual({ x: 4, y: 4 });
    expect(f.center).toEqual({ x: 2, y: 2 });
    expect(f.south).toEqual({ x: 2, y: 4 });
  });
});

describe("aliquotRect", () => {
  it("returns the correct quarter rectangles", () => {
    // NE1/4: east half (+x), north half (−y).
    expect(aliquotRect(NW, SIDE, ["NE"])).toEqual([
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 2, y: 2 },
    ]);
    // SW1/4: west half, south half (+y).
    expect(aliquotRect(NW, SIDE, ["SW"])).toEqual([
      { x: 0, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 0, y: 4 },
    ]);
  });

  it("nests outer→inner: NW1/4 of the SE1/4", () => {
    // SE1/4 spans x∈[2,4], y∈[2,4]; its NW1/4 is x∈[2,3], y∈[2,3].
    const ring = aliquotRect(NW, SIDE, ["SE", "NW"]);
    expect(ring[0]).toEqual({ x: 2, y: 2 });
    expect(ring[2]).toEqual({ x: 3, y: 3 });
    expect(polygonArea(ring)).toBeCloseTo(1, 9); // (4·4)/16
  });
});

describe("nominal aliquot acreage", () => {
  it("halves by quartering from 640 acres", () => {
    expect(nominalAliquotAcres([])).toBe(640);
    expect(nominalAliquotAcres(["NE"])).toBe(160);
    expect(nominalAliquotAcres(["SE", "NW"])).toBe(40);
    expect(nominalAliquotAcres(["SE", "NW", "SW"])).toBe(10);
  });
});

describe("PLSS text formatting", () => {
  const tr: TownshipRange = {
    township: 3,
    townshipDir: "South",
    range: 16,
    rangeDir: "East",
    meridian: "Tallahassee",
  };

  it("formats aliquot parts outer→inner", () => {
    expect(formatAliquot(["SE", "NW"])).toBe("the NW1/4 of the SE1/4");
    expect(formatAliquot(["NE"])).toBe("the NE1/4");
  });

  it("formats standard legal descriptions", () => {
    const text = formatPLSS(["SE", "NW"], 8, tr);
    expect(text).toBe(
      "the NW1/4 of the SE1/4 of Section 8, Township 3 South, Range 16 East, Tallahassee Meridian",
    );
  });

  it("formats short PLSS designations", () => {
    expect(formatPLSSShort(["SE", "NW"], 8, tr)).toBe(
      "NW1/4 SE1/4 Sec 8, T3S, R16E",
    );
  });
});

describe("section grid & corners", () => {
  it("numbers 36 sections in serpentine order", () => {
    // Sec 1 top right, Sec 6 top left, Sec 7 below 6, Sec 12 below 1, Sec 36 bottom right.
    expect(sectionColRow(1)).toEqual({ col: 5, row: 0 });
    expect(sectionColRow(6)).toEqual({ col: 0, row: 0 });
    expect(sectionColRow(7)).toEqual({ col: 0, row: 1 });
    expect(sectionColRow(12)).toEqual({ col: 5, row: 1 });
    expect(sectionColRow(36)).toEqual({ col: 5, row: 5 });
  });

  it("names corner monuments", () => {
    expect(sectionCornerName(8, "nw")).toBe("NW corner of Sec 8");
    expect(sectionCornerName(8, "north")).toBe("N1/4 corner of Sec 8");
  });
});
