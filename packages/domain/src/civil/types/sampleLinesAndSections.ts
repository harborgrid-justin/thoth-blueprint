import type { Point2D } from '../../survey/transparentCommands';

export type SectionPlotArrayOrder = 'by_rows' | 'by_columns';
export type SectionPlotStartingCorner = 'upper_left' | 'upper_right' | 'lower_left' | 'lower_right';

export interface GroupPlotStyle {
  id: string;
  name: string;
  plotLayout: SectionPlotArrayOrder;
  startingCorner: SectionPlotStartingCorner;
  bufferSpaceFt: number;
  columnSpacingFt: number;
  rowSpacingFt: number;
  maxColumns: number;
  alignCenterline: boolean;
  isDraftMode: boolean;
}

export interface CivilSectionView {
  id: string;
  station: number;
  leftOffsetFt: number;
  rightOffsetFt: number;
  gridRow: number;
  gridColumn: number;
  modelSpacePosition: Point2D;
}

export interface SampleLineGroupConfig {
  id: string;
  name: string;
  alignmentId: string;
  sampleLines: { station: number; leftWidth: number; rightWidth: number }[];
}
