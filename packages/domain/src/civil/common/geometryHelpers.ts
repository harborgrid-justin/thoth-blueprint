import type { Point2D } from '../../survey/transparentCommands';

/**
 * Calculates exact polygon area using Shoelace formula.
 */
export function calculatePolygonArea(vertices: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2.0;
}

/**
 * Calculates exact polygon centroid (Cx, Cy).
 */
export function calculatePolygonCentroid(vertices: Point2D[]): Point2D {
  let cx = 0;
  let cy = 0;
  let areaFactor = 0;

  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const factor = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    cx += (vertices[i].x + vertices[j].x) * factor;
    cy += (vertices[i].y + vertices[j].y) * factor;
    areaFactor += factor;
  }

  const area = areaFactor / 2.0;
  if (Math.abs(area) < 1e-9) {
    const sumX = vertices.reduce((acc, v) => acc + v.x, 0);
    const sumY = vertices.reduce((acc, v) => acc + v.y, 0);
    return { x: sumX / vertices.length, y: sumY / vertices.length };
  }

  const factor3A = 6.0 * area;
  return { x: cx / factor3A, y: cy / factor3A };
}

/**
 * Calculates Euclidean distance and bearing angle in radians between two 2D points.
 */
export function calculateDistanceAndBearing(p1: Point2D, p2: Point2D): { distance: number; bearingRad: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.hypot(dx, dy);
  const bearingRad = Math.atan2(dx, dy); // Azimuth clockwise from North
  return { distance, bearingRad };
}
