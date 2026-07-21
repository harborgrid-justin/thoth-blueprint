import type { ExperienceResult } from "./types";
import federalData from "../planning/geoid/data/federalReference.json";

const defaultGeo = federalData.standards.geometry;

/**
 * Experiences 16 - 30: Roadway Geometry & Alignment Auto-Solvers
 */

// 16. Auto-calculate minimum horizontal curve radius for design speed (AASHTO eMax & fMax)
export function autoCalcMinRadius(designSpeedMph: number, eMax: number = defaultGeo.eMax): ExperienceResult {
  const fMax = Math.max(
    defaultGeo.aashtoMinFriction,
    defaultGeo.aashtoMaxFrictionBase - designSpeedMph * defaultGeo.aashtoMaxFrictionSpeedSlope
  );
  // R = V^2 / (15 * (e + f))
  const minRadiusFt = Math.ceil(
    (designSpeedMph * designSpeedMph) / (defaultGeo.aashtoCurveRadiusConstant * (eMax + fMax))
  );

  return {
    experienceId: "EXP-GEO-016",
    code: "AUTO-CALC-MIN-RADIUS",
    name: "Auto-Calculate AASHTO Minimum Horizontal Radius",
    category: "geometry",
    status: "autosized",
    message: `For ${designSpeedMph} MPH design speed (eMax=${Math.round(eMax * 100)}%), AASHTO minimum centerline radius is ${minRadiusFt} ft.`,
    recommendedValue: minRadiusFt,
  };
}

// 17. Auto-calculate minimum vertical curve K-factors for stopping sight distance (SSD)
export function autoCalcVerticalKFactor(designSpeedMph: number): ExperienceResult {
  const kCrest = Math.ceil(defaultGeo.kCrestMultiplier * designSpeedMph * designSpeedMph);
  const kSag = Math.ceil(defaultGeo.kSagMultiplier * designSpeedMph * designSpeedMph);

  return {
    experienceId: "EXP-GEO-017",
    code: "AUTO-CALC-VERTICAL-K-FACTOR",
    name: "Auto-Calculate AASHTO Vertical Curve K-Factors",
    category: "geometry",
    status: "autosized",
    message: `AASHTO SSD design standards for ${designSpeedMph} MPH: Minimum K-Crest = ${kCrest}, K-Sag = ${kSag}.`,
    recommendedValue: { kCrest, kSag },
  };
}

// 18. Auto-calculate crest vertical curve length for headlight sight distance
export function autoCalcHeadlightCrestLength(
  A_gradeDiff: number,
  SSD_ft: number,
  constant: number = defaultGeo.aashtoHeadlightCrestConstant
): ExperienceResult {
  // L = A * SSD^2 / 2158
  const reqLenFt = Math.max(100, Math.ceil((A_gradeDiff * SSD_ft * SSD_ft) / constant));

  return {
    experienceId: "EXP-GEO-018",
    code: "AUTO-CALC-HEADLIGHT-CREST-LENGTH",
    name: "Auto-Calculate Headlight Crest Curve Length",
    category: "geometry",
    status: "autosized",
    message: `Auto-calculated crest vertical curve length to ${reqLenFt} ft for algebraic grade change A=${A_gradeDiff.toFixed(1)}%.`,
    recommendedValue: reqLenFt,
  };
}

// 19. Auto-calculate sag vertical curve length for comfort & underpass clearance
export function autoCalcSagComfortLength(
  A_gradeDiff: number,
  vMph: number,
  constant: number = defaultGeo.aashtoSagComfortConstant
): ExperienceResult {
  const lenFt = Math.max(100, Math.ceil((A_gradeDiff * vMph * vMph) / constant));
  return {
    experienceId: "EXP-GEO-019",
    code: "AUTO-CALC-SAG-COMFORT-LENGTH",
    name: "Auto-Calculate Sag Vertical Curve Length",
    category: "geometry",
    status: "autosized",
    message: `Auto-calculated sag vertical curve length to ${lenFt} ft for comfort acceleration (a <= 1.0 ft/s²).`,
    recommendedValue: lenFt,
  };
}

