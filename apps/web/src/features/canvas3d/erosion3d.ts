import * as THREE from "three";
import _ from "lodash";
import { length, type Point, type SimulationFrame, elevationAt } from "@thoth/domain";

/** Grid dimensions passed from the terrain model so the elevation lookup is accurate. */
export interface ErosionGridConfig {
  cols: number;
  rows: number;
  cellSize: number;
  /** World-space origin of the grid (plan coordinates, not centered). */
  origin: Point;
}

/**
 * Default grid configuration matching the ErosionSimulator's internal default
 * grid so the visualizer still works when no terrain is present.
 */
const DEFAULT_GRID: ErosionGridConfig = {
  cols: 50,
  rows: 50,
  cellSize: 2.0,
  origin: { x: 0, y: 0 },
};

// Scratch Color objects reused every frame to avoid per-particle GC pressure.
// These are only used inside update() which runs synchronously.
const _fastColor = new THREE.Color(0x7df9ff); // electric cyan
const _slowColor = new THREE.Color(0x1a6ebd); // deep blue
const _mudColor  = new THREE.Color(0x78350f); // earth brown
const _scratch   = new THREE.Color();

/** Build a 64×64 radial gradient canvas texture for a glowing water droplet. */
function buildParticleSprite(): THREE.CanvasTexture {
  const SIZE = 64;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const half = SIZE / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, "rgba(255,255,255,1.0)");
  grad.addColorStop(0.3, "rgba(200,230,255,0.85)");
  grad.addColorStop(0.65, "rgba(80,160,255,0.35)");
  grad.addColorStop(1.0, "rgba(0,80,200,0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return new THREE.CanvasTexture(canvas);
}

export class Erosion3DVisualizer {
  private particlesMesh: THREE.Points | null = null;
  private container: THREE.Group;
  private center: Point;
  private exag: number;
  private grid: ErosionGridConfig;

  /** Initial heights snapshot captured on the first update — used for the heatmap. */
  private baseHeights: number[] | null = null;
  /** Original terrain vertex colors cached to restore them on clearParticles. */
  private originalTerrainColors: Float32Array | null = null;
  /** Direct ref to the terrain mesh — avoids container.traverse() in clearParticles. */
  private terrainMeshRef: THREE.Mesh | null = null;

  /**
   * Typed-array pool: reused every frame to avoid Float32Array GC churn.
   * Grown lazily if particle count increases.
   */
  private _positions: Float32Array = new Float32Array(0);
  private _colors: Float32Array = new Float32Array(0);
  private _sizes: Float32Array = new Float32Array(0);

  constructor(
    container: THREE.Group,
    center: Point,
    exag: number,
    grid?: ErosionGridConfig,
  ) {
    this.container = container;
    this.center = center;
    this.exag = exag;
    this.grid = grid ?? DEFAULT_GRID;
  }

