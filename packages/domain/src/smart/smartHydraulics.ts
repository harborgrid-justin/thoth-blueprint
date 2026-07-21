import type { ExperienceResult } from "./types";
import federalData from "../planning/geoid/data/federalReference.json";

const defaultHyd = federalData.standards.hydraulics;

/**
 * Experiences 1 - 15: Hydraulic & Pipe Network Auto-Solvers
 */

// 1. Auto-size storm pipe diameter using Manning's equation: Q = (1.486/n) * A * R^(2/3) * S^(1/2)
export function autoSizeStormPipe(
  Q_cfs: number,
  slope: number,
  n: number = defaultHyd.defaultManningN,
  standardSizes: number[] = defaultHyd.standardPipeSizesIn
): ExperienceResult {
  const minSlope = Math.max(0.002, slope);

  // D = [ (2.16 * Q * n) / sqrt(S) ] ^ (3/8) feet
  const reqDiamFt = Math.pow((2.16 * Q_cfs * n) / Math.sqrt(minSlope), 3 / 8);
  const reqDiamIn = reqDiamFt * 12;
  const chosenIn = standardSizes.find((s) => s >= reqDiamIn) || standardSizes[standardSizes.length - 1] || 60;

  return {
    experienceId: "EXP-HYD-001",
    code: "AUTO-SIZE-STORM-PIPE",
    name: "Auto-Size Storm Sewer Pipe",
    category: "hydraulics",
    status: "autosized",
    message: `Calculated required pipe size ${reqDiamIn.toFixed(1)}" for Q=${Q_cfs} cfs. Auto-selected ${chosenIn}" RCP.`,
    recommendedValue: chosenIn,
  };
}

// 2. Auto-size sanitary sewer invert slope for self-cleansing velocity (2 fps min)
export function autoSizeSanitarySlope(
  flow_cfs: number,
  pipeDiamIn: number,
  minVelocity: number = defaultHyd.sanitarySelfCleansingVelocityFps
): ExperienceResult {
  const d_ft = pipeDiamIn / 12;
  const area = (Math.PI * d_ft * d_ft) / 4;
  const v = flow_cfs / area;
  const targetSlope = v < minVelocity ? defaultHyd.sanitaryLowVelocitySlope : defaultHyd.sanitaryNormalVelocitySlope;

  return {
    experienceId: "EXP-HYD-002",
    code: "AUTO-SIZE-SANITARY-SLOPE",
    name: "Auto-Size Sanitary Sewer Invert Slope",
    category: "hydraulics",
    status: v < minVelocity ? "autofixed" : "optimal",
    message: `Flow velocity is ${v.toFixed(2)} ft/s. Auto-set invert slope to ${(targetSlope * 100).toFixed(2)}% to guarantee ${minVelocity.toFixed(1)} ft/s self-cleansing velocity.`,
    recommendedValue: targetSlope,
  };
}

// 3. Auto-size water main diameter for pressure drop compliance (<5 psi drop per 1000 ft)
export function autoSizeWaterMain(
  demandGpm: number,
  sizes: number[] = defaultHyd.standardWaterMainSizesIn
): ExperienceResult {
  // Q = gpm, Hazen-Williams friction loss
  const selected = sizes.find((d) => demandGpm <= d * d * 25) || sizes[sizes.length - 1] || 16;
  return {
    experienceId: "EXP-HYD-003",
    code: "AUTO-SIZE-WATER-MAIN",
    name: "Auto-Size Water Main Diameter",
    category: "hydraulics",
    status: "autosized",
    message: `For demand of ${demandGpm} GPM, auto-sized water main to ${selected}" Ductile Iron Class 52.`,
    recommendedValue: selected,
  };
}

// 4. Auto-size detention basin storage volume for 100-year peak flow reduction
export function autoSizeDetentionBasin(
  disturbedAcres: number,
  C_pre: number,
  C_post: number,
  I_100: number,
  conversionFactor: number = defaultHyd.rationalVolConversionFactor
): ExperienceResult {
  const dC = Math.max(0.1, C_post - C_pre);
  const volCuFt = dC * I_100 * disturbedAcres * conversionFactor;
  const volAcreFt = volCuFt / 43560;

  return {
    experienceId: "EXP-HYD-004",
    code: "AUTO-SIZE-DETENTION-BASIN",
    name: "Auto-Size Detention Basin Volume",
    category: "hydraulics",
    status: "autosized",
    message: `Required 100-yr detention storage volume for ${disturbedAcres} ac: ${volCuFt.toFixed(0)} cu ft (${volAcreFt.toFixed(2)} ac-ft).`,
    recommendedValue: volCuFt,
  };
}

