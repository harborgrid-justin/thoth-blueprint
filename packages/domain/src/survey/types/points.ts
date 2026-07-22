export type CogoPointStyle = 'default' | 'monument' | 'control' | 'tree' | 'utility';

export interface CogoPoint {
  id: string;
  pointNumber: number;
  northing: number;
  easting: number;
  elevation: number;
  rawDescription: string;
  fullDescription?: string;
  layer?: string;
  style?: CogoPointStyle;
}

export interface PointGroupConfig {
  id: string;
  name: string;
  includeNumbers?: number[];
  includeRawDescriptions?: string[];
  points: CogoPoint[];
}
