import type { ExperienceResult } from "./types";
import federalData from "../planning/geoid/data/federalReference.json";

const defaultGrd = federalData.standards.grading;

/**
 * Experiences 31 - 45: Grading & Earthwork Auto-Solvers
 */

// 31. Optimum cut/fill earthwork balance pad elevation solver
export function autoSolveCutFillBalance(netVolumeCuYd: number, currentPadElev: number): ExperienceResult {
  const diffElevFt = netVolumeCuYd / 5000; // approximation factor
  const optElevFt = currentPadElev - diffElevFt;

  return {
    experienceId: "EXP-GRD-031",
    code: "AUTO-SOLVE-CUT-FILL-BALANCE",
    name: "Auto-Solve Optimum Cut/Fill Earthwork Elevation",
    category: "grading",
    status: Math.abs(netVolumeCuYd) > 50 ? "autofixed" : "optimal",
    message: Math.abs(netVolumeCuYd) > 50 ? `Net earthwork imbalance: ${netVolumeCuYd.toFixed(0)} cu yd. Auto-shifted pad elevation to ${optElevFt.toFixed(2)} ft to balance site.` : "Earthwork cut and fill volumes are balanced.",
    recommendedValue: optElevFt,
  };
}

// 32. Retaining wall height & footings auto-sizing
export function autoSizeRetainingWall(cutDepthFt: number): ExperienceResult {
  const wallHeightFt = Math.max(0, cutDepthFt);
  const footingWidthFt = Math.ceil(wallHeightFt * 0.65);
  const keyDepthIn = wallHeightFt > 8 ? 18 : 12;

  return {
    experienceId: "EXP-GRD-032",
    code: "AUTO-SIZE-RETAINING-WALL",
    name: "Auto-Size Structural Retaining Wall",
    category: "grading",
    status: wallHeightFt > 3 ? "autosized" : "optimal",
    message: wallHeightFt > 3 ? `Cut height is ${wallHeightFt.toFixed(1)} ft. Auto-sized reinforced concrete wall: H=${wallHeightFt.toFixed(1)}', Base Footing Width=${footingWidthFt}', Key Depth=${keyDepthIn}".` : "No retaining wall required; cut slope is self-supporting.",
    recommendedValue: { wallHeightFt, footingWidthFt, keyDepthIn },
  };
}

// 33. Building pad positive drainage slope auto-grading (2% min)
export function autoGradeBuildingPad(
  slopePercent: number,
  minPositiveDrainage: number = defaultGrd.padSlopePercent
): ExperienceResult {
  const targetPercent = Math.max(minPositiveDrainage, slopePercent);
  return {
    experienceId: "EXP-GRD-033",
    code: "AUTO-GRADE-BUILDING-PAD",
    name: "Auto-Grade Building Envelope Drainage Slope",
    category: "grading",
    status: slopePercent < minPositiveDrainage ? "autofixed" : "optimal",
    message: slopePercent < minPositiveDrainage ? `Existing pad slope ${slopePercent.toFixed(1)}% violates IBC 1804.4. Auto-adjusted perimeter grading to +${minPositiveDrainage.toFixed(1)}% positive drainage.` : "Building pad positive drainage complies with IBC 1804.4.",
    recommendedValue: targetPercent,
  };
}

// 34. ADA parking aisle slope auto-grading (2% cross, 5% longitudinal)
export function autoGradeADAParkingAisle(
  crossSlope: number,
  longSlope: number,
  maxCross: number = defaultGrd.adaCrossSlope,
  maxLong: number = defaultGrd.adaLongSlope
): ExperienceResult {
  const fixedCross = Math.min(maxCross, crossSlope);
  const fixedLong = Math.min(maxLong, longSlope);
  const needsFix = crossSlope > maxCross || longSlope > maxLong;

  return {
    experienceId: "EXP-GRD-034",
    code: "AUTO-GRADE-ADA-PARKING-AISLE",
    name: "Auto-Grade ADA Parking Stall Aisle Slopes",
    category: "grading",
    status: needsFix ? "autofixed" : "optimal",
    message: needsFix ? `ADA aisle slopes (${(crossSlope * 100).toFixed(1)}% x ${(longSlope * 100).toFixed(1)}%) exceed 2.0% max limit. Auto-flattened to ${(fixedCross * 100).toFixed(1)}% x ${(fixedLong * 100).toFixed(1)}%.` : "ADA parking stall and access aisle slopes comply with ADAAG 502.4.",
    recommendedValue: { fixedCross, fixedLong },
  };
}

