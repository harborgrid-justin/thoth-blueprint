import { describe, expect, it } from "vitest";
import { defaultSpatialContext } from "../spatial/spatial";
import type { Polygon } from "../spatial/geometry";
import type { Parcel, Site } from "../spatial/primitives";
import {
  formatLandLot,
  formatLandLotShort,
  landLotRect,
  landLotSide,
  ordinal,
  ACRE_SQFT,
} from "./landlot";
import {
  ALL_CAPABILITIES,
  getRegionPlugin,
  listRegionPlugins,
  resolveCapabilities,
} from "./regions";
import { collectSiteCurves } from "../drawing/platset";

describe("Georgia Land Lot System", () => {
  it("sizes a 202.5-acre land lot (~2970 ft square)", () => {
    expect(landLotSide(202.5)).toBeCloseTo(Math.sqrt(202.5 * ACRE_SQFT), 6);
    expect(landLotSide(202.5)).toBeCloseTo(2969.99, 1);
    const ring = landLotRect({ x: 0, y: 0 }, 202.5);
    expect(ring).toHaveLength(4);
    expect(ring[2].x).toBeCloseTo(landLotSide(202.5), 6);
  });

  it("formats ordinals and land-lot nomenclature", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(9)).toBe("9th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(22)).toBe("22nd");
    expect(formatLandLot({ district: 9, landLot: 12 })).toBe(
      "Land Lot 12 of the 9th Land District",
    );
    expect(formatLandLotShort({ district: 9, landLot: 12 })).toBe("LL 12, 9th Dist.");
  });
});

describe("region plug-ins", () => {
  it("baseline capabilities are all enabled", () => {
    expect(Object.values(ALL_CAPABILITIES).every(Boolean)).toBe(true);
    expect(resolveCapabilities(null)).toEqual(ALL_CAPABILITIES);
  });

  it("registers Newton County, Georgia with the land-lot framework", () => {
    const newton = getRegionPlugin("us-ga-newton")!;
    expect(newton.state).toBe("Georgia");
    expect(newton.county).toBe("Newton");
    expect(newton.surveyFramework).toBe("georgia-land-lot");
    expect(newton.defaults.units).toBe("feet");
    expect(newton.standards?.landLotAcres).toBe(202.5);
    // Georgia-specific certificate present.
    expect(newton.certificates.some((c) => /Georgia/i.test(c.title))).toBe(true);
    // Enabling a plug-in keeps every capability on unless it opts out.
    expect(resolveCapabilities(newton).platComposer).toBe(true);
  });

  it("lists at least the default and Newton County plug-ins", () => {
    const ids = listRegionPlugins().map((p) => p.id);
    expect(ids).toContain("us-plss-default");
    expect(ids).toContain("us-ga-newton");
  });
});

describe("consolidated curve table", () => {
  const square: Polygon = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];
  const parcel: Parcel = {
    id: "p",
    kind: "parcel",
    name: "Parcel A",
    layerId: "l",
    boundary: square,
    arcs: { "0": -1 }, // semicircle, R = 50
  };
  const site: Site = {
    id: "s",
    name: "Site",
    spatial: defaultSpatialContext(),
    layers: [],
    elements: [parcel],
    alignments: [
      {
        id: "a",
        name: "BL",
        startStation: 0,
        pis: [
          { point: { x: 0, y: 0 } },
          { point: { x: 0, y: -1000 }, radius: 500 },
          { point: { x: 1000, y: -1000 } },
        ],
      },
    ],
  };

  it("labels every boundary arc and alignment curve C1…Cn", () => {
    const curves = collectSiteCurves(site);
    expect(curves.map((c) => c.label)).toEqual(["C1", "C2"]);
    expect(curves[0].source).toBe("Parcel A");
    expect(curves[0].radius).toBeCloseTo(50, 6);
    expect(curves[1].source).toBe("BL");
    expect(curves[1].radius).toBeCloseTo(500, 6);
  });
});
