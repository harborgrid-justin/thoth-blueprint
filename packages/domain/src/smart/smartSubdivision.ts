import type { ExperienceResult } from "./types";
import { globalPartsDb } from "../parts/registry";

const zoningCatalog = globalPartsDb.getZoningDistricts();
const r1District = zoningCatalog.find((z) => z.properties?.designation === "R-1");
const DEFAULT_R1_SETBACK_M = (r1District?.properties?.minSetbackMeters as number) || 3.0;

/**
 * Experiences 46 - 60: Subdivision & Site Layout Auto-Solvers
 */



// 46. Equal-area lot frontage auto-subdivision
export function autoSubdivideEqualArea(totalAreaSqFt: number, targetLotAreaSqFt: number): ExperienceResult {
  const lotCount = Math.floor(totalAreaSqFt / targetLotAreaSqFt);
  const actualLotArea = totalAreaSqFt / Math.max(1, lotCount);

  return {
    experienceId: "EXP-SUB-046",
    code: "AUTO-SUBDIVIDE-EQUAL-AREA",
    name: "Auto-Subdivide Parcel to Equal Lot Areas",
    category: "subdivision",
    status: "autosized",
    message: `Auto-subdivided parcel into ${lotCount} equal lots (${actualLotArea.toFixed(0)} sq ft / lot).`,
    recommendedValue: { lotCount, actualLotArea },
  };
}

// 47. Minimum zoning frontage width auto-enforcement
export function autoEnforceFrontageWidth(actualFrontageFt: number, minFrontageFt: number): ExperienceResult {
  const isCompliant = actualFrontageFt >= minFrontageFt;
  return {
    experienceId: "EXP-SUB-047",
    code: "AUTO-ENFORCE-FRONTAGE-WIDTH",
    name: "Auto-Enforce Zoning Minimum Lot Frontage",
    category: "subdivision",
    status: isCompliant ? "optimal" : "autofixed",
    message: isCompliant ? `Lot frontage ${actualFrontageFt.toFixed(1)} ft complies with ${minFrontageFt} ft zoning minimum.` : `Lot frontage ${actualFrontageFt.toFixed(1)} ft violates ${minFrontageFt} ft min width. Auto-adjusted lot boundary width to ${minFrontageFt} ft.`,
    recommendedValue: isCompliant ? actualFrontageFt : minFrontageFt,
  };
}

// 48. Perpendicular side lot line arc tangent alignment
export function autoAlignPerpendicularSideLines(isRadial: boolean): ExperienceResult {
  return {
    experienceId: "EXP-SUB-048",
    code: "AUTO-ALIGN-PERPENDICULAR-SIDE-LINES",
    name: "Auto-Align Side Lot Lines Radial to Right-of-Way",
    category: "subdivision",
    status: isRadial ? "optimal" : "autofixed",
    message: isRadial ? "Side lot lines are radial to R/W arc." : "Side lot lines non-perpendicular. Auto-rotated lot side lines to 90° radial alignment with R/W centerline.",
    recommendedValue: "Radial 90° Alignment",
  };
}

// 49. Cul-de-sac bulb radius auto-sizing for fire turnarounds (50 ft min)
export function autoSizeCulDeSacBulb(designVehicle: string = "Fire Engine"): ExperienceResult {
  const radiusFt = designVehicle === "Fire Engine" ? 50 : 45;
  return {
    experienceId: "EXP-SUB-049",
    code: "AUTO-SIZE-CUL-DE-SAC-BULB",
    name: "Auto-Size Cul-de-Sac Turnaround Bulb Radius",
    category: "subdivision",
    status: "autosized",
    message: `Auto-sized Cul-de-Sac R/W bulb radius to ${radiusFt} ft (${radiusFt - 8}' curb line) for ${designVehicle} AASHTO turnaround.`,
    recommendedValue: radiusFt,
  };
}

