import type { Point2D } from '../../survey/transparentCommands';

export interface ModelBuilderConfig {
  modelName: string;
  boundaryPolygon: Point2D[];
  areaSqKm: number;
  imageryTileLevel: number;
  convertToGrid: boolean;
}

export interface CoverageAreaConfig {
  surfaceName: string;
  boundary: Point2D[];
  forceSurfaceSmoothing: boolean;
}

export interface GISVectorFeature {
  featureId: string;
  featureType: 'polygon' | 'polyline' | 'point';
  attributes: Record<string, any>;
  geometry: Point2D[];
}
