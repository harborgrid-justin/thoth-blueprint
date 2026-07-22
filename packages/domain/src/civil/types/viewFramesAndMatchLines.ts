import type { Point2D } from '../../survey/transparentCommands';

export interface MatchLine {
  id: string;
  station: number;
  position: Point2D;
  leftMaskPolygon: Point2D[];
  rightMaskPolygon: Point2D[];
}

export interface ViewFrame {
  id: string;
  name: string;
  startStation: number;
  endStation: number;
  bounds: { min: Point2D; max: Point2D };
  viewportScale: number;
  isLocked: boolean;
}

export interface ViewFrameGroupConfig {
  id: string;
  alignmentId: string;
  templateName: string;
  viewFrames: ViewFrame[];
  matchLines: MatchLine[];
}