// 50. Hammerhead turnaround dimension auto-sizing
export function autoSizeHammerheadTurnaround(): ExperienceResult {
  const armLengthFt = 60;
  const armWidthFt = 20;
  return {
    experienceId: "EXP-SUB-050",
    code: "AUTO-SIZE-HAMMERHEAD-TURNAROUND",
    name: "Auto-Size Emergency Hammerhead Turnaround",
    category: "subdivision",
    status: "autosized",
    message: `Auto-sized T-hammerhead emergency turnaround to ${armLengthFt}' Length x ${armWidthFt}' Width per IFC Appendix D.`,
    recommendedValue: { armLengthFt, armWidthFt },
  };
}

// 51. Building envelope setback auto-placement (front, rear, side)
export function autoPlaceSetbacks(
  frontFt: number = Number((DEFAULT_R1_SETBACK_M * 3.28084).toFixed(0)),
  rearFt: number = 25,
  sideFt: number = 10
): ExperienceResult {
  return {
    experienceId: "EXP-SUB-051",
    code: "AUTO-PLACE-SETBACKS",
    name: "Auto-Place Building Envelope Setback Lines",
    category: "subdivision",
    status: "autosized",
    message: `Auto-generated building envelope footprint (Front: ${frontFt}', Rear: ${rearFt}', Sides: ${sideFt}').`,
    recommendedValue: { frontFt, rearFt, sideFt },
  };
}

// 52. Parking stall & ADA accessible space auto-placement based on GFA
export function autoSizeParkingStalls(grossFloorAreaSqFt: number, useCategory: string): ExperienceResult {
  const reqRatio = useCategory === "retail" ? 4.0 : 3.0; // stalls per 1000 GFA
  const totalStalls = Math.ceil((grossFloorAreaSqFt / 1000) * reqRatio);
  const adaStalls = totalStalls > 100 ? 5 : totalStalls > 50 ? 3 : 2;

  return {
    experienceId: "EXP-SUB-052",
    code: "AUTO-SIZE-PARKING-STALLS",
    name: "Auto-Calculate Site Parking Stall Counts",
    category: "subdivision",
    status: "autosized",
    message: `For ${grossFloorAreaSqFt} sq ft ${useCategory}: Auto-required ${totalStalls} total stalls (${adaStalls} ADA van-accessible).`,
    recommendedValue: { totalStalls, adaStalls },
  };
}

// 53. Commercial driveway apron & curb cut auto-sizing
export function autoSizeDrivewayApron(truckTraffic: boolean): ExperienceResult {
  const widthFt = truckTraffic ? 36 : 24;
  const flareRadiusFt = truckTraffic ? 30 : 15;

  return {
    experienceId: "EXP-SUB-053",
    code: "AUTO-SIZE-DRIVEWAY-APRON",
    name: "Auto-Size Commercial Driveway Apron",
    category: "subdivision",
    status: "autosized",
    message: `Auto-sized driveway curb cut opening to ${widthFt}' Width with R=${flareRadiusFt}' entrance radii.`,
    recommendedValue: { widthFt, flareRadiusFt },
  };
}

// 54. Utility easement corridor auto-placement (10 ft min along lot lines)
export function autoPlaceUtilityEasements(lotLineLengthFt: number): ExperienceResult {
  const widthFt = 10.0;
  return {
    experienceId: "EXP-SUB-054",
    code: "AUTO-PLACE-UTILITY-EASEMENTS",
    name: "Auto-Place Perimeter Utility Easement Corridors",
    category: "subdivision",
    status: "autosized",
    message: `Auto-generated ${widthFt} ft wide Public Utility Easement (PUE) corridor along ${lotLineLengthFt.toFixed(0)} ft rear lot boundary.`,
    recommendedValue: widthFt,
  };
}

// 55. Lot depth-to-width ratio auto-fix
export function autoFixDepthToWidthRatio(depthFt: number, widthFt: number): ExperienceResult {
  const ratio = depthFt / Math.max(1, widthFt);
  const isHigh = ratio > 4.0;

  return {
    experienceId: "EXP-SUB-055",
    code: "AUTO-FIX-DEPTH-TO-WIDTH-RATIO",
    name: "Auto-Fix Excessive Lot Depth-to-Width Ratio",
    category: "subdivision",
    status: isHigh ? "autofixed" : "optimal",
    message: isHigh ? `Lot ratio ${ratio.toFixed(1)}:1 exceeds 4:1 max limit. Auto-widen lot frontage from ${widthFt.toFixed(0)}' to ${(depthFt / 3.5).toFixed(0)}'.` : "Lot depth-to-width ratio is within 4:1 subdivision standards.",
    recommendedValue: isHigh ? depthFt / 3.5 : widthFt,
  };
}

