import { type ResolvedAlignment, pointAtStation } from "./alignment";
import { type Point } from "./geometry";
import { paperPerModel } from "./sheetview";
import { type Unit } from "./spatial";
import { type PaperUnit } from "./sheetsize";
import { type Sheet, type DrawingSet } from "./sheet";

/** A single rectangular View Frame showing a station range along an alignment. */
export interface ViewFrame {
  id: string;
  name: string;
  stationStart: number;
  stationEnd: number;
  center: Point;
  width: number;       // viewport width in model units
  height: number;      // viewport height in model units
  rotationDeg: number; // clockwise rotation angle in degrees to align viewport
}

/** A match line marking the page break boundary between two adjacent view frames. */
export interface PlanMatchLine {
  id: string;
  station: number;
  cutLine: [Point, Point]; // Left to Right normal cut line segment in model coordinates
  label: string;
}

/** A group organizing view frames and match lines along an alignment. */
export interface ViewFrameGroup {
  id: string;
  name: string;
  alignmentId: string;
  frames: ViewFrame[];
  matchLines: PlanMatchLine[];
}

/**
 * Automatically splits an alignment baseline into consecutive page segments (View Frames)
 * and calculates perpendicular boundary Match Lines.
 */
export function generateViewFrames(
  resolved: ResolvedAlignment,
  alignmentId: string,
  scaleId: string,
  viewportWidthIn: number,  // paper sheet viewport width in inches
  viewportHeightIn: number, // paper sheet viewport height in inches
  modelUnit: Unit,
  overlapRatio = 0.15,
): ViewFrameGroup {
  const paperUnit: PaperUnit = "in";
  // Model units per paper unit (inches)
  const scalePx = paperPerModel(scaleId, modelUnit, paperUnit);
  
  // Real world model dimensions of the viewport
  const modelWidth = scalePx > 0 ? viewportWidthIn / scalePx : 400;
  const modelHeight = scalePx > 0 ? viewportHeightIn / scalePx : 250;

  const stepDistance = modelWidth * (1 - overlapRatio);

  const frames: ViewFrame[] = [];
  const matchLines: PlanMatchLine[] = [];

  let station = resolved.startStation;
  let idx = 1;

  while (station < resolved.endStation) {
    const stationStart = station;
    const stationEnd = Math.min(resolved.endStation, station + modelWidth);
    const stationCenter = (stationStart + stationEnd) / 2;

    const centerPoint = pointAtStation(resolved, stationCenter);
    if (!centerPoint) break;

    // View rotation: set viewport horizontal to follow centerline bearing
    // heading is bearing, viewport horizontal aligns perpendicular to left normal
    const rotationDeg = centerPoint.bearing;

    frames.push({
      id: `frame-${alignmentId}-${idx}`,
      name: `View Frame #${idx} (STA ${Math.round(stationStart)} to ${Math.round(stationEnd)})`,
      stationStart,
      stationEnd,
      center: centerPoint.point,
      width: modelWidth,
      height: modelHeight,
      rotationDeg,
    });

    // Create match line at the end of the frame (if not the end of the alignment)
    if (stationEnd < resolved.endStation) {
      const edgePoint = pointAtStation(resolved, stationEnd);
      if (edgePoint) {
        const rad = (edgePoint.bearing * Math.PI) / 180;
        // Right normal vector
        const nx = Math.cos(rad);
        const ny = Math.sin(rad);

        // Match line extends perpendicular left/right of centerline
        const len = modelHeight / 2;
        const pLeft: Point = { x: edgePoint.point.x - len * nx, y: edgePoint.point.y - len * ny };
        const pRight: Point = { x: edgePoint.point.x + len * nx, y: edgePoint.point.y + len * ny };

        matchLines.push({
          id: `match-${alignmentId}-${idx}`,
          station: stationEnd,
          cutLine: [pLeft, pRight],
          label: `MATCH LINE STA ${Math.round(stationEnd)}`,
        });
      }
    }

    station += stepDistance;
    idx++;

    // Prevent infinite loop on edge cases
    if (stepDistance <= 0.01) break;
  }

  return {
    id: `vfg-${alignmentId}`,
    name: `View Frame Group - ${resolved.name}`,
    alignmentId,
    frames,
    matchLines,
  };
}

/** Creates a Sheet Set (DrawingSet) from a View Frame Group. */
export function createSheetSetFromFrames(
  group: ViewFrameGroup,
  drawingSetName: string,
): DrawingSet {
  const sheets: Sheet[] = group.frames.map((frame, i) => {
    const seq = i + 1;
    return {
      id: `sheet-${frame.id}`,
      number: {
        discipline: "C",
        type: 1, // 1-plans type digit in NCS
        sequence: seq,
      },
      title: `ROAD PLAN SHEET - PART ${seq}`,
      size: "arch-d", // Standard template layout size
      orientation: "landscape",
      scaleId: "1:500", // standard scale ID
      discipline: "C",
      viewportIds: [frame.id],
      revisions: [],
    };
  });

  return {
    id: `set-${group.id}`,
    name: drawingSetName,
    sheets,
    titleBlockDefaults: {
      projectName: "BLUEPRINT CORRIDOR PLAN",
      date: new Date().toLocaleDateString(),
      drawnBy: "Thoth AI",
    },
  };
}
