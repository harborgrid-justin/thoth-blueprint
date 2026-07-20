import type { ElevationGrid } from "./terrain";

export interface GradingPad {
  id: string;
  name: string;
  points: { x: number; y: number }[]; // 2D polygon vertices
  targetElevation: number;
  cutSlope: number; // e.g. 2 (representing 2:1 horizontal:vertical)
  fillSlope: number; // e.g. 3 (representing 3:1)
}

export interface VolumeReport {
  cutVolume: number; // cubic yards
  fillVolume: number; // cubic yards
  netVolume: number; // cut - fill
}

/**
 * Helper to check if a point is inside a polygon using ray casting.
 */
function isPointInPolygon(p: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y))
        && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates distance from a point to the nearest segment of a polygon.
 */
function getDistanceToPolygon(p: { x: number; y: number }, polygon: { x: number; y: number }[]): number {
  let minDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (dx === 0 && dy === 0) continue;

    // Projection scalar
    let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;
    const dist = Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/**
 * Computes grading volumes by sampling a grid inside the pad's horizontal footprint and surrounding buffer.
 */
export function calculateGradingVolumes(
  pad: GradingPad,
  padZ: number,
  surface: ElevationGrid,
  gridResolution: number = 5 // 5-unit grid intervals
): VolumeReport {
  // Determine bounding box around the pad with a daylight buffer offset
  const buffer = 150; // max daylight run length
  const xs = pad.points.map((p) => p.x);
  const ys = pad.points.map((p) => p.y);
  const minX = Math.min(...xs) - buffer;
  const maxX = Math.max(...xs) + buffer;
  const minY = Math.min(...ys) - buffer;
  const maxY = Math.max(...ys) + buffer;

  let totalCutVolume = 0;
  let totalFillVolume = 0;

  const cellArea = gridResolution * gridResolution;

  // Double loop grid sampling
  for (let x = minX; x <= maxX; x += gridResolution) {
    for (let y = minY; y <= maxY; y += gridResolution) {
      // Find existing terrain elevation
      const cellIndexX = Math.floor((x - surface.origin.x) / surface.cellSize);
      const cellIndexY = Math.floor((y - surface.origin.y) / surface.cellSize);
      if (cellIndexX < 0 || cellIndexX >= surface.cols || cellIndexY < 0 || cellIndexY >= surface.rows) {
        continue;
      }
      const existingZ = surface.heights[cellIndexY * surface.cols + cellIndexX];

      // Check if inside the grading pad footprint
      const inside = isPointInPolygon({ x, y }, pad.points);
      
      let proposedZ = existingZ;
      if (inside) {
        proposedZ = padZ;
      } else {
        // Daylight daylight slope projection
        const dist = getDistanceToPolygon({ x, y }, pad.points);
        if (existingZ > padZ) {
          // Cut region: daylight slope goes upwards from the pad
          proposedZ = padZ + dist / pad.cutSlope;
          // Clip to existing terrain
          if (proposedZ > existingZ) {
            proposedZ = existingZ; // already daylit
          }
        } else {
          // Fill region: daylight slope goes downwards from the pad
          proposedZ = padZ - dist / pad.fillSlope;
          if (proposedZ < existingZ) {
            proposedZ = existingZ; // already daylit
          }
        }
      }

      const diff = proposedZ - existingZ; // Positive means fill, Negative means cut
      if (diff > 0) {
        totalFillVolume += diff * cellArea;
      } else {
        totalCutVolume += Math.abs(diff) * cellArea;
      }
    }
  }

  // Convert cubic units to Cubic Yards (1 cubic yard = 27 cubic feet)
  const cutVolume = totalCutVolume / 27;
  const fillVolume = totalFillVolume / 27;

  return {
    cutVolume,
    fillVolume,
    netVolume: cutVolume - fillVolume,
  };
}

/**
 * Iteratively solves for the grading pad elevation that achieves a balanced cut/fill (Net volume = 0).
 */
export function solveBalancedElevation(
  pad: GradingPad,
  surface: ElevationGrid,
  targetNetVolume: number = 0,
  tolerance: number = 50 // within 50 cubic yards
): number {
  let lowZ = -100;
  let highZ = 500;
  let balancedZ = (lowZ + highZ) / 2;
  const maxIterations = 20;

  for (let i = 0; i < maxIterations; i++) {
    balancedZ = (lowZ + highZ) / 2;
    const report = calculateGradingVolumes(pad, balancedZ, surface, 10);
    const deviation = report.netVolume - targetNetVolume;

    if (Math.abs(deviation) < tolerance) {
      return balancedZ;
    }

    if (deviation > 0) {
      // Too much Cut: raise the pad to reduce Cut
      lowZ = balancedZ;
    } else {
      // Too much Fill: lower the pad to reduce Fill
      highZ = balancedZ;
    }
  }

  return balancedZ;
}