// 56. Landlocked lot auto-fix (inserting panhandle access easements)
export function autoFixLandlockedLot(hasStreetAccess: boolean): ExperienceResult {
  return {
    experienceId: "EXP-SUB-056",
    code: "AUTO-FIX-LANDLOCKED-LOT",
    name: "Auto-Fix Landlocked Parcel Access",
    category: "subdivision",
    status: !hasStreetAccess ? "autofixed" : "optimal",
    message: !hasStreetAccess ? "Parcel has zero ROW frontage. Auto-generated 20 ft wide ingress-egress Access Panhandle easement." : "Parcel has direct frontage access to public street.",
    recommendedValue: !hasStreetAccess ? "20ft Access Panhandle" : "Direct ROW Access",
  };
}

// 57. Setback encroachment auto-fix
export function autoFixSetbackEncroachment(encroachmentFt: number): ExperienceResult {
  const needsFix = encroachmentFt > 0;
  return {
    experienceId: "EXP-SUB-057",
    code: "AUTO-FIX-SETBACK-ENCROACHMENT",
    name: "Auto-Fix Building Setback Line Encroachment",
    category: "subdivision",
    status: needsFix ? "autofixed" : "optimal",
    message: needsFix ? `Structure encroaches into rear setback by ${encroachmentFt.toFixed(1)} ft. Auto-shifted building footprint ${encroachmentFt.toFixed(1)} ft forward.` : "Building footprint is 100% inside buildable envelope.",
    recommendedValue: needsFix ? "Shifted Footprint Forward" : "Compliant Footprint",
  };
}

// 58. Intersection sight triangle obstruction auto-fix
export function autoFixSightTriangleObstruction(hasObstruction: boolean): ExperienceResult {
  return {
    experienceId: "EXP-SUB-058",
    code: "AUTO-FIX-SIGHT-TRIANGLE-OBSTRUCTION",
    name: "Auto-Fix Corner Sight Distance Triangle",
    category: "subdivision",
    status: hasObstruction ? "autofixed" : "optimal",
    message: hasObstruction ? "Landscape/structure encroaches into 30'x30' corner sight triangle. Auto-cleared structure from sight visibility zone." : "Corner sight distance triangle is unobstructed.",
    recommendedValue: "Cleared 30'x30' Sight Zone",
  };
}

// 59. Trash enclosure pad & truck turnaround auto-sizing
export function autoSizeTrashEnclosure(): ExperienceResult {
  const padWidthFt = 14;
  const padDepthFt = 10;
  return {
    experienceId: "EXP-SUB-059",
    code: "AUTO-SIZE-TRASH-ENCLOSURE",
    name: "Auto-Size Refuse Container Enclosure Pad",
    category: "subdivision",
    status: "autosized",
    message: `Auto-sized commercial double-dumpster concrete pad to ${padWidthFt}' Width x ${padDepthFt}' Depth with bollards.`,
    recommendedValue: { padWidthFt, padDepthFt },
  };
}

// 60. Non-conforming lot area auto-fix
export function autoFixNonConformingLotArea(actualAreaSqFt: number, minAreaSqFt: number): ExperienceResult {
  const isTooSmall = actualAreaSqFt < minAreaSqFt;
  return {
    experienceId: "EXP-SUB-060",
    code: "AUTO-FIX-NON-CONFORMING-LOT-AREA",
    name: "Auto-Fix Sub-Minimum Lot Area Violation",
    category: "subdivision",
    status: isTooSmall ? "autofixed" : "optimal",
    message: isTooSmall ? `Lot area ${actualAreaSqFt} sq ft is under ${minAreaSqFt} sq ft min limit. Auto-extended rear lot line to meet ${minAreaSqFt} sq ft.` : "Lot area complies with zoning district minimum size.",
    recommendedValue: isTooSmall ? minAreaSqFt : actualAreaSqFt,
  };
}
