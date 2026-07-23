export type PartCategory =
  | "architectural"
  | "electrical"
  | "lumber"
  | "civil"
  | "mechanical_plumbing"
  | "structural"
  | "landscape"
  | "custom";

export interface PartDimensions {
  width?: number; // feet or inches depending on unit
  height?: number;
  depth?: number;
  thickness?: number;
  length?: number;
  diameter?: number;
}

export interface PartSpecification {
  id: string;
  sku?: string;
  name: string;
  category: PartCategory;
  subcategory: string;
  description: string;
  manufacturer?: string;
  modelNumber?: string;
  unit: "ea" | "ft" | "m" | "sqft" | "sqm" | "bdft" | "linear_ft";
  cost?: number;
  dimensions?: PartDimensions;
  properties?: Record<string, string | number | boolean>;
  tags?: string[];
}

export interface PartFilterOptions {
  category?: PartCategory;
  subcategory?: string;
  searchQuery?: string;
  tags?: string[];
  manufacturer?: string;
}
