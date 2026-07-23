import type { ExperienceResult } from "./types";
import { globalPartsDb } from "../parts/registry";

/**
 * Experiences 76 - 85: Erosion & Sediment Control Auto-Solvers
 */

// 76. Sediment basin storage volume auto-sizing (3600 cu ft/acre)
export function autoSizeSedimentBasinVolume(disturbedAcres: number): ExperienceResult {
  const reqVolCuFt = disturbedAcres * 3600;
  const wetVolCuFt = reqVolCuFt / 2;
  const dryVolCuFt = reqVolCuFt / 2;

  return {
    experienceId: "EXP-ESC-076",
    code: "AUTO-SIZE-SEDIMENT-BASIN-VOLUME",
    name: "Auto-Size Temporary Sediment Trap Volume",
    category: "erosion",
    status: "autosized",
    message: `For ${disturbedAcres} ac disturbance: Auto-sized sediment basin volume to ${reqVolCuFt} cu ft (${wetVolCuFt} cu ft wet storage + ${dryVolCuFt} cu ft dry storage).`,
    recommendedValue: { reqVolCuFt, wetVolCuFt, dryVolCuFt },
  };
}

// 77. Perimeter silt fence barrier auto-placement along contours
export function autoPlaceSiltFence(contourLengthFt: number): ExperienceResult {
  const bmpCatalog = globalPartsDb.getErosionControlBmps();
  const siltFence = bmpCatalog.find((b) => b.id.includes("silt-fence"));
  const eff = (siltFence?.properties?.trappingEfficiencyPercent as number) || 85;

  return {
    experienceId: "EXP-ESC-077",
    code: "AUTO-PLACE-SILT-FENCE",
    name: "Auto-Place Perimeter Silt Fence Filter Barrier",
    category: "erosion",
    status: "autosized",
    message: `Auto-generated ${contourLengthFt.toFixed(0)} LF Type-A geotextile silt fence (${eff}% sediment trapping efficiency) along downhill perimeter disturbance boundary.`,
    recommendedValue: contourLengthFt,
  };
}

// 78. Construction entrance wash rack & stone pad length auto-sizing (50 ft min)
export function autoSizeConstructionEntrance(truckVolume: string): ExperienceResult {
  const lengthFt = truckVolume === "heavy" ? 70 : 50;
  const widthFt = 24;

  return {
    experienceId: "EXP-ESC-078",
    code: "AUTO-SIZE-CONSTRUCTION-ENTRANCE",
    name: "Auto-Size Stabilized Construction Entrance Pad",
    category: "erosion",
    status: "autosized",
    message: `Auto-sized VDOT Coarse Aggregate Entrance Pad to ${lengthFt}' Length x ${widthFt}' Width (6" Class-I stone over geotextile).`,
    recommendedValue: { lengthFt, widthFt },
  };
}

// 79. Catch basin inlet protection barrier auto-sizing
export function autoSizeInletProtection(inletType: string): ExperienceResult {
  const protectionType = inletType === "curb" ? "Curb Inlet Gravel Filter Sock (12\" Dia)" : "Drop Inlet Block & Gravel Barrier";
  return {
    experienceId: "EXP-ESC-079",
    code: "AUTO-SIZE-INLET-PROTECTION",
    name: "Auto-Size Catch Basin Inlet Sediment Protection",
    category: "erosion",
    status: "autosized",
    message: `Auto-assigned ${protectionType} for ${inletType} storm drain structure.`,
    recommendedValue: protectionType,
  };
}

// 80. USLE annual soil loss tonnage auto-calculator
export function autoCalcUSLESoilLoss(acres: number, slopePercent: number, kFactor: number = 0.32): ExperienceResult {
  // A = R * K * LS * C * P
  const ls = Math.pow(slopePercent / 5, 1.2);
  const tonsPerAcrePerYr = 20.0 * kFactor * ls * 0.4 * 0.8;
  const totalTons = tonsPerAcrePerYr * acres;

  return {
    experienceId: "EXP-ESC-080",
    code: "AUTO-CALC-USLE-SOIL-LOSS",
    name: "Auto-Calculate USLE Annual Soil Erosion Tonnage",
    category: "erosion",
    status: totalTons > 50 ? "warning" : "optimal",
    message: `RUSLE estimated annual soil loss: ${totalTons.toFixed(1)} tons/yr (${tonsPerAcrePerYr.toFixed(1)} tons/ac/yr).`,
    recommendedValue: totalTons,
  };
}