// 20. Auto-calculate superelevation runoff & tangent runout lengths
export function autoCalcSuperelevationRunoff(
  laneWidthFt: number,
  eFull: number,
  vMph: number,
  denominator: number = defaultGeo.aashtoSuperelevationDenominator
): ExperienceResult {
  const Lr = Math.ceil((laneWidthFt * eFull * 100 * 1.5 * vMph) / denominator);
  const Lt = Math.ceil(Lr * (0.02 / Math.max(0.01, eFull)));

  return {
    experienceId: "EXP-GEO-020",
    code: "AUTO-CALC-SUPERELEVATION-RUNOFF",
    name: "Auto-Calculate Superelevation Transition Lengths",
    category: "geometry",
    status: "autosized",
    message: `Auto-calculated Superelevation Runoff Lr = ${Lr} ft, Tangent Runout Lt = ${Lt} ft for eFull=${(eFull * 100).toFixed(1)}%.`,
    recommendedValue: { Lr, Lt },
  };
}

// 21. Auto-calculate widening tapers on inner curve edges for truck wheel track clearance
export function autoCalcCurveWidening(radiusFt: number, designTruck: string = "WB-50"): ExperienceResult {
  const wFeet = radiusFt < 400 ? (designTruck === "WB-67" ? 4.5 : 3.0) : 0;
  return {
    experienceId: "EXP-GEO-021",
    code: "AUTO-CALC-CURVE-WIDENING",
    name: "Auto-Calculate Curve Trajectory Widening",
    category: "geometry",
    status: wFeet > 0 ? "autofixed" : "optimal",
    message: wFeet > 0 ? `Curve R=${radiusFt} ft requires ${wFeet} ft inner-edge pavement widening for ${designTruck} off-tracking.` : "Curve radius is wide enough; no extra widening required.",
    recommendedValue: wFeet,
  };
}

// 22. Auto-calculate spiraled transition curve lengths (AASHTO rate of lateral acceleration)
export function autoCalcSpiralLength(radiusFt: number, vMph: number): ExperienceResult {
  // Ls = 1.6 * V^3 / (R * C), C=2 ft/sec^3
  const LsFt = Math.max(150, Math.ceil((1.6 * Math.pow(vMph, 3)) / (radiusFt * 2.0)));
  return {
    experienceId: "EXP-GEO-022",
    code: "AUTO-CALC-SPIRAL-LENGTH",
    name: "Auto-Calculate Euler Spiral Transition Length",
    category: "geometry",
    status: "autosized",
    message: `Auto-sized Clothoid Euler Spiral transition length to ${LsFt} ft for R=${radiusFt} ft @ ${vMph} MPH.`,
    recommendedValue: LsFt,
  };
}

// 23. Auto-calculate decision sight distance (DSD) avoidance maneuvers
export function autoCalcDecisionSightDistance(vMph: number): ExperienceResult {
  const dsdFt = Math.ceil(vMph * 1.47 * 10.0); // 10-sec avoidance maneuver time
  return {
    experienceId: "EXP-GEO-023",
    code: "AUTO-CALC-DECISION-SIGHT-DISTANCE",
    name: "Auto-Calculate AASHTO Decision Sight Distance",
    category: "geometry",
    status: "autosized",
    message: `AASHTO Decision Sight Distance (Speed ${vMph} MPH, Complex Interchange Environment): ${dsdFt} ft.`,
    recommendedValue: dsdFt,
  };
}

// 24. Auto-calculate intersection curb return radii for WB-50/WB-67 design vehicles
export function autoCalcCurbReturnRadius(designVehicle: string): ExperienceResult {
  const radiusFt = designVehicle === "WB-67" ? 50 : designVehicle === "WB-50" ? 40 : 30;
  return {
    experienceId: "EXP-GEO-024",
    code: "AUTO-CALC-CURB-RETURN-RADIUS",
    name: "Auto-Size Intersection Curb Return Radius",
    category: "geometry",
    status: "autosized",
    message: `Auto-sized 90-degree intersection corner curb return radius to ${radiusFt} ft for ${designVehicle} template.`,
    recommendedValue: radiusFt,
  };
}