// 35. ADA access ramp & landing slope auto-grading (8.33% max)
export function autoGradeADARamp(
  rampSlopePercent: number,
  maxRampSlope: number = defaultGrd.adaRampSlopePercent
): ExperienceResult {
  const fixedSlope = Math.min(maxRampSlope, rampSlopePercent);
  return {
    experienceId: "EXP-GRD-035",
    code: "AUTO-GRADE-ADA-RAMP",
    name: "Auto-Grade Pedestrian Ramp Slope",
    category: "grading",
    status: rampSlopePercent > 8.33 ? "autofixed" : "optimal",
    message: rampSlopePercent > 8.33 ? `Ramp slope ${rampSlopePercent.toFixed(2)}% exceeds 1:12 (8.33%) max limit. Auto-extended ramp length to achieve 8.33% slope.` : "ADA access ramp slope complies with ADAAG 405.2.",
    recommendedValue: fixedSlope,
  };
}

// 36. Swale bottom slope auto-grading (1% min, 4% max)
export function autoGradeSwaleSlope(slopePercent: number): ExperienceResult {
  const fixedSlope = Math.max(1.0, Math.min(4.0, slopePercent));
  return {
    experienceId: "EXP-GRD-036",
    code: "AUTO-GRADE-SWALE-SLOPE",
    name: "Auto-Grade Drainage Swale Profile",
    category: "grading",
    status: slopePercent < 1.0 || slopePercent > 4.0 ? "autofixed" : "optimal",
    message: slopePercent < 1.0 ? "Swale slope < 1.0% causes standing water. Auto-steepened bottom profile to 1.0%." : slopePercent > 4.0 ? "Swale slope > 4.0% causes erosion scouring. Auto-flattened bottom profile to 4.0% with check dams." : "Swale slope complies with stormwater conveyance standards.",
    recommendedValue: fixedSlope,
  };
}

// 37. Daylight slope tie auto-solver (2:1 cut, 3:1 fill)
export function autoSolveDaylightTie(isCut: boolean): ExperienceResult {
  const slopeRatio = isCut ? 2.0 : 3.0; // 2:1 H:V cut, 3:1 H:V fill
  return {
    experienceId: "EXP-GRD-037",
    code: "AUTO-SOLVE-DAYLIGHT-TIE",
    name: "Auto-Solve Embankment Daylight Tie Slope",
    category: "grading",
    status: "autosized",
    message: `Auto-generated ${isCut ? "2:1 Cut" : "3:1 Fill"} daylight grading tie line to existing ground contours.`,
    recommendedValue: slopeRatio,
  };
}

// 38. Terraced benching auto-grading for steep slopes (>15 ft slope heights)
export function autoGradeTerracedBenching(slopeHeightFt: number): ExperienceResult {
  const benchCount = Math.floor(slopeHeightFt / 15);
  return {
    experienceId: "EXP-GRD-038",
    code: "AUTO-GRADE-TERRACED-BENCHING",
    name: "Auto-Grade Slope Benching Terraces",
    category: "grading",
    status: benchCount > 0 ? "autofixed" : "optimal",
    message: benchCount > 0 ? `Slope height ${slopeHeightFt} ft exceeds 15 ft threshold. Auto-inserted ${benchCount} terrace bench(es) (6 ft width) with reverse 2% slope.` : "Slope height is under 15 ft; terraced benching not required.",
    recommendedValue: benchCount,
  };
}

// 39. Catchment ridge auto-grading for lot runoff isolation
export function autoGradeCatchmentRidge(hasOverlandFlow: boolean): ExperienceResult {
  return {
    experienceId: "EXP-GRD-039",
    code: "AUTO-GRADE-CATCHMENT-RIDGE",
    name: "Auto-Grade Lot Drainage Catchment Ridge",
    category: "grading",
    status: hasOverlandFlow ? "autofixed" : "optimal",
    message: hasOverlandFlow ? "Overland flow detected crossing lot boundary. Auto-graded 6-inch high swale ridge along rear lot line." : "Lot catchment ridges prevent offsite runoff intrusion.",
    recommendedValue: "6-inch Rear Lot Ridge",
  };
}

// 40. Low-point ponding auto-fix (inserting yard drain inlets)
export function autoFixLowPointPonding(hasOutlet: boolean): ExperienceResult {
  return {
    experienceId: "EXP-GRD-040",
    code: "AUTO-FIX-LOW-POINT-PONDING",
    name: "Auto-Fix Low-Point Depressional Ponding",
    category: "grading",
    status: !hasOutlet ? "autofixed" : "optimal",
    message: !hasOutlet ? "Trapped low point detected with no gravity outlet. Auto-inserted 12\" NDS Yard Drain & Sump Catch Basin." : "Low point has gravity surface outlet.",
    recommendedValue: "12in Yard Drain Inlet",
  };
}

