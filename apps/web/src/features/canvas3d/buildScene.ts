import * as THREE from "three";
import {
  boundsCenter,
  elevationAt,
  isPointElement,
  isSpatialElement,
  type Bounds,
  type ElevationGrid,
  type Point,
  type Polygon,
  type Site,
} from "@thoth/domain";
import { elementColor } from "@/lib/elementMeta";
import { buildTerrainModel, siteExtent } from "@/features/terrain/terrainModel";

/**
 * Coordinate mapping from plan space to the three.js scene:
 *   three.x = planX − centerX
 *   three.z = planY − centerY
 *   three.y = elevation × exaggeration   (up)
 * The whole plan is centered on the origin so the camera math stays well-scaled.
 */
export interface SceneResult {
  group: THREE.Group;
  center: Point;
  extent: Bounds;
  radius: number;
  /** Height of the terrain at the plan center (for camera targeting). */
  baseElevation: number;
  exaggeration: number;
  dispose: () => void;
}

const VERTICAL_EXAGGERATION = 1.6;
const DRAPE_OFFSET = 0.6;

export function buildScene(site: Site): SceneResult | null {
  const extent = siteExtent(site);
  if (!extent) return null;

  const terrain = buildTerrainModel(site);
  const center = boundsCenter(extent);
  const exag = VERTICAL_EXAGGERATION;
  const disposables: Array<{ dispose: () => void }> = [];

  const group = new THREE.Group();

  const tx = (p: Point) => p.x - center.x;
  const tz = (p: Point) => p.y - center.y;
  const elevAt = (p: Point): number =>
    terrain.existing ? elevationAt(terrain.existing, p) : 0;

  // --- Ground surface ------------------------------------------------------
  const surface = terrain.existing;
  if (surface) {
    const mesh = terrainMesh(surface, center, exag, disposables);
    group.add(mesh);
  } else {
    const geo = new THREE.PlaneGeometry(
      extent.maxX - extent.minX,
      extent.maxY - extent.minY,
    );
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2f4a2f, roughness: 1 });
    disposables.push(geo, mat);
    group.add(new THREE.Mesh(geo, mat));
  }

  // --- Spatial elements ----------------------------------------------------
  // Draw order by kind so buildings sit on top of draped areas.
  const draped: Array<{ boundary: Polygon; color: number; opacity: number; lift: number }> = [];
  const buildings: THREE.Object3D[] = [];

  for (const el of site.elements) {
    if (isPointElement(el)) {
      if (el.kind === "tree") {
        group.add(treeObject(el.position, el.canopyRadius, elevAt(el.position) * exag, tx, tz, disposables));
      }
      continue;
    }
    if (!isSpatialElement(el)) continue;

    if (el.kind === "building") {
      const height = (el.height ?? el.storeys * 3.2) * exag;
      const base = elevAt(centroidOf(el.boundary)) * exag;
      buildings.push(
        extrudedBuilding(el.boundary, center, base, height, disposables),
      );
      continue;
    }

    const category = el.kind === "landuse" ? el.category : undefined;
    const color = new THREE.Color(elementColor(el.kind, category)).getHex();
    const opacity =
      el.kind === "water" ? 0.85 : el.kind === "region" ? 0.12 : el.kind === "grade" ? 0.5 : 0.55;
    const lift = el.kind === "water" ? -0.4 : el.kind === "region" ? 0.1 : DRAPE_OFFSET;
    draped.push({ boundary: el.boundary, color, opacity, lift });
  }

  // Draped polygons, ordered so subtle regions render first.
  draped
    .sort((a, b) => b.opacity - a.opacity)
    .forEach(({ boundary, color, opacity, lift }) => {
      const y = elevAt(centroidOf(boundary)) * exag + lift;
      group.add(drapedPolygon(boundary, center, y, color, opacity, disposables));
    });

  buildings.forEach((b) => group.add(b));

  // --- Networks (roads / utilities) ---------------------------------------
  for (const net of site.networks ?? []) {
    const nodes = new Map(net.nodes.map((n) => [n.id, n.point]));
    const color = net.kind === "road" ? 0x1e293b : 0x0ea5e9;
    for (const edge of net.edges) {
      const a = nodes.get(edge.from);
      const b = nodes.get(edge.to);
      if (!a || !b) continue;
      group.add(networkEdge(a, b, center, elevAt, exag, color, edge.width ?? 6, net.kind === "road", disposables));
    }
  }

  const dx = extent.maxX - extent.minX;
  const dz = extent.maxY - extent.minY;
  const radius = Math.max(dx, dz) * 0.75;

  return {
    group,
    center,
    extent,
    radius,
    baseElevation: elevAt(center) * exag,
    exaggeration: exag,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

// ---------------------------------------------------------------------------

function terrainMesh(
  grid: ElevationGrid,
  center: Point,
  exag: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Mesh {
  const { cols, rows } = grid;
  const geo = new THREE.PlaneGeometry(1, 1, cols - 1, rows - 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(cols * rows * 3);

  let min = Infinity;
  let max = -Infinity;
  for (const h of grid.heights) {
    if (h < min) min = h;
    if (h > max) max = h;
  }
  const span = Math.max(1e-6, max - min);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const worldX = grid.origin.x + c * grid.cellSize;
      const worldY = grid.origin.y + r * grid.cellSize;
      const elev = grid.heights[i];
      pos.setXYZ(i, worldX - center.x, elev * exag, worldY - center.y);
      const col = terrainColor((elev - min) / span);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false });
  disposables.push(geo, mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function terrainColor(t: number): THREE.Color {
  // low = green lowland, mid = tan, high = brown/grey ridge.
  const low = new THREE.Color(0x4b7a43);
  const mid = new THREE.Color(0xb8a06a);
  const high = new THREE.Color(0x8a7360);
  return t < 0.5 ? low.clone().lerp(mid, t * 2) : mid.clone().lerp(high, (t - 0.5) * 2);
}

function shapeFromBoundary(boundary: Polygon, center: Point): THREE.Shape {
  const shape = new THREE.Shape();
  boundary.forEach((p, i) => {
    // Flip plan-Y so that after rotateX(-90°) it maps back to +Z = planY − centerY.
    const sx = p.x - center.x;
    const sy = center.y - p.y;
    if (i === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
  });
  shape.closePath();
  return shape;
}

function drapedPolygon(
  boundary: Polygon,
  center: Point,
  y: number,
  color: number,
  opacity: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Mesh {
  const geo = new THREE.ShapeGeometry(shapeFromBoundary(boundary, center));
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  disposables.push(geo, mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  return mesh;
}

function extrudedBuilding(
  boundary: Polygon,
  center: Point,
  baseY: number,
  height: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const shape = shapeFromBoundary(boundary, center);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd8935a, roughness: 0.7, metalness: 0.05 });
  const edgeGeo = new THREE.EdgesGeometry(geo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x7a4a22 });
  disposables.push(geo, mat, edgeGeo, edgeMat);

  const g = new THREE.Group();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  g.add(mesh);
  g.add(new THREE.LineSegments(edgeGeo, edgeMat));
  g.position.y = baseY;
  return g;
}

function treeObject(
  position: Point,
  canopyRadius: number,
  baseY: number,
  tx: (p: Point) => number,
  tz: (p: Point) => number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const r = Math.max(1.5, canopyRadius);
  const canopyGeo = new THREE.ConeGeometry(r, r * 2.2, 7);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.9 });
  const trunkGeo = new THREE.CylinderGeometry(r * 0.12, r * 0.16, r, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 });
  disposables.push(canopyGeo, canopyMat, trunkGeo, trunkMat);

  const g = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = r * 0.5;
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = r * 1.6;
  canopy.castShadow = true;
  g.add(trunk, canopy);
  g.position.set(tx(position), baseY, tz(position));
  return g;
}

