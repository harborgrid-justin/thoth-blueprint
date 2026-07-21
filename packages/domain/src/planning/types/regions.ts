import type { MonumentType } from "../../survey/monument";

export type { MonumentType };
import type { Orientation, SheetSizeId } from "../../drawing/sheetsize";
import type { AreaUnit, CRS, Unit } from "../../spatial/spatial";

/** The rectangular-survey framework a jurisdiction is described in. */
export type SurveyFramework = "plss" | "georgia-land-lot" | "metes-and-bounds";

/** The platform's plat/civil capabilities. Every flag defaults to enabled. */
export interface Capabilities {
  surveyFramework: boolean;
  monuments: boolean;
  curveTable: boolean;
  lineTable: boolean;
  easements: boolean;
  stationing: boolean;
  platComposer: boolean;
  certificates: boolean;
  interiorAngles: boolean;
  sheetSet: boolean;
  titleBlock: boolean;
  revisions: boolean;
  dimensions: boolean;
  schedules: boolean;
  sections: boolean;
  elevations: boolean;
  details: boolean;
  gridBubbles: boolean;
  keynotes: boolean;
  matchLines: boolean;
  cadLayers: boolean;
  buildingInteriors: boolean;
  pdfExport: boolean;
}

/** A plat certificate/attestation block (template text with {placeholders}). */
export interface CertificateSpec {
  id: string;
  title: string;
  body: string;
  /** Signature-line labels beneath the block. */
  signatures?: string[];
}

/** A field shown in the sheet title block. */
export interface TitleBlockField {
  label: string;
  /** Data key resolved from the sheet context (e.g. "county", "scale"). */
  key: string;
}

/** The sheet title-block layout for a jurisdiction. */
export interface TitleBlockSpec {
  /** Fixed lines (firm name/address/license), shown verbatim if provided. */
  firmLines?: string[];
  fields: TitleBlockField[];
}

/** A column in the consolidated curve-data table. */
export interface CurveTableColumn {
  key:
    | "label"
    | "radius"
    | "delta"
    | "arcLength"
    | "chord"
    | "chordBearing"
    | "tangent";
  label: string;
}

/** Sheet/drafting standards a jurisdiction sets for its CAD deliverables. */
export interface SheetStandards {
  defaultSize: SheetSizeId;
  orientation: Orientation;
  /** Named drawing-scale ids offered for this jurisdiction (from ./drafting). */
  scaleSet: string[];
  layerStandard: "ncs" | "aia";
  /** Default dimension-style id (from ./dimension). */
  dimStyleId: string;
  unit: "in" | "mm";
}

/** Local subdivision / zoning standards a jurisdiction can impose. */
export interface JurisdictionStandards {
  /** Minimum lot area, acres. */
  minLotAreaAcres?: number;
  /** Nominal land-lot acreage for the Georgia Land Lot System. */
  landLotAcres?: number;
  frontSetback?: number;
  sideSetback?: number;
  rearSetback?: number;
  /** Minimum right-of-way width, plan units. */
  minRowWidth?: number;
}

/** A regional plug-in: how the platform's capabilities are adjusted for a place. */
export interface RegionPlugin {
  id: string;
  name: string;
  country: string;
  state?: string;
  county?: string;
  surveyFramework: SurveyFramework;
  defaults: { units: Unit; areaUnit: AreaUnit; crs: CRS };
  monuments: MonumentType[];
  /** Capability overrides; unspecified flags stay enabled. */
  capabilities?: Partial<Capabilities>;
  curveTableColumns: CurveTableColumn[];
  certificates: CertificateSpec[];
  titleBlock: TitleBlockSpec;
  standards?: JurisdictionStandards;
  /** CAD sheet/drafting standards for this jurisdiction. */
  sheetStandards?: SheetStandards;
}
