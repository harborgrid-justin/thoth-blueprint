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
