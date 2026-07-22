import type { Point2D } from '../../survey/transparentCommands';

export interface AreaLabel {
  id: string;
  parcelId: string;
  position: Point2D;
  text: string;
  rotationRad: number;
}

export interface SegmentLabel {
  id: string;
  start: Point2D;
  end: Point2D;
  distanceText: string;
  bearingText: string;
  rotationRad: number;
  isFlippedForReadability: boolean;
}

export interface UDPFieldSchema {
  fieldName: string;
  fieldType: 'string' | 'number' | 'boolean';
  defaultValue: any;
}
