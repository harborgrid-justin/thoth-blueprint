export interface SuperelevationStation {
  station: number;
  leftOuterSlope: number;
  rightOuterSlope: number;
  description?: string;
}

export interface SuperelevationCurve {
  id?: string;
  name?: string;
  alignmentId: string;
  designSpeed?: number;
  eMax: number;
  normalCrown?: number;
  transitionStations: SuperelevationStation[];
  stations?: SuperelevationStation[];
}