// 25. Auto-calculate roundabout ICD (Inscribed Circle Diameter) for design vehicle turning templates
export function autoCalcRoundaboutICD(lanes: number): ExperienceResult {
  const icdFt = lanes >= 2 ? 160 : 120;
  return {
    experienceId: "EXP-GEO-025",
    code: "AUTO-CALC-ROUNDABOUT-ICD",
    name: "Auto-Size Roundabout Inscribed Circle Diameter",
    category: "geometry",
    status: "autosized",
    message: `Auto-sized Roundabout Inscribed Circle Diameter (ICD) to ${icdFt} ft for ${lanes}-lane circulatory roadway.`,
    recommendedValue: icdFt,
  };
}

// 26. Auto-calculate roundabout splitter island deflection angles for entry speed control
export function autoCalcSplitterDeflection(vEntryMph: number): ExperienceResult {
  const targetAngleDeg = vEntryMph > 25 ? 45 : 30;
  return {
    experienceId: "EXP-GEO-026",
    code: "AUTO-CALC-SPLITTER-DEFLECTION",
    name: "Auto-Calculate Roundabout Splitter Island Deflection",
    category: "geometry",
    status: "autosized",
    message: `Auto-set entry curve deflection angle to ${targetAngleDeg}° to enforce entry speed <= 25 MPH.`,
    recommendedValue: targetAngleDeg,
  };
}

// 27. Auto-calculate channelized right-turn slip lane deceleration lengths
export function autoCalcSlipLaneDecel(vMainMph: number): ExperienceResult {
  const lenFt = Math.ceil(vMainMph * 7.5);
  return {
    experienceId: "EXP-GEO-027",
    code: "AUTO-CALC-SLIP-LANE-DECEL",
    name: "Auto-Calculate Right-Turn Slip Lane Deceleration",
    category: "geometry",
    status: "autosized",
    message: `Auto-calculated channelized right-turn deceleration lane length to ${lenFt} ft.`,
    recommendedValue: lenFt,
  };
}

// 28. Auto-calculate passing sight distance (PSD) for 2-lane rural highways
export function autoCalcPassingSightDistance(vMph: number): ExperienceResult {
  const psdFt = Math.ceil(vMph * 25.0);
  return {
    experienceId: "EXP-GEO-028",
    code: "AUTO-CALC-PASSING-SIGHT-DISTANCE",
    name: "Auto-Calculate Passing Sight Distance",
    category: "geometry",
    status: "autosized",
    message: `AASHTO Passing Sight Distance (PSD) required for ${vMph} MPH: ${psdFt} ft.`,
    recommendedValue: psdFt,
  };
}

// 29. Auto-calculate guardrail barrier runout length (LR) & flare rates
export function autoCalcGuardrailRunout(vMph: number, adt: number): ExperienceResult {
  const lrFt = adt > 6000 ? (vMph >= 60 ? 475 : 330) : 250;
  return {
    experienceId: "EXP-GEO-029",
    code: "AUTO-CALC-GUARDRAIL-RUNOUT",
    name: "Auto-Calculate Guardrail Runout Length (LR)",
    category: "geometry",
    status: "autosized",
    message: `Auto-calculated MASH Guardrail Runout Length LR = ${lrFt} ft for ADT=${adt} @ ${vMph} MPH.`,
    recommendedValue: lrFt,
  };
}

// 30. Auto-calculate clear zone widths based on traffic volume & embankment slopes
export function autoCalcClearZoneWidth(vMph: number, slopeRatio: number): ExperienceResult {
  const baseWidth = vMph >= 55 ? 30 : 18;
  const clearZoneFt = slopeRatio <= 3 ? Math.ceil(baseWidth * 1.3) : baseWidth;

  return {
    experienceId: "EXP-GEO-030",
    code: "AUTO-CALC-CLEAR-ZONE-WIDTH",
    name: "Auto-Calculate Roadside Clear Zone Width",
    category: "geometry",
    status: "autosized",
    message: `Auto-calculated Roadside Clear Zone Requirement: ${clearZoneFt} ft from edge of traveled way.`,
    recommendedValue: clearZoneFt,
  };
}