function networkEdge(
  a: Point,
  b: Point,
  center: Point,
  elevAt: (p: Point) => number,
  exag: number,
  color: number,
  width: number,
  isRoad: boolean,
  disposables: Array<{ dispose: () => void }>,
): THREE.Object3D {
  const ax = a.x - center.x;
  const az = a.y - center.y;
  const bx = b.x - center.x;
  const bz = b.y - center.y;
  const ay = elevAt(a) * exag + 0.8;
  const by = elevAt(b) * exag + 0.8;

  if (isRoad) {
    // A flat ribbon following the segment.
    const dir = new THREE.Vector2(bx - ax, bz - az).normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(width / 2);
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      ax + nrm.x, ay, az + nrm.y,
      ax - nrm.x, ay, az - nrm.y,
      bx + nrm.x, by, bz + nrm.y,
      bx - nrm.x, by, bz - nrm.y,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
    disposables.push(geo, mat);
    return new THREE.Mesh(geo, mat);
  }

  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(ax, ay, az),
    new THREE.Vector3(bx, by, bz),
  ]);
  const mat = new THREE.LineBasicMaterial({ color });
  disposables.push(geo, mat);
  return new THREE.Line(geo, mat);
}

function centroidOf(boundary: Polygon): Point {
  const sum = boundary.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / boundary.length, y: sum.y / boundary.length };
}
