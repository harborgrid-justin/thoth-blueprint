import * as THREE from "three";
import _ from "lodash";
import {
  add,
  subtract,
  scale,
  normalize,
  distance,
  type Point,
  type CurtainWall,
  calculateCurtainWallGeometry,
} from "@thoth/domain";

export function enterpriseCurtainWall(
  wall: CurtainWall,
  center: Point,
  baseElevation: number,
  exag: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const cwGroup = new THREE.Group();
  cwGroup.name = wall.name;

  const cwGeom = calculateCurtainWallGeometry(wall);

  let startPt = { x: 0, y: 0 };
  let endPt = { x: 5, y: 0 };
  if (wall.boundary && wall.boundary.length >= 2) {
    startPt = wall.boundary[0];
    endPt = wall.boundary[1];
  }

  const d = subtract(endPt, startPt);
  const planLen = distance(endPt, startPt) || 1.0;
  const dir = normalize(d);
  const wallAngle = Math.atan2(d.y, d.x);

  const totalHeight = wall.height || 3.0;
  const frameWidth = wall.frameProfileWidth || 0.1;
  const paneOffset = wall.paneOffset || 0.02;

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.25,
    metalness: 0.8,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.9,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.9,
    metalness: 0.0,
  });
  const insMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.8,
    metalness: 0.1,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x86198f,
    roughness: 0.4,
  });

  disposables.push(metalMat, glassMat, brickMat, insMat, doorMat);

  const mid = scale(add(startPt, endPt), 0.5);

  // 1. Bottom frame
  {
    const geo = new THREE.BoxGeometry(planLen, frameWidth * exag, 0.12);
    const m = new THREE.Mesh(geo, metalMat);
    m.position.set(
      mid.x - center.x,
      baseElevation + (frameWidth / 2) * exag,
      mid.y - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  }
  // Top frame
  {
    const geo = new THREE.BoxGeometry(planLen, frameWidth * exag, 0.12);
    const m = new THREE.Mesh(geo, metalMat);
    m.position.set(
      mid.x - center.x,
      baseElevation + totalHeight * exag - (frameWidth / 2) * exag,
      mid.y - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  }
  // Left post
  {
    const geo = new THREE.BoxGeometry(frameWidth, totalHeight * exag, 0.12);
    const m = new THREE.Mesh(geo, metalMat);
    const lpPos = add(startPt, scale(dir, frameWidth / 2));
    m.position.set(
      lpPos.x - center.x,
      baseElevation + (totalHeight * exag) / 2,
      lpPos.y - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  }
  // Right post
  {
    const geo = new THREE.BoxGeometry(frameWidth, totalHeight * exag, 0.12);
    const m = new THREE.Mesh(geo, metalMat);
    const rpPos = subtract(endPt, scale(dir, frameWidth / 2));
    m.position.set(
      rpPos.x - center.x,
      baseElevation + (totalHeight * exag) / 2,
      rpPos.y - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  }

  // 2. Vertical mullion beams
  _.forEach(cwGeom.mullions, (mull) => {
    if (mull.direction !== "vertical") {
      return;
    }
    const lxly = add(startPt, scale(dir, mull.xStart));
    const geo = new THREE.BoxGeometry(
      mull.width,
      (mull.yEnd - mull.yStart) * exag,
      0.1,
    );
    const m = new THREE.Mesh(geo, metalMat);
    m.position.set(
      lxly.x - center.x,
      baseElevation + ((mull.yStart + mull.yEnd) / 2) * exag,
      lxly.y - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  });

  // 3. Horizontal mullion beams
  _.forEach(cwGeom.mullions, (mull) => {
    if (mull.direction !== "horizontal") {
      return;
    }
    const geo = new THREE.BoxGeometry(planLen, mull.width * exag, 0.08);
    const m = new THREE.Mesh(geo, metalMat);
    m.position.set(
      mid.x - center.x,
      baseElevation + mull.yStart * exag,
      mid.y - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  });

  // 4. Infill Panels
  const perpNormal = { x: -dir.y, y: dir.x };
  _.forEach(cwGeom.panels, (pan) => {
    const mx = (pan.xStart + pan.xEnd) / 2;
    const pXY = add(
      add(startPt, scale(dir, mx)),
      scale(perpNormal, paneOffset),
    );

    let useMat = glassMat;
    let thickness = 0.02;
    if (pan.material === "brick") {
      useMat = brickMat;
      thickness = 0.1;
    } else if (pan.material === "insulation") {
      useMat = insMat;
      thickness = 0.08;
    } else if (pan.material === "door" || pan.material === "window") {
      useMat = metalMat; // Match style
      thickness = 0.06;
    }

    const geo = new THREE.BoxGeometry(pan.width, pan.height * exag, thickness);
    const mesh = new THREE.Mesh(geo, useMat);
    mesh.position.set(
      pXY.x - center.x,
      baseElevation + ((pan.yStart + pan.yEnd) / 2) * exag,
      pXY.y - center.y,
    );
    mesh.rotation.y = -wallAngle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cwGroup.add(mesh);
    disposables.push(geo);

    if (pan.material === "door") {
      const handleGeo = new THREE.BoxGeometry(0.05, 0.15 * exag, 0.05);
      const handle = new THREE.Mesh(handleGeo, metalMat);
      const hXY = add(
        add(startPt, scale(dir, pan.xStart + 0.1)),
        scale(perpNormal, paneOffset + 0.04),
      );
      handle.position.set(
        hXY.x - center.x,
        baseElevation + 0.9 * exag,
        hXY.y - center.y,
      );
      handle.rotation.y = -wallAngle;
      cwGroup.add(handle);
      disposables.push(handleGeo);
    }
  });

  return cwGroup;
}
