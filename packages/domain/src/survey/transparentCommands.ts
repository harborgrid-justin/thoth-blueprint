/**
 * Domain module implementing REQ-013 through REQ-022 (Linework & Drafting Tools & Transparent Commands).
 */

import type { CogoPoint } from './points';

export interface Point2D {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point2D;
  end: Point2D;
}

export interface PolylineEntity {
  id: string;
  vertices: Point2D[];
  arcs?: Array<{ vertexIndex: number; radius: number; isClockwise: boolean }>;
  isClosed: boolean;
}

export type Quadrant = 1 | 2 | 3 | 4; // 1=NE, 2=SE, 3=SW, 4=NW

/**
 * REQ-013: Generate contiguous lines using sequential point number ranges (e.g. "1-5, 8, 10-12").
 */
export function createLineworkFromPointRanges(pointMap: Map<number, CogoPoint>, rangeInput: string): PolylineEntity {
  const pointNumbers: number[] = [];
  const parts = rangeInput.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) pointNumbers.push(i);
      }
    } else {
      const val = parseInt(part, 10);
      if (!isNaN(val)) pointNumbers.push(val);
    }
  }

  const vertices: Point2D[] = [];
  for (const pNum of pointNumbers) {
    const pt = pointMap.get(pNum);
    if (pt) {
      vertices.push({ x: pt.easting, y: pt.northing });
    }
  }

  return {
    id: `pline-${Date.now()}`,
    vertices,
    isClosed: false,
  };
}

/**
 * REQ-015: Support line drafting using quadrant bearing input ($1=NE, 2=SE, 3=SW, 4=NW$), bearing values (DMS / deg), and linear distances.
 */
export function calculatePointFromQuadrantBearing(
  start: Point2D,
  quadrant: Quadrant,
  bearingDeg: number, // bearing in degrees off N/S axis towards E/W
  distance: number
): Point2D {
  let azimuthDeg = 0;

  switch (quadrant) {
    case 1: // NE
      azimuthDeg = bearingDeg;
      break;
    case 2: // SE
      azimuthDeg = 180 - bearingDeg;
      break;
    case 3: // SW
      azimuthDeg = 180 + bearingDeg;
      break;
    case 4: // NW
      azimuthDeg = 360 - bearingDeg;
      break;
  }

  const azimuthRad = (azimuthDeg * Math.PI) / 180;
  // In surveying: Easting = x, Northing = y. Azimuth is clockwise from North (Y-axis)
  const dx = distance * Math.sin(azimuthRad);
  const dy = distance * Math.cos(azimuthRad);

  return {
    x: start.x + dx,
    y: start.y + dy,
  };
}

/**
 * REQ-016: Line extension from endpoint of existing line by extension distance.
 */
export function extendLineEndpoint(segment: LineSegment, extensionDistance: number): LineSegment {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) return segment;

  const ux = dx / length;
  const uy = dy / length;

  return {
    start: segment.start,
    end: {
      x: segment.end.x + ux * extensionDistance,
      y: segment.end.y + uy * extensionDistance,
    },
  };
}

/**
 * REQ-017: Join selected line segments into a single, continuous polyline entity.
 */
export function joinLineSegments(segments: LineSegment[]): PolylineEntity {
  if (segments.length === 0) {
    return { id: `pline-${Date.now()}`, vertices: [], isClosed: false };
  }

  const vertices: Point2D[] = [segments[0].start, segments[0].end];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const last = vertices[vertices.length - 1];

    if (Math.hypot(seg.start.x - last.x, seg.start.y - last.y) < 1e-4) {
      vertices.push(seg.end);
    } else if (Math.hypot(seg.end.x - last.x, seg.end.y - last.y) < 1e-4) {
      vertices.push(seg.start);
    } else {
      vertices.push(seg.start, seg.end);
    }
  }

  const isClosed = vertices.length > 2 &&
    Math.hypot(vertices[0].x - vertices[vertices.length - 1].x, vertices[0].y - vertices[vertices.length - 1].y) < 1e-4;

  return {
    id: `pline-${Date.now()}`,
    vertices,
    isClosed,
  };
}

/**
 * REQ-018: Polyline midpoint grip operations (add vertex, stretch vertex, convert segment to arc).
 */
