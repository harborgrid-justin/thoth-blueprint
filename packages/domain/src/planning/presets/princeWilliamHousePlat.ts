import type { Site, Parcel, Lot, Building, RightOfWay, Easement, Layer, Polygon } from "../../spatial/types/index";
import { defaultSpatialContext } from "../../spatial/spatial";

function rect(x: number, y: number, w: number, h: number): Polygon {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/**
 * Creates a complete civil & survey plat for a single-family house on a 28,000 sq ft lot
 * fronting on a VDOT public road in Prince William County, Virginia.
 */
export function createPrinceWilliamHousePlat(): Site {
  // Parcel Boundary (140' x 200' = 28,000 sq ft)
  const parcel: Parcel = {
    id: "parcel-pwc-101",
    kind: "parcel",
    name: "Parcel 14 — Oakridge Estates (GPIN 7892-34-5678)",
    boundary: rect(0, 0, 140, 200),
    layerId: "c-prop",
  };

  const lot: Lot = {
    id: "lot-pwc-101",
    kind: "lot",
    name: "Lot 14 (28,000 sq ft)",
    boundary: rect(0, 0, 140, 200),
    setback: 35,
    layerId: "c-prop-lot",
  };

  // Proposed 2-Storey House Footprint (56' x 50' = 2,800 sq ft)
  const houseBuilding: Building = {
    id: "building-house-101",
    kind: "building",
    name: "Proposed 2-Storey Residence & Garage",
    boundary: rect(42, 50, 56, 50),
    storeys: 2,
    height: 32,
    dwellingUnits: 1,
    layerId: "a-bldg",
  };

  // 50' VDOT Public Road Right-of-Way along South boundary (Y = -50 to Y = 0)
  const publicRoadRow: RightOfWay = {
    id: "row-bacon-race",
    kind: "row",
    name: "Bacon Race Road (50' VDOT Public R.O.W.)",
    boundary: rect(0, -50, 140, 50),
    layerId: "c-road",
  };

  // 10' Public Utility & Drainage Easement (PU&DE) along front boundary (Y = 0 to Y = 10)
  const frontEasement: Easement = {
    id: "easement-pude-front",
    kind: "easement",
    name: "10' Public Utility & Drainage Easement (PU&DE)",
    boundary: rect(0, 0, 140, 10),
    layerId: "c-ease",
  };

  // 15' Utility Easement along rear boundary (Y = 185 to Y = 200)
  const rearEasement: Easement = {
    id: "easement-rear-util",
    kind: "easement",
    name: "15' Rear Utility & Drainage Easement",
    boundary: rect(0, 185, 140, 15),
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
    id: "site-prince-william-28k",
    name: "28,000 sq ft House Plat — Prince William County, VA",
    jurisdictionId: "us-va-prince-william",
    spatial: defaultSpatialContext({ units: "feet", crs: "EPSG:2283" }),
    elements: [parcel, lot, houseBuilding, publicRoadRow, frontEasement, rearEasement],
    layers,
  };
}
