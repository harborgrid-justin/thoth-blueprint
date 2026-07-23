import { createId } from "../spatial/id";
import type { ElementKind, LandUseCategory, PlanElement, Point, Polygon, Site } from "../spatial/types";
import { elementMeta } from "./elementMeta";

/** The number of existing elements of a kind, for auto-naming. */
function countOfKind(site: Site, kind: ElementKind): number {
  return site.elements.filter((e: PlanElement) => e.kind === kind).length;
}

/**
 * Build a new spatial planning element of `kind` from a drawn boundary. Element
 * kinds carry sensible domain defaults (a zone gets a designation, a building a
 * storey count) so a freshly drawn shape is immediately a real planning object.
 */
import { globalPartsDb } from "../parts/registry";

const catalogZoning = globalPartsDb.getZoningDistricts()[0];
const DEFAULT_DESIGNATION = (catalogZoning?.properties?.designation as string) || "R-1";
const DEFAULT_MAX_COVERAGE = (catalogZoning?.properties?.maxCoverage as number) || 0.5;
const DEFAULT_MAX_FAR = (catalogZoning?.properties?.maxFar as number) || 1.0;
const DEFAULT_MAX_HEIGHT = (catalogZoning?.properties?.maxHeightMeters as number) || 12.0;
const DEFAULT_MIN_SETBACK = (catalogZoning?.properties?.minSetbackMeters as number) || 3.0;
const DEFAULT_STOREYS = (catalogZoning?.properties?.defaultStoreys as number) || 2;
const DEFAULT_BLDG_HEIGHT = (catalogZoning?.properties?.defaultBuildingHeightMeters as number) || 7.0;
const DEFAULT_ROW_WIDTH = (catalogZoning?.properties?.rowWidthMeters as number) || 12.0;

export function createSpatialElement(
  site: Site,
  kind: Exclude<ElementKind, "note" | "tree" | "spot">,
  boundary: Polygon,
  layerId: string,
): PlanElement {
  const meta = elementMeta(kind);
  const name = `${meta.namePrefix} ${countOfKind(site, kind) + 1}`;
  const base = { id: createId(kind), name, layerId, boundary };

  switch (kind) {
    case "zone":
      return {
        ...base,
        kind,
        designation: DEFAULT_DESIGNATION,
        allowedUses: ["residential"] as LandUseCategory[],
        maxCoverage: DEFAULT_MAX_COVERAGE,
        maxFar: DEFAULT_MAX_FAR,
        maxHeight: DEFAULT_MAX_HEIGHT,
        minSetback: DEFAULT_MIN_SETBACK,
      };
    case "landuse":
      return { ...base, kind, category: "residential" };
    case "lot":
      return { ...base, kind, setback: DEFAULT_MIN_SETBACK };
    case "building":
      return {
        ...base,
        kind,
        storeys: DEFAULT_STOREYS,
        height: DEFAULT_BLDG_HEIGHT,
        dwellingUnits: 1,
        use: "residential",
      };
    case "row":
      return { ...base, kind, width: DEFAULT_ROW_WIDTH };
    case "openspace":
      return { ...base, kind, dedicated: false };
    case "region":
      return { ...base, kind, regionType: "estate" };
    case "water":
      return { ...base, kind, waterType: "pond" };
    case "planting":
      return { ...base, kind, plantingType: "forest", canopyCover: 0.8 };
    case "grade":
      return { ...base, kind, targetElevation: 0, method: "flat" };
    case "parcel":
      return { ...base, kind };
    case "block":
      return { ...base, kind };
    case "easement":
      return { ...base, kind, purpose: "utility" };
    case "stair":
      return {
        ...base,
        kind,
        stairType: "straight",
        width: 1.0,
        height: 2.8,
        treadDepthLimit: 0.28,
        riserHeightLimit: 0.18,
        stringerProfile: "open",
        stringerWidth: 0.05,
        landingSlabThickness: 0.15,
        treadSlabThickness: 0.12,
        nosingProfile: "round",
        nosingOverhang: 0.02,
        slipResistantGrooves: false,
      };
    case "curtainwall":
      return {
        ...base,
        kind,
        width: 6.0,
        height: 3.2,
        grid: {
          verticalDivisions: "uniform",
          verticalOffsets: [4],
          horizontalDivisions: "uniform",
          horizontalOffsets: [2],
          infillMaterials: {
            "0,0": "glazing",
            "1,0": "glazing",
            "2,0": "glazing",
            "3,0": "glazing",
            "0,1": "glazing",
            "1,1": "glazing",
            "2,1": "glazing",
            "3,1": "glazing",
          },
        },
        cornerStyle: "rectangular",
        frameProfileWidth: 0.1,
        expansionGap: 0.01,
        paneOffset: 0.02,
        clipSpacing: 0.6,
        structuralTieSpacing: 1.2,
        frameRValue: 2.5,
      };
    case "door":
      return {
        ...base,
        kind,
        width: 0.9,
        height: 2.1,
        depth: 0.15,
        doorOperation: "swing",
        swingAngle: 90,
        sillThickness: 0.05,
        sillOverhang: 0.03,
        thresholdHeight: 0.01,
        weatherstripping: true,
        hardwareTrim: "lever",
        fireRating: "none",
        stcRating: 32,
        safetyGlazing: "none",
        frameProfile: "wood",
      };
    case "window":
      return {
        ...base,
        kind,
        width: 1.2,
        height: 1.2,
        depth: 0.15,
        windowType: "single-hung",
        sillThickness: 0.06,
        sillOverhang: 0.04,
        thresholdHeight: 0.0,
        weatherstripping: true,
        fireRating: "none",
        stcRating: 35,
        safetyGlazing: "tempered",
        frameProfile: "vinyl",
      };
    case "roof":
      return {
        ...base,
        kind,
        roofType: "gable",
        pitch: 6,
        overhang: 0.3,
        soffitWidth: 0.3,
        thickness: 0.2,
        shingleMaterial: "asphalt",
        gutters: true,
        soffitVents: true,
        dormers: [],
      };
  }
}

/** Build a point-anchored element (note, tree, or spot elevation). */
export function createPointElement(
  site: Site,
  kind: "note" | "tree" | "spot",
  position: Point,
  layerId: string,
): PlanElement {
  switch (kind) {
    case "tree":
      return {
        id: createId("tree"),
        kind,
        layerId,
        position,
        species: "Shade tree",
        canopyRadius: 4,
      };
    case "spot":
      return {
        id: createId("spot"),
        kind,
        layerId,
        position,
        z: 0,
        label: `SP${countOfKind(site, "spot") + 1}`,
      };
    case "note":
      return {
        id: createId("note"),
        kind,
        layerId,
        text: `Note ${countOfKind(site, "note") + 1}`,
        position,
      };
  }
}
