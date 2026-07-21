import { evaluatePointGroup } from "@thoth/domain";
import { elementMatches, elementSearchText } from "@/lib/search";
import { elementColor, elementMeta } from "@/lib/elementMeta";
import { formatNumber } from "@/lib/format";

export const POINT_GROUPS = [
  { id: "all", name: "All Points", query: "*" },
  { id: "trees", name: "Trees Group", query: "TR*" },
  { id: "storm", name: "Storm Structures", query: "MH*" },
  { id: "benchmarks", name: "Benchmarks", query: "BM*" },
];

export function countLayerElements(elements: any[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const el of elements) {
    counts.set(el.layerId, (counts.get(el.layerId) ?? 0) + 1);
  }
  return counts;
}

export function evaluatePointGroups(elements: any[]) {
  const pointElements = elements.map((e: any) => ({
    id: e.id,
    description: e.description || e.species || e.label || "",
  }));

  return POINT_GROUPS.map((group) => {
    const matchedIds = evaluatePointGroup(pointElements, group.query);
    const countText = formatNumber(matchedIds.length);
    return {
      ...group,
      matchedIds,
      countText,
    };
  });
}

export function filterLayerElements(elements: any[], query: string) {
  if (!query.trim()) {return elements;}
  return elements.filter((el) => elementMatches(el, query, "all"));
}

export function getLayerMeta(layer: any, elKind = "parcel") {
  const color = layer.color ?? elementColor(elKind as any);
  const meta = elementMeta(elKind as any);
  return { color, meta };
}

export function getElementSearchHaystack(el: any) {
  return elementSearchText(el);
}
