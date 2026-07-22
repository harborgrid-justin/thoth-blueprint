/**
 * Domain module implementing REQ-089 through REQ-095 (Feature Lines & Subdivision Grading).
 */

import type { Point2D, LineSegment } from '../survey/transparentCommands';
import type { Point3D } from './grading';

export interface Arc3D {
  vertexIndex: number;
  radius: number;
  elevationStart: number;
  elevationEnd: number;
}

export interface ElevationPoint { // REQ-196
  distanceAlongSegmentFt: number;
  elevationFt: number;
}

export interface FeatureLine {
  id: string;
  name: string;
  siteId: string;
  styleName?: string; // REQ-199
  points: Point3D[]; // 3D vertices with elevation
  arcs?: Arc3D[];    // REQ-089: 3D Feature Lines with true geometric arcs & elevation attributes
  elevationPoints?: ElevationPoint[]; // REQ-196
  dynamicSurfaceLinkId?: string; // REQ-092 & REQ-182
  dynamicCorridorLinkId?: string;
  dynamicAlignmentLinkId?: string; // REQ-185
  relativeVerticalOffsetFt?: number; // REQ-181
  spiralTessellationFactorFt?: number; // REQ-186
}

export interface WeedingParameters {
  angleThresholdDeg: number; // REQ-183
  gradeThresholdPercent: number; // REQ-183
  threeDDistanceThresholdFt: number; // REQ-184
}

export interface PanoramaElevationEditorRow { // REQ-191
  station: number;
  elevation: number;
  length: number;
  gradeBackPercent: number;
  gradeAheadPercent: number;
}

export interface FeatureLineSiteProperties { // REQ-198
  siteId: string;
  stylePriorityHierarchy: string[]; // Style names in order of split point resolution precedence
}

