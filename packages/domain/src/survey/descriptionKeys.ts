import type { DescriptionKey, PointGroup } from "./types/descriptionKeys";

export type { DescriptionKey, PointGroup };

/** Check if description matches wildcard code (e.g. TR* matches TREE) */
export function matchWildcard(value: string, pattern: string): boolean {
  const cleanVal = value.toUpperCase().trim();
  const cleanPat = pattern.toUpperCase().trim();
  if (cleanPat === "*") {
    return true;
  }
  if (cleanPat.endsWith("*")) {
    const prefix = cleanPat.slice(0, -1);
    return cleanVal.startsWith(prefix);
  }
  return cleanVal === cleanPat;
}

/** Find matching description key configuration */
export function findMatchingKey(
  rawDesc: string,
  keys: DescriptionKey[],
): DescriptionKey | null {
  for (const k of keys) {
    if (matchWildcard(rawDesc, k.code)) {
      return k;
    }
  }
  return null;
}

/** Formats raw description based on AASHTO rules (e.g. "$*" copies raw) */
export function formatDescription(rawDesc: string, formatSpec: string): string {
  if (formatSpec === "$*") {
    return rawDesc;
  }
  if (formatSpec.includes("$*")) {
    return formatSpec.replace(/\$\*/g, rawDesc);
  }
  return formatSpec;
}

/** Evaluates point group membership */
export function evaluatePointGroup(
  points: { id: string; description?: string }[],
  query: string,
): string[] {
  return points
    .filter((pt) => pt.description && matchWildcard(pt.description, query))
    .map((pt) => pt.id);
}

import { globalPartsDb } from "../parts/registry";

const catalogKeys = globalPartsDb.getDescriptionKeys();

/** Standard default description key set */
export const DEFAULT_DESCRIPTION_KEYS: DescriptionKey[] = catalogKeys.length > 0
  ? catalogKeys.map((k) => ({
      code: (k.properties?.code as string) || k.id,
      layerId: (k.properties?.layerId as string) || "c-survey",
      format: (k.properties?.format as string) || "$*",
      elementKind: (k.properties?.elementKind as any) || "spot",
    }))
  : [
      { code: "TR*", layerId: "c-tree", format: "Tree $*", elementKind: "tree" },
      {
        code: "MH*",
        layerId: "c-storm",
        format: "Manhole $*",
        elementKind: "civilSymbol",
        symbolName: "Inlet Protection",
      },
      {
        code: "BM*",
        layerId: "c-survey",
        format: "Benchmark $*",
        elementKind: "spot",
      },
    ];
