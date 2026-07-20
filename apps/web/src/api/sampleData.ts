import {
  createId,
  defaultSpatialContext,
  networkFromPath,
  subdivideGrid,
  type Building,
  type Easement,
  type InfrastructureNetwork,
  type LandUse,
  type Layer,
  type Lot,
  type Parcel,
  type PlanElement,
  type PlantingArea,
  type Polygon,
  type Region,
  type RightOfWay,
  type Site,
  type SpotElevationPoint,
  type SurveyMonument,
  type Tree,
  type WaterBody,
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
    { id: "layer-landscape", name: "Landscape", order: 6, visible: true, locked: false, color: "#22c55e" },
    { id: "layer-terrain", name: "Terrain", order: 7, visible: true, locked: false, color: "#a16207" },
  ];
}

/** Scatter spot elevations over an extent following a smooth hill function. */
function hillSpots(
  x0: number,
  y0: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
  fn: (nx: number, ny: number) => number,
): SpotElevationPoint[] {
  const spots: SpotElevationPoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = cols > 1 ? c / (cols - 1) : 0;
      const ny = rows > 1 ? r / (rows - 1) : 0;
      spots.push({
        id: createId("spot"),
        kind: "spot",
        layerId: "layer-terrain",
        position: { x: x0 + nx * w, y: y0 + ny * h },
        z: Math.round(fn(nx, ny) * 10) / 10,
        label: `SP${spots.length + 1}`,
      });
    }
  }
  return spots;
}

function tree(x: number, y: number, canopyRadius = 4): Tree {
  return { id: createId("tree"), kind: "tree", layerId: "layer-landscape", position: { x, y }, species: "Shade tree", canopyRadius };
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

  // A neighborhood park with a curved (arc) frontage — a cul-de-sac-style edge.
  const park: LandUse = {
    id: createId("landuse"),
    kind: "landuse",
    name: "Corner Park",
    layerId: "layer-landuse",
    boundary: rect(230, 130, 50, 60),
    category: "park",
    // Edge 2 (the south boundary) bows outward as a circular arc.
    arcs: { "2": -0.4 },
  };
  elements.push(park);

  // A platted utility easement strip behind the north lots.
  const easement: Easement = {
    id: createId("esmt"),
    kind: "easement",
    name: "20' Utility Easement",
    layerId: "layer-base",
    boundary: rect(30, 86, 240, 8),
    purpose: "utility",
  };
  elements.push(easement);

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

  // Terrain: a gentle rise toward the north-east corner.
  elements.push(
    ...hillSpots(20, 20, 260, 180, 7, 5, (nx, ny) => 4 + nx * 8 + (1 - ny) * 5),
  );

  // Street trees along the park frontage.
  for (let i = 0; i < 5; i++) elements.push(tree(236 + i * 9, 150));

  // A road network running down Maple Street with a stub into the park.
  const roads = networkFromPath(
    createId("net"),
    "Maple Street",
    "road",
    [
      { x: 20, y: 110 },
      { x: 150, y: 110 },
      { x: 255, y: 110 },
    ],
    () => createId("nn"),
    { roadClass: "local", width: 15 },
  );

  // A stationed survey baseline down Maple Street, with a horizontal curve
  // and parallel offset lines (edge of pavement + right-of-way).
  const baseline = {
    id: createId("algn"),
    name: "R/L MAPLE ST",
    startStation: 1000, // 10+00
    pis: [
      { point: { x: 30, y: 110 } },
      { point: { x: 200, y: 110 }, radius: 30 },
      { point: { x: 268, y: 150 } },
    ],
    offsets: [
      { distance: 7.5, kind: "pavement" as const, label: "EP" },
      { distance: -7.5, kind: "pavement" as const, label: "EP" },
      { distance: 10, kind: "row" as const, label: "R/W" },
      { distance: -10, kind: "row" as const, label: "R/W" },
    ],
  };

  // Survey monuments and the PLSS framework the plat is tied to.
  const mon = (
    type: Parameters<typeof monumentOf>[0],
    status: "found" | "set",
    x: number,
    y: number,
    label?: string,
  ) => monumentOf(type, status, x, y, label);
  const monuments = [
    mon("section-corner", "found", 10, 10, "SEC 8 COR"),
    mon("quarter-corner", "found", 160, 10),
    mon("quarter-corner", "found", 10, 160),
    mon("prm", "set", 20, 20, "PRM LB6685"),
    mon("prm", "set", 280, 20, "PRM LB6685"),
    mon("prm", "set", 280, 200, "PRM LB6685"),
    mon("prm", "set", 20, 200, "PRM LB6685"),
    mon("pcp", "set", 150, 110, "PCP"),
    mon("iron-rod", "found", 30, 92, "IR FND"),
    mon("concrete", "found", 270, 190, "CM FND"),
  ];

  return {
    id: createId("site"),
    name,
    spatial: defaultSpatialContext(),
    layers: baseLayers(),
    elements,
    networks: [roads],
    alignments: [baseline],
    monuments,
    controlLines: [
      { id: createId("ctl"), type: "silt-fence", label: "Silt Fence", path: [{ x: 22, y: 202 }, { x: 278, y: 202 }] },
      { id: createId("ctl"), type: "tree-line", label: "Tree Line", path: [{ x: 22, y: 18 }, { x: 278, y: 18 }] },
      { id: createId("ctl"), type: "flow", path: [{ x: 40, y: 60 }, { x: 120, y: 112 }, { x: 210, y: 150 }] },
    ],
    civilSymbols: [
      { id: createId("sym"), type: "inlet-protection", position: { x: 62, y: 118 }, subtype: "A" },
      { id: createId("sym"), type: "inlet-protection", position: { x: 150, y: 118 }, subtype: "B" },
      { id: createId("sym"), type: "inlet-protection", position: { x: 236, y: 118 }, subtype: "C" },
      { id: createId("sym"), type: "ditch-check", position: { x: 120, y: 112 }, rotation: 30 },
      { id: createId("sym"), type: "culvert", position: { x: 210, y: 150 } },
      { id: createId("sym"), type: "erosion-bale", position: { x: 40, y: 198 } },
      { id: createId("sym"), type: "riprap", position: { x: 268, y: 152 } },
    ],
    jurisdictionId: "us-plss-default",
    plss: {
      townshipRange: { township: 3, townshipDir: "South" as const, range: 16, rangeDir: "East" as const },
      section: 8,
      sectionNwCorner: { x: 10, y: 10 },
      sectionSide: 300,
    },
  };
}

