import { describe, it, expect } from "vitest";
import {
  defaultSpatialContext,
  surveyReport,
  polygonArea,
  boundaryArea,
  type Site,
  type Parcel,
  type Lot,
  type Building,
  type Easement,
  type RightOfWay,
  type Layer,
  type Polygon,
  type PlanNote,
} from "../..";

describe("Method 1: Interactive UI Canvas Plat Drawing Workflow", () => {
  it("executes Steps 1 to 6 to build the Knightsbridge Lot 11 House Location Survey from scratch", () => {
    // ------------------------------------------------------------------------
    // Step 1: Initialize Project & Set Up Layers
    // ------------------------------------------------------------------------
    const layers: Layer[] = [
      { id: "c-prop", name: "C-PROP (Property Boundary — Blue line)", order: 0, visible: true, locked: false, color: "#2563eb" },
      { id: "c-prop-lot", name: "C-PROP-LOT (Subdivision Lots — Light blue)", order: 1, visible: true, locked: false, color: "#3b82f6" },
      { id: "a-bldg", name: "A-BLDG (Building Structures — Red outline)", order: 2, visible: true, locked: false, color: "#dc2626" },
      { id: "c-ease", name: "C-EASE (Easements & BRLs — Orange dashed lines)", order: 3, visible: true, locked: false, color: "#d97706" },
      { id: "c-road", name: "C-ROAD (Public Road R.O.W. — Charcoal grey)", order: 4, visible: true, locked: false, color: "#475569" },
    ];

    const site: Site = {
      id: "site-interactive-lot11",
      name: "Interactive Lot 11 Knightsbridge Plat",
      jurisdictionId: "us-va-prince-william",
      spatial: defaultSpatialContext({ units: "feet", crs: "EPSG:2283" }),
      layers,
      elements: [],
    };

    expect(site.spatial.units).toBe("feet");
    expect(site.spatial.crs).toBe("EPSG:2283");
    expect(site.layers.length).toBe(5);

    // ------------------------------------------------------------------------
    // Step 2: Draw the Property Boundary (Metes & Bounds Traverse + Front Arc)
    // ------------------------------------------------------------------------
    // Course 1 (West line): N 03°52'08" E 178.64' -> Corner (12.05, 178.23)
    // Course 2 (North line): N 81°44'15" E 82.79' -> Corner (93.98, 190.12)
    // Course 3 (East line): S 09°56'35" E 189.40' -> Corner (126.68, 3.57)
    // Course 4 (Front line): Connect back to (0, 0)
    const lotBoundary: Polygon = [
      { x: 0, y: 0 },          // P.O.B. SW Corner
      { x: 12.05, y: 178.23 }, // NW Corner
      { x: 93.98, y: 190.12 }, // NE Corner
      { x: 126.68, y: 3.57 },  // SE Corner
    ];

    // Front Boundary Curved Arc along Knightsbridge Drive (Arc A = 110.05', R = 498.00')
    const lotArcs = { 3: -0.05527 };

    const parcel: Parcel = {
      id: "drawn-parcel-11",
      kind: "parcel",
      name: "Lot 11, Section 6 — Knightsbridge Drive (19,430 sq ft)",
      boundary: lotBoundary,
      arcs: lotArcs,
      layerId: "c-prop",
    };

    const lot: Lot = {
      id: "drawn-lot-11",
      kind: "lot",
      name: "Lot 11 (19,430 sq ft)",
      boundary: lotBoundary,
      arcs: lotArcs,
      setback: 25,
      layerId: "c-prop-lot",
    };

    site.elements.push(parcel, lot);

    // Verify calculated area matches survey spec (~19,430 sq ft)
    const lotArea = boundaryArea(parcel.boundary, parcel.arcs);
    expect(lotArea).toBeGreaterThan(18800);
    expect(lotArea).toBeLessThan(19600);

    // ------------------------------------------------------------------------
    // Step 3: Draw Building Footprint (#12720 Residence)
    // ------------------------------------------------------------------------
    // Front setback 42.0', West side offset 14.6', East side offset 28.7'
    const houseBuilding: Building = {
      id: "drawn-house-12720",
      kind: "building",
      name: "Two Story Brick & Frame House with Basement #12720",
      boundary: [
        { x: 26.65, y: 42.0 },   // Front-left
        { x: 66.55, y: 42.0 },   // Front-right (Garage)
        { x: 66.55, y: 78.4 },   // Rear-right
        { x: 52.05, y: 78.4 },   // Rear deck step
        { x: 52.05, y: 90.4 },   // Rear wood deck outer corner
        { x: 26.65, y: 90.4 },   // Rear wood deck left corner
        { x: 26.65, y: 78.4 },   // Rear house wall
      ],
      storeys: 2,
      height: 30,
      dwellingUnits: 1,
      layerId: "a-bldg",
    };

    site.elements.push(houseBuilding);
    expect(houseBuilding.storeys).toBe(2);
    expect(houseBuilding.height).toBe(30);

    // ------------------------------------------------------------------------
    // Step 4: Draw Easements & Public Right-of-Way
    // ------------------------------------------------------------------------
    // 54' Knightsbridge Drive R.O.W.
    const row: RightOfWay = {
      id: "drawn-row-knightsbridge",
      kind: "row",
      name: "Knightsbridge Drive (54' R/W — 650.98' to P.C. @ Berwick Place)",
      boundary: [
        { x: -20, y: -54 },
        { x: 150, y: -54 },
        { x: 150, y: 0 },
        { x: -20, y: 0 },
      ],
      layerId: "c-road",
    };

    // 20' Sanitary Sewer Easement (North boundary / Lot 12)
    const northSewerEasement: Easement = {
      id: "drawn-easement-sewer",
      kind: "easement",
      name: "20' Sanitary Sewer Easement",
      boundary: [
        { x: 12.05, y: 158.23 },
        { x: 93.98, y: 170.12 },
        { x: 93.98, y: 190.12 },
        { x: 12.05, y: 178.23 },
      ],
      layerId: "c-ease",
    };

    // 20' Storm Drainage Easement (West boundary)
    const westDrainageEasement: Easement = {
      id: "drawn-easement-storm",
      kind: "easement",
      name: "20' Storm Drainage Easement",
      boundary: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 32.05, y: 178.23 },
        { x: 12.05, y: 178.23 },
      ],
      layerId: "c-ease",
    };

    // 40' Ingress-Egress & Utility Easement (East boundary)
    const eastUtilityEasement: Easement = {
      id: "drawn-easement-ingress",
      kind: "easement",
      name: "40' Ingress-Egress and Utility Easement",
      boundary: [
        { x: 86.68, y: 3.57 },
        { x: 126.68, y: 3.57 },
        { x: 93.98, y: 190.12 },
        { x: 53.98, y: 190.12 },
      ],
      layerId: "c-ease",
    };

    site.elements.push(row, northSewerEasement, westDrainageEasement, eastUtilityEasement);
    expect(site.elements.filter((e) => e.kind === "easement").length).toBe(3);

    // ------------------------------------------------------------------------
    // Step 5: Add Dimensions, Callouts, and Annotations
    // ------------------------------------------------------------------------
    const floodCertNote: PlanNote = {
      id: "drawn-note-flood",
      kind: "note",
      name: "HUD Flood Certification",
      position: { x: 50, y: 120 },
      layerId: "c-prop",
    };

    site.elements.push(floodCertNote);
    expect(site.elements.find((e) => e.kind === "note")).toBeDefined();

    // ------------------------------------------------------------------------
    // Step 6: Generate & Export Final Plat Sheet (Survey Report Computation)
    // ------------------------------------------------------------------------
    const report = surveyReport(parcel.boundary, site.spatial, parcel.arcs);
    expect(report.courses.length).toBe(4);
    expect(report.area.acres).toBeGreaterThan(0.4);
    expect(report.closure.linearMisclosure).toBeLessThan(0.1);
  });
});
