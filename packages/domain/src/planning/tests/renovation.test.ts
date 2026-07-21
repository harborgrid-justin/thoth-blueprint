import { describe, it, expect } from "vitest";
import {
  defaultSpatialContext,
  type Site,
  type PlanElement,
} from "../../index.js";
import {
  computeRenovationTakeoffs,
  runRenovationAudit,
} from "../renovation.js";

describe("Renovation Mode Domain Logic", () => {
  it("should calculate correct material takeoff areas for Existing, New, and Demolished elements", () => {
    const elements: PlanElement[] = [
      {
        id: "b1",
        kind: "building",
        name: "Existing Building",
        layerId: "layer-buildings",
        boundary: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
        renovationStatus: "existing",
      },
      {
        id: "b2",
        kind: "building",
        name: "New Building Extension",
        layerId: "layer-buildings",
        boundary: [
          { x: 10, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 10 },
          { x: 10, y: 10 },
        ],
        renovationStatus: "new",
      },
      {
        id: "b3",
        kind: "building",
        name: "Demolished Shed",
        layerId: "layer-buildings",
        boundary: [
          { x: 30, y: 0 },
          { x: 35, y: 0 },
          { x: 35, y: 5 },
          { x: 30, y: 5 },
        ],
        renovationStatus: "demolished",
      },
    ];

    const site: Site = {
      id: "s1",
      name: "Renovation Site",
      spatial: defaultSpatialContext(),
      layers: [],
      elements,
    };

    const takeoffs = computeRenovationTakeoffs(site);

    expect(takeoffs.existing.count).toBe(1);
    expect(takeoffs.existing.totalArea).toBe(100);

    expect(takeoffs.new.count).toBe(1);
    expect(takeoffs.new.totalArea).toBe(100);

    expect(takeoffs.demolished.count).toBe(1);
    expect(takeoffs.demolished.totalArea).toBe(25);
  });

  it("should run renovation audits and report structural violations", () => {
    const elements: PlanElement[] = [
      {
        id: "p1",
        kind: "parcel",
        name: "Demolished Parcel",
        layerId: "layer-parcels",
        boundary: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 50 },
          { x: 0, y: 50 },
        ],
        renovationStatus: "demolished",
      },
      {
        id: "b1",
        kind: "building",
        name: "New Window/Structure",
        layerId: "layer-buildings",
        boundary: [
          { x: 10, y: 10 },
          { x: 20, y: 10 },
          { x: 20, y: 20 },
          { x: 10, y: 20 },
        ],
        renovationStatus: "new",
      },
      {
        id: "p2",
        kind: "parcel",
        name: "Protected Existing Parcel",
        layerId: "layer-parcels",
        boundary: [
          { x: 100, y: 100 },
          { x: 150, y: 100 },
          { x: 150, y: 150 },
          { x: 100, y: 150 },
        ],
        apn: "PROTECTED",
        renovationStatus: "demolished",
      },
    ];

    const site: Site = {
      id: "s1",
      name: "Renovation Site",
      spatial: defaultSpatialContext(),
      layers: [],
      elements,
    };

    const warnings = runRenovationAudit(site);
    expect(warnings.length).toBe(2);
    expect(warnings[0]).toContain(
      'New building "New Window/Structure" intersects with demolished parcel "Demolished Parcel"',
    );
    expect(warnings[1]).toContain(
      'Cannot demolish protected parcel "Protected Existing Parcel"',
    );
  });
});