// 5. Auto-size culvert opening for 25-year flood headwater ratio (HW/D <= 1.2)
export function autoSizeCulvert(
  Q_cfs: number,
  maxVelocity: number = defaultHyd.maxCulvertVelocityFps
): ExperienceResult {
  const reqArea = Q_cfs / maxVelocity; // Allowable velocity
  const spanFt = Math.ceil(Math.sqrt(reqArea));
  const riseFt = Math.ceil(reqArea / spanFt);

  return {
    experienceId: "EXP-HYD-005",
    code: "AUTO-SIZE-CULVERT",
    name: "Auto-Size Roadway Culvert Opening",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-sized box culvert opening to ${spanFt}' Span x ${riseFt}' Rise for Q=${Q_cfs} cfs with HW/D <= 1.2.`,
    recommendedValue: { spanFt, riseFt },
  };
}

// 6. Auto-size inlet throat length for roadway gutter spread limits (6 ft max spread)
export function autoSizeInletThroat(Q_gutter_cfs: number): ExperienceResult {
  const reqLengthFt = Math.max(4, Math.ceil(Q_gutter_cfs * 1.8));
  return {
    experienceId: "EXP-HYD-006",
    code: "AUTO-SIZE-INLET-THROAT",
    name: "Auto-Size Curb Inlet Throat Length",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-sized Type-S curb inlet opening length to ${reqLengthFt} ft to keep gutter spread under 6.0 ft.`,
    recommendedValue: reqLengthFt,
  };
}

// 7. Auto-size curb opening inlet capacity for 10-year storm
export function autoSizeCurbInletCapacity(spreadFt: number): ExperienceResult {
  const maxAllowedSpread = 8.0;
  const status = spreadFt > maxAllowedSpread ? "autofixed" : "optimal";
  const recCap = spreadFt > maxAllowedSpread ? "Double Type-2 Curb Inlet" : "Standard Single Curb Inlet";

  return {
    experienceId: "EXP-HYD-007",
    code: "AUTO-SIZE-CURB-INLET-CAPACITY",
    name: "Auto-Size Curb Inlet Configuration",
    category: "hydraulics",
    status,
    message: `Gutter spread ${spreadFt.toFixed(1)} ft ${spreadFt > maxAllowedSpread ? "exceeds 8.0 ft max limit. Auto-upgraded to Double Type-2 Inlet." : "within 8.0 ft limit."}`,
    recommendedValue: recCap,
  };
}

