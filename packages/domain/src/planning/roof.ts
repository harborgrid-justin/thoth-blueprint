import type { RoofElement, Point } from "../spatial/types.js";
import { area, distance } from "../spatial/geometry.js";

import type { RoofGeometryResults } from "./types/roof";

export type { RoofGeometryResults };

export function calculateRoofGeometry(roof: RoofElement): RoofGeometryResults {
  const warnings: string[] = [];
  const ventilationWarnings: string[] = [];

  // 1. Slope Pitch Math (REQ-UNIMP-053, REQ-UNIMP-057)
  const pitchVal = roof.pitch || 4; // default 4:12 pitch
  const pitchAngleRad = Math.atan(pitchVal / 12);
  const slopeFactor = Math.sqrt(1 + (pitchVal / 12) ** 2); // sec(theta)

  // Plan Area
  let planAreaSqm: number;
  let boundary = roof.boundary || [];
  if (boundary.length >= 3) {
    planAreaSqm = Math.abs(area(boundary));
  } else {
    // Generate dummy square boundary if missing
    boundary = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 10 },
      { x: 0, y: 10 },
    ];
    planAreaSqm = 120;
  }

  const trueAreaSqm = planAreaSqm * slopeFactor;

  // Find bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  boundary.forEach((pt) => {
    if (pt.x < minX) {minX = pt.x;}
    if (pt.x > maxX) {maxX = pt.x;}
    if (pt.y < minY) {minY = pt.y;}
    if (pt.y > maxY) {maxY = pt.y;}
  });

  const width = maxX - minX;
  const length = maxY - minY;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  // 2. Ridge, Hip, and Valley Lines (REQ-UNIMP-051, REQ-UNIMP-055)
  const ridgeLine: Point[] = [];
  const hipLines: Point[][] = [];
  const valleyLines: Point[][] = [];

  if (roof.roofType === "gable") {
    // Ridge runs full length of the building at midX
    ridgeLine.push({ x: midX, y: minY }, { x: midX, y: maxY });
  } else if (roof.roofType === "hip") {
    // Ridge is shorter, ends are sloped hip planes
    const hipOffset = width / 2; // 45-degree hips in plan
    ridgeLine.push({ x: midX, y: minY + hipOffset }, { x: midX, y: maxY - hipOffset });

    // Hips connect corners to ridge ends
    hipLines.push(
      [{ x: minX, y: minY }, { x: midX, y: minY + hipOffset }],
      [{ x: maxX, y: minY }, { x: midX, y: minY + hipOffset }],
      [{ x: minX, y: maxY }, { x: midX, y: maxY - hipOffset }],
      [{ x: maxX, y: maxY }, { x: midX, y: maxY - hipOffset }],
    );
  } else if (roof.roofType === "shed") {
    // High edge acts as a ridge, low edge is eaves
    ridgeLine.push({ x: minX, y: minY }, { x: maxX, y: minY });
  } else {
    // Flat or mansard default
    ridgeLine.push({ x: minX, y: midY }, { x: maxX, y: midY });
  }

  // 3. Rafter / Joist spacing layout (REQ-UNIMP-056)
  const rafterLines: Point[][] = [];
  const spacing = 0.6; // 24 inches / 60cm spacing
  const rafterCount = Math.floor(width / spacing);
  for (let i = 1; i < rafterCount; i++) {
    const rx = minX + i * spacing;
    // Rafters run from center ridge to the outer low boundaries (left and right)
    rafterLines.push(
      [{ x: rx, y: midY }, { x: rx, y: minY }],
      [{ x: rx, y: midY }, { x: rx, y: maxY }],
    );
  }

  // 4. Drainage Flow lines, gutters, and downspout positions (REQ-UNIMP-052, REQ-UNIMP-058)
  const drainageFlows: Point[][] = [];
  const gutterPaths: Point[][] = [];
  const downspoutAnchors: Point[] = [];
  const overhang = roof.overhang || 0.3;

  // Drainage runs down-slope (perpendicular to ridge line)
  const steps = 5;
  for (let i = 1; i < steps; i++) {
    const rx = minX + (i / steps) * width;
    drainageFlows.push(
      [{ x: rx, y: midY }, { x: rx, y: minY - overhang }],
      [{ x: rx, y: midY }, { x: rx, y: maxY + overhang }],
    );
  }

  // Gutters along the low eaves (north and south boundaries)
  if (roof.gutters) {
    gutterPaths.push(
      [{ x: minX - overhang, y: minY - overhang }, { x: maxX + overhang, y: minY - overhang }],
      [{ x: minX - overhang, y: maxY + overhang }, { x: maxX + overhang, y: maxY + overhang }],
    );
    // Downspouts at the 4 low corners
    downspoutAnchors.push(
      { x: minX - overhang, y: minY - overhang },
      { x: maxX + overhang, y: minY - overhang },
      { x: minX - overhang, y: maxY + overhang },
      { x: maxX + overhang, y: maxY + overhang },
    );
  }

  // 5. Material takeoffs (REQ-UNIMP-059)
  const sheathingVolCuM = trueAreaSqm * 0.015; // 15mm plywood sheathing
  const insulationVolCuM = trueAreaSqm * 0.18; // 180mm fiberglass insulation
  const shingleWeightKg = trueAreaSqm * 12.0; // ~12kg/sqm asphalt shingles
  const timberBoardFeet = trueAreaSqm * 8.5; // rafter lumber estimate

  // 6. Ventilation Area Verification (REQ-UNIMP-060)
  // International Residential Code (IRC R806.1): Net free vent area >= 1:150 of plan area
  // (or 1:300 if balanced between ridge and soffit)
  const requiredVentAreaSqm = planAreaSqm / 300;
  
  // Calculate provided vent area:
  // Ridge vent (length of ridge * free area width ~ 0.05m)
  let ridgeVentArea = 0;
  if (roof.roofType !== "flat" && ridgeLine.length >= 2) {
    const rLen = distance(ridgeLine[1], ridgeLine[0]);
    ridgeVentArea = rLen * 0.05;
  }
  // Soffit vents (eaves perimeter * vent slot ~ 0.02m)
  let soffitVentArea = 0;
  if (roof.soffitVents) {
    soffitVentArea = (width * 2 + length * 2) * 0.02;
  }
  const providedVentAreaSqm = ridgeVentArea + soffitVentArea;

  if (providedVentAreaSqm < requiredVentAreaSqm) {
    ventilationWarnings.push(
      `Provided vent area (${providedVentAreaSqm.toFixed(3)}m²) is below building code requirements (${requiredVentAreaSqm.toFixed(3)}m² / 1:300 ratio).`,
    );
  }

  // Warnings for structural limits (heavy snow load check: pitch < 3:12 warns)
  if (pitchVal < 3) {
    warnings.push(`Low pitch slope ratio (${pitchVal}:12) requires special ice/water waterproofing membranes.`);
  }

  return {
    pitchAngleRad,
    slopeFactor,
    planAreaSqm,
    trueAreaSqm,
    ridgeLine,
    hipLines,
    valleyLines,
    rafterLines,
    drainageFlows,
    gutterPaths,
    downspoutAnchors,
    sheathingVolCuM,
    insulationVolCuM,
    shingleWeightKg,
    timberBoardFeet,
    requiredVentAreaSqm,
    providedVentAreaSqm,
    ventilationWarnings,
    warnings,
  };
}
