import type { Site, Parcel, Lot, Building, RightOfWay, Easement, Layer, Polygon } from "../../spatial/types/index";
import { defaultSpatialContext } from "../../spatial/spatial";

/**
 * Creates a complete civil & survey plat for Lot 11, Section 6, Knightsbridge Drive (19,430 sq ft)
 * in Prince William County, Virginia, featuring a 2-story brick & frame house with basement (#12720),
 * 20' Sanitary Sewer Easement, Storm Drainage Easement, 40' Ingress-Egress & Utility Easement,
 * Sight Distance Easement, Slope Maintenance Easement, and curved front R/W along Knightsbridge Drive.
 */
export function createKnightsbridgeLot11Plat(): Site {
  // Boundary polygon vertices for Lot 11 (19,430 sq. ft.)
  // V0: (0, 0) — Front SW Corner (P.O.B.)
  // V1: (12.05, 178.23) — NW Corner (N 03°52'08" E 178.64')
  // V2: (93.98, 190.12) — NE Corner (N 81°44'15" E 82.79')
  // V3: (126.68, 3.57) — SE Corner (S 09°56'35" E 189.40')
  // Front Curve (V3 -> V0): Arc A = 110.05', R = 498.00', chord 16.99' N 86°07'52" W
  const lotBoundary: Polygon = [
    { x: 0, y: 0 },
    { x: 12.05, y: 178.23 },
    { x: 93.98, y: 190.12 },
    { x: 126.68, y: 3.57 },
  ];

  // Bulge for curved edge V3 -> V0 (A = 110.05', R = 498.00', central angle theta ≈ 0.22098 rad)
  // bulge b = tan(theta / 4) ≈ -0.05527
  const lotArcs = { 3: -0.05527 };

  // Parcel (19,430 sq ft)
  const parcel: Parcel = {
    id: "parcel-knightsbridge-11",
    kind: "parcel",
    name: "Lot 11, Section 6 — Knightsbridge Drive (19,430 sq ft)",
    boundary: lotBoundary,
    arcs: lotArcs,
    layerId: "c-prop",
  };

  // Lot 11 with 25' setback
  const lot: Lot = {
    id: "lot-knightsbridge-11",
    kind: "lot",
    name: "Lot 11 (19,430 sq ft)",
    boundary: lotBoundary,
    arcs: lotArcs,
    setback: 25,
    layerId: "c-prop-lot",
  };

  // House #12720 Footprint (Two Story Brick & Frame House with Basement, Wood Deck & Garage)
  const houseBoundary: Polygon = [
    { x: 26.65, y: 42.0 },   // Front-left
    { x: 66.55, y: 42.0 },   // Front-right (Garage)
    { x: 66.55, y: 78.4 },   // Rear-right
    { x: 52.05, y: 78.4 },   // Rear deck step
    { x: 52.05, y: 90.4 },   // Rear wood deck outer corner
    { x: 26.65, y: 90.4 },   // Rear wood deck left corner
    { x: 26.65, y: 78.4 },   // Rear house wall
  ];

  const houseBuilding: Building = {
    id: "building-house-12720",
    kind: "building",
    name: "Two Story Brick & Frame House with Basement #12720",
    boundary: houseBoundary,
    storeys: 2,
    height: 30,
    dwellingUnits: 1,
    layerId: "a-bldg",
  };

  // 54' Knightsbridge Drive R.O.W. along South boundary
  const knightsbridgeRow: RightOfWay = {
    id: "row-knightsbridge-dr",
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

  // 20' Sanitary Sewer Easement along North Boundary (Lot 12 side)
  const northSewerEasement: Easement = {
    id: "easement-sewer-north",
    kind: "easement",
    name: "20' Sanitary Sewer Easement (North Boundary / Lot 12)",
    boundary: [
      { x: 12.05, y: 158.23 },
      { x: 93.98, y: 170.12 },
      { x: 93.98, y: 190.12 },
      { x: 12.05, y: 178.23 },
    ],
    layerId: "c-ease",
  };

  // 20' Storm Drainage Easement & 25' Setback along West Boundary
  const westDrainageEasement: Easement = {
    id: "easement-storm-west",
    kind: "easement",
    name: "20' Storm Drainage Easement (West Boundary)",
    boundary: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 32.05, y: 178.23 },
      { x: 12.05, y: 178.23 },
    ],
    layerId: "c-ease",
  };

  // 40' Ingress-Egress & Utility Easement along East Boundary (Lots 13, 14, 15 side)
  const eastUtilityEasement: Easement = {
    id: "easement-ingress-east",
    kind: "easement",
    name: "40' Ingress-Egress and Utility Easement (East Boundary / Lots 13-15)",
    boundary: [
      { x: 86.68, y: 3.57 },
      { x: 126.68, y: 3.57 },
      { x: 93.98, y: 190.12 },
      { x: 53.98, y: 190.12 },
    ],
    layerId: "c-ease",
  };

  // Sight Distance Easement at Southeast Front Corner
  const sightDistanceEasement: Easement = {
    id: "easement-sight-distance",
    kind: "easement",
    name: "Sight Distance Easement (SE Front Corner)",
    boundary: [
      { x: 106.68, y: 3.57 },
      { x: 126.68, y: 3.57 },
      { x: 121.68, y: 25.0 },
    ],
    layerId: "c-ease",
  };

  // Slope Maintenance Easement along Southwest Front Corner
  const slopeMaintenanceEasement: Easement = {
    id: "easement-slope-maint",
    kind: "easement",
    name: "Slope Maintenance Easement (SW Front Corner)",
    boundary: [
      { x: 0, y: 0 },
      { x: 25, y: 0 },
      { x: 20, y: 15 },
      { x: 0, y: 15 },
    ],
    layerId: "c-ease",
  };

  const layers: Layer[] = [
    { id: "c-prop", name: "C-PROP (Property Boundary)", order: 0, visible: true, locked: false, color: "#2563eb" },
    { id: "c-prop-lot", name: "C-PROP-LOT (Subdivision Lots)", order: 1, visible: true, locked: false, color: "#3b82f6" },
    { id: "a-bldg", name: "A-BLDG (Building Structures)", order: 2, visible: true, locked: false, color: "#dc2626" },
    { id: "c-road", name: "C-ROAD (Public Road R.O.W.)", order: 3, visible: true, locked: false, color: "#475569" },
    { id: "c-ease", name: "C-EASE (Easements & BRLs)", order: 4, visible: true, locked: false, color: "#d97706" },
  ];

  return {
    id: "site-knightsbridge-lot11",
    name: "Lot 11, Section 6, Knightsbridge Drive (19,430 sq ft Plat)",
    jurisdictionId: "us-va-prince-william",
    spatial: defaultSpatialContext({ units: "feet", crs: "EPSG:2283" }),
    elements: [
      parcel,
      lot,
      houseBuilding,
      knightsbridgeRow,
      northSewerEasement,
      westDrainageEasement,
      eastUtilityEasement,
      sightDistanceEasement,
      slopeMaintenanceEasement,
    ],
    layers,
  };
}
