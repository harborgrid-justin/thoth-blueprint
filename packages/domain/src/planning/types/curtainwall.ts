import type { Point } from "../../spatial/geometry";

export interface CurtainWallPanel {
  key: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  width: number;
  height: number;
  material: "glazing" | "brick" | "insulation" | "door" | "window";
  isOverwritten: boolean;
  panePolygons: Point[][];
  clipAnchors: Point[];
}

export interface CurtainWallMullion {
  direction: "vertical" | "horizontal";
  index: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  width: number;
  mullionPolygon: Point[];
}

export interface CurtainWallGeometryResults {
  panels: CurtainWallPanel[];
  mullions: CurtainWallMullion[];
  perimeterFrame: Point[][];
  elevationOutline: Point[];
  structuralTies: Point[];
  warnings: string[];
  overallUFactor: number;
  overallRValue: number;
  inventory: {
    material: string;
    width: number;
    height: number;
    count: number;
  }[];
}
