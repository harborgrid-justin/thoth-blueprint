import { vec2 } from "gl-matrix";
import type { ElevationGrid } from "./terrain";
import { elevationAt } from "./terrain";
import type { Point, Polygon } from "../spatial/geometry";
import { pointInPolygon } from "../spatial/geometry";

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
  const pVec = vec2.fromValues(p.x, p.y);
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    
    const p1Vec = vec2.fromValues(p1.x, p1.y);
    const p2Vec = vec2.fromValues(p2.x, p2.y);
    
    const ab = vec2.create();
    vec2.sub(ab, p2Vec, p1Vec);
    
    const lenSq = vec2.sqrLen(ab);
    if (lenSq < 1e-12) continue;

    const ap = vec2.create();
    vec2.sub(ap, pVec, p1Vec);

    let t = vec2.dot(ap, ab) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const proj = vec2.create();
    vec2.scaleAndAdd(proj, p1Vec, ab, t);
    
    const dist = vec2.distance(pVec, proj);
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

      const inside = isPointInPolygon({ x, y }, pad.points);
      let proposedZ: number;
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

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** Drape a 2D polyline onto an ElevationGrid surface to create a 3D feature line. */
export function drapePolyline(points: Point[], surface: ElevationGrid): Point3D[] {
  return points.map(p => ({
    x: p.x,
    y: p.y,
    z: elevationAt(surface, p)
  }));
}

/** Calculate daylight points for a 3D feature line projecting to meet a terrain surface. */
export function calculateDaylightLine(
  featureLine: Point3D[],
  surface: ElevationGrid,
  cutSlope: number = 2.0,  // H:V
  fillSlope: number = 3.0, // H:V
  searchDistance: number = 300
): Point3D[] {
  const daylightLine: Point3D[] = [];
  const n = featureLine.length;
  if (n < 2) return [];

  for (let i = 0; i < n; i++) {
    const curr = featureLine[i];
    
    // Calculate 2D tangent vector using gl-matrix
    let tx: number;
    let ty: number;
    if (i === 0) {
      tx = featureLine[1].x - curr.x;
      ty = featureLine[1].y - curr.y;
    } else if (i === n - 1) {
      tx = curr.x - featureLine[n - 2].x;
      ty = curr.y - featureLine[n - 2].y;
    } else {
      const t1 = vec2.fromValues(curr.x - featureLine[i - 1].x, curr.y - featureLine[i - 1].y);
      const t2 = vec2.fromValues(featureLine[i + 1].x - curr.x, featureLine[i + 1].y - curr.y);
      const len1 = vec2.len(t1);
      const len2 = vec2.len(t2);
      tx = (len1 > 0 ? t1[0] / len1 : 0) + (len2 > 0 ? t2[0] / len2 : 0);
      ty = (len1 > 0 ? t1[1] / len1 : 0) + (len2 > 0 ? t2[1] / len2 : 0);
    }
    
    const tangent = vec2.fromValues(tx, ty);
    const tangentLen = vec2.len(tangent);
    if (tangentLen < 1e-4) continue;
    
    // Left normal vector
    const nx = -tangent[1] / tangentLen;
    const ny = tangent[0] / tangentLen;
    
    const terrainAtStart = elevationAt(surface, curr);
    const isCut = curr.z < terrainAtStart;
    const slope = isCut ? cutSlope : fillSlope;
    
    // March ray along the normal to find where proposed slope intersects terrain
    let found = false;
    let prevDist = 0;
    let prevDiff = curr.z - terrainAtStart;
    
    const steps = 150;
    const stepSize = searchDistance / steps;
    
    for (let step = 1; step <= steps; step++) {
      const d = step * stepSize;
      const pt2d = { x: curr.x + d * nx, y: curr.y + d * ny };
      const terrZ = elevationAt(surface, pt2d);
      const propZ = isCut ? curr.z + d / slope : curr.z - d / slope;
      
      const diff = propZ - terrZ;
      if ((isCut && diff < 0) || (!isCut && diff > 0)) {
        prevDist = d;
        prevDiff = diff;
      } else {
        const fraction = Math.abs(prevDiff) / (Math.abs(prevDiff) + Math.abs(diff));
        const dayDist = prevDist + fraction * (d - prevDist);
        const dayPt = { x: curr.x + dayDist * nx, y: curr.y + dayDist * ny };
        daylightLine.push({
          x: dayPt.x,
          y: dayPt.y,
          z: elevationAt(surface, dayPt)
        });
        found = true;
        break;
      }
    }
    
    if (!found) {
      daylightLine.push({
        x: curr.x + searchDistance * nx,
        y: curr.y + searchDistance * ny,
        z: elevationAt(surface, { x: curr.x + searchDistance * nx, y: curr.y + searchDistance * ny })
      });
    }
  }
  
  return daylightLine;
}

/** Compute the pond storage capacity (volume) below a specified water surface elevation. */
export function calculatePondVolume(
  surface: ElevationGrid,
  waterElevation: number,
  boundary: Polygon,
  gridResolution: number = 2
): number {
  const xs = boundary.map((p) => p.x);
  const ys = boundary.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  let totalVolume = 0;
  const cellArea = gridResolution * gridResolution;
  
  for (let x = minX + gridResolution / 2; x < maxX; x += gridResolution) {
    for (let y = minY + gridResolution / 2; y < maxY; y += gridResolution) {
      if (pointInPolygon({ x, y }, boundary)) {
        const z = elevationAt(surface, { x, y });
        if (z < waterElevation) {
          totalVolume += (waterElevation - z) * cellArea;
        }
      }
    }
  }
  
  return totalVolume / 27;
}

export interface FlowArrow {
  point: Point;
  direction: Point;
  slope: number;
}

/** Calculate drainage flow arrows across the surface at grid cell centers. */
export function calculateDrainageFlow(
  surface: ElevationGrid,
  cellStride: number = 4
): FlowArrow[] {
  const arrows: FlowArrow[] = [];
  const dx = surface.cellSize;
  
  for (let r = 1; r < surface.rows - 1; r += cellStride) {
    for (let c = 1; c < surface.cols - 1; c += cellStride) {
      const x = surface.origin.x + c * dx;
      const y = surface.origin.y + r * dx;
      
      const zL = surface.heights[r * surface.cols + (c - 1)];
      const zR = surface.heights[r * surface.cols + (c + 1)];
      const zT = surface.heights[(r - 1) * surface.cols + c];
      const zB = surface.heights[(r + 1) * surface.cols + c];
      
      const gradX = (zR - zL) / (2 * dx);
      const gradY = (zB - zT) / (2 * dx);
      const grad = vec2.fromValues(gradX, gradY);
      const slope = vec2.len(grad);
      if (slope > 1e-4) {
        arrows.push({
          point: { x, y },
          direction: { x: -grad[0] / slope, y: -grad[1] / slope },
          slope
        });
      }
    }
  }
  return arrows;
}

