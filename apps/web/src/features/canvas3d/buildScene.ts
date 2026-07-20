import * as THREE from "three";
import {
  boundsCenter,
  centroid,
  densifyBoundary,
  elevationAt,
  isPointElement,
  isSpatialElement,
  type Bounds,
  type ElevationGrid,
  type Point,
  type Polygon,
  type Site,
  type Stair,
  type CurtainWall,
  type DoorElement,
  type WindowElement,
} from "@thoth/domain";
import { elementColor } from "@/lib/elementMeta";
import { buildTerrainModel, siteExtent } from "@/features/terrain/terrainModel";
import { enterpriseStair } from "./stairs3d";
import { enterpriseCurtainWall } from "./curtainwall3d";
import { enterpriseDoor, enterpriseWindow } from "./doorwindow3d";
import { enterpriseBuilding, buildingInterior, shapeFromBoundary } from "./building3d";

export interface SceneResult {
  group: THREE.Group;
  center: Point;
  extent: Bounds;
  radius: number;
  baseElevation: number;
  exaggeration: number;
  buildingMeshes: Map<string, THREE.Object3D>;
  dispose: () => void;
}

const VERTICAL_EXAGGERATION = 1.6;
const DRAPE_OFFSET = 0.6;

export function buildScene(site: Site): SceneResult | null {
  const extent = siteExtent(site);
  if (!extent) {return null;}

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
  }

  // Ground plane
  {
    let minElev = 0;
    if (surface) {
      minElev = Infinity;
      for (const h of surface.heights) {if (h < minElev) {minElev = h;}}
    }
    const span = Math.max(extent.maxX - extent.minX, extent.maxY - extent.minY);
    const geo = new THREE.PlaneGeometry(span * 12, span * 12);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x47593c, roughness: 1 });
    disposables.push(geo, mat);
    const plane = new THREE.Mesh(geo, mat);
    plane.position.y = minElev * exag - 0.6;
    plane.receiveShadow = true;
    group.add(plane);
  }

  // --- Spatial elements ----------------------------------------------------
  const draped: Array<{
    ring: Polygon;
    color: number;
    opacity: number;
    lift: number;
    roughness: number;
    metalness: number;
  }> = [];
  const outlines: Array<{ ring: Polygon; color: number; lift: number }> = [];
  const buildingMeshes = new Map<string, THREE.Object3D>();

  for (const el of site.elements) {
    if (isPointElement(el)) {
      if (el.kind === "tree") {
        group.add(treeObject(el.position, el.canopyRadius, elevAt(el.position) * exag, tx, tz, disposables));
      }
      continue;
    }
    if (!isSpatialElement(el)) {continue;}

    const ring = densifyBoundary(el.boundary, el.arcs, 3);

    if (el.kind === "building") {
      const storeys = Math.max(1, el.storeys);
      const height = (el.height ?? storeys * 3.2) * exag;
      const base = elevAt(centroidOf(ring)) * exag;
      const bGroup = enterpriseBuilding(ring, center, base, storeys, height, el.use, el.renovationStatus, disposables);
      buildingMeshes.set(el.id, bGroup);
      continue;
    }

    if (el.kind === "stair") {
      const base = elevAt(centroid(ring)) * exag;
      const sGroup = enterpriseStair(el as Stair, center, base, exag, disposables);
      group.add(sGroup);
      continue;
    }

    if (el.kind === "curtainwall") {
      const base = elevAt(centroid(ring)) * exag;
      const cwGroup = enterpriseCurtainWall(el as CurtainWall, center, base, exag, disposables);
      group.add(cwGroup);
      continue;
    }

    if (el.kind === "door") {
      const base = elevAt(centroid(ring)) * exag;
      const dGroup = enterpriseDoor(el as DoorElement, center, base, exag, disposables);
      group.add(dGroup);
      continue;
    }

    if (el.kind === "window") {
      const base = elevAt(centroid(ring)) * exag;
      const wGroup = enterpriseWindow(el as WindowElement, center, base, exag, disposables);
      group.add(wGroup);
      continue;
    }

    const category = el.kind === "landuse" ? el.category : undefined;
    let color = new THREE.Color(elementColor(el.kind, category)).getHex();
    let opacity =
      el.kind === "water" ? 0.82 : el.kind === "region" ? 0.1 : el.kind === "grade" ? 0.45 : 0.5;
    
    if (el.renovationStatus === "new") {
      color = 0x22c55e;
      opacity = Math.max(opacity, 0.6);
    } else if (el.renovationStatus === "demolished") {
      color = 0xef4444;
      opacity = opacity * 0.4;
    }

    const lift = el.kind === "water" ? -0.3 : el.kind === "region" ? 0.15 : DRAPE_OFFSET;
    const roughness = el.kind === "water" ? 0.12 : 0.9;
    const metalness = el.kind === "water" ? 0.0 : 0.02;
    draped.push({ ring, color, opacity, lift, roughness, metalness });

    if (OUTLINE_KINDS.has(el.kind)) {
      let oColor = outlineColor(el.kind);
      if (el.renovationStatus === "new") {
        oColor = 0x22c55e;
      } else if (el.renovationStatus === "demolished") {
        oColor = 0xef4444;
      }
      outlines.push({ ring, color: oColor, lift: DRAPE_OFFSET + 0.18 });
    }
  }

  // Terrain-conforming land use / zones / water
  draped
    .sort((a, b) => b.opacity - a.opacity)
    .forEach((d) =>
      group.add(
        conformingDrape(d.ring, center, elevAt, exag, d.lift, d.color, d.opacity, d.roughness, d.metalness, disposables),
      ),
    );

  // Parcel outlines
  outlines.forEach((o) => group.add(boundaryOutline(o.ring, center, elevAt, exag, o.lift, o.color, disposables)));

  buildingMeshes.forEach((b) => group.add(b));

  // Building interiors
  for (const model of site.buildingModels ?? []) {
    group.add(buildingInterior(model, center, elevAt, exag, disposables));
  }

  // Networks
  for (const net of site.networks ?? []) {
    const nodes = new Map(net.nodes.map((n) => [n.id, n.point]));
    const color = net.kind === "road" ? 0x1e293b : 0x0ea5e9;
    for (const edge of net.edges) {
      const a = nodes.get(edge.from);
      const b = nodes.get(edge.to);
      if (!a || !b) {continue;}
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
    buildingMeshes,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

// Helpers
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
    if (h < min) {min = h;}
    if (h > max) {max = h;}
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
  const low = new THREE.Color(0x4b7a43);
  const mid = new THREE.Color(0xb8a06a);
  const high = new THREE.Color(0x8a7360);
  return t < 0.5 ? low.clone().lerp(mid, t * 2) : mid.clone().lerp(high, (t - 0.5) * 2);
}

const OUTLINE_KINDS = new Set(["parcel", "lot", "zone", "block", "openspace"]);

function outlineColor(kind: string): number {
  switch (kind) {
    case "lot": return 0x0c4a6e;
    case "zone": return 0x5b21b6;
    case "openspace": return 0x115e59;
    default: return 0x334155;
  }
}

function conformingDrape(
  ring: Polygon,
  center: Point,
  elevAt: (p: Point) => number,
  exag: number,
  lift: number,
  color: number,
  opacity: number,
  roughness: number,
  metalness: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Mesh {
  const geo = new THREE.ShapeGeometry(shapeFromBoundary(ring, center));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const plan = { x: pos.getX(i) + center.x, y: center.y - pos.getY(i) };
    pos.setZ(i, elevAt(plan) * exag + lift);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    roughness,
    metalness,
    side: THREE.DoubleSide,
  });
  disposables.push(geo, mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function boundaryOutline(
  ring: Polygon,
  center: Point,
  elevAt: (p: Point) => number,
  exag: number,
  lift: number,
  color: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Line {
  const pts = ring.map(
    (p) => new THREE.Vector3(p.x - center.x, elevAt(p) * exag + lift, p.y - center.y),
  );
  if (pts.length) {pts.push(pts[0].clone());}
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
  disposables.push(geo, mat);
  return new THREE.Line(geo, mat);
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
  const seed = pseudoRandom(position.x, position.y);
  g.rotation.y = seed * Math.PI * 2;
  g.scale.setScalar(0.82 + seed * 0.42);
  return g;
}

function pseudoRandom(x: number, y: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return v - Math.floor(v);
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
