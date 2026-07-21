/** Area of cut and fill calculated on a single cross-section in plan units². */
export interface SectionArea {
  station: number;
  cutArea: number;
  fillArea: number;
}

/** Earthwork volume between two stations in plan units³. */
export interface StationVolume {
  startStation: number;
  endStation: number;
  cutVolume: number;
  fillVolume: number;
  netVolume: number; // Cut minus Fill
}

/** Coordinates of a point on the Mass Haul Diagram. */
export interface MassHaulPoint {
  station: number;
  cumulativeVolume: number;
}
