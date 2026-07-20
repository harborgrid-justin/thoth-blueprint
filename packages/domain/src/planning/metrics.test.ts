import { describe, expect, it } from "vitest";
import { defaultSpatialContext } from "../spatial/spatial";
import type { Building, LandUse, Parcel, Site } from "../spatial/primitives";
import {
  coverage,
  computeSiteMetrics,
  floorAreaRatio,
  landUseBreakdown,
  siteArea,
} from "./metrics";

function square(size: number, ox = 0, oy = 0) {
  return [
    { x: ox, y: oy },
    { x: ox + size, y: oy },
    { x: ox + size, y: oy + size },
    { x: ox, y: oy + size },
  ];
}

const parcel: Parcel = {
  id: "p1",
  kind: "parcel",
  name: "Parcel 1",
  layerId: "l1",
  boundary: square(100), // 100 x 100 = 10,000 m²
};

const building: Building = {
  id: "b1",
  kind: "building",
  name: "Building 1",
  layerId: "l1",
  boundary: square(50), // 2,500 m² footprint
  storeys: 3,
  dwellingUnits: 20,
};

const park: LandUse = {
  id: "lu1",
  kind: "landuse",
  name: "Park",
  layerId: "l1",
  boundary: square(40), // 1,600 m²
  category: "park",
};

const commercial: LandUse = {
  id: "lu2",
  kind: "landuse",
  name: "Shops",
  layerId: "l1",
  boundary: square(20), // 400 m²
  category: "commercial",
};

const site: Site = {
  id: "s1",
  name: "Test Site",
  spatial: defaultSpatialContext(),
  layers: [{ id: "l1", name: "Base", order: 0, visible: true, locked: false }],
  elements: [parcel, building, park, commercial],
};

describe("site metrics", () => {
  it("sums parcel area", () => {
    expect(siteArea(site, "sqm")).toBeCloseTo(10000);
  });

  it("computes coverage from building footprints", () => {
    expect(coverage(site)).toBeCloseTo(0.25); // 2500 / 10000
  });

  it("computes FAR from footprint × storeys", () => {
    expect(floorAreaRatio(site)).toBeCloseTo(0.75); // 7500 / 10000
  });

  it("breaks land use down largest-first with correct shares", () => {
    const breakdown = landUseBreakdown(site, "sqm");
    expect(breakdown[0].category).toBe("park");
    expect(breakdown[0].area).toBeCloseTo(1600);
    expect(breakdown[0].share).toBeCloseTo(0.8); // 1600 / 2000
    expect(breakdown[1].category).toBe("commercial");
  });

  it("computes a full metrics snapshot", () => {
    const m = computeSiteMetrics(site, "acres");
    expect(m.dwellingUnits).toBe(20);
    expect(m.lotCount).toBe(0);
    expect(m.density).toBeGreaterThan(0);
    expect(m.areaUnit).toBe("acres");
  });
});
