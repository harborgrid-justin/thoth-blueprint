import * as THREE from "three";
import { type Point, type SimulationFrame } from "@thoth/domain";

export class Erosion3DVisualizer {
  private particlesMesh: THREE.Points | null = null;
  private container: THREE.Group;
  private center: Point;
  private exag: number;

  constructor(container: THREE.Group, center: Point, exag: number) {
    this.container = container;
    this.center = center;
    this.exag = exag;
  }

  /**
   * Updates the 3D scene representation with the current simulation frame.
   * Modifies terrain heights dynamically and updates the flowing water particles.
   */
  update(frame: SimulationFrame, terrainMesh: THREE.Mesh | null): void {
    // 1. Update Terrain Geometry Heights (Dynamic Deformation)
    if (terrainMesh && terrainMesh.geometry) {
      const geo = terrainMesh.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;

      if (posAttr && posAttr.count === frame.heights.length) {
        for (let i = 0; i < posAttr.count; i++) {
          const elev = frame.heights[i];
          // In terrainMesh, Y is the elevation (up), X and Z are coordinates
          posAttr.setY(i, elev * this.exag);
        }
        posAttr.needsUpdate = true;
        geo.computeVertexNormals();
      }
    }

    // 2. Render Flowing Water Particles
    const activeParticles = frame.particles.filter((p) => !p.isDead);

    if (activeParticles.length === 0) {
      this.clearParticles();
      return;
    }

    const vertexCount = activeParticles.length;
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);

    activeParticles.forEach((p, idx) => {
      const px = p.position.x - this.center.x;
      const pz = p.position.y - this.center.y;

      // Estimate elevation: query heightfield or linear interpolation
      const py = this.getApproximateElevation(p.position, frame.heights);

      positions[idx * 3] = px;
      positions[idx * 3 + 1] = py * this.exag + 0.15; // slightly offset above ground
      positions[idx * 3 + 2] = pz;

      // Color maps to sediment concentration (clear blue to brown mud)
      const t = Math.min(1.0, p.sediment * 12.0);
      const waterColor = new THREE.Color(0x38bdf8).lerp(new THREE.Color(0x78350f), t); // blue to brown

      colors[idx * 3] = waterColor.r;
      colors[idx * 3 + 1] = waterColor.g;
      colors[idx * 3 + 2] = waterColor.b;
    });

    if (!this.particlesMesh) {
      const pointsGeo = new THREE.BufferGeometry();
      pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      // Nice circular glowing dots for particles
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
      }

      const texture = new THREE.CanvasTexture(canvas);
      const pointsMat = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        map: texture,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

      this.particlesMesh = new THREE.Points(pointsGeo, pointsMat);
      this.container.add(this.particlesMesh);
    } else {
      const pointsGeo = this.particlesMesh.geometry;
      pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      pointsGeo.attributes.position.needsUpdate = true;
      if (pointsGeo.attributes.color) {
        pointsGeo.attributes.color.needsUpdate = true;
      }
    }
  }

  /** Retrieve height value at plan coordinate from simulation heightfield */
  private getApproximateElevation(p: Point, heights: number[]): number {
    const cols = 50; // standard simulated grid dimension
    const rows = 50;
    const cs = 2.0;

    const c = Math.floor(p.x / cs);
    const r = Math.floor(p.y / cs);

    if (c < 0 || c >= cols || r < 0 || r >= rows) {
      return heights[0] || 0;
    }
    return heights[r * cols + c] || 0;
  }

  clearParticles(): void {
    if (this.particlesMesh) {
      this.container.remove(this.particlesMesh);
      if (this.particlesMesh.geometry) {
        this.particlesMesh.geometry.dispose();
      }
      if (Array.isArray(this.particlesMesh.material)) {
        this.particlesMesh.material.forEach((m) => m.dispose());
      } else {
        this.particlesMesh.material.dispose();
      }
      this.particlesMesh = null;
    }
  }

  dispose(): void {
    this.clearParticles();
  }
}
