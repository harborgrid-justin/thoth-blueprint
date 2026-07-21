import type { Point } from "../../spatial/geometry";

export interface DoorGeometryResults {
  swingPath: Point[];
  doorPanelPolygon: Point[];
  sillPolygon: Point[];
  thresholdPolygon: Point[];
  hardwareAnchor: Point;
  warnings: string[];
}

export interface WindowGeometryResults {
  glazingPolygons: Point[][];
  sillPolygon: Point[];
  sashPolygons: Point[][];
  warnings: string[];
}

export interface UnitScheduleItem {
  id: string;
  kind: "door" | "window";
  name: string;
  type: string;
  width: number;
  height: number;
  hardware: string;
  fireRating: string;
  stcRating: number;
  stc?: number;
  safety: string;
}

export type UnitSchedule = UnitScheduleItem[] & {
  doors: UnitScheduleItem[];
  windows: UnitScheduleItem[];
};
