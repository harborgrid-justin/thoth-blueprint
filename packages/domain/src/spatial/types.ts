import type { HorizontalAlignment } from "../civil/alignment";
import type { CivilSymbol, ControlLine } from "../survey/controls";
import type { LandLotRef } from "../planning/landlot";
import type { SurveyMonument } from "../survey/monument";
import type { TownshipRange } from "../survey/plss";
import type { InfrastructureNetwork } from "../civil/network";
import type { CadLayer } from "../drawing/drafting";
import type { DrawingSet } from "../drawing/sheet";
import type { SheetViewport, SectionMark, ElevationMark, DetailMark, MatchLine } from "../drawing/sheetview";
import type { Dimension } from "../drawing/dimension";
import type { GridLine, Keynote, KeynoteTag, Leader, RevisionCloud } from "../drawing/annotation";
import type { BuildingModel } from "../planning/building";
import type { LandUseCategory } from "../planning/landuse";

export type {
  HorizontalAlignment,
  CivilSymbol,
  ControlLine,
  LandLotRef,
  SurveyMonument,
  TownshipRange,
  InfrastructureNetwork,
  CadLayer,
  DrawingSet,
  SheetViewport,
  SectionMark,
  ElevationMark,
  DetailMark,
  MatchLine,
  Dimension,
  GridLine,
  Keynote,
  KeynoteTag,
  Leader,
  RevisionCloud,
  BuildingModel,
  LandUseCategory,
};

/** A single position in plan space. */
export interface Point {
  x: number;
  y: number;
}

/** An open sequence of connected points. */
export type Polyline = Point[];

/**
 * A closed ring of points describing an area. The closing edge from the last
 * point back to the first is implied; callers should NOT repeat the first point.
 */
export type Polygon = Point[];

/** An axis-aligned bounding box in plan space. */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Length units a plan can be expressed in. Attached explicitly — never implied. */
export type Unit = "meters" | "feet";

/**
 * A coordinate reference system identifier, typically an EPSG code such as
 * "EPSG:3857" (Web Mercator) or "EPSG:4326" (WGS84 lon/lat). Every plan has one;
 * geometry without a CRS is invalid.
 */
export type CRS = string;

/** The ratio of plan distance to real-world distance (e.g. 1 / 1000). */
export type Scale = number;

/** The spatial reference attached to all geometry in a plan. */
export interface SpatialContext {
  crs: CRS;
  units: Unit;
  scale: Scale;
}

/** Units in which an area metric can be reported. */
export type AreaUnit = "sqm" | "sqft" | "acres" | "hectares" | "sqkm" | "sqmi";

/** Circular-arc bulge mappings keyed by vertex index. */
export type EdgeArcs = Record<string, number>;

/** The kinds of planning elements a plan can contain. */
export type ElementKind =
  | "region"
  | "parcel"
  | "block"
  | "lot"
  | "zone"
  | "landuse"
  | "building"
  | "row"
  | "easement"
  | "openspace"
  | "water"
  | "planting"
  | "grade"
  | "tree"
  | "spot"
  | "note";

/** A named, orderable grouping of elements that can be shown, hidden, or locked. */
export interface Layer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
  /** Optional color hint for elements drawn on this layer. */
  color?: string;
}

/** Fields shared by every spatial planning element. */
export interface ElementBase {
  id: string;
  kind: ElementKind;
  name: string;
  layerId: string;
  /** Closed boundary ring in plan coordinates (arc endpoints when curved). */
  boundary: Polygon;
  /**
   * Optional per-edge circular-arc bulges (DXF convention; edge i runs vertex
   * i → i+1). Absent or empty means every edge is a straight line.
   */
  arcs?: EdgeArcs;
  /** Optional CAD layer name (NCS/AIA) this element plots on. */
  cadLayerId?: string;
  /** Optional line-weight override. */
  lineWeight?: string;
  /** Optional line-type override. */
  lineType?: string;
  /** Optional hatch pattern id override. */
  hatchId?: string;
  /** Renovation status of the planning element. Defaults to "existing" if not specified. */
  renovationStatus?: "existing" | "new" | "demolished";
}

/** A large-scale land division above the parcel. */
export interface Region extends ElementBase {
  kind: "region";
  regionType?: "estate" | "district" | "watershed" | "reserve" | "agricultural" | "settlement";
}

/** A legally or conceptually distinct piece of land — the fundamental unit. */
export interface Parcel extends ElementBase {
  kind: "parcel";
  /** Optional assessor/parcel identifier. */
  apn?: string;
}

/** An area bounded by rights-of-way that contains lots (parcel → block → lot). */
export interface Block extends ElementBase {
  kind: "block";
  parcelId?: string;
}

/** A subdivided unit of a parcel/block intended for a building or use. */
export interface Lot extends ElementBase {
  kind: "lot";
  parcelId?: string;
  blockId?: string;
  /** Required minimum distance from each boundary to a building, in plan units. */
  setback?: number;
}

/** An area governed by planning rules (e.g. a zoning district). */
export interface Zone extends ElementBase {
  kind: "zone";
  /** A zoning designation code, e.g. "R-1", "C-2", "MU". */
  designation: string;
  /** Land uses permitted within the zone. */
  allowedUses: LandUseCategory[];
  /** Maximum building coverage as a fraction of lot area (0–1). */
  maxCoverage?: number;
  /** Maximum floor area ratio. */
  maxFar?: number;
  /** Maximum building height in plan units. */
  maxHeight?: number;
  /** Minimum setback from boundaries in plan units. */
  minSetback?: number;
}

/** The designated purpose of an area, allocated across the site. */
export interface LandUse extends ElementBase {
  kind: "landuse";
  category: LandUseCategory;
}

