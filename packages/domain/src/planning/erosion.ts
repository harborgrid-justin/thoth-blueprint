import type { Site, Point } from "../spatial/types.js";
import type { ElevationGrid } from "../civil/terrain.js";

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

export class ErosionSimulator {
  private site: Site;
  private grid: ElevationGrid;
  private steps: SimulationFrame[] = [];

  // Parameters
  private rainIntensity = 40; // particles per step
  private soilErodibility = 0.055;
  private depositRate = 0.12;
  private gravity = 9.81;

  constructor(site: Site) {
    this.site = site;
    this.grid = (site as any).terrain?.existing || this.makeDefaultGrid();
  }

  private makeDefaultGrid(): ElevationGrid {
    const heights = new Array(2500).fill(10);
    for (let r = 0; r < 50; r++) {
      for (let c = 0; c < 50; c++) {
        heights[r * 50 + c] = 15 - (r / 50) * 8 + Math.sin(c / 5) * 1.5;
      }
    }
    return {
      cols: 50,
      rows: 50,
      cellSize: 2.0,
      origin: { x: 0, y: 0 },
      heights,
    };
  }

  /** Run the simulation for N steps and record timeline frames */
  runSimulation(maxSteps = 100): SimulationFrame[] {
    const cols = this.grid.cols;
    const rows = this.grid.rows;
    const heights = [...this.grid.heights];
    const barrierStats: BarrierStats[] = this.site.elements
      .filter((e) => e.kind === "curtainwall" || (e as any).type === "erosion-bale")
      .map((e) => ({
        id: e.id,
        name: (e as any).name || "Silt Barrier",
        sedimentTrappedKg: 0,
        loadRatio: 0,
      }));

    let totalSoilLostKg = 0;
    let totalWaterRunoffLiters = 0;
    this.steps = [];

    for (let s = 0; s < maxSteps; s++) {
      const activeParticles: ErosionParticle[] = [];

      // 1. Generate new rain particles (hydrology)
      for (let p = 0; p < this.rainIntensity; p++) {
        const x = this.grid.origin.x + Math.random() * (cols - 1) * this.grid.cellSize;
        const y = this.grid.origin.y + Math.random() * (rows - 1) * this.grid.cellSize;
        activeParticles.push({
          id: `p-${s}-${p}`,
          position: { x, y },
          velocity: { x: 0, y: 0 },
          waterVolume: 1.0, // Liters
          sediment: 0.0,
          isDead: false,
        });
        totalWaterRunoffLiters += 1.0;
      }

      // 2. Move particles and apply erosion math
      activeParticles.forEach((part) => {
        let life = 30; // maximum travel steps
        while (life > 0 && !part.isDead) {
          life--;

          // Compute terrain normal gradient at current position
          const grad = this.getGradientAt(part.position, heights);
          if (Math.hypot(grad.x, grad.y) < 1e-4) {
            part.isDead = true;
            break;
          }

          // Update velocity based on gravity slope direction
          part.velocity.x = part.velocity.x * 0.5 - grad.x * this.gravity * 0.1;
          part.velocity.y = part.velocity.y * 0.5 - grad.y * this.gravity * 0.1;

          // Compute next potential coordinate position
          const nextPt = {
            x: part.position.x + part.velocity.x * 0.2,
            y: part.position.y + part.velocity.y * 0.2,
          };

          // Check barrier intersections (silt fences, straw bales)
          const barrierHit = this.checkBarrierIntersection(part.position, nextPt);
          if (barrierHit) {
            // Trap sediment in barrier
            const stat = barrierStats.find((b) => b.id === barrierHit.id);
            if (stat) {
              const trapped = part.sediment * 0.85; // 85% trapping efficiency
              stat.sedimentTrappedKg += trapped;
              stat.loadRatio = Math.min(1.0, stat.sedimentTrappedKg / 100.0); // max 100kg capacity
              part.sediment -= trapped;
            }

            // Stop/deflect particle
            part.velocity = { x: 0, y: 0 };
            part.isDead = true;
            break;
          }

          // Check boundary limits
          if (
            nextPt.x < this.grid.origin.x ||
            nextPt.x >= this.grid.origin.x + (cols - 1) * this.grid.cellSize ||
            nextPt.y < this.grid.origin.y ||
            nextPt.y >= this.grid.origin.y + (rows - 1) * this.grid.cellSize
          ) {
            // Particle washes off-site
            totalSoilLostKg += part.sediment;
            part.isDead = true;
            break;
          }

          // Perform erosion & deposition math (based on sediment capacity)
          const speed = Math.hypot(part.velocity.x, part.velocity.y);
          const capacity = Math.max(0.01, speed * part.waterVolume * 0.15);

          const cellIndex = this.getCellIndex(part.position);

          if (part.sediment < capacity) {
            // ERODE terrain: lift soil
            const erodeAmt = (capacity - part.sediment) * this.soilErodibility;
            heights[cellIndex] -= erodeAmt;
            part.sediment += erodeAmt;
          } else {
            // DEPOSIT sediment: build terrain
            const depositAmt = (part.sediment - capacity) * this.depositRate;
            heights[cellIndex] += depositAmt;
            part.sediment -= depositAmt;
          }

          // Advance position
          part.position = nextPt;
          part.waterVolume *= 0.98; // evaporation / absorption loss
          if (part.waterVolume < 0.05) {
            part.isDead = true;
          }
        }
      });

      // Save frame snapshot
      this.steps.push({
        step: s,
        heights: [...heights],
        particles: activeParticles.map((p) => ({ ...p, position: { ...p.position }, velocity: { ...p.velocity } })),
        barrierStats: barrierStats.map((b) => ({ ...b })),
        totalSoilLostKg,
        totalWaterRunoffLiters,
      });
    }

    return this.steps;
  }

