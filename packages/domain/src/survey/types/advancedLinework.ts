import type { Point2D } from './transparentCommands';

export interface SurveyFigureStyle {
  id: string;
  name: string;
  lineColor: string;
  linetype: string;
  layer: string;
}

export interface SurveyFigure {
  id: string;
  name: string;
  vertices: Point2D[];
  isClosed: boolean;
  style: SurveyFigureStyle;
}

export interface LineworkCodeSetRule {
  code: string;
  action: 'begin' | 'end' | 'close' | 'arc_start' | 'arc_end';
}