export function manipulatePolylineGrip(
  polyline: PolylineEntity,
  action: 'add_vertex' | 'stretch_vertex' | 'convert_arc',
  targetIndex: number,
  newPosition: Point2D,
  arcRadius?: number
): PolylineEntity {
  const newVertices = [...polyline.vertices];
  const newArcs = [...(polyline.arcs || [])];

  if (action === 'add_vertex') {
    newVertices.splice(targetIndex + 1, 0, newPosition);
  } else if (action === 'stretch_vertex') {
    if (targetIndex >= 0 && targetIndex < newVertices.length) {
      newVertices[targetIndex] = newPosition;
    }
  } else if (action === 'convert_arc') {
    newArcs.push({
      vertexIndex: targetIndex,
      radius: arcRadius || 10,
      isClockwise: true,
    });
  }

  return {
    ...polyline,
    vertices: newVertices,
    arcs: newArcs,
  };
}

/**
 * REQ-019, REQ-020, REQ-021, REQ-022: Transparent Command Executor.
 */
export type TransparentCommandType =
  | 'AD' // Angle-Distance
  | 'BD' // Bearing-Distance
  | 'ZD' // Azimuth-Distance
  | 'DD' // Deflection-Distance
  | 'PN' // Point Number
  | 'PNAME' // Point Name
  | 'PO' // Point Object
  | 'ZE' // Zoom to Point
  | 'C'; // Close Polyline

export interface TransparentCommandInput {
  command: TransparentCommandType;
  startPoint?: Point2D;
  referenceAngleDeg?: number;
  angleOrBearingDeg?: number;
  quadrant?: Quadrant;
  distance?: number;
  pointNumber?: number;
  pointName?: string;
  pointMap?: Map<number, CogoPoint>;
}

export function executeTransparentCommand(input: TransparentCommandInput): Point2D | { action: 'close' | 'zoom'; targetPoint?: Point2D } {
  const { command, startPoint, referenceAngleDeg, angleOrBearingDeg, quadrant, distance, pointNumber, pointMap } = input;

  switch (command) {
    case 'BD': {
      if (!startPoint || quadrant === undefined || angleOrBearingDeg === undefined || distance === undefined) {
        throw new Error('Bearing-Distance requires startPoint, quadrant, bearing, and distance');
      }
      return calculatePointFromQuadrantBearing(startPoint, quadrant, angleOrBearingDeg, distance);
    }
    case 'ZD': {
      if (!startPoint || angleOrBearingDeg === undefined || distance === undefined) {
        throw new Error('Azimuth-Distance requires startPoint, azimuth, and distance');
      }
      const azRad = (angleOrBearingDeg * Math.PI) / 180;
      return {
        x: startPoint.x + distance * Math.sin(azRad),
        y: startPoint.y + distance * Math.cos(azRad),
      };
    }
    case 'AD': {
      if (!startPoint || referenceAngleDeg === undefined || angleOrBearingDeg === undefined || distance === undefined) {
        throw new Error('Angle-Distance requires startPoint, referenceAngle, angle, and distance');
      }
      const totalAzDeg = (referenceAngleDeg + angleOrBearingDeg) % 360;
      const azRad = (totalAzDeg * Math.PI) / 180;
      return {
        x: startPoint.x + distance * Math.sin(azRad),
        y: startPoint.y + distance * Math.cos(azRad),
      };
    }
    case 'DD': {
      if (!startPoint || referenceAngleDeg === undefined || angleOrBearingDeg === undefined || distance === undefined) {
        throw new Error('Deflection-Distance requires startPoint, referenceAngle, deflectionAngle, and distance');
      }
      const totalAzDeg = (referenceAngleDeg + angleOrBearingDeg) % 360;
      const azRad = (totalAzDeg * Math.PI) / 180;
      return {
        x: startPoint.x + distance * Math.sin(azRad),
        y: startPoint.y + distance * Math.cos(azRad),
      };
    }
    case 'PN':
    case 'PNAME':
    case 'PO': {
      if (!pointNumber || !pointMap) {
        throw new Error('Point transparent command requires pointNumber and pointMap');
      }
      const pt = pointMap.get(pointNumber);
      if (!pt) throw new Error(`Point ${pointNumber} not found`);
      return { x: pt.easting, y: pt.northing };
    }
    case 'ZE': {
      if (!pointNumber || !pointMap) throw new Error('Zoom to Point requires pointNumber');
      const pt = pointMap.get(pointNumber);
      return { action: 'zoom', targetPoint: pt ? { x: pt.easting, y: pt.northing } : undefined };
    }
    case 'C': {
      return { action: 'close' };
    }
    default:
      throw new Error(`Unsupported transparent command ${command}`);
  }
}