/** Build a survey monument for the sample data. */
function monumentOf(
  type:
    | "prm"
    | "pcp"
    | "section-corner"
    | "quarter-corner"
    | "iron-rod"
    | "concrete",
  status: "found" | "set",
  x: number,
  y: number,
  label?: string,
): SurveyMonument {
  return { id: createId("mon"), type, status, position: { x, y }, label };
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

/**
 * A single-household estate at landscape scale — thousands of hectares organized
 * into management regions (homestead, agriculture, forest, watershed) with a
 * private access road, a lake, and varied terrain. This is the "whole territory
 * for one household" case: very large extents with regions above parcels.
 */
export function estateSite(name: string): Site {
  const elements: PlanElement[] = [];

  // ~6 km × 4 km holding (units are meters).
  const holding: Region = {
    id: createId("region"),
    kind: "region",
    name: "Estate Boundary",
    layerId: "layer-base",
    boundary: rect(0, 0, 6000, 4000),
    regionType: "estate",
  };
  elements.push(holding);

  const regions: Array<[string, Polygon, Region["regionType"]]> = [
    ["Homestead", rect(400, 300, 1400, 1000), "settlement"],
    ["Cropland", rect(2200, 300, 3200, 1400), "agricultural"],
    ["Managed Forest", rect(400, 1600, 2600, 2000), "reserve"],
    ["Watershed", rect(3400, 2000, 2200, 1700), "watershed"],
  ];
  for (const [rName, boundary, regionType] of regions) {
    elements.push({
      id: createId("region"),
      kind: "region",
      name: rName,
      layerId: "layer-base",
      boundary,
      regionType,
    } satisfies Region);
  }

  // The single household compound.
  const homesteadParcel: Parcel = {
    id: createId("parcel"),
    kind: "parcel",
    name: "Homestead Parcel",
    layerId: "layer-base",
    boundary: rect(700, 500, 700, 500),
  };
  elements.push(homesteadParcel);
  elements.push({
    id: createId("bldg"),
    kind: "building",
    name: "Main House",
    layerId: "layer-buildings",
    boundary: rect(900, 650, 120, 90),
    storeys: 2,
    height: 8,
    dwellingUnits: 1,
    use: "residential",
  } satisfies Building);

  // Land uses at territory scale.
  const crop: PlantingArea = {
    id: createId("planting"),
    kind: "planting",
    name: "Cropland",
    layerId: "layer-landscape",
    boundary: rect(2300, 400, 3000, 1200),
    plantingType: "crop",
    canopyCover: 0.2,
  };
  const forest: PlantingArea = {
    id: createId("planting"),
    kind: "planting",
    name: "Managed Forest",
    layerId: "layer-landscape",
    boundary: rect(500, 1700, 2400, 1800),
    plantingType: "forest",
    canopyCover: 0.85,
  };
  elements.push(crop, forest);

  const lake: WaterBody = {
    id: createId("water"),
    kind: "water",
    name: "Reservoir",
    layerId: "layer-landscape",
    boundary: [
      { x: 3800, y: 2400 },
      { x: 4600, y: 2300 },
      { x: 5200, y: 2700 },
      { x: 5000, y: 3300 },
      { x: 4200, y: 3400 },
      { x: 3700, y: 2900 },
    ],
    waterType: "reservoir",
  };
  elements.push(lake);

  // Terrain: a broad ridge falling toward the reservoir in the south-east.
  elements.push(
    ...hillSpots(0, 0, 6000, 4000, 9, 6, (nx, ny) => {
      const ridge = Math.sin(nx * Math.PI) * 60;
      const fallToWater = (1 - nx) * 40 + (1 - ny) * 30;
      return Math.round(120 + ridge + fallToWater);
    }),
  );

  // Orchard trees near the homestead.
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++) elements.push(tree(760 + c * 90, 1080 + r * 70, 12));

  // Private access road from the entrance to the homestead and on to the fields.
  const road: InfrastructureNetwork = networkFromPath(
    createId("net"),
    "Private Drive",
    "road",
    [
      { x: 0, y: 900 },
      { x: 1050, y: 900 },
      { x: 1050, y: 750 },
      { x: 2200, y: 900 },
      { x: 3800, y: 1200 },
    ],
    () => createId("nn"),
    { roadClass: "private", width: 8 },
  );

  return {
    id: createId("site"),
    name,
    spatial: defaultSpatialContext(),
    layers: baseLayers(),
    elements,
    networks: [road],
  };
}

/** Build a starter site for a chosen template. */
export function siteForTemplate(name: string, template: CreateProjectInput["template"]): Site {
  switch (template) {
    case "subdivision":
      return subdivisionSite(name);
    case "district":
      return districtSite(name);
    case "estate":
      return estateSite(name);
    default:
      return emptySite(name);
  }
}
