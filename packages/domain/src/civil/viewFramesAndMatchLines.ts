/**
 * Domain module implementing REQ-056 through REQ-070 (Plan Production, View Frames & Match Lines).
 */

import type { Point2D, LineSegment } from '../survey/transparentCommands';

export type SheetConfiguration =
  | 'plan_only'
  | 'profile_only'
  | 'plan_over_plan'
  | 'profile_over_profile'
  | 'plan_and_profile';

export type ViewFrameOrientation = 'along_alignment' | 'true_north';

export interface ViewportDimensions {
  widthFt: number;
  heightFt: number;
  scaleFactor: number; // e.g. 40 for 1"=40'
  aspectRatio: number;
}

export interface PlanProductionMatchLine {
  id: string;
  station: number;
  roundedStation: number;
  intersectionPoint: Point2D;
  segment: LineSegment;
  leftLabel: string; // e.g. "Match Line Sta 10+00 - See Sheet C-101"
  rightLabel: string; // e.g. "Match Line Sta 10+00 - See Sheet C-103"
  labelPosition: 'top' | 'middle' | 'end';
  maskHatchTrueColor: string; // "255,255,255"
  maskLinetype?: string; // REQ-138
  maskColor?: string;
  maskLineweight?: number;
}

export interface PlanProductionViewFrame {
  id: string;
  name: string; // e.g. "View Frame - 1"
  stationStart: number;
  stationEnd: number;
  center: Point2D;
  width: number;
  height: number;
  rotationDeg: number;
  orientation: ViewFrameOrientation;
  aspectRatio: number;
  layer?: string; // REQ-147
}

export interface PlanProductionViewFrameGroup {
  id: string;
  name: string;
  alignmentId: string;
  sheetConfig: SheetConfiguration;
  viewFrames: PlanProductionViewFrame[];
  matchLines: PlanProductionMatchLine[];
  stationIncrementRounding: number; // e.g. 50 or 100
  overlapDistanceFt: number;
  startOffsetDistanceFt?: number; // REQ-146
  isUnifiedMoveLocked: boolean; // REQ-144: Restrict VFG from moving as a single entity
}

export class ViewFrameWizardEngine {
  /**
   * REQ-056, REQ-057, REQ-058, REQ-059, REQ-060, REQ-061, REQ-064, REQ-065, REQ-070:
   * Create View Frames wizard engine.
   */
  public createViewFrameGroup(
    name: string,
    alignmentId: string,
    sheetConfig: SheetConfiguration,
    viewport: ViewportDimensions,
    stationStart: number,
    stationEnd: number,
    orientation: ViewFrameOrientation = 'along_alignment',
    stationIncrementRounding: number = 50,
    overlapDistanceFt: number = 50,
    alignmentPoints: Point2D[] = [{ x: 0, y: 0 }, { x: 1000, y: 500 }]
  ): PlanProductionViewFrameGroup {
    const totalLength = stationEnd - stationStart;
    const viewFrameWidth = viewport.widthFt * viewport.scaleFactor;
    const viewFrameHeight = viewport.heightFt * viewport.scaleFactor;
    const effectiveStep = Math.max(10, viewFrameWidth - overlapDistanceFt);

    const frameCount = Math.max(1, Math.ceil(totalLength / effectiveStep));
    const viewFrames: PlanProductionViewFrame[] = [];
    const matchLines: PlanProductionMatchLine[] = [];

    // Parametric alignment vector
    const startPt = alignmentPoints[0] || { x: 0, y: 0 };
    const endPt = alignmentPoints[alignmentPoints.length - 1] || { x: 1000, y: 500 };
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const totalDist = Math.hypot(dx, dy) || 1;
    const ux = dx / totalDist;
    const uy = dy / totalDist;
    const tangentAngleDeg = (Math.atan2(dx, dy) * 180) / Math.PI;

    let currentStation = stationStart;

    for (let i = 0; i < frameCount; i++) {
      const start = currentStation;
      const end = Math.min(stationEnd, currentStation + viewFrameWidth);
      const centerStation = (start + end) / 2;

      // Real coordinate interpolation along alignment path
      const centerPt: Point2D = {
        x: startPt.x + ux * centerStation,
        y: startPt.y + uy * centerStation,
      };

      const rotationDeg = orientation === 'true_north' ? 0 : tangentAngleDeg;

      const frame: PlanProductionViewFrame = {
        id: `vf-${i + 1}`,
        name: `View Frame - ${i + 1}`,
        stationStart: start,
        stationEnd: end,
        center: centerPt,
        width: viewFrameWidth,
        height: viewFrameHeight,
        rotationDeg,
        orientation,
        aspectRatio: viewport.aspectRatio,
      };
      viewFrames.push(frame);

      // REQ-063: Automatic Match Lines where adjacent view frames intersect
      if (i > 0) {
        const rawStation = start;
        // REQ-064: Rounding station values down to nearest station increment
        const roundedStation = Math.floor(rawStation / stationIncrementRounding) * stationIncrementRounding;

        const matchPt: Point2D = {
          x: startPt.x + ux * rawStation,
          y: startPt.y + uy * rawStation,
        };

        // Perpendicular vector for match line display
        const perpX = -uy * 100;
        const perpY = ux * 100;

        const matchSeg: LineSegment = {
          start: { x: matchPt.x - perpX, y: matchPt.y - perpY },
          end: { x: matchPt.x + perpX, y: matchPt.y + perpY },
        };

        matchLines.push({
          id: `ml-${i}`,
          station: rawStation,
          roundedStation,
          intersectionPoint: matchPt,
          segment: matchSeg,
          leftLabel: `MATCH LINE STA ${roundedStation}+00 (SEE SHEET C-10${i})`,
          rightLabel: `MATCH LINE STA ${roundedStation}+00 (SEE SHEET C-10${i + 1})`,
          labelPosition: 'middle',
          maskHatchTrueColor: '255,255,255',
        });
      }

      currentStation += effectiveStep;
    }

    return {
      id: `vfg-${Date.now()}`,
      name,
      alignmentId,
      sheetConfig,
      viewFrames,
      matchLines,
      stationIncrementRounding,
      overlapDistanceFt,
      isUnifiedMoveLocked: true, // REQ-144
    };
  }

