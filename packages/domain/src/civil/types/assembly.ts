export interface SubassemblyParam {
  name: string;
  value: number;
}

export type SubassemblyType =
  | "Lane"
  | "CurbAndGutter"
  | "Sidewalk"
  | "Daylight"
  | "Median"
  | "ConditionalCutOrFill"
  | "RetainingWall"
  | "DaylightBench"
  | "LinkWidthAndSlope"
  | "LinkSlopeToSurface"
  | "SubassemblyTransition";

export interface Subassembly {
  id: string;
  name: string;
  side: "left" | "right";
  type: SubassemblyType;
  parameters: SubassemblyParam[];
}

export interface Assembly {
  id: string;
  name: string;
  leftSubassemblies: Subassembly[];
  rightSubassemblies: Subassembly[];
}

export interface AssemblyPoint {
  code: string;
  x: number;
  y: number;
}

