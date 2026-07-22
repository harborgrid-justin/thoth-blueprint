/**
 * Domain module implementing REQ-081 through REQ-088 (Cross Sections & Sample Line Groups).
 */

import type { Point2D } from '../survey/transparentCommands';
import type { SheetSet } from './sheetsAndDataRefs';

export interface CivilSampleLine {
  id: string;
  name: string;
  station: number;
  leftSwathWidthFt: number;
  rightSwathWidthFt: number;
  centerPoint: Point2D;
}

export interface CivilSampleLineGroup {
  id: string;
  name: string;
  alignmentId: string;
  sampleLines: CivilSampleLine[];
  tangentIncrementFt: number;
  curveIncrementFt: number;
  spiralIncrementFt: number;
}

export type SectionPlotArrayOrder = 'by_rows' | 'by_columns';
export type SectionPlotStartingCorner = 'upper_left' | 'upper_right' | 'lower_left' | 'lower_right';

export interface GroupPlotStyle {
  id: string;
  name: string;
  plotLayout: SectionPlotArrayOrder; // REQ-155, REQ-156
  startingCorner?: SectionPlotStartingCorner; // REQ-158
  bufferSpaceFt: number; // REQ-160
  columnSpacingFt?: number; // REQ-159
  rowSpacingFt?: number; // REQ-159
  maxColumns: number;
  alignCenterline?: boolean; // REQ-157
  isDraftMode?: boolean; // REQ-154: Draft mode in model space grid
}

export interface CivilSectionView {
  id: string;
  sampleLineId: string;
  station: number;
  elevationMin: number;
  elevationMax: number;
  offsetMin: number;
  offsetMax: number;
  gridRow: number;
  gridColumn: number;
  modelSpacePosition?: { x: number; y: number };
}

export class SampleLineEngine {
  /**
   * REQ-081, REQ-082, REQ-083: Sample Lines along alignment by station ranges & swath widths.
   */
  public createSampleLineGroup(
    name: string,
    alignmentId: string,
    stationStart: number,
    stationEnd: number,
    leftSwathWidthFt: number = 50,
    rightSwathWidthFt: number = 50,
    tangentIncrementFt: number = 50,
    curveIncrementFt: number = 25,
    spiralIncrementFt: number = 25
  ): CivilSampleLineGroup {
    const sampleLines: CivilSampleLine[] = [];
    let currentStation = stationStart;
    let index = 1;

    while (currentStation <= stationEnd) {
      const centerPt: Point2D = {
        x: currentStation * 0.95,
        y: currentStation * 0.1,
      };

      sampleLines.push({
        id: `sl-${index}`,
        name: `SL - ${currentStation.toFixed(0)}`,
        station: currentStation,
        leftSwathWidthFt,
        rightSwathWidthFt,
        centerPoint: centerPt,
      });

      index++;
      currentStation += tangentIncrementFt;
    }

    return {
      id: `slg-${Date.now()}`,
      name,
      alignmentId,
      sampleLines,
      tangentIncrementFt,
      curveIncrementFt,
      spiralIncrementFt,
    };
  }

  /**
   * REQ-084, REQ-085, REQ-086, REQ-087: Create Multiple Section Views wizard in model space.
   */
  public createMultipleSectionViews(
    sampleLineGroup: CivilSampleLineGroup,
    templateContainsSectionViewport: boolean = true,
    groupPlotStyle?: GroupPlotStyle,
    customOffsetRange?: { min: number; max: number },
    customElevationRange?: { min: number; max: number }
  ): CivilSectionView[] {
    if (!templateContainsSectionViewport && !groupPlotStyle?.isDraftMode) {
      throw new Error('REQ-085 Prerequisite Violation: Layout template must contain a Section-type viewport for section sheet generation.');
    }

    const plotStyle: GroupPlotStyle = groupPlotStyle || {
      id: 'gps-std',
      name: 'Standard Grid',
      plotLayout: 'by_rows',
      startingCorner: 'upper_left',
      bufferSpaceFt: 20,
      columnSpacingFt: 100,
      rowSpacingFt: 80,
      maxColumns: 4,
      alignCenterline: true,
      isDraftMode: false,
    };

    const views: CivilSectionView[] = [];
    const colSpacing = (plotStyle.columnSpacingFt || 100) + plotStyle.bufferSpaceFt;
    const rowSpacing = (plotStyle.rowSpacingFt || 80) + plotStyle.bufferSpaceFt;

    sampleLineGroup.sampleLines.forEach((sl, idx) => {
      let row = 0;
      let col = 0;

      if (plotStyle.plotLayout === 'by_rows') {
        row = Math.floor(idx / plotStyle.maxColumns);
        col = idx % plotStyle.maxColumns;
      } else {
        col = Math.floor(idx / plotStyle.maxColumns);
        row = idx % plotStyle.maxColumns;
      }

      // Starting corner coordinate adjustment (REQ-158)
      let posX = col * colSpacing;
      let posY = -row * rowSpacing;

      if (plotStyle.startingCorner === 'upper_right') posX = -col * colSpacing;
      if (plotStyle.startingCorner === 'lower_left') posY = row * rowSpacing;

      views.push({
        id: `secview-${sl.id}`,
        sampleLineId: sl.id,
        station: sl.station,
        elevationMin: customElevationRange?.min ?? 100,
        elevationMax: customElevationRange?.max ?? 150,
        offsetMin: customOffsetRange?.min ?? -sl.leftSwathWidthFt,
        offsetMax: customOffsetRange?.max ?? sl.rightSwathWidthFt,
        gridRow: row,
        gridColumn: col,
        modelSpacePosition: { x: posX, y: posY },
      });
    });

    return views;
  }

  /**
   * REQ-088: Convert section view arrays into paper space plot layouts integrated with Sheet Sets.
   */
  public createSectionSheets(views: CivilSectionView[], sheetSetName: string = 'CrossSections.dst'): SheetSet {
    const sheetCount = Math.ceil(views.length / 6);
    const sheets = Array.from({ length: sheetCount }, (_, i) => ({
      id: `sec-sheet-${i + 1}`,
      name: `Sec Sheet ${i + 1}`,
      dwgFileName: `CrossSections_${i + 1}.dwg`,
      viewFrameId: `vf-sec-${i + 1}`,
      northArrowRotationDeg: 0,
      viewAlignment: 'center' as const,
    }));

    return {
      id: `ss-sec-${Date.now()}`,
      filePath: sheetSetName,
      name: sheetSetName,
      sheets,
      isOpenInPalette: true,
    };
  }
}
