import type { Point } from "../../spatial/geometry";

export interface RoofGeometryResults {
  pitchAngleRad: number;
  slopeFactor: number;
  planAreaSqm: number;
  trueAreaSqm: number;

  // 2D plan lines
  ridgeLine: Point[];
  hipLines: Point[][];
  valleyLines: Point[][];
  rafterLines: Point[][];
  drainageFlows: Point[][]; // arrow line segments pointing from ridge to eaves
  gutterPaths: Point[][]; // outlines along low eaves
  downspoutAnchors: Point[]; // corner downspout locations

  // Materials & Volumes (REQ-UNIMP-059)
  sheathingVolCuM: number;
  insulationVolCuM: number;
  shingleWeightKg: number;
  timberBoardFeet: number;

  // Ventilation (REQ-UNIMP-060)
  requiredVentAreaSqm: number;
  providedVentAreaSqm: number;
  ventilationWarnings: string[];

  warnings: string[];
}
