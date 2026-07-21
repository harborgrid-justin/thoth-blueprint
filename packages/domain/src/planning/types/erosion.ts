import type { Point } from "../../spatial/geometry";

export interface ErosionParticle {
  id: string;
  position: Point;
  velocity: Point;
  waterVolume: number;
  sediment: number;
  isDead: boolean;
}

export interface BarrierStats {
  id: string;
  name: string;
  sedimentTrappedKg: number;
  loadRatio: number; // 0 to 1 capacity
}

export interface SimulationFrame {
  step: number;
  heights: number[]; // terrain heightfield values
  particles: ErosionParticle[]; // active flow particles
  barrierStats: BarrierStats[];
  totalSoilLostKg: number;
  totalWaterRunoffLiters: number;
}
