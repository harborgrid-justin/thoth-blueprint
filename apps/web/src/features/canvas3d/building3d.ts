import * as THREE from "three";
import { type Point, type Polygon, type LandUseCategory, type BuildingModel, wallPolygon } from "@thoth/domain";

export function shapeFromBoundary(boundary: Polygon, center: Point): THREE.Shape {
  const shape = new THREE.Shape();
  if (boundary.length === 0) {return shape;}
  shape.moveTo(boundary[0].x - center.x, boundary[0].y - center.y);
  for (let i = 1; i < boundary.length; i++) {
    shape.lineTo(boundary[i].x - center.x, boundary[i].y - center.y);
  }
  return shape;
}

export function buildingColor(use?: LandUseCategory): number {
  switch (use) {
    case "residential":
      return 0xe2e8f0;
    case "commercial":
      return 0x93c5fd;
    case "industrial":
      return 0xfca5a5;
    case "civic":
      return 0xfef08a;
    case "park":
      return 0x86efac;
    default:
      return 0xd1d5db;
  }
}

export function enterpriseBuilding(
  ring: Polygon,
  center: Point,
  baseY: number,
  storeys: number,
  height: number,
  use: LandUseCategory | undefined,
  renovationStatus: "existing" | "new" | "demolished" | undefined,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const shape = shapeFromBoundary(ring, center);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);

  let bColor = buildingColor(use);
  let bOpacity = 1.0;
  let bTransparent = false;

  if (renovationStatus === "new") {
    bColor = 0x22c55e;
    bOpacity = 0.75;
    bTransparent = true;
  } else if (renovationStatus === "demolished") {
    bColor = 0xef4444;
    bOpacity = 0.35;
    bTransparent = true;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: bColor,
    roughness: 0.62,
    metalness: 0.12,
    transparent: bTransparent,
    opacity: bOpacity,
  });
  const edgeGeo = new THREE.EdgesGeometry(geo, 20);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x1f2937, transparent: true, opacity: 0.55 });
  disposables.push(geo, mat, edgeGeo, edgeMat);

  const g = new THREE.Group();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  g.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // Per-storey floor lines around the footprint.
  if (storeys > 1) {
    const local = ring.map((p) => new THREE.Vector2(p.x - center.x, p.y - center.y));
    const bandPts: THREE.Vector3[] = [];
    for (let k = 1; k < storeys; k++) {
      const y = (k / storeys) * height;
      for (let i = 0; i < local.length; i++) {
        const a = local[i];
        const b = local[(i + 1) % local.length];
        bandPts.push(new THREE.Vector3(a.x, y, a.y), new THREE.Vector3(b.x, y, b.y));
      }
    }
    const bandGeo = new THREE.BufferGeometry().setFromPoints(bandPts);
    const bandMat = new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.28 });
    disposables.push(bandGeo, bandMat);
    g.add(new THREE.LineSegments(bandGeo, bandMat));
  }

  g.position.y = baseY;
  return g;
}

export function buildingInterior(
  model: BuildingModel,
  center: Point,
  elevAt: (p: Point) => number,
  exag: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const g = new THREE.Group();
  const levelBase = new Map(model.levels.map((l) => [l.id, l.elevation]));
  const mat = new THREE.MeshStandardMaterial({ color: 0xe2e0d8, roughness: 0.7, metalness: 0.04 });
  disposables.push(mat);

  for (const wall of model.walls) {
    const poly = wallPolygon(wall);
    if (poly.length < 3) {continue;}
    const shape = shapeFromBoundary(poly, center);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: wall.height * exag, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    disposables.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const ground = elevAt(wall.baseline[0]) * exag;
    const floor = (levelBase.get(wall.levelId) ?? 0) * exag;
    mesh.position.y = ground + floor;
    g.add(mesh);
  }
  return g;
}
