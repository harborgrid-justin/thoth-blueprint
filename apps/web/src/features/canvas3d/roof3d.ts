import * as THREE from "three";
import _ from "lodash";
import {
  type Point,
  type RoofElement,
  calculateRoofGeometry,
  bounds,
  boundsCenter,
} from "@thoth/domain";

export function enterpriseRoof(
  roof: RoofElement,
  center: Point,
  baseElevation: number,
  exag: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const roofGroup = new THREE.Group();
  roofGroup.name = roof.name;

  const geom = calculateRoofGeometry(roof);
  const boundary = roof.boundary || [];
  if (boundary.length < 3) {
    return roofGroup;
  }

  // 1. Determine Roof Material Color (REQ-UNIMP-059)
  let roofColor = 0x374151; // asphalt charcoal grey
  if (roof.shingleMaterial === "tile") {
    roofColor = 0xb91c1c; // terracotta red
  } else if (roof.shingleMaterial === "slate") {
    roofColor = 0x4b5563; // blue slate
  } else if (roof.shingleMaterial === "metal") {
    roofColor = 0x94a3b8; // zinc metal
  }

  // Renovation color overrides
  if (roof.renovationStatus === "new") {
    roofColor = 0x22c55e;
  } else if (roof.renovationStatus === "demolished") {
    roofColor = 0xef4444;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: roofColor,
    roughness: 0.65,
    metalness: roof.shingleMaterial === "metal" ? 0.8 : 0.1,
    transparent: roof.renovationStatus !== undefined,
    opacity:
      roof.renovationStatus === "new"
        ? 0.75
        : roof.renovationStatus === "demolished"
          ? 0.35
          : 1.0,
    side: THREE.DoubleSide,
  });
  disposables.push(mat);

  // 2. Build sloped roof plane faces (REQ-UNIMP-051, REQ-UNIMP-055)
  // We'll construct a BufferGeometry with all the triangles.
  const vertices: number[] = [];
  const indices: number[] = [];

  // Find bounding box using our domain geometry library
  const box = bounds(boundary);
  const minX = box.minX;
  const maxX = box.maxX;
  const minY = box.minY;
  const maxY = box.maxY;
  const width = maxX - minX;
  const midX = boundsCenter(box).x;

  const pitchVal = roof.pitch || 4;
  const height = (width / 2) * (pitchVal / 12) * exag;

  const projectToRidge = (p: Point): Point => {
    if (roof.roofType === "shed") {
      return { x: p.x, y: minY }; // shed slopes up to North wall
    }
    if (roof.roofType === "flat") {
      return { x: p.x, y: p.y }; // flat roof has no slope ridge
    }
    // For Gable / Hip, project onto midX ridge line segment [minY, maxY]
    const yVal = Math.max(minY, Math.min(maxY, p.y));
    return { x: midX, y: yVal };
  };

  const getElevation = (p: Point, isRidge: boolean): number => {
    if (roof.roofType === "flat") {
      return baseElevation + 0.1 * exag; // flat roof stays low
    }
    if (isRidge) {
      return baseElevation + height;
    }
    if (roof.roofType === "shed" && Math.abs(p.y - minY) < 1e-3) {
      return baseElevation + height; // shed high side
    }
    return baseElevation;
  };

  // Add boundary points as vertices
  _.forEach(boundary, (p) => {
    const rx = p.x - center.x;
    const rz = p.y - center.y;
    const ry = getElevation(p, false);
    vertices.push(rx, ry, rz);
  });

  // Add ridge projection points as vertices
  _.forEach(boundary, (p) => {
    const ridgePt = projectToRidge(p);
    const rx = ridgePt.x - center.x;
    const rz = ridgePt.y - center.y;
    const ry = getElevation(p, true);
    vertices.push(rx, ry, rz);
  });

  // Triangulate between boundary loop and ridge projection loop
  const n = boundary.length;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;

    // Indices:
    // Boundary: i, next
    // Ridge: i + n, next + n
    indices.push(i, i + n, next);
    indices.push(next, i + n, next + n);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3),
  );
  geo.setIndex(indices);
  geo.computeVertexNormals();
  disposables.push(geo);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  roofGroup.add(mesh);

  // 3. Draw structural rafters underneath (REQ-UNIMP-056)
  const rafterMat = new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.9,
  }); // wood brown
  disposables.push(rafterMat);

  _.forEach(geom.rafterLines, (line) => {
    if (line.length < 2) {
      return;
    }
    const p1 = line[0];
    const p2 = line[1];

    const h1 = getElevation(p1, true);
    const h2 = getElevation(p2, false);

    const x1 = p1.x - center.x;
    const z1 = p1.y - center.y;
    const x2 = p2.x - center.x;
    const z2 = p2.y - center.y;

    const dx = x2 - x1;
    const dy = h2 - h1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dy, dz);

    const rafterGeo = new THREE.BoxGeometry(0.04, 0.12, length);
    disposables.push(rafterGeo);

    const rMesh = new THREE.Mesh(rafterGeo, rafterMat);
    rMesh.position.set((x1 + x2) / 2, (h1 + h2) / 2 - 0.08, (z1 + z2) / 2);
    rMesh.lookAt(new THREE.Vector3(x2, h2 - 0.08, z2));
    rMesh.castShadow = true;
    roofGroup.add(rMesh);
  });

  // 4. Draw Gutters (REQ-UNIMP-058)
  if (roof.gutters) {
    const gutterMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.2,
    });
    disposables.push(gutterMat);

    _.forEach(geom.gutterPaths, (line) => {
      if (line.length < 2) {
        return;
      }
      const p1 = line[0];
      const p2 = line[1];

      const x1 = p1.x - center.x;
      const z1 = p1.y - center.y;
      const x2 = p2.x - center.x;
      const z2 = p2.y - center.y;
      const h = baseElevation;

      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);

      const gutGeo = new THREE.CylinderGeometry(0.06, 0.06, length, 8);
      gutGeo.rotateX(Math.PI / 2);
      disposables.push(gutGeo);

      const gMesh = new THREE.Mesh(gutGeo, gutterMat);
      gMesh.position.set((x1 + x2) / 2, h - 0.05, (z1 + z2) / 2);
      gMesh.rotation.y = -Math.atan2(dz, dx);
      gMesh.castShadow = true;
      roofGroup.add(gMesh);
    });

    // 5. Draw Downspouts (REQ-UNIMP-058)
    _.forEach(geom.downspoutAnchors, (pt) => {
      const rx = pt.x - center.x;
      const rz = pt.y - center.y;
      const h = baseElevation;

      const downGeo = new THREE.CylinderGeometry(0.04, 0.04, h + 2.0, 6);
      disposables.push(downGeo);

      const dMesh = new THREE.Mesh(downGeo, gutterMat);
      dMesh.position.set(rx, (h - 2.0) / 2, rz);
      dMesh.castShadow = true;
      roofGroup.add(dMesh);
    });
  }

  return roofGroup;
}
