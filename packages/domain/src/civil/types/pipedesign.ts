import type { Point } from "../../spatial/geometry";

export type PipeMaterial = "concrete" | "pvc" | "hdpe" | "ductile_iron";

export interface PipeNode {
  id: string;
  name: string;
  kind: "manhole" | "catch_basin" | "outfall" | "junction";
  position: Point;
  rimElevation: number;
  invertElevation: number;
  sumpDepth?: number;
}

export interface PipeSegment {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  diameter: number; // inches
  material: PipeMaterial;
  nManning: number;
  startInvert: number;
  endInvert: number;
}

export interface PipeNetwork {
  id: string;
  name: string;
  kind: "storm" | "sanitary";
  nodes: PipeNode[];
  pipes: PipeSegment[];
}

export interface PipeCheckViolation {
  elementId: string;
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface PipeNetworkAnalysisReport {
  networkId: string;
  violations: PipeCheckViolation[];
  totalLength: number;
  pipeCount: number;
  structureCount: number;
}
