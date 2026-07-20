import { isPointElement, type ElementKind, type PlanElement } from "@thoth/domain";

/**
 * Free-text haystack for an element: its kind plus name and the planning
 * attributes a planner would search by (APN, zoning designation, land-use
 * category, building use, etc.). Lower-cased for case-insensitive matching.
 */
export function elementSearchText(el: PlanElement): string {
  const parts: string[] = [el.kind];
  if (isPointElement(el)) {
    if (el.kind === "note") parts.push(el.text);
    if (el.kind === "tree") parts.push(el.species ?? "");
    if (el.kind === "spot") parts.push(el.label ?? "");
  } else {
    parts.push(el.name);
    switch (el.kind) {
      case "parcel":
        parts.push(el.apn ?? "");
        break;
      case "zone":
        parts.push(el.designation, ...el.allowedUses);
        break;
      case "landuse":
        parts.push(el.category);
        break;
      case "building":
        parts.push(el.use ?? "");
        break;
      case "region":
        parts.push(el.regionType ?? "");
        break;
      case "water":
        parts.push(el.waterType ?? "");
        break;
      case "planting":
        parts.push(el.plantingType ?? "");
        break;
    }
  }
  return parts.join(" ").toLowerCase();
}

/** Does an element match a free-text query and an optional kind filter? */
export function elementMatches(
  el: PlanElement,
  query: string,
  kind: ElementKind | "all",
): boolean {
  if (kind !== "all" && el.kind !== kind) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return elementSearchText(el).includes(q);
}
