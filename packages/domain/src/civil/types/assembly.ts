export interface SubassemblyParam {
  name: string;
  value: number;
}

export interface Subassembly {
  id: string;
  name: string;
  side: "left" | "right";
  type: "Lane" | "CurbAndGutter" | "Sidewalk" | "Daylight";
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
