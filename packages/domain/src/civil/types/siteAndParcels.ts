import type { Point2D } from '../../survey/transparentCommands';

export interface ParcelStyle {
  id: string;
  name: string;
  boundaryColor: string;
  linetype: string;
  layer: string;
}

export interface ParcelLayoutParameters {
  minimumAreaSqFt: number;
  minimumFrontageFt: number;
  frontageOffsetFt: number;
  minimumWidthFt: number;
  minimumDepthFt: number;
  maximumDepthFt?: number;
  layoutPreference?: 'shortest_frontage' | 'equal_area';
  remainderDistribution: 'last_parcel' | 'redistribute_all';
}

export interface UserDefinedClassificationData {
  zoningDistrict?: string;
  maxImperviousRatio?: number;
  ownerName?: string;
  landUseCode?: string;
  customProperties?: Record<string, string | number>;
}

export interface ParcelObject {
  id: string;
  name: string;
  number: number;
  siteId: string;
  boundaryVertices: Point2D[];
  arcs?: Array<{ vertexIndex: number; radius: number; deltaAngleDeg: number }>;
  style: ParcelStyle;
  areaSqFt: number;
  perimeterFt: number;
  elevationFt?: number;
  address?: string;
  taxId?: string;
  userClassification?: UserDefinedClassificationData;
}

export interface SiteContainer {
  id: string;
  name: string;
  startingParcelNumber: number;
  parcels: ParcelObject[];
  alignments: Array<{ id: string; name: string }>;
  gradingObjects: Array<{ id: string; name: string }>;
  featureLines: Array<{ id: string; name: string }>;
}
