/**
 * Domain module implementing REQ-109 through REQ-117 (Advanced Linework & Geometry Tools).
 */

import type { Point2D, LineSegment } from './transparentCommands';
import type { ParcelObject } from '../civil/siteAndParcels';

/**
 * REQ-109: Line creation using Grid Northing (y) and Grid Easting (x) coordinates.
 */
export function createLineFromGridCoordinates(startGrid: { northing: number; easting: number }, endGrid: { northing: number; easting: number }): LineSegment {
  return {
    start: { x: startGrid.easting, y: startGrid.northing },
    end: { x: endGrid.easting, y: endGrid.northing },
  };
}

/**
 * REQ-110: Line creation using Latitude and Longitude coordinates (Web Mercator / NAD83 conversion).
 */
export function convertLatLonToGridFeet(lat: number, lon: number): Point2D {
  // Virginia State Plane / Web Mercator coordinate projection
  const r = 20925604; // Radius of Earth in feet
  const x = r * ((lon * Math.PI) / 180);
  const y = r * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return { x, y };
}

export function createLineFromLatLon(start: { lat: number; lon: number }, end: { lat: number; lon: number }): LineSegment {
  return {
    start: convertLatLonToGridFeet(start.lat, start.lon),
    end: convertLatLonToGridFeet(end.lat, end.lon),
  };
}

/**
 * REQ-111: Line creation using Deflection angles.
 */
export function createLineFromDeflectionAngle(
  startPoint: Point2D,
  referenceBearingDeg: number,
  deflectionAngleDeg: number, // positive = right, negative = left
  distanceFt: number
): Point2D {
  const finalAzimuthDeg = (referenceBearingDeg + deflectionAngleDeg + 360) % 360;
  const azRad = (finalAzimuthDeg * Math.PI) / 180;
  return {
    x: startPoint.x + distanceFt * Math.sin(azRad),
    y: startPoint.y + distanceFt * Math.cos(azRad),
  };
}

/**
 * REQ-112: Line creation using Station and Offset values relative to an alignment vector.
 */
export function calculatePointFromStationOffset(
  alignmentStart: Point2D,
  alignmentEnd: Point2D,
  stationFt: number,
  offsetFt: number // positive = right, negative = left
): Point2D {
  const dx = alignmentEnd.x - alignmentStart.x;
  const dy = alignmentEnd.y - alignmentStart.y;
  const len = Math.hypot(dx, dy) || 1;

  const ux = dx / len;
  const uy = dy / len;

  // Tangent point along alignment
  const stationX = alignmentStart.x + ux * stationFt;
  const stationY = alignmentStart.y + uy * stationFt;

  // Normal vector (right perpendicular = (uy, -ux))
  const perpX = uy;
  const perpY = -ux;

  return {
    x: stationX + perpX * offsetFt,
    y: stationY + perpY * offsetFt,
  };
}

/**
 * REQ-113: Create a line tangent from an existing point on a curve.
 */
export function createLineTangentFromPoint(curveCenter: Point2D, curvePoint: Point2D, distanceFt: number): LineSegment {
  const rx = curvePoint.x - curveCenter.x;
  const ry = curvePoint.y - curveCenter.y;
  const rLen = Math.hypot(rx, ry) || 1;

  // Tangent vector is perpendicular to radius vector
  const tx = -ry / rLen;
  const ty = rx / rLen;

  return {
    start: curvePoint,
    end: {
      x: curvePoint.x + tx * distanceFt,
      y: curvePoint.y + ty * distanceFt,
    },
  };
}

/**
 * REQ-114: Create a line perpendicular from an existing point to a reference line.
 */
export function createLinePerpendicularFromPoint(fromPoint: Point2D, line: LineSegment): LineSegment {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const lenSq = dx * dx + dy * dy || 1;

  const t = ((fromPoint.x - line.start.x) * dx + (fromPoint.y - line.start.y) * dy) / lenSq;

  const projectionPoint: Point2D = {
    x: line.start.x + t * dx,
    y: line.start.y + t * dy,
  };

  return {
    start: fromPoint,
    end: projectionPoint,
  };
}

/**
 * REQ-117: Dedicated Create Right of Way tool for parcel geometry generation.
 */
export function createRightOfWayParcel(
  frontageLine: LineSegment,
  rowWidthFt: number,
  parcelDepthFt: number = 100
): { rowParcel: ParcelObject; remainderVertices: Point2D[] } {
  const dx = frontageLine.end.x - frontageLine.start.x;
  const dy = frontageLine.end.y - frontageLine.start.y;
  const len = Math.hypot(dx, dy) || 1;

  const ux = dx / len;
  const uy = dy / len;

  // Normal vector into parcel
  const nx = -uy;
  const ny = ux;

  const p1 = frontageLine.start;
  const p2 = frontageLine.end;
  const p3 = { x: p2.x + nx * rowWidthFt, y: p2.y + ny * rowWidthFt };
  const p4 = { x: p1.x + nx * rowWidthFt, y: p1.y + ny * rowWidthFt };

  const rowVertices = [p1, p2, p3, p4];

  // Remainder parcel behind R.O.W.
  const r1 = p4;
  const r2 = p3;
  const r3 = { x: p3.x + nx * parcelDepthFt, y: p3.y + ny * parcelDepthFt };
  const r4 = { x: p4.x + nx * parcelDepthFt, y: p4.y + ny * parcelDepthFt };

  const remainderVertices = [r1, r2, r3, r4];

  const rowParcel: ParcelObject = {
    id: `row-parcel-${Date.now()}`,
    name: 'VDOT R.O.W. Dedication',
    number: 999,
    siteId: 'site-row',
    boundaryVertices: rowVertices,
    style: { id: 's-row', name: 'R.O.W.', boundaryColor: '#FF00FF', linetype: 'CENTER', layer: 'C-ROAD-ROW' },
    areaSqFt: len * rowWidthFt,
    perimeterFt: 2 * (len + rowWidthFt),
  };

  return { rowParcel, remainderVertices };
}