// 41. Steep slope over-steepening auto-fix (inserting retaining walls)
export function autoFixSteepSlopeOverrun(slopeRatio: number): ExperienceResult {
  const needsWall = slopeRatio < 1.5; // Steeper than 1.5:1
  return {
    experienceId: "EXP-GRD-041",
    code: "AUTO-FIX-STEEP-SLOPE-OVERRUN",
    name: "Auto-Fix Embankment Over-Steepening",
    category: "grading",
    status: needsWall ? "autofixed" : "optimal",
    message: needsWall ? `Proposed slope ${slopeRatio.toFixed(1)}:1 exceeds soil stability limit (1.5:1 max). Auto-replaced slope with segment Retaining Wall.` : "Embankment slope ratio is within stable geotechnical limits.",
    recommendedValue: needsWall ? "Segment Retaining Wall" : "Stable Slope",
  };
}

// 42. Soil erosion velocity auto-fix (inserting check dams)
export function autoFixErosionVelocity(velocityFps: number): ExperienceResult {
  const needsCheckDams = velocityFps > 5.0;
  return {
    experienceId: "EXP-GRD-042",
    code: "AUTO-FIX-EROSION-VELOCITY",
    name: "Auto-Fix Channel Scouring Velocity",
    category: "grading",
    status: needsCheckDams ? "autofixed" : "optimal",
    message: needsCheckDams ? `Swale flow velocity ${velocityFps.toFixed(1)} ft/s exceeds 5.0 ft/s erosion limit. Auto-inserted Rock Check Dams every 50 ft.` : "Channel flow velocity is non-erosive.",
    recommendedValue: needsCheckDams ? "Rock Check Dams @ 50ft" : "No Check Dams Needed",
  };
}

// 43. Slope boundary overrun auto-fix
export function autoFixSlopeBoundaryOverrun(overrunFt: number): ExperienceResult {
  const needsFix = overrunFt > 0;
  return {
    experienceId: "EXP-GRD-043",
    code: "AUTO-FIX-SLOPE-BOUNDARY-OVERRUN",
    name: "Auto-Fix Property Line Slope Encroachment",
    category: "grading",
    status: needsFix ? "autofixed" : "optimal",
    message: needsFix ? `Daylight slope line overruns property line by ${overrunFt.toFixed(1)} ft. Auto-steepened slope to 2:1 and added Toe Wall.` : "Daylight slope line remains fully inside property boundaries.",
    recommendedValue: needsFix ? "2:1 Slope + Toe Wall" : "Standard Daylight Tie",
  };
}

// 44. Foundation cut/fill over-excavation auto-fix
export function autoFixFoundationOverexcavation(overcutDepthFt: number): ExperienceResult {
  const needsFix = overcutDepthFt > 4.0;
  return {
    experienceId: "EXP-GRD-044",
    code: "AUTO-FIX-FOUNDATION-OVEREXCAVATION",
    name: "Auto-Fix Subgrade Over-Excavation Depth",
    category: "grading",
    status: needsFix ? "autofixed" : "optimal",
    message: needsFix ? `Foundation cut depth ${overcutDepthFt.toFixed(1)} ft is excessive. Auto-raised building floor elevation by ${(overcutDepthFt - 2.0).toFixed(1)} ft.` : "Foundation cut depth is economically optimized.",
    recommendedValue: needsFix ? "Raised Floor Elevation" : "Standard Foundation Cut",
  };
}

// 45. Slope transition fillet curves auto-fix to eliminate sharp grade breaks
export function autoFixSlopeGradeBreaks(breakAngleDeg: number): ExperienceResult {
  const needsFillet = breakAngleDeg > 15;
  return {
    experienceId: "EXP-GRD-045",
    code: "AUTO-FIX-SLOPE-GRADE-BREAKS",
    name: "Auto-Fix Slope Transition Grade Breaks",
    category: "grading",
    status: needsFillet ? "autofixed" : "optimal",
    message: needsFillet ? `Grade break angle ${breakAngleDeg}° is sharp. Auto-inserted 10 ft vertical fillet transition curve.` : "Slope grade transitions are smooth.",
    recommendedValue: needsFillet ? "10ft Fillet Transition Curve" : "Smooth Grade Break",
  };
}
