export interface DescriptionKey {
  code: string; // e.g. "TR*" or "MH*"
  layerId: string; // e.g. "c-tree", "c-storm"
  format: string; // e.g. "$*" or "Tree - $*"
  elementKind: "tree" | "spot" | "civilSymbol" | "note";
  symbolName?: string;
}

export interface PointGroup {
  id: string;
  name: string;
  query: string; // wildcard query like "TR*" or "*"
  pointIds: string[];
}

/** Check if description matches wildcard code (e.g. TR* matches TREE) */
export function matchWildcard(value: string, pattern: string): boolean {
  const cleanVal = value.toUpperCase().trim();
  const cleanPat = pattern.toUpperCase().trim();
  if (cleanPat === "*") return true;
  if (cleanPat.endsWith("*")) {
    const prefix = cleanPat.slice(0, -1);
    return cleanVal.startsWith(prefix);
  }
  return cleanVal === cleanPat;
}

/** Find matching description key configuration */
export function findMatchingKey(rawDesc: string, keys: DescriptionKey[]): DescriptionKey | null {
  for (const k of keys) {
    if (matchWildcard(rawDesc, k.code)) {
      return k;
    }
  }
  return null;
}

/** Formats raw description based on AASHTO rules (e.g. "$*" copies raw) */
export function formatDescription(rawDesc: string, formatSpec: string): string {
  if (formatSpec === "$*") return rawDesc;
  if (formatSpec.includes("$*")) {
    return formatSpec.replace(/\$\*/g, rawDesc);
  }
  return formatSpec;
}

/** Evaluates point group membership */
export function evaluatePointGroup(points: { id: string; description?: string }[], query: string): string[] {
  return points
    .filter((pt) => pt.description && matchWildcard(pt.description, query))
    .map((pt) => pt.id);
}

/** Standard default description key set */
export const DEFAULT_DESCRIPTION_KEYS: DescriptionKey[] = [
  { code: "TR*", layerId: "c-tree", format: "Tree $*", elementKind: "tree" },
  { code: "MH*", layerId: "c-storm", format: "Manhole $*", elementKind: "civilSymbol", symbolName: "Inlet Protection" },
  { code: "BM*", layerId: "c-survey", format: "Benchmark $*", elementKind: "spot" },
];
