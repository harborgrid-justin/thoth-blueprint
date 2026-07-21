import { describe, it, expect } from "vitest";
import { createKnightsbridgeLot11Plat } from "./knightsbridgeLot11Plat";
import { measuredArea } from "../../spatial/spatial";

import { boundaryArea } from "../../spatial/curve";

describe("Knightsbridge Lot 11 House Location Survey Plat Preset", () => {
  it("creates a valid site with Lot 11 spatial elements", () => {
    const site = createKnightsbridgeLot11Plat();

    expect(site.id).toBe("site-knightsbridge-lot11");
    expect(site.jurisdictionId).toBe("us-va-prince-william");
    expect(site.spatial.units).toBe("feet");
    expect(site.spatial.crs).toBe("EPSG:2283");
    expect(site.elements.length).toBeGreaterThanOrEqual(8);
  });

  it("calculates lot area matching survey specification (19,430 sq ft)", () => {
    const site = createKnightsbridgeLot11Plat();
    const parcel = site.elements.find((e) => e.kind === "parcel");
    expect(parcel).toBeDefined();

    if (parcel) {
      const lotArea = boundaryArea(parcel.boundary, parcel.arcs);
      expect(lotArea).toBeGreaterThan(18800);
      expect(lotArea).toBeLessThan(19600);
    }
  });

  it("contains house #12720 building structure with basement & deck", () => {
    const site = createKnightsbridgeLot11Plat();
    const house = site.elements.find((e) => e.kind === "building");
    expect(house).toBeDefined();
    expect(house?.name).toContain("#12720");
    expect(house?.storeys).toBe(2);
  });

  it("includes all required easements and public right-of-way", () => {
    const site = createKnightsbridgeLot11Plat();
    const easements = site.elements.filter((e) => e.kind === "easement");
    const row = site.elements.find((e) => e.kind === "row");

    expect(easements.length).toBe(5);
    expect(row).toBeDefined();
    expect(row?.name).toContain("Knightsbridge Drive");
  });
});
