import { describe, expect, it } from "vitest";
import { area as polygonArea } from "../spatial/geometry";
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
} from "./plss";

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
    expect(nominalAliquotAcres(["NW"])).toBe(160);
    expect(nominalAliquotAcres(["SE", "NW"])).toBe(40);
    expect(nominalAliquotAcres(["SE", "NW", "NE"])).toBe(10);
  });
});

describe("formatting", () => {
  const tr: TownshipRange = { township: 3, townshipDir: "South", range: 16, rangeDir: "East" };

  it("formats aliquot descriptions inner→outer", () => {
    expect(formatAliquot(["SE", "NW"])).toBe("NW1/4 of the SE1/4");
    expect(formatAliquot([])).toBe("all");
  });

  it("formats PLSS references", () => {
    expect(formatPLSS(tr, 8)).toBe("Section 8, Township 3 South, Range 16 East");
    expect(formatPLSSShort(tr, 8)).toBe("Sec. 8, T3S, R16E");
  });

  it("names section corners", () => {
    expect(sectionCornerName("SW")).toBe("Southwest corner");
  });
});

describe("section numbering (boustrophedon)", () => {
  it("places section 1 in the NE and 36 in the SE", () => {
    expect(sectionColRow(1)).toEqual({ col: 5, row: 0 }); // NE corner
    expect(sectionColRow(6)).toEqual({ col: 0, row: 0 }); // NW corner
    expect(sectionColRow(7)).toEqual({ col: 0, row: 1 }); // below 6
    expect(sectionColRow(12)).toEqual({ col: 5, row: 1 });
    expect(sectionColRow(36)).toEqual({ col: 5, row: 5 }); // SE corner
    expect(sectionColRow(37)).toBeNull();
  });
});