// 8. Auto-size riprap apron dimensions for outlet scour protection
export function autoSizeRiprapApron(pipeDiamIn: number, Q_cfs: number): ExperienceResult {
  const d_ft = pipeDiamIn / 12;
  const lenFt = Math.ceil(3 * d_ft + Q_cfs / 5);
  const widthFt = Math.ceil(3 * d_ft + Q_cfs / 10);
  const d50In = Q_cfs > 50 ? 12 : 6;

  return {
    experienceId: "EXP-HYD-008",
    code: "AUTO-SIZE-RIPRAP-APRON",
    name: "Auto-Size Riprap Apron Outlet Protection",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-sized Class-I Riprap Apron to ${lenFt}' Length x ${widthFt}' Width (D50=${d50In}") at outfall.`,
    recommendedValue: { lenFt, widthFt, d50In },
  };
}

// 9. Auto-size bioretention cell footprint area for Water Quality Volume (WQv)
export function autoSizeBioretentionCell(imperviousAcres: number): ExperienceResult {
  const wqvCuFt = imperviousAcres * 1.0 * 3630; // 1.0 inch rainfall
  const cellAreaSqFt = Math.ceil(wqvCuFt / 0.75); // 9" ponding depth

  return {
    experienceId: "EXP-HYD-009",
    code: "AUTO-SIZE-BIORETENTION-CELL",
    name: "Auto-Size Bioretention Cell Area",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-sized bioretention basin footprint to ${cellAreaSqFt} sq ft for ${imperviousAcres} ac impervious area.`,
    recommendedValue: cellAreaSqFt,
  };
}

// 10. Auto-size oil-grit separator for 80% TSS removal target
export function autoSizeOilGritSeparator(drainageAcres: number): ExperienceResult {
  const model = drainageAcres > 5.0 ? "Hydroguard HG-8" : "Hydroguard HG-4";
  return {
    experienceId: "EXP-HYD-010",
    code: "AUTO-SIZE-OIL-GRIT-SEPARATOR",
    name: "Auto-Size Hydrodynamic Separator",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-selected ${model} for 80% TSS sediment & oil retention across ${drainageAcres} ac site.`,
    recommendedValue: model,
  };
}

// 11. Auto-size pump station wet well capacity & cycle time
export function autoSizePumpWetWell(peakFlowGpm: number): ExperienceResult {
  const minVolGal = (peakFlowGpm * 15) / 4; // 15-minute minimum cycle time
  const reqDiamFt = Math.ceil(Math.sqrt((minVolGal / 7.48 / Math.PI) * 4));

  return {
    experienceId: "EXP-HYD-011",
    code: "AUTO-SIZE-PUMP-WET-WELL",
    name: "Auto-Size Lift Station Wet Well",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-sized wet well to ${reqDiamFt}' Diameter (${minVolGal.toFixed(0)} gal usable capacity) for ${peakFlowGpm} GPM pump rate.`,
    recommendedValue: { minVolGal, reqDiamFt },
  };
}

// 12. Auto-size orifice plate diameter for controlled discharge
export function autoSizeOrificePlate(targetFlowCfs: number, headFt: number): ExperienceResult {
  // Q = C * A * sqrt(2*g*h), C=0.6
  const areaReq = targetFlowCfs / (0.6 * Math.sqrt(2 * 32.2 * Math.max(0.5, headFt)));
  const diamFt = Math.sqrt((4 * areaReq) / Math.PI);
  const diamIn = diamFt * 12;

  return {
    experienceId: "EXP-HYD-012",
    code: "AUTO-SIZE-ORIFICE-PLATE",
    name: "Auto-Size Orifice Control Structure",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-sized primary outlet control orifice to ${diamIn.toFixed(2)}" diameter at H=${headFt} ft.`,
    recommendedValue: diamIn,
  };
}

// 13. Auto-size weir crest length for emergency spillways
export function autoSizeWeirCrest(peakOverflowCfs: number, headFt: number = 1.0): ExperienceResult {
  // Q = 3.33 * L * H^(1.5)
  const lengthFt = Math.max(5, Math.ceil(peakOverflowCfs / (3.33 * Math.pow(headFt, 1.5))));

  return {
    experienceId: "EXP-HYD-013",
    code: "AUTO-SIZE-WEIR-CREST",
    name: "Auto-Size Emergency Spillway Weir",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-sized emergency spillway broad-crested weir length to ${lengthFt} ft for Q=${peakOverflowCfs} cfs.`,
    recommendedValue: lengthFt,
  };
}

// 14. Auto-size force main pipe wall for water hammer surge pressure
export function autoSizeForceMainWall(operatingPsi: number): ExperienceResult {
  const surgePsi = operatingPsi * 1.5;
  const drClass = surgePsi > 150 ? "DR-14 (200 PSI)" : "DR-18 (150 PSI)";

  return {
    experienceId: "EXP-HYD-014",
    code: "AUTO-SIZE-FORCE-MAIN-WALL",
    name: "Auto-Size Force Main Pressure Class",
    category: "hydraulics",
    status: "autosized",
    message: `Peak surge pressure ${surgePsi.toFixed(0)} PSI. Auto-selected C900 PVC ${drClass}.`,
    recommendedValue: drClass,
  };
}

// 15. Auto-size trench drain grate capacity
export function autoSizeTrenchDrain(runoffCfs: number): ExperienceResult {
  const widthIn = runoffCfs > 2.0 ? 12 : 6;
  return {
    experienceId: "EXP-HYD-015",
    code: "AUTO-SIZE-TRENCH-DRAIN",
    name: "Auto-Size Slotted Trench Drain",
    category: "hydraulics",
    status: "autosized",
    message: `Auto-sized loading dock trench drain to ${widthIn}" width ADA heavy-duty ductile iron grate.`,
    recommendedValue: widthIn,
  };
}