/** A structure represented by a 2D footprint on a lot. */
export interface Building extends ElementBase {
  kind: "building";
  lotId?: string;
  /** Number of storeys; multiplies footprint area into gross floor area. */
  storeys: number;
  /** Height in plan units (informational; storeys drive floor-area math). */
  height?: number;
  /** Dwelling units contained, for density metrics. */
  dwellingUnits?: number;
  use?: LandUseCategory;
}

/** Land reserved for streets, paths, or utilities — typically public. */
export interface RightOfWay extends ElementBase {
  kind: "row";
  /** Centerline of the ROW, if modeled linearly. */
  centerline?: Polyline;
  /** Nominal width in plan units. */
  width?: number;
}

/** An area encumbering a parcel/lot that restricts building. */
export interface Easement extends ElementBase {
  kind: "easement";
  purpose?: "utility" | "access" | "drainage" | "other";
}

/** Unbuilt land reserved as open space (distinct from a "park" land use). */
export interface OpenSpace extends ElementBase {
  kind: "openspace";
  /** Whether this open space is a public dedication. */
  dedicated?: boolean;
}

/** A body of water — a landscape and drainage feature. */
export interface WaterBody extends ElementBase {
  kind: "water";
  waterType?: "lake" | "pond" | "river" | "stream" | "wetland" | "reservoir";
}

/** A landscaped / vegetated area (lawn, forest, garden, crop, meadow). */
export interface PlantingArea extends ElementBase {
  kind: "planting";
  plantingType?: "lawn" | "forest" | "garden" | "orchard" | "crop" | "meadow";
  /** Estimated canopy/cover fraction (0–1) for landscape metrics. */
  canopyCover?: number;
}

/** A grading region: land reshaped to a target elevation (a pad, terrace, or basin). */
export interface GradeRegion extends ElementBase {
  kind: "grade";
  /** Finished-grade elevation in plan units. */
  targetElevation: number;
  method?: "flat" | "terrace";
}

/** A free-form annotation anchored on the canvas. */
export interface PlanNote {
  id: string;
  kind: "note";
  layerId: string;
  text: string;
  position: Point;
  renovationStatus?: "existing" | "new" | "demolished";
}

/** A single tree/shrub as a point, with a canopy radius for coverage math. */
export interface Tree {
  id: string;
  kind: "tree";
  layerId: string;
  position: Point;
  species?: string;
  /** Canopy radius in plan units. */
  canopyRadius: number;
  renovationStatus?: "existing" | "new" | "demolished";
}

/** A surveyed spot elevation / benchmark — a control point for the terrain surface. */
export interface SpotElevationPoint {
  id: string;
  kind: "spot";
  layerId: string;
  position: Point;
  /** Elevation in plan units. */
  z: number;
  label?: string;
  renovationStatus?: "existing" | "new" | "demolished";
}

/** Any spatial planning element (everything carrying a boundary polygon). */
export type SpatialElement =
  | Region
  | Parcel
  | Block
  | Lot
  | Zone
  | LandUse
  | Building
  | RightOfWay
  | Easement
  | OpenSpace
  | WaterBody
  | PlantingArea
  | GradeRegion;

/** Any point-based element (anchored at a position, no boundary). */
export type PointElement = PlanNote | Tree | SpotElevationPoint;

/** Any element that can appear in a plan. */
export type PlanElement = SpatialElement | PointElement;

/** The overall area being planned; top-level container for spatial content. */
export interface Site {
  id: string;
  name: string;
  spatial: SpatialContext;
  layers: Layer[];
  elements: PlanElement[];
  /** Road and utility networks serving the site. */
  networks?: InfrastructureNetwork[];
  /** Stationed horizontal alignments (roadway/civil baselines). */
  alignments?: HorizontalAlignment[];
  /** Survey monuments (control) depicted on the plat. */
  monuments?: SurveyMonument[];
  /** Civil / erosion-control line features (silt fence, tree line, flow, …). */
  controlLines?: ControlLine[];
  /** Civil / erosion-control point symbols (inlet protection, ditch check, …). */
  civilSymbols?: CivilSymbol[];
  /**
   * Public Land Survey System framework this plat is tied to (Township/Range),
   * with the controlling section and its northwest corner in plan coordinates.
   */
  plss?: {
    townshipRange: TownshipRange;
    section: number;
    /** Plan-coordinate NW corner and side length of the controlling section. */
    sectionNwCorner?: Point;
    sectionSide?: number;
  };
  /** Georgia Land Lot System framework (used when the jurisdiction requires it). */
  landLot?: {
    ref: LandLotRef;
    /** Plan-coordinate NW corner of the controlling land lot. */
    nwCorner?: Point;
  };
  /** Active region plug-in (jurisdiction) id — see `./regions`. */
  jurisdictionId?: string;
  /** CAD sheet drawing sets composed from this site (see `./sheet`). */
  drawingSets?: DrawingSet[];
  /** Paper-space viewports referenced by sheets (see `./sheetview`). */
  sheetViewports?: SheetViewport[];
  /** Dimension entities annotating the plan (see `./dimension`). */
  dimensions?: Dimension[];
  /** NCS/AIA CAD layer standard for this site (see `./drafting`). */
  cadLayers?: CadLayer[];
  /** Building-interior models (walls/doors/windows/rooms) keyed to buildings. */
  buildingModels?: BuildingModel[];
  /** Drafting annotation & reference marks. */
  annotations?: {
    gridLines?: GridLine[];
    keynotes?: Keynote[];
    keynoteTags?: KeynoteTag[];
    revisionClouds?: RevisionCloud[];
    sectionMarks?: SectionMark[];
    elevationMarks?: ElevationMark[];
    detailMarks?: DetailMark[];
    matchLines?: MatchLine[];
    leaders?: Leader[];
  };
}
