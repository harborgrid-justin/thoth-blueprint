/**
 * Regional plug-ins (jurisdictions) — the platform ships **100% of the plat /
 * civil capabilities enabled**, and a region plug-in *adjusts* them for a place:
 * which survey framework applies (PLSS vs. the Georgia Land Lot System vs. plain
 * metes-and-bounds), the default units/CRS, the recognized monument types, the
 * plat sheet's title-block fields and required certificates, the curve-table
 * columns, and local subdivision standards.
 *
 * Enabling a plug-in (e.g. "Newton County, Georgia") is purely additive/
 * configurational: nothing is hard-coded to one jurisdiction, and the base
 * capability set has everything turned on.
 */

import type { MonumentType } from "../survey/monument";
import type { Orientation, SheetSizeId } from "../drawing/sheetsize";
import type { AreaUnit, CRS, Unit } from "../spatial/spatial";

import type {
  SurveyFramework,
  Capabilities,
  CertificateSpec,
  TitleBlockField,
  TitleBlockSpec,
  CurveTableColumn,
  SheetStandards,
  JurisdictionStandards,
  RegionPlugin,
} from "./types/regions";

export type {
  SurveyFramework,
  Capabilities,
  CertificateSpec,
  TitleBlockField,
  TitleBlockSpec,
  CurveTableColumn,
  SheetStandards,
  JurisdictionStandards,
  RegionPlugin,
};

/** The full capability set, everything on — the platform's baseline. */
export const ALL_CAPABILITIES: Capabilities = {
  surveyFramework: true,
  monuments: true,
  curveTable: true,
  lineTable: true,
  easements: true,
  stationing: true,
  platComposer: true,
  certificates: true,
  interiorAngles: true,
  sheetSet: true,
  titleBlock: true,
  revisions: true,
  dimensions: true,
  schedules: true,
  sections: true,
  elevations: true,
  details: true,
  gridBubbles: true,
  keynotes: true,
  matchLines: true,
  cadLayers: true,
  buildingInteriors: true,
  pdfExport: true,
};



/** Imperial engineering/architectural sheet standards on ARCH D. */
const IMPERIAL_SHEET_STANDARDS: SheetStandards = {
  defaultSize: "arch-d",
  orientation: "landscape",
  scaleSet: ["eng-10", "eng-20", "eng-30", "eng-40", "eng-50", "eng-100", "arch-1-8", "arch-1-4", "arch-1-2"],
  layerStandard: "ncs",
  dimStyleId: "eng-arrow",
  unit: "in",
};

/** Resolve a plug-in's effective capabilities against the all-on baseline. */
export function resolveCapabilities(plugin?: RegionPlugin | null): Capabilities {
  return { ...ALL_CAPABILITIES, ...(plugin?.capabilities ?? {}) };
}

// --- shared building blocks ------------------------------------------------

const STANDARD_MONUMENTS: MonumentType[] = [
  "prm",
  "pcp",
  "iron-rod",
  "iron-pipe",
  "rebar-cap",
  "nail-disc",
  "concrete",
  "benchmark",
];

const FULL_CURVE_COLUMNS: CurveTableColumn[] = [
  { key: "label", label: "Curve" },
  { key: "radius", label: "Radius" },
  { key: "delta", label: "Delta" },
  { key: "arcLength", label: "Arc" },
  { key: "chord", label: "Chord" },
  { key: "chordBearing", label: "Chord Brg." },
  { key: "tangent", label: "Tangent" },
];

// --- plug-ins --------------------------------------------------------------

