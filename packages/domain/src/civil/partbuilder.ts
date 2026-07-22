import type {
  PartParam,
  CustomPartDefinition,
  CustomPartCatalog,
} from "./types/partBuilder";

export type { PartParam, CustomPartDefinition, CustomPartCatalog };

export type SizeStorageType = "Constant" | "List" | "Range";

export interface PartSizeParameter {
  name: string;
  description: string;
  storageType: SizeStorageType;
  value: number; // for Constant
  listValues?: number[]; // for List
  rangeLimit?: { min: number; max: number }; // for Range
}

export interface PartFamily {
  id: string;
  name: string;
  partType: "JunctionStructure" | "Inlet" | "Outlet";
  shape: "Cylinder" | "Box";
  description: string;
  parameters: Record<string, PartSizeParameter>;
}

export interface CatalogChapter {
  name: string;
  families: PartFamily[];
}

export interface PartsCatalog {
  chapters: CatalogChapter[];
}

/** Standard structure components layout relative to rim (0.0). */
export interface ResolvedStructureComponents {
  frameTop: number;
  frameBottom: number;
  coneTop: number;
  coneBottom: number;
  riserTop: number;
  riserBottom: number;
  barrelTop: number;
  barrelBottom: number;
  totalHeight: number;
}

/**
 * Resolves standard vertical components for a cylindrical manhole structure
 * relative to the rim elevation.
 */
export function resolveCylindricalManhole(
  rimElevation: number,
  sumpElevation: number,
  parameters: Record<string, number>,
): ResolvedStructureComponents {
  const frameHeight = parameters["FRH"] ?? 0.5; // Frame Height
  const coneHeight = parameters["CNH"] ?? 1.5; // Cone Height

  const totalHeight = Math.max(0.1, rimElevation - sumpElevation);

  // Distribute height into frame, cone, riser, and barrel
  const frameTop = rimElevation;
  const frameBottom = rimElevation - frameHeight;

  // Cone sits below frame
  const coneTop = frameBottom;
  const coneBottom = Math.max(sumpElevation, coneTop - coneHeight);

  // Riser spans between cone and barrel, or is 0
  const riserTop = coneBottom;
  const barrelHeight = Math.min(4.0, coneBottom - sumpElevation); // Max barrel height 4 units
  const riserBottom = sumpElevation + barrelHeight;

  const barrelTop = riserBottom;
  const barrelBottom = sumpElevation;

  return {
    frameTop,
    frameBottom,
    coneTop,
    coneBottom,
    riserTop,
    riserBottom,
    barrelTop,
    barrelBottom,
    totalHeight,
  };
}

/**
 * Validates vault (box shape) wall thickness constraints.
 * Formula: thickness >= minThicknessRatio * wallLength
 */
export function validateVaultBoxWall(
  width: number,
  length: number,
  wallThickness: number,
  minThicknessRatio = 0.08, // wallThickness must be at least 8% of width/length
): { isValid: boolean; minimumRequired: number; errorMsg?: string } {
  const maxSpan = Math.max(width, length);
  const minRequired = maxSpan * minThicknessRatio;

  if (wallThickness < minRequired) {
    return {
      isValid: false,
      minimumRequired: minRequired,
      errorMsg: `Wall thickness of ${wallThickness.toFixed(2)} is too thin for a vault spanning ${maxSpan} units. Minimum required thickness is ${minRequired.toFixed(2)} units.`,
    };
  }

  return {
    isValid: true,
    minimumRequired: minRequired,
  };
}

/**
 * Generates factory default Part Catalog chapters.
 */
export function getDefaultPartsCatalog(): PartsCatalog {
  return {
    chapters: [
      {
        name: "Cylindrical Structures",
        families: [
          {
            id: "fam-cyl-manhole",
            name: "Cylindrical Manhole",
            partType: "JunctionStructure",
            shape: "Cylinder",
            description: "Standard precast concrete sewer or storm manhole",
            parameters: {
              FRH: {
                name: "FRH",
                description: "Frame Height",
                storageType: "Constant",
                value: 0.5,
              },
              CNH: {
                name: "CNH",
                description: "Cone Height",
                storageType: "Constant",
                value: 1.5,
              },
              BDM: {
                name: "BDM",
                description: "Barrel Diameter",
                storageType: "List",
                value: 4.0,
                listValues: [3.0, 4.0, 5.0, 6.0],
              },
              BDH: {
                name: "BDH",
                description: "Barrel Height",
                storageType: "Range",
                value: 4.0,
                rangeLimit: { min: 2.0, max: 12.0 },
              },
            },
          },
        ],
      },
      {
        name: "Inlet & Box Structures",
        families: [
          {
            id: "fam-box-vault",
            name: "Concrete Utility Vault",
            partType: "JunctionStructure",
            shape: "Box",
            description: "Rectangular precast vault structure",
            parameters: {
              VWD: {
                name: "VWD",
                description: "Vault Width",
                storageType: "List",
                value: 4.0,
                listValues: [2.0, 3.0, 4.0, 6.0],
              },
              VLN: {
                name: "VLN",
                description: "Vault Length",
                storageType: "List",
                value: 6.0,
                listValues: [4.0, 6.0, 8.0, 10.0],
              },
              WTH: {
                name: "WTH",
                description: "Wall Thickness",
                storageType: "Constant",
                value: 0.5,
              },
            },
          },
        ],
      },
    ],
  };
}