  /**
   * Updates the 3D scene representation with the current simulation frame.
   *
   * 1. Deforms the terrain heightfield mesh to match the eroded heights.
   * 2. Overlays an erosion/deposition heatmap on the terrain vertex colors:
   *    red = net erosion, blue = net deposition, grey = unchanged.
   * 3. Renders flowing water particles with:
   *    - Additive blending for a natural luminous glow.
   *    - Per-particle size driven by water volume (large = full volume, tiny = nearly dry).
   *    - Color mixed from sediment concentration AND flow speed.
   */
  update(frame: SimulationFrame, terrainMesh: THREE.Mesh | null): void {
    // 1. Update Terrain Geometry Heights (Dynamic Deformation) & Heatmap
    if (terrainMesh && terrainMesh.geometry) {
      const geo = terrainMesh.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;

      if (posAttr && posAttr.count === frame.heights.length) {
        // Capture baseline on first frame for heatmap delta
        if (!this.baseHeights) {
          this.baseHeights = [...frame.heights];
        }

        // Cache original terrain vertex colors for restoration later
        const colorAttr = geo.attributes.color as THREE.BufferAttribute | undefined;
        if (colorAttr && !this.originalTerrainColors) {
          this.originalTerrainColors = new Float32Array(colorAttr.array);
        }

        for (let i = 0; i < posAttr.count; i++) {
          const elev = frame.heights[i]!;
          posAttr.setY(i, elev * this.exag);

          // Heatmap: diff from baseline
          if (colorAttr && this.baseHeights) {
            const delta = elev - this.baseHeights[i]!;
            const heatColor = deltaToHeatmapColor(delta);
            colorAttr.setXYZ(i, heatColor.r, heatColor.g, heatColor.b);
          }
        }

        posAttr.needsUpdate = true;
        if (colorAttr) {colorAttr.needsUpdate = true;}
        geo.computeVertexNormals();
      }
    }

    // 2. Render Flowing Water Particles
    const activeParticles = frame.particles.filter((p) => !p.isDead);

    if (activeParticles.length === 0) {
      this.clearParticles();
      return;
    }

    // Store terrain mesh ref on first update for use in clearParticles
    if (terrainMesh && !this.terrainMeshRef) {
      this.terrainMeshRef = terrainMesh;
    }

    const vertexCount = activeParticles.length;

    // Grow typed-array pool only when particle count increases — reuse otherwise.
    if (vertexCount * 3 > this._positions.length) {
      this._positions = new Float32Array(vertexCount * 3);
      this._colors    = new Float32Array(vertexCount * 3);
      this._sizes     = new Float32Array(vertexCount);
    }
    const positions = this._positions;
    const colors    = this._colors;
    const sizes     = this._sizes;

    activeParticles.forEach((p, idx) => {
      const px = p.position.x - this.center.x;
      const pz = p.position.y - this.center.y;
      const py = this.getElevation(p.position, frame.heights);

      positions[idx * 3] = px;
      positions[idx * 3 + 1] = py * this.exag + 0.18; // slightly above ground
      positions[idx * 3 + 2] = pz;

      // Size: map water volume [0,1] → size [0.25, 1.4]
      sizes[idx] = 0.25 + Math.min(1.0, p.waterVolume) * 1.15;

      // Color: blend based on sediment (brown tint) + flow speed (cyan brightness).
      // Uses module-level scratch Color objects — no heap allocation per particle.
      const speed = length(p.velocity);
      const sedimentT = Math.min(1.0, p.sediment * 12.0);
      const speedT    = Math.min(1.0, speed * 2.5);

      // fast/clear=electric cyan → slow/deep=deep blue, then mud tint
      _scratch.copy(_fastColor).lerp(_slowColor, 1 - speedT);
      _scratch.lerp(_mudColor, sedimentT * 0.75);

      colors[idx * 3]     = _scratch.r;
      colors[idx * 3 + 1] = _scratch.g;
      colors[idx * 3 + 2] = _scratch.b;
    });

    if (!this.particlesMesh) {
      const pointsGeo = new THREE.BufferGeometry();
      pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      pointsGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      const sprite = buildParticleSprite();
      const pointsMat = new THREE.PointsMaterial({
        size: 1.0,
        vertexColors: true,
        map: sprite,
        transparent: true,
        // Additive blending: overlapping particles accumulate brightness, creating
        // a luminous water-flow glow effect (standard for fire/water particle FX).
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      this.particlesMesh = new THREE.Points(pointsGeo, pointsMat);
      this.container.add(this.particlesMesh);
    } else {
      const pointsGeo = this.particlesMesh.geometry;
      pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      pointsGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      pointsGeo.attributes.position.needsUpdate = true;
      if (pointsGeo.attributes.color) {pointsGeo.attributes.color.needsUpdate = true;}
      if (pointsGeo.attributes.size) {pointsGeo.attributes.size.needsUpdate = true;}
    }
  }

  private getElevation(p: Point, heights: number[]): number {
    return elevationAt(
      {
        origin: this.grid.origin,
        cellSize: this.grid.cellSize,
        cols: this.grid.cols,
        rows: this.grid.rows,
        heights,
      },
      p,
    );
  }

  clearParticles(): void {
    // Restore original terrain vertex colors using the stored mesh ref.
    if (this.originalTerrainColors && this.terrainMeshRef) {
      const colorAttr = this.terrainMeshRef.geometry.attributes.color as THREE.BufferAttribute | undefined;
      if (colorAttr && colorAttr.array.length === this.originalTerrainColors.length) {
        colorAttr.set(this.originalTerrainColors);
        colorAttr.needsUpdate = true;
      }
    }

    if (this.particlesMesh) {
      this.container.remove(this.particlesMesh);
      if (this.particlesMesh.geometry) {
        this.particlesMesh.geometry.dispose();
      }
      const mat = this.particlesMesh.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => {
          if ((m as THREE.PointsMaterial).map) {(m as THREE.PointsMaterial).map!.dispose();}
          m.dispose();
        });
      } else {
        if ((mat as THREE.PointsMaterial).map) {(mat as THREE.PointsMaterial).map!.dispose();}
        mat.dispose();
      }
      this.particlesMesh = null;
    }

    this.baseHeights = null;
    this.originalTerrainColors = null;
    this.terrainMeshRef = null;
  }

  dispose(): void {
    this.clearParticles();
  }
}

// --- Heatmap helper ---------------------------------------------------------

/**
 * Map an elevation delta (metres) to a colour for the terrain heatmap overlay.
 *
 *  delta < 0  → erosion  → red family  (deeper = more saturated)
 *  delta ≈ 0  → neutral  → light grey
 *  delta > 0  → deposit  → blue family (deeper = more saturated)
 */
function deltaToHeatmapColor(delta: number): THREE.Color {
  const neutral = new THREE.Color(0x9ea3a8);

  if (Math.abs(delta) < 0.001) {
    return neutral.clone();
  }

  if (delta < 0) {
    // Erosion: grey → saturated red
    const t = Math.min(1.0, Math.abs(delta) / 0.4);
    return neutral.clone().lerp(new THREE.Color(0xe53e3e), t);
  }

  // Deposition: grey → vivid blue
  const t = Math.min(1.0, delta / 0.3);
  return neutral.clone().lerp(new THREE.Color(0x3182ce), t);
}
