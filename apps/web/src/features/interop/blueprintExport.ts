import {
  bounds,
  centroid,
  elevationAt,
  isSpatialElement,
  unionBounds,
  writeCollada,
  type Point,
  type Polygon,
  type SimpleMesh,
  type Site,
} from "@thoth/domain";
import { elementColor } from "@/lib/elementMeta";
import { buildTerrainModel } from "@/features/terrain/terrainModel";
import { downloadBlob, downloadText, slugify } from "./fileIo";

const VERTICAL_EXAGGERATION = 1.6;

// ---------------------------------------------------------------------------
// PNG — a raster snapshot of the 2D plan
// ---------------------------------------------------------------------------

/** Render the plan to a PNG raster and download it. Colors are resolved to hex. */
export async function exportPlanPng(site: Site, options: { maxSize?: number; background?: string } = {}): Promise<void> {
  const maxSize = options.maxSize ?? 2000;
  const spatial = site.elements.filter(isSpatialElement);
  const extent = spatial.length ? unionBounds(spatial.map((e) => bounds(e.boundary))) : null;
  if (!extent) throw new Error("Nothing to export — the plan has no drawn geometry.");

  const pad = 0.06;
  const w = extent.maxX - extent.minX;
  const h = extent.maxY - extent.minY;
  const padX = w * pad;
  const padY = h * pad;
  const worldW = w + padX * 2;
  const worldH = h + padY * 2;
  const scale = maxSize / Math.max(worldW, worldH);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(worldW * scale);
  canvas.height = Math.round(worldH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");

  const project = (p: Point) => ({
    x: (p.x - extent.minX + padX) * scale,
    y: (p.y - extent.minY + padY) * scale,
  });

  ctx.fillStyle = options.background ?? "#f1f5f9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw back-to-front by layer order.
  const layerOrder = new Map(site.layers.map((l) => [l.id, l.order]));
  const ordered = [...spatial].sort(
    (a, b) => (layerOrder.get(a.layerId) ?? 0) - (layerOrder.get(b.layerId) ?? 0),
  );

  for (const el of ordered) {
    const category = el.kind === "landuse" ? el.category : undefined;
    const color = elementColor(el.kind, category);
    ctx.beginPath();
    el.boundary.forEach((pt, i) => {
      const s = project(pt);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.closePath();
    ctx.globalAlpha = el.kind === "building" ? 0.85 : el.kind === "region" ? 0.08 : 0.35;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1, scale * 0.4);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // Networks.
  for (const net of site.networks ?? []) {
    const nodes = new Map(net.nodes.map((n) => [n.id, n.point]));
    ctx.strokeStyle = net.kind === "road" ? "#334155" : "#0ea5e9";
    ctx.lineWidth = Math.max(1.5, scale * 1.2);
    for (const edge of net.edges) {
      const a = nodes.get(edge.from);
      const b = nodes.get(edge.to);
      if (!a || !b) continue;
      const sa = project(a);
      const sb = project(b);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob) downloadBlob(`${slugify(site.name)}.png`, blob);
}

// ---------------------------------------------------------------------------
// COLLADA (.dae) — the plan as a 3D model
// ---------------------------------------------------------------------------

/** Build COLLADA meshes from the site (terrain + extruded buildings) and download. */
export function exportSiteDae(site: Site): void {
  const meshes = siteToMeshes(site);
  if (meshes.length === 0) throw new Error("Nothing to export — add terrain or buildings first.");
  const dae = writeCollada(meshes);
  downloadText(`${slugify(site.name)}.dae`, dae, "model/vnd.collada+xml");
}

/** Convert a site into triangle meshes: the terrain surface and building solids. */
export function siteToMeshes(site: Site): SimpleMesh[] {
  const meshes: SimpleMesh[] = [];
  const terrain = buildTerrainModel(site);
  const exag = VERTICAL_EXAGGERATION;
  const elevAt = (p: Point) => (terrain.existing ? elevationAt(terrain.existing, p) : 0);

  // Terrain surface as a triangulated grid (y-up).
  const grid = terrain.existing;
  if (grid) {
    const positions: number[] = [];
    const indices: number[] = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const i = r * grid.cols + c;
        positions.push(
          grid.origin.x + c * grid.cellSize,
          grid.heights[i] * exag,
          grid.origin.y + r * grid.cellSize,
        );
      }
    }
    for (let r = 0; r < grid.rows - 1; r++) {
      for (let c = 0; c < grid.cols - 1; c++) {
        const a = r * grid.cols + c;
        const b = a + 1;
        const d = a + grid.cols;
        const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
    meshes.push({ name: "Terrain", positions, indices, color: [0.42, 0.48, 0.32] });
  }

  // Buildings as extruded prisms.
  for (const el of site.elements) {
    if (el.kind !== "building") continue;
    const base = elevAt(centroid(el.boundary)) * exag;
    const height = (el.height ?? el.storeys * 3.2) * exag;
    meshes.push(prism(el.name, el.boundary, base, base + height, [0.85, 0.58, 0.35]));
  }

  return meshes;
}

/** A closed extruded prism from a boundary between two heights (y-up). */
function prism(
  name: string,
  boundary: Polygon,
  bottom: number,
  top: number,
  color: [number, number, number],
): SimpleMesh {
  const n = boundary.length;
  const positions: number[] = [];
  const indices: number[] = [];

  // Bottom ring (0..n-1), top ring (n..2n-1).
  for (const p of boundary) positions.push(p.x, bottom, p.y);
  for (const p of boundary) positions.push(p.x, top, p.y);

  // Side walls.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    indices.push(i, j, n + i, j, n + j, n + i);
  }
  // Top cap (fan triangulation — fine for convex-ish footprints).
  for (let i = 1; i < n - 1; i++) indices.push(n, n + i, n + i + 1);
  // Bottom cap (reverse winding).
  for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i);

  return { name, positions, indices, color };
}
