import type { Stair, Point } from "../spatial/types.js";
import { centroid, distance, add, scale } from "../spatial/geometry.js";

export interface StairGeometryResults {
  riserCount: number;
  actualRiserHeight: number;
  treadCount: number;
  actualTreadDepth: number;

  // 3D structural centerlines (left & right stringers) (REQ-UNIMP-021)
  stringerCenterlines: Point[][];

  // 2D annotation symbols (REQ-UNIMP-022, REQ-UNIMP-023, REQ-UNIMP-024)
  breakLine: Point[]; // line representing the 4-ft plan break cut
  arrowPath: Point[]; // directional flow arrow pointing "Down"
  balusterAnchors: Point[]; // anchor mounting coordinates on treads

  // Individual step lines for 2D rendering
  treadLines: Point[][];

  // Material Takeoffs (REQ-UNIMP-025)
  concreteVolumeCuM: number;
  timberBoardFeet: number;

  // Audit warnings (REQ-UNIMP-017, REQ-UNIMP-014)
  warnings: string[];
}

/**
 * Computes all design parameters, structural stringer centerlines, 2D plan annotations,
 * and quantity takeoff volumes for a given Stair element.
 */
export function calculateStairGeometry(stair: Stair): StairGeometryResults {
  const warnings: string[] = [];

  // 1. Riser & Tread limit checking (REQ-UNIMP-014)
  const riserHeightLimit = stair.riserHeightLimit || 0.18; // Default 18cm (7 inches)
  const treadDepthLimit = stair.treadDepthLimit || 0.28; // Default 28cm (11 inches)

  if (riserHeightLimit > 0.21) {
    warnings.push(`Warning: Riser height limit (${riserHeightLimit}m) exceeds safe maximum (0.21m / 8.25").`);
  }
  if (treadDepthLimit < 0.22) {
    warnings.push(`Warning: Tread depth limit (${treadDepthLimit}m) is below safe minimum (0.22m / 9").`);
  }

  const height = Math.abs(stair.height);
  const riserCount = Math.max(1, Math.ceil(height / riserHeightLimit));
  const actualRiserHeight = height / riserCount;

  // Total treads in the stairway
  const totalTreadCount = Math.max(1, riserCount - 1);
  
  // Calculate average actual tread depth based on length of boundary
  const footprintCenter = centroid(stair.boundary);
  
  // Estimate length of the staircase footprint
  let footprintLength = 3.0; // Fallback
  if (stair.boundary.length >= 4) {
    // Distance from start edge midpoint to end edge midpoint
    const p0 = stair.boundary[0];
    const p1 = stair.boundary[1];
    const p2 = stair.boundary[2];
    const p3 = stair.boundary[3];
    const startMid = scale(add(p0, p1), 0.5);
    const endMid = scale(add(p2, p3), 0.5);
    footprintLength = distance(endMid, startMid);
  }
  
  const actualTreadDepth = footprintLength / Math.max(1, totalTreadCount);

  // 2. Safety overhead clearance calculations (REQ-UNIMP-017)
  const overheadLimit = stair.overheadClearanceLimit || 2.03; // Default 6'8"
  if (stair.ceilingElevation !== undefined) {
    // Check clearance at the critical top step or mid-point
    const criticalClearance = stair.ceilingElevation - height;
    if (criticalClearance < overheadLimit) {
      warnings.push(
        `Violation: Overhead clearance height (${criticalClearance.toFixed(2)}m) is less than standard minimum (${overheadLimit.toFixed(2)}m / 6'8").`
      );
    }
  }

  // Initializing geometry components
  const stringerCenterlines: Point[][] = [];
  const breakLine: Point[] = [];
  const arrowPath: Point[] = [];
  const balusterAnchors: Point[] = [];
  const treadLines: Point[][] = [];

  // Generate specific geometries based on type
  if (stair.stairType === "spiral") {
    // SPIRAL STAIR DESIGN (REQ-UNIMP-011, REQ-UNIMP-013)
    const totalRotDeg = stair.totalRotation || 270;
    const totalRotRad = (totalRotDeg * Math.PI) / 180;
    const radius = stair.radius || 1.2;
    const w = stair.width || 0.9;
    
    const innerR = Math.max(0.1, radius - w / 2);
    const outerR = radius + w / 2;

    // Generate wedge tread lines and stringers
    const leftStringer: Point[] = [];
    const rightStringer: Point[] = [];

    for (let i = 0; i <= totalTreadCount; i++) {
      const angle = (i / totalTreadCount) * totalRotRad;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Left/Right stringer boundary points at radius outer & inner
      const ptInner = { x: footprintCenter.x + innerR * cos, y: footprintCenter.y + innerR * sin };
      const ptOuter = { x: footprintCenter.x + outerR * cos, y: footprintCenter.y + outerR * sin };

      leftStringer.push(ptInner);
      rightStringer.push(ptOuter);

      if (i < totalTreadCount) {
        treadLines.push([ptInner, ptOuter]);
        
        // Baluster mounting coordinates on outer edge of treads (REQ-UNIMP-024)
        const nextAngle = ((i + 0.5) / totalTreadCount) * totalRotRad;
        balusterAnchors.push({
          x: footprintCenter.x + (outerR - 0.05) * Math.cos(nextAngle),
          y: footprintCenter.y + (outerR - 0.05) * Math.sin(nextAngle),
        });
      }
    }
    stringerCenterlines.push(leftStringer, rightStringer);

    // Direction arrow: circles down (we assume standard clockwise path) (REQ-UNIMP-023)
    for (let i = 0; i <= totalTreadCount; i++) {
      const angle = (i / totalTreadCount) * totalRotRad;
      arrowPath.push({
        x: footprintCenter.x + radius * Math.cos(angle),
        y: footprintCenter.y + radius * Math.sin(angle),
      });
    }

    // 2D Breakline cut at approx 1.2m height (REQ-UNIMP-022)
    // Find tread index matching 1.2m height
    const cutTreadIdx = Math.min(totalTreadCount - 1, Math.floor(1.2 / actualRiserHeight));
    const cutAngle = (cutTreadIdx / totalTreadCount) * totalRotRad;
    breakLine.push(
      { x: footprintCenter.x + innerR * Math.cos(cutAngle), y: footprintCenter.y + innerR * Math.sin(cutAngle) },
      { x: footprintCenter.x + outerR * Math.cos(cutAngle), y: footprintCenter.y + outerR * Math.sin(cutAngle) }
    );

  } else if (stair.stairType === "u-shape") {
    // U-SHAPE STAIR DESIGN (REQ-UNIMP-012, REQ-UNIMP-018)
    // Two flights divided by an intermediate landing
    const uOffset = stair.uShapeOffset || 0.15;
    const w = stair.width || 0.9;
    const landingLen = stair.intermediateLandingLength || w;

    // Riser count per flight
    const fRisers = Math.ceil(riserCount / 2);
    const sRisers = riserCount - fRisers;
    
    const fTreads = Math.max(1, fRisers - 1);
    const sTreads = Math.max(1, sRisers - 1);

    // Layout two parallel flights running opposite directions
    const startPt = stair.boundary[0] || { x: 0, y: 0 };
    const dx = stair.boundary[1] ? stair.boundary[1].x - startPt.x : w;
    const dy = stair.boundary[1] ? stair.boundary[1].y - startPt.y : 0;
    const angle = Math.atan2(dy, dx);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Midline separation vector
    const sepX = -(w + uOffset) * sin;
    const sepY = (w + uOffset) * cos;

    // Flight 1: Upwards along standard direction
    const flight1Left: Point[] = [];
    const flight1Right: Point[] = [];
    for (let i = 0; i <= fTreads; i++) {
      const progress = i * treadDepthLimit;
      const ptL = { x: startPt.x + progress * cos, y: startPt.y + progress * sin };
      const ptR = { x: ptL.x + w * -sin, y: ptL.y + w * cos };

      flight1Left.push(ptL);
      flight1Right.push(ptR);

      if (i < fTreads) {
        treadLines.push([ptL, ptR]);
        balusterAnchors.push({ x: (ptL.x + ptR.x) / 2, y: (ptL.y + ptR.y) / 2 });
      }
    }
    stringerCenterlines.push(flight1Left, flight1Right);

    // Flight 2: Downwards in parallel shift
    const flight2Left: Point[] = [];
    const flight2Right: Point[] = [];
    const f2Start = {
      x: startPt.x + (fTreads * treadDepthLimit + landingLen) * cos + sepX,
      y: startPt.y + (fTreads * treadDepthLimit + landingLen) * sin + sepY,
    };

    for (let i = 0; i <= sTreads; i++) {
      const progress = i * -treadDepthLimit;
      const ptL = { x: f2Start.x + progress * cos, y: f2Start.y + progress * sin };
      const ptR = { x: ptL.x + w * sin, y: ptL.y + w * -cos };

      flight2Left.push(ptL);
      flight2Right.push(ptR);

      if (i < sTreads) {
        treadLines.push([ptL, ptR]);
        balusterAnchors.push({ x: (ptL.x + ptR.x) / 2, y: (ptL.y + ptR.y) / 2 });
      }
    }
    stringerCenterlines.push(flight2Left, flight2Right);

    // Down direction arrow connecting flights 2 to 1 (REQ-UNIMP-023)
    arrowPath.push(
      { x: f2Start.x + w/2 * sin, y: f2Start.y + w/2 * -cos },
      { x: startPt.x + sepX/2, y: startPt.y + sepY/2 },
      { x: startPt.x + w/2 * -sin, y: startPt.y + w/2 * cos }
    );

    // Breakline on first flight (REQ-UNIMP-022)
    const cutIdx = Math.min(fTreads - 1, Math.floor(1.2 / actualRiserHeight));
    const ptCutL = flight1Left[cutIdx] || startPt;
    const ptCutR = flight1Right[cutIdx] || startPt;
    breakLine.push(ptCutL, ptCutR);

  } else {
    // STRAIGHT STAIR DESIGN (Standard)
    const startPt = stair.boundary[0] || { x: 0, y: 0 };
    const p1 = stair.boundary[1] || { x: startPt.x + 3.0, y: startPt.y };
    const w = stair.width || 1.0;

    const dx = p1.x - startPt.x;
    const dy = p1.y - startPt.y;
    const angle = Math.atan2(dy, dx);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const leftStringer: Point[] = [];
    const rightStringer: Point[] = [];

    for (let i = 0; i <= totalTreadCount; i++) {
      const progress = i * actualTreadDepth;
      // Step left/right boundaries
      const ptL = { x: startPt.x + progress * cos, y: startPt.y + progress * sin };
      const ptR = { x: ptL.x + w * -sin, y: ptL.y + w * cos };

      leftStringer.push(ptL);
      rightStringer.push(ptR);

      if (i < totalTreadCount) {
        treadLines.push([ptL, ptR]);

        // Baluster Anchor at center of each step (REQ-UNIMP-024)
        balusterAnchors.push({
          x: ptL.x + (w / 2) * -sin + (actualTreadDepth / 2) * cos,
          y: ptL.y + (w / 2) * cos + (actualTreadDepth / 2) * sin,
        });
      }
    }
    stringerCenterlines.push(leftStringer, rightStringer);

    // Plan breakline at 1.2m height cut (REQ-UNIMP-022)
    const cutIdx = Math.min(totalTreadCount - 1, Math.floor(1.2 / actualRiserHeight));
    const ptCutL = leftStringer[cutIdx] || startPt;
    const ptCutR = rightStringer[cutIdx] || startPt;
    breakLine.push(ptCutL, ptCutR);

    // Direction arrow path pointing "Down" (REQ-UNIMP-023)
    arrowPath.push(
      { x: p1.x + (w / 2) * -sin, y: p1.y + (w / 2) * cos },
      { x: startPt.x + (w / 2) * -sin, y: startPt.y + (w / 2) * cos }
    );
  }

  // 3. Material Takeoffs Calculations (REQ-UNIMP-025)
  // Concrete Volume (m3) = (total treads volume) + (landings volume) + (stringers volume)
  const landingThick = stair.landingSlabThickness || 0.15;
  const treadThick = stair.treadSlabThickness || 0.12;
  const w = stair.width || 1.0;
  
  // Treads Volume
  const singleTreadVol = w * actualTreadDepth * actualRiserHeight * 0.5; // triangular step profile
  const totalStepsVol = riserCount * singleTreadVol;
  
  // Landing Volume (1 landing if U-shaped/split stair)
  const landingArea = stair.stairType === "u-shape" ? w * w * 2 : 0;
  const landingsVol = landingArea * landingThick;

  // Stringers Volume (2 channels along sides)
  const stringerW = stair.stringerWidth || 0.05;
  const slopeLen = Math.hypot(footprintLength, height);
  const stringerVol = 2 * (slopeLen * 0.3 * stringerW); // assumed stringer depth 30cm

  const concreteVolumeCuM = totalStepsVol + landingsVol + stringerVol;

  // Timber Board Feet (assuming wood framing for steps, stringers, and landings)
  // 1 board foot = 12" x 12" x 1" = 144 cubic inches = 0.00235974 cubic meters
  const woodTreadsVol = riserCount * w * actualTreadDepth * treadThick;
  const totalWoodVol = woodTreadsVol + landingsVol + stringerVol;
  const boardFootFactor = 1 / 0.00235974;
  const timberBoardFeet = totalWoodVol * boardFootFactor;

  return {
    riserCount,
    actualRiserHeight,
    treadCount: totalTreadCount,
    actualTreadDepth,
    stringerCenterlines,
    breakLine,
    arrowPath,
    balusterAnchors,
    treadLines,
    concreteVolumeCuM,
    timberBoardFeet,
    warnings,
  };
}
