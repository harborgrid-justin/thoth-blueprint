import * as THREE from "three";
import { type Point, type Stair, calculateStairGeometry, centroid } from "@thoth/domain";

export function enterpriseStair(
  stair: Stair,
  center: Point,
  baseElevation: number,
  exag: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const stairGroup = new THREE.Group();
  stairGroup.name = stair.name;

  const stairGeom = calculateStairGeometry(stair);
  const color =
    stair.renovationStatus === "new"
      ? 0x22c55e
      : stair.renovationStatus === "demolished"
        ? 0xef4444
        : 0x78716c;

  const mat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.8,
    metalness: 0.1,
    transparent: stair.renovationStatus !== undefined,
    opacity:
      stair.renovationStatus === "new"
        ? 0.6
        : stair.renovationStatus === "demolished"
          ? 0.35
          : 1.0,
  });
  disposables.push(mat);

  let dir = { x: 1, y: 0 };
  if (stair.boundary.length >= 2) {
    const dx = stair.boundary[1].x - stair.boundary[0].x;
    const dy = stair.boundary[1].y - stair.boundary[0].y;
    const len = Math.hypot(dx, dy) || 1;
    dir = { x: dx / len, y: dy / len };
  }

  stairGeom.treadLines.forEach((line, i) => {
    if (line.length < 2) {return;}
    const ptA = line[0];
    const ptB = line[1];
    const treadW = Math.hypot(ptB.x - ptA.x, ptB.y - ptA.y);
    const treadAngle = Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x);

    const stepDepth = stairGeom.actualTreadDepth;
    const stepHeight = stairGeom.actualRiserHeight * exag;

    let tx = (ptA.x + ptB.x) / 2;
    let tz = (ptA.y + ptB.y) / 2;
    let rotY = -treadAngle;

    if (stair.stairType === "spiral") {
      const totalRotRad = ((stair.totalRotation || 270) * Math.PI) / 180;
      const angle = ((i + 0.5) / stairGeom.treadCount) * totalRotRad;
      const radius = stair.radius || 1.2;
      const centerPt = centroid(stair.boundary);
      tx = centerPt.x + radius * Math.cos(angle);
      tz = centerPt.y + radius * Math.sin(angle);
      rotY = -angle;
    } else {
      tx -= dir.x * (stepDepth / 2);
      tz -= dir.y * (stepDepth / 2);
    }

    const geo = new THREE.BoxGeometry(treadW, stepHeight, stepDepth);
    disposables.push(geo);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      tx - center.x,
      baseElevation + i * stepHeight + stepHeight / 2,
      tz - center.y,
    );
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    stairGroup.add(mesh);
  });

  if (stair.stringerProfile !== "none") {
    const sWidth = stair.stringerWidth || 0.05;
    stairGeom.stringerCenterlines.forEach((line) => {
      if (line.length < 2) {return;}

      for (let i = 0; i < line.length - 1; i++) {
        const p1 = line[i];
        const p2 = line[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const segLen = Math.hypot(dx, dy);
        const segAngle = Math.atan2(dy, dx);

        const h1 = i * stairGeom.actualRiserHeight * exag;
        const h2 = (i + 1) * stairGeom.actualRiserHeight * exag;
        const dh = h2 - h1;
        const beamLen = Math.hypot(segLen, dh);

        const geo = new THREE.BoxGeometry(sWidth, 0.3 * exag, beamLen);
        disposables.push(geo);

        const beam = new THREE.Mesh(geo, mat);
        beam.position.set(
          (p1.x + p2.x) / 2 - center.x,
          baseElevation + (h1 + h2) / 2,
          (p1.y + p2.y) / 2 - center.y,
        );
        beam.rotation.y = -segAngle;
        beam.rotation.x = Math.atan2(dh, segLen);
        beam.castShadow = true;
        stairGroup.add(beam);
      }
    });
  }

  return stairGroup;
}
