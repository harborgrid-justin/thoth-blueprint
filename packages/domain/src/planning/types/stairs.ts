import type { Point } from "../../spatial/geometry";

export interface StairGeometryResults {
  riserCount: number;
  actualRiserHeight: number;
  treadCount: number;
  actualTreadDepth: number;

  // 3D structural centerlines (left & right stringers) (REQ-UNIMP-021)
  stringerCenterlines: Point[][];

  // 2D annotation symbols (REQ-UNIMP-022, REQ-UNIMP-023, REQ-UNIMP-024)
  breakLine: Point[]; // line representing the 4-ft plan break cut
  arrowPath: Point[]; // directional flow arrow pointing "Down"
  balusterAnchors: Point[]; // anchor mounting coordinates on treads

  // Individual step lines for 2D rendering
  treadLines: Point[][];

  // Material Takeoffs (REQ-UNIMP-025)
  concreteVolumeCuM: number;
  timberBoardFeet: number;

  // Audit warnings (REQ-UNIMP-017, REQ-UNIMP-014)
  warnings: string[];
}
