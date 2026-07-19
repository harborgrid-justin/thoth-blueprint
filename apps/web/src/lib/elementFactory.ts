import {
  createId,
  type ElementKind,
  type LandUseCategory,
  type PlanElement,
  type Point,
  type Polygon,
  type Site,
} from "@thoth/domain";
import { elementMeta } from "./elementMeta";

/** The number of existing elements of a kind, for auto-naming. */
function countOfKind(site: Site, kind: ElementKind): number {
  return site.elements.filter((e) => e.kind === kind).length;
}

/**
 * Build a new spatial planning element of `kind` from a drawn boundary. Element
 * kinds carry sensible domain defaults (a zone gets a designation, a building a
 * storey count) so a freshly drawn shape is immediately a real planning object.
 */
export function createSpatialElement(
  site: Site,
  kind: Exclude<ElementKind, "note">,
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
        designation: "R-1",
        allowedUses: ["residential"] as LandUseCategory[],
        maxCoverage: 0.5,
        maxFar: 1,
        maxHeight: 12,
        minSetback: 3,
      };
    case "landuse":
      return { ...base, kind, category: "residential" };
    case "lot":
      return { ...base, kind, setback: 3 };
    case "building":
      return { ...base, kind, storeys: 2, height: 7, dwellingUnits: 1, use: "residential" };
    case "row":
      return { ...base, kind, width: 12 };
    case "openspace":
      return { ...base, kind, dedicated: false };
    case "parcel":
      return { ...base, kind };
    case "block":
      return { ...base, kind };
    case "easement":
      return { ...base, kind, purpose: "utility" };
  }
}

/** Build a free-floating note anchored at a point. */
export function createNote(site: Site, position: Point, layerId: string): PlanElement {
  return {
    id: createId("note"),
    kind: "note",
    layerId,
    text: `Note ${countOfKind(site, "note") + 1}`,
    position,
  };
}
