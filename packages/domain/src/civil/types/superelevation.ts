export interface SuperelevationStation {
  station: number;
  leftSlope: number; // e.g. -0.02 (2% normal crown) or +0.06 (6% full super)
  rightSlope: number;
  description?: string; // e.g. "Normal Crown", "Level Crown", "Full Super"
}

export interface SuperelevationCurve {
  id: string;
  name: string;
  alignmentId: string;
  eMax: number; // Max rate (e.g. 0.06 for 6%)
  stations: SuperelevationStation[];
}