  private getCellIndex(p: Point): number {
    const c = Math.floor((p.x - this.grid.origin.x) / this.grid.cellSize);
    const r = Math.floor((p.y - this.grid.origin.y) / this.grid.cellSize);
    const cols = this.grid.cols;
    return Math.max(0, Math.min(heightsCount(this.grid) - 1, r * cols + c));
  }

  private getGradientAt(p: Point, heights: number[]): Point {
    const cols = this.grid.cols;
    const rows = this.grid.rows;
    const cs = this.grid.cellSize;

    const c = Math.floor((p.x - this.grid.origin.x) / cs);
    const r = Math.floor((p.y - this.grid.origin.y) / cs);

    if (c <= 0 || c >= cols - 1 || r <= 0 || r >= rows - 1) {
      return { x: 0, y: 0 };
    }

    // Finite differences
    const hL = heights[r * cols + (c - 1)] || 0;
    const hR = heights[r * cols + (c + 1)] || 0;
    const hD = heights[(r - 1) * cols + c] || 0;
    const hU = heights[(r + 1) * cols + c] || 0;

    return {
      x: (hR - hL) / (2 * cs),
      y: (hU - hD) / (2 * cs),
    };
  }

  /** Checks if segment (from -> to) intersects with any erosion barriers */
  private checkBarrierIntersection(from: Point, to: Point): { id: string } | null {
    const ccw = (A: Point, B: Point, C: Point) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (B.x - A.x);

    for (const el of this.site.elements) {
      if (el.kind === "curtainwall" && el.boundary && el.boundary.length >= 2) {
        for (let i = 0; i < el.boundary.length - 1; i++) {
          const b1 = el.boundary[i];
          const b2 = el.boundary[i + 1];
          // Check segment intersection
          const intersect = ccw(from, b1, b2) !== ccw(to, b1, b2) && ccw(from, to, b1) !== ccw(from, to, b2);
          if (intersect) {
            return { id: el.id };
          }
        }
      } else if ((el as any).type === "erosion-bale") {
        const pos = (el as any).position;
        if (pos) {
          const dx = to.x - pos.x;
          const dy = to.y - pos.y;
          if (Math.hypot(dx, dy) < 1.5) {
            return { id: el.id };
          }
        }
      }
    }
    return null;
  }
}

function heightsCount(grid: ElevationGrid): number {
  return grid.cols * grid.rows;
}