// 81. Temporary slope drain pipe auto-sizer
export function autoSizeSlopeDrainPipe(drainageAcres: number): ExperienceResult {
  const pipeDiamIn = drainageAcres > 2.0 ? 18 : 12;
  return {
    experienceId: "EXP-ESC-081",
    code: "AUTO-SIZE-SLOPE-DRAIN-PIPE",
    name: "Auto-Size Temporary Slope Drain Flume",
    category: "erosion",
    status: "autosized",
    message: `Auto-sized flexible corrugated slope drain pipe to ${pipeDiamIn}" diameter for ${drainageAcres} ac embankment runoff.`,
    recommendedValue: pipeDiamIn,
  };
}

// 82. Unstabilized slope erosion blanket auto-fix
export function autoFixUnstabilizedSlopeErosion(slopePercent: number): ExperienceResult {
  const needsBlanket = slopePercent > 33.3; // Steeper than 3:1
  return {
    experienceId: "EXP-ESC-082",
    code: "AUTO-FIX-UNSTABILIZED-SLOPE-EROSION",
    name: "Auto-Fix Bare Slope Soil Stabilization",
    category: "erosion",
    status: needsBlanket ? "autofixed" : "optimal",
    message: needsBlanket ? `Slope gradient ${(slopePercent).toFixed(0)}% exceeds 3:1 limit. Auto-applied Straw/Coconut Matting Erosion Control Blanket (ECB).` : "Slope gradient does not require temporary erosion blankets.",
    recommendedValue: needsBlanket ? "Straw/Coconut ECB" : "Standard Hydroseed",
  };
}

// 83. Sediment barrier overflow auto-fix
export function autoFixSedimentBarrierOverflow(overflowRisk: boolean): ExperienceResult {
  return {
    experienceId: "EXP-ESC-083",
    code: "AUTO-FIX-SEDIMENT-BARRIER-OVERFLOW",
    name: "Auto-Fix Silt Fence Overtopping Overflow",
    category: "erosion",
    status: overflowRisk ? "autofixed" : "optimal",
    message: overflowRisk ? "High drainage area exceeds single silt fence capacity. Auto-added parallel secondary Filter Berm." : "Sediment barrier capacity is sufficient.",
    recommendedValue: "Secondary Compost Filter Berm",
  };
}

// 84. Soil loss hydroseeding & mulch auto-fix
export function autoFixHighSoilLoss(tonsPerAcre: number): ExperienceResult {
  const needsMulch = tonsPerAcre > 15;
  return {
    experienceId: "EXP-ESC-084",
    code: "AUTO-FIX-HIGH-SOIL-LOSS",
    name: "Auto-Fix High Soil Loss Tonnage",
    category: "erosion",
    status: needsMulch ? "autofixed" : "optimal",
    message: needsMulch ? `Soil loss rate ${tonsPerAcre.toFixed(1)} tons/ac/yr is high. Auto-prescribed Bonded Fiber Matrix (BFM) Hydroseeding @ 3500 lbs/ac.` : "Soil loss rate is within acceptable EPA NPDES thresholds.",
    recommendedValue: "BFM Hydroseeding",
  };
}

// 85. Channel scouring turf reinforcement mat (TRM) auto-fix
export function autoFixChannelScouring(shearStressPsf: number): ExperienceResult {
  const needsTRM = shearStressPsf > 2.0;
  return {
    experienceId: "EXP-ESC-085",
    code: "AUTO-FIX-CHANNEL-SCOURING",
    name: "Auto-Fix Channel Bed Hydraulic Shear Stress",
    category: "erosion",
    status: needsTRM ? "autofixed" : "optimal",
    message: needsTRM ? `Channel shear stress ${shearStressPsf.toFixed(2)} PSF exceeds unlined turf limit. Auto-lined swale with Turf Reinforcement Mat (TRM Type 3B).` : "Channel shear stress is safe for unlined vegetation.",
    recommendedValue: needsTRM ? "TRM Type 3B Matting" : "Unlined Turf",
  };
}
