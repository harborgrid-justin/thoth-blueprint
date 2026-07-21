import type { Point } from "../../spatial/geometry";
import type { CrossSection } from "./profile";

export interface SampleLine {
  id: string;
  station: number;
  swathLeft: number;
  swathRight: number;
  centerPoint: Point;
}

export interface SampleLineGroup {
  id: string;
  name: string;
  alignmentId: string;
  sampleLines: SampleLine[];
}

export interface EarthworkVolumeItem {
  station: number;
  cutAreaSqFt: number;
  fillAreaSqFt: number;
  cutVolumeCuYd: number;
  fillVolumeCuYd: number;
  netVolumeCuYd: number;
  cumulativeCutCuYd: number;
  cumulativeFillCuYd: number;
  cumulativeNetCuYd: number;
}

export interface QTOVolumeSummary {
  alignmentId: string;
  items: EarthworkVolumeItem[];
  totalCutCuYd: number;
  totalFillCuYd: number;
  totalNetCuYd: number;
}

export interface SectionView {
  station: number;
  sampleLineId: string;
  crossSection: CrossSection;
  minElevation: number;
  maxElevation: number;
}