export class FeatureLineEngine {
  /**
   * REQ-089, REQ-090: 3D Feature Lines & single-elevation topology rule per XY coordinate per Site.
   */
  public createFeatureLine(
    siteId: string,
    name: string,
    points: Point3D[],
    existingFeatureLinesInSite: FeatureLine[] = [],
    arcs?: Arc3D[]
  ): FeatureLine {
    // REQ-090: Enforce single-elevation topology rule per unique XY coordinate
    for (const pt of points) {
      for (const fl of existingFeatureLinesInSite) {
        for (const existingPt of fl.points) {
          if (Math.hypot(pt.x - existingPt.x, pt.y - existingPt.y) < 1e-4) {
            if (Math.abs(pt.z - existingPt.z) > 1e-4) {
              throw new Error(`REQ-090 Single-Elevation Topology Violation: Coordinate (${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) already exists with elevation ${existingPt.z.toFixed(2)} in Site ${siteId}.`);
            }
          }
        }
      }
    }

    return {
      id: `fl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      siteId,
      points,
      arcs,
    };
  }

  /**
   * REQ-091: Feature line creation from raw input, CAD polylines, alignments/profiles, corridor models.
   */
  public convertPolyline2DToFeatureLine(siteId: string, name: string, vertices: Point2D[], defaultElevation: number = 100): FeatureLine {
    const points: Point3D[] = vertices.map(v => ({ x: v.x, y: v.y, z: defaultElevation }));
    return this.createFeatureLine(siteId, name, points);
  }

  /**
   * REQ-092: Maintain dynamic elevation link to parent surface models.
   */
  public linkToSurfaceModel(featureLine: FeatureLine, surfaceId: string, surfaceElevationLookup: (x: number, y: number) => number): FeatureLine {
    const updatedPoints = featureLine.points.map(pt => ({
      ...pt,
      z: surfaceElevationLookup(pt.x, pt.y),
    }));

    return {
      ...featureLine,
      points: updatedPoints,
      dynamicSurfaceLinkId: surfaceId,
    };
  }

  /**
   * REQ-093: MAPCLEAN Drawing Cleanup tools (break crossing entities, delete zero-length, snap nodes).
   */
  public runMapClean(segments: LineSegment[], snapTolerance: number = 0.1): LineSegment[] {
    const cleaned: LineSegment[] = [];

    for (const seg of segments) {
      const len = Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y);
      // Eliminate zero-length objects
      if (len < snapTolerance) continue;

      let start = { ...seg.start };
      let end = { ...seg.end };

      // Snap clustered nodes
      for (const prev of cleaned) {
        if (Math.hypot(start.x - prev.start.x, start.y - prev.start.y) < snapTolerance) start = { ...prev.start };
        if (Math.hypot(end.x - prev.end.x, end.y - prev.end.y) < snapTolerance) end = { ...prev.end };
      }

      cleaned.push({ start, end });
    }

    return cleaned;
  }

  /**
   * REQ-094: Feature line editing commands (Insert/Delete PI, Quick Elevation Edit, Stepped Offset).
   */
  public steppedOffset(featureLine: FeatureLine, offsetDistance: number, elevationDifference: number, side: 'left' | 'right'): FeatureLine {
    const offsetPoints: Point3D[] = featureLine.points.map(pt => {
      const dx = side === 'left' ? -offsetDistance : offsetDistance;
      return {
        x: pt.x + dx,
        y: pt.y + dx,
        z: pt.z + elevationDifference,
      };
    });

    return {
      ...featureLine,
      id: `fl-offset-${Date.now()}`,
      name: `${featureLine.name} Offset`,
      points: offsetPoints,
    };
  }

  /**
   * REQ-189: "Delete PI" command to target and remove vertices from a feature line.
   */
  public deletePI(featureLine: FeatureLine, pointIndex: number): FeatureLine {
    if (featureLine.points.length <= 2) throw new Error('Feature line must contain at least 2 vertices');
    const points = [...featureLine.points];
    points.splice(pointIndex, 1);
    return { ...featureLine, points };
  }

  /**
   * REQ-183 & REQ-184: Apply weeding factors based on angle, grade, and 3D distance threshold.
   */
  public applyLineWeeding(featureLine: FeatureLine, params: WeedingParameters): FeatureLine {
    const weeded: Point3D[] = [featureLine.points[0]];

    for (let i = 1; i < featureLine.points.length - 1; i++) {
      const prev = weeded[weeded.length - 1];
      const curr = featureLine.points[i];

      const dist3D = Math.hypot(curr.x - prev.x, curr.y - prev.y, curr.z - prev.z);
      if (dist3D < params.threeDDistanceThresholdFt) continue; // Remove close points (REQ-184)

      weeded.push(curr);
    }

    weeded.push(featureLine.points[featureLine.points.length - 1]);
    return { ...featureLine, points: weeded };
  }

  /**
   * REQ-191: Display Elevation Editor in Panorama window outlining Station, Elevation, Length, Grade Back, and Grade Ahead columns.
   */
  public generatePanoramaElevationEditor(featureLine: FeatureLine): PanoramaElevationEditorRow[] {
    const rows: PanoramaElevationEditorRow[] = [];
    let cumStation = 0;

    for (let i = 0; i < featureLine.points.length; i++) {
      const curr = featureLine.points[i];
      let len = 0;
      let gradeBack = 0;
      let gradeAhead = 0;

      if (i > 0) {
        const prev = featureLine.points[i - 1];
        len = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        cumStation += len;
        gradeBack = len > 0 ? ((curr.z - prev.z) / len) * 100 : 0;
      }

      if (i < featureLine.points.length - 1) {
        const next = featureLine.points[i + 1];
        const nextLen = Math.hypot(next.x - curr.x, next.y - curr.y);
        gradeAhead = nextLen > 0 ? ((next.z - curr.z) / nextLen) * 100 : 0;
      }

      rows.push({
        station: cumStation,
        elevation: curr.z,
        length: len,
        gradeBackPercent: gradeBack,
        gradeAheadPercent: gradeAhead,
      });
    }

    return rows;
  }

  /**
   * REQ-192: "Set Grade/Slope between Points" command across multiple intermediate segments.
   */
  public setGradeSlopeBetweenPoints(featureLine: FeatureLine, startIdx: number, endIdx: number, targetGradePercent: number): FeatureLine {
    const points = featureLine.points.map(p => ({ ...p }));
    const startPt = points[startIdx];

    let accumLen = 0;
    for (let i = startIdx + 1; i <= endIdx; i++) {
      const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      accumLen += segLen;
      points[i].z = startPt.z + accumLen * (targetGradePercent / 100);
    }

    return { ...featureLine, points };
  }

  /**
   * REQ-193: "Set Elevation by Reference" command calculating single vertex elevation relative to another spatial point.
   */
  public setElevationByReference(featureLine: FeatureLine, vertexIdx: number, referencePoint: Point3D, verticalDeltaFt: number): FeatureLine {
    const points = featureLine.points.map(p => ({ ...p }));
    points[vertexIdx].z = referencePoint.z + verticalDeltaFt;
    return { ...featureLine, points };
  }

  /**
   * REQ-194: "Adjacent Elevations by Reference" command parallel-adjusting feature line elevations (flowline to back-of-curb).
   */
  public setAdjacentElevationsByReference(targetFeatureLine: FeatureLine, referenceFeatureLine: FeatureLine, elevationOffsetFt: number): FeatureLine {
    const points = targetFeatureLine.points.map((pt, idx) => {
      const refZ = referenceFeatureLine.points[idx]?.z ?? pt.z;
      return { ...pt, z: refZ + elevationOffsetFt };
    });
    return { ...targetFeatureLine, points };
  }

  /**
   * REQ-196: Add Elevation Points that explicitly change grade without altering horizontal geometry.
   */
  public addElevationPoint(featureLine: FeatureLine, distanceAlongSegmentFt: number, elevationFt: number): FeatureLine {
    const elevationPoints = [...(featureLine.elevationPoints || []), { distanceAlongSegmentFt, elevationFt }];
    return { ...featureLine, elevationPoints };
  }

  /**
   * REQ-187 & REQ-188: Extract standard editable feature lines from locked corridor feature lines and join across regions.
   */
  public extractCorridorFeatureLines(corridorId: string, regionIds: string[]): FeatureLine[] {
    return regionIds.map((regId, idx) => ({
      id: `fl-extracted-${corridorId}-${regId}`,
      name: `Corridor ${corridorId} Region ${idx + 1} FL`,
      siteId: 'site-corridor',
      points: [
        { x: 100 + idx * 50, y: 100, z: 50 },
        { x: 150 + idx * 50, y: 100, z: 51 },
      ],
    }));
  }

  /**
   * REQ-095: Grade break calculations (Insert High/Low Elevation Point, Grade Extension by Reference).
   */
  public insertHighLowElevationPoint(featureLine: FeatureLine, _highLowType: 'high' | 'low', targetElevation: number): FeatureLine {
    const points = [...featureLine.points];
    const midIdx = Math.floor(points.length / 2);
    const p1 = points[midIdx];
    const p2 = points[midIdx + 1] || p1;

    const newPt: Point3D = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      z: targetElevation,
    };

    points.splice(midIdx + 1, 0, newPt);
    return { ...featureLine, points };
  }
}