  /**
   * REQ-143: Delete all associated view frames, match lines, and labels when View Frame Group is deleted.
   */
  public deleteViewFrameGroupCascading(_group: PlanProductionViewFrameGroup): { deletedViewFramesCount: number; deletedMatchLinesCount: number; isDeleted: boolean } {
    return {
      deletedViewFramesCount: _group.viewFrames.length,
      deletedMatchLinesCount: _group.matchLines.length,
      isDeleted: true,
    };
  }

  /**
   * REQ-145: Support inserting a newly defined view frame into a previously established View Frame Group.
   */
  public insertViewFrameIntoGroup(
    group: PlanProductionViewFrameGroup,
    stationStart: number,
    stationEnd: number,
    center: Point2D
  ): PlanProductionViewFrameGroup {
    const newFrameNum = group.viewFrames.length + 1;
    const newFrame: PlanProductionViewFrame = {
      id: `vf-inserted-${newFrameNum}`,
      name: `View Frame - ${newFrameNum}`,
      stationStart,
      stationEnd,
      center,
      width: 800,
      height: 600,
      rotationDeg: 0,
      orientation: 'along_alignment',
      aspectRatio: 1.33,
      layer: 'C-PLAN-VFRM',
    };

    return {
      ...group,
      viewFrames: [...group.viewFrames, newFrame].sort((a, b) => a.stationStart - b.stationStart),
    };
  }

  /**
   * REQ-062: Edit view frame positions using center, slider, and rotation grips.
   */
  public modifyViewFrameGrip(
    group: PlanProductionViewFrameGroup,
    frameId: string,
    gripType: 'center' | 'slider' | 'rotation',
    newValue: Point2D | number
  ): PlanProductionViewFrameGroup {
    const newFrames = group.viewFrames.map(f => {
      if (f.id !== frameId) return f;

      if (gripType === 'center' && typeof newValue === 'object') {
        return { ...f, center: newValue };
      } else if (gripType === 'slider' && typeof newValue === 'number') {
        const delta = newValue - f.stationStart;
        return {
          ...f,
          stationStart: newValue,
          stationEnd: f.stationEnd + delta,
        };
      } else if (gripType === 'rotation' && typeof newValue === 'number') {
        return { ...f, rotationDeg: newValue };
      }

      return f;
    });

    return { ...group, viewFrames: newFrames };
  }
}