/** Generic U.S. PLSS jurisdiction — the sensible default. */
export const US_PLSS_DEFAULT: RegionPlugin = {
  id: "us-plss-default",
  name: "United States (PLSS default)",
  country: "United States",
  surveyFramework: "plss",
  defaults: { units: "feet", areaUnit: "acres", crs: "EPSG:3857" },
  monuments: [...STANDARD_MONUMENTS, "section-corner", "quarter-corner"],
  curveTableColumns: FULL_CURVE_COLUMNS,
  titleBlock: {
    fields: [
      { label: "Project", key: "projectName" },
      { label: "Location", key: "framework" },
      { label: "Scale", key: "scale" },
      { label: "Date", key: "date" },
      { label: "Sheet", key: "sheet" },
    ],
  },
  certificates: [
    {
      id: "dedication",
      title: "Owner's Certificate & Dedication",
      body:
        "The undersigned owner of the land shown hereon has caused the same to be " +
        "surveyed and subdivided as shown, and dedicates the rights-of-way and " +
        "easements to public use.",
      signatures: ["Owner", "Date"],
    },
    {
      id: "surveyor",
      title: "Surveyor's Certificate",
      body:
        "I certify that this plat is a true and correct representation of the land " +
        "surveyed, that the monuments shown were placed as depicted, and that the " +
        "survey meets the applicable minimum technical standards.",
      signatures: ["Professional Land Surveyor", "License No."],
    },
    {
      id: "approval",
      title: "Certificate of Approval",
      body: "Approved for recording by the governing authority of {jurisdiction}.",
      signatures: ["Approving Official", "Date"],
    },
  ],
  standards: { minRowWidth: 50 },
  sheetStandards: IMPERIAL_SHEET_STANDARDS,
};

/**
 * Newton County, Georgia — a Georgia Land Lot System jurisdiction (202.5-acre
 * land lots), Georgia West State Plane, with Georgia plat certificates.
 */
export const NEWTON_COUNTY_GA: RegionPlugin = {
  id: "us-ga-newton",
  name: "Newton County, Georgia",
  country: "United States",
  state: "Georgia",
  county: "Newton",
  surveyFramework: "georgia-land-lot",
  // Georgia West State Plane (NAD83), US survey feet.
  defaults: { units: "feet", areaUnit: "acres", crs: "EPSG:2240" },
  monuments: [...STANDARD_MONUMENTS],
  // The land-lot system replaces the PLSS section grid.
  curveTableColumns: FULL_CURVE_COLUMNS,
  titleBlock: {
    firmLines: ["NEWTON COUNTY, GEORGIA", "Land Lot / District survey"],
    fields: [
      { label: "Project", key: "projectName" },
      { label: "Land Lot / District", key: "framework" },
      { label: "County", key: "county" },
      { label: "Scale", key: "scale" },
      { label: "Sheet", key: "sheet" },
    ],
  },
  certificates: [
    {
      id: "dedication",
      title: "Owner's Certificate & Dedication",
      body:
        "The owner of the property shown and described hereon acknowledges this plat " +
        "and dedicates to the use of the public forever all rights-of-way, streets, " +
        "and easements shown, in Newton County, Georgia.",
      signatures: ["Owner", "Date"],
    },
    {
      id: "surveyor-ga",
      title: "Surveyor's Certificate (Georgia)",
      body:
        "It is hereby certified that this plat is true and correct and was prepared " +
        "from an actual survey of the property by a Georgia Registered Land Surveyor; " +
        "that all monuments shown hereon actually exist or are marked as “Future”; and " +
        "that this plat complies with the Georgia Plat Act (O.C.G.A. § 15-6-67).",
      signatures: ["Georgia Registered Land Surveyor", "Registration No."],
    },
    {
      id: "county-approval",
      title: "Certificate of Approval for Recording",
      body:
        "This plat has been approved for recording by the Newton County Board of " +
        "Commissioners / Planning & Development, subject to the county subdivision " +
        "regulations.",
      signatures: ["Director / Chairman", "Date"],
    },
    {
      id: "health",
      title: "Health Department Certificate",
      body:
        "Approved for on-site sewage management (septic) and water supply by the " +
        "Newton County Environmental Health Department, where applicable.",
      signatures: ["Environmental Health", "Date"],
    },
  ],
  standards: {
    landLotAcres: 202.5,
    minLotAreaAcres: 1,
    frontSetback: 50,
    sideSetback: 15,
    rearSetback: 40,
    minRowWidth: 60,
  },
  sheetStandards: {
    ...IMPERIAL_SHEET_STANDARDS,
    scaleSet: ["eng-20", "eng-30", "eng-40", "eng-50", "eng-100", "eng-200", "arch-1-4"],
  },
};

/** All available region plug-ins. */
export const REGION_PLUGINS: RegionPlugin[] = [US_PLSS_DEFAULT, NEWTON_COUNTY_GA];

const BY_ID = new Map(REGION_PLUGINS.map((p) => [p.id, p]));

/** Look up a region plug-in by id. */
export function getRegionPlugin(id: string | undefined | null): RegionPlugin | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** List all registered region plug-ins. */
export function listRegionPlugins(): RegionPlugin[] {
  return REGION_PLUGINS;
}
