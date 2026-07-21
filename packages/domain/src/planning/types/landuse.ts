/** The designated-purpose categories a {@link LandUse} area can carry. */
export type LandUseCategory =
  | "residential"
  | "commercial"
  | "mixed-use"
  | "civic"
  | "industrial"
  | "park"
  | "open-space"
  | "agricultural"
  | "infrastructure"
  | "unassigned";

/** Descriptive metadata for a land-use category, shared by model and UI. */
export interface LandUseDefinition {
  category: LandUseCategory;
  label: string;
  /** A stable hex color used consistently across canvas, legend, and charts. */
  color: string;
  /** Whether the category counts as impervious for coverage/GSI metrics. */
  impervious: boolean;
  /** Whether the category counts as open space for OSR metrics. */
  openSpace: boolean;
  description: string;
}
