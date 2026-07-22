import type { Point2D } from '../../survey/transparentCommands';
import type { Point3D } from './grading';

export interface ImportScriptContext {
  externalId: string;
  rawDesc: string;
  trunkDiameterInches?: number;
}

export interface BlockExtractionCSVRow {
  blockName: string;
  position: Point3D;
  attributes: Record<string, any>;
}

export interface Placed3DModel {
  id: string;
  modelFileName: string;
  insertionPosition: Point2D;
  elevationFt: number;
  insertionMode: 'center_2d' | 'origin';
  isInteractivePlaced: boolean;
}
