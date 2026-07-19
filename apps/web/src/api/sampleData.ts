import {
  createId,
  defaultSpatialContext,
  subdivideGrid,
  type Building,
  type LandUse,
  type Layer,
  type Lot,
  type Parcel,
  type PlanElement,
  type Polygon,
  type RightOfWay,
  type Site,
  type Zone,
} from "@thoth/domain";
import type { CreateProjectInput } from "./client";

function rect(x: number, y: number, w: number, h: number): Polygon {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

function baseLayers(): Layer[] {
  return [
    { id: "layer-base", name: "Base / Parcels", order: 0, visible: true, locked: false, color: "#64748b" },
    { id: "layer-zoning", name: "Zoning", order: 1, visible: true, locked: false, color: "#8b5cf6" },
    { id: "layer-landuse", name: "Land Use", order: 2, visible: true, locked: false, color: "#22c55e" },
    { id: "layer-lots", name: "Lots", order: 3, visible: true, locked: false, color: "#0ea5e9" },
    { id: "layer-buildings", name: "Buildings", order: 4, visible: true, locked: false, color: "#f59e0b" },
    { id: "layer-row", name: "Rights-of-Way", order: 5, visible: true, locked: false, color: "#94a3b8" },
  ];
}

/** An empty but valid site: spatial context and a set of layers, no geometry. */
export function emptySite(name: string): Site {
  return {
    id: createId("site"),
    name,
    spatial: defaultSpatialContext(),
    layers: baseLayers(),
    elements: [],
  };
}

/** A residential subdivision: one parcel divided into lots, with buildings, a park, and a road. */
export function subdivisionSite(name: string): Site {
  const elements: PlanElement[] = [];

  const parcel: Parcel = {
    id: createId("parcel"),
    kind: "parcel",
    name: "Parcel A",
    layerId: "layer-base",
    boundary: rect(20, 20, 260, 180),
    apn: "112-04-021",
  };
  elements.push(parcel);

  const zone: Zone = {
    id: createId("zone"),
    kind: "zone",
    name: "R-1 Residential",
    layerId: "layer-zoning",
    boundary: rect(20, 20, 260, 180),
    designation: "R-1",
    allowedUses: ["residential", "park", "open-space"],
    maxCoverage: 0.45,
    maxFar: 0.9,
    maxHeight: 11,
    minSetback: 3,
  };
  elements.push(zone);

  // A road right-of-way splitting the parcel into two rows of lots.
  const row: RightOfWay = {
    id: createId("row"),
    kind: "row",
    name: "Maple Street",
    layerId: "layer-row",
    boundary: rect(20, 100, 260, 20),
    width: 20,
  };
  elements.push(row);

  // A neighborhood park.
  const park: LandUse = {
    id: createId("landuse"),
    kind: "landuse",
    name: "Corner Park",
    layerId: "layer-landuse",
    boundary: rect(230, 130, 50, 60),
    category: "park",
  };
  elements.push(park);

  // Subdivide the north band into lots.
  const northLots = subdivideGrid(rect(30, 30, 240, 60), {
    columns: 6,
    rows: 1,
    gap: 4,
    layerId: "layer-lots",
    makeId: () => createId("lot"),
    setback: 3,
  });
  // Subdivide the south band (excluding the park) into lots.
  const southLots = subdivideGrid(rect(30, 128, 190, 64), {
    columns: 5,
    rows: 1,
    gap: 4,
    layerId: "layer-lots",
    makeId: () => createId("lot"),
    setback: 3,
  });
  const lots: Lot[] = [...northLots, ...southLots];
  lots.forEach((lot, i) => (lot.name = `Lot ${i + 1}`));
  elements.push(...lots);

  // Drop a house on the first few lots.
  lots.slice(0, 8).forEach((lot, i) => {
    const b = lot.boundary;
    const minX = Math.min(...b.map((p) => p.x));
    const minY = Math.min(...b.map((p) => p.y));
    const w = Math.max(...b.map((p) => p.x)) - minX;
    const h = Math.max(...b.map((p) => p.y)) - minY;
    const building: Building = {
      id: createId("bldg"),
      kind: "building",
      name: `House ${i + 1}`,
      layerId: "layer-buildings",
      boundary: rect(minX + w * 0.22, minY + h * 0.28, w * 0.56, h * 0.44),
      storeys: 2,
      height: 7,
      dwellingUnits: 1,
      use: "residential",
    };
    elements.push(building);
  });

  return {
    id: createId("site"),
    name,
    spatial: defaultSpatialContext(),
    layers: baseLayers(),
    elements,
  };
}

/** A mixed-use district: zones and land-use allocation with a few anchor buildings. */
export function districtSite(name: string): Site {
  const elements: PlanElement[] = [];

  const parcel: Parcel = {
    id: createId("parcel"),
    kind: "parcel",
    name: "District Block",
    layerId: "layer-base",
    boundary: rect(10, 10, 300, 220),
  };
  elements.push(parcel);

  const mixedZone: Zone = {
    id: createId("zone"),
    kind: "zone",
    name: "MU Core",
    layerId: "layer-zoning",
    boundary: rect(10, 10, 180, 220),
    designation: "MU-1",
    allowedUses: ["mixed-use", "commercial", "residential", "civic"],
    maxCoverage: 0.7,
    maxFar: 3.5,
    maxHeight: 40,
    minSetback: 2,
  };
  elements.push(mixedZone);

  const landUses: Array<[string, Polygon, LandUse["category"]]> = [
    ["Mixed-Use Core", rect(20, 20, 150, 90), "mixed-use"],
    ["Retail Frontage", rect(20, 120, 150, 45), "commercial"],
    ["Residential Blocks", rect(20, 175, 150, 45), "residential"],
    ["Civic Plaza", rect(200, 20, 100, 70), "civic"],
    ["Central Green", rect(200, 100, 100, 60), "park"],
    ["Open Space", rect(200, 170, 100, 50), "open-space"],
  ];
  for (const [luName, boundary, category] of landUses) {
    elements.push({
      id: createId("landuse"),
      kind: "landuse",
      name: luName,
      layerId: "layer-landuse",
      boundary,
      category,
    } satisfies LandUse);
  }

  const anchors: Array<[string, Polygon, number, number]> = [
    ["Tower One", rect(30, 30, 55, 35), 8, 60],
    ["Tower Two", rect(100, 30, 55, 35), 6, 40],
    ["Market Hall", rect(40, 128, 110, 28), 1, 0],
  ];
  for (const [bName, boundary, storeys, du] of anchors) {
    elements.push({
      id: createId("bldg"),
      kind: "building",
      name: bName,
      layerId: "layer-buildings",
      boundary,
      storeys,
      height: storeys * 3.5,
      dwellingUnits: du,
      use: "mixed-use",
    } satisfies Building);
  }

  return {
    id: createId("site"),
    name,
    spatial: defaultSpatialContext(),
    layers: baseLayers(),
    elements,
  };
}

/** Build a starter site for a chosen template. */
export function siteForTemplate(name: string, template: CreateProjectInput["template"]): Site {
  switch (template) {
    case "subdivision":
      return subdivisionSite(name);
    case "district":
      return districtSite(name);
    default:
      return emptySite(name);
  }
}
