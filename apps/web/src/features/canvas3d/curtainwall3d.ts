import * as THREE from "three";
import { type Point, type CurtainWall, calculateCurtainWallGeometry } from "@thoth/domain";

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

  const dx = endPt.x - startPt.x;
  const dy = endPt.y - startPt.y;
  const planLen = Math.hypot(dx, dy) || 1.0;
  const cos = dx / planLen;
  const sin = dy / planLen;
  const wallAngle = Math.atan2(dy, dx);

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

  // 1. Bottom frame
  {
    const geo = new THREE.BoxGeometry(planLen, frameWidth * exag, 0.12);
    const m = new THREE.Mesh(geo, metalMat);
    m.position.set(
      (startPt.x + endPt.x) / 2 - center.x,
      baseElevation + (frameWidth / 2) * exag,
      (startPt.y + endPt.y) / 2 - center.y,
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
      (startPt.x + endPt.x) / 2 - center.x,
      baseElevation + totalHeight * exag - (frameWidth / 2) * exag,
      (startPt.y + endPt.y) / 2 - center.y,
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
    m.position.set(
      startPt.x + (frameWidth / 2) * cos - center.x,
      baseElevation + (totalHeight * exag) / 2,
      startPt.y + (frameWidth / 2) * sin - center.y,
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
    m.position.set(
      endPt.x - (frameWidth / 2) * cos - center.x,
      baseElevation + (totalHeight * exag) / 2,
      endPt.y - (frameWidth / 2) * sin - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  }

  // 2. Vertical mullion beams
  cwGeom.mullions.forEach((mull) => {
    if (mull.direction !== "vertical") {return;}
    const lx = startPt.x + mull.xStart * cos;
    const ly = startPt.y + mull.xStart * sin;
    const geo = new THREE.BoxGeometry(mull.width, (mull.yEnd - mull.yStart) * exag, 0.1);
    const m = new THREE.Mesh(geo, metalMat);
    m.position.set(
      lx - center.x,
      baseElevation + ((mull.yStart + mull.yEnd) / 2) * exag,
      ly - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  });

  // 3. Horizontal mullion beams
  cwGeom.mullions.forEach((mull) => {
    if (mull.direction !== "horizontal") {return;}
    const geo = new THREE.BoxGeometry(planLen, mull.width * exag, 0.08);
    const m = new THREE.Mesh(geo, metalMat);
    m.position.set(
      (startPt.x + endPt.x) / 2 - center.x,
      baseElevation + mull.yStart * exag,
      (startPt.y + endPt.y) / 2 - center.y,
    );
    m.rotation.y = -wallAngle;
    m.castShadow = true;
    cwGroup.add(m);
    disposables.push(geo);
  });

  // 4. Infill Panels
  cwGeom.panels.forEach((pan) => {
    const mx = (pan.xStart + pan.xEnd) / 2;
    const pX = startPt.x + mx * cos - paneOffset * -sin;
    const pY = startPt.y + mx * sin - paneOffset * cos;

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
      pX - center.x,
      baseElevation + ((pan.yStart + pan.yEnd) / 2) * exag,
      pY - center.y,
    );
    mesh.rotation.y = -wallAngle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cwGroup.add(mesh);
    disposables.push(geo);

    if (pan.material === "door") {
      const handleGeo = new THREE.BoxGeometry(0.05, 0.15 * exag, 0.05);
      const handle = new THREE.Mesh(handleGeo, metalMat);
      const hX = startPt.x + (pan.xStart + 0.1) * cos - (paneOffset + 0.04) * -sin;
      const hY = startPt.y + (pan.xStart + 0.1) * sin - (paneOffset + 0.04) * cos;
      handle.position.set(
        hX - center.x,
        baseElevation + 0.9 * exag,
        hY - center.y,
      );
      handle.rotation.y = -wallAngle;
      cwGroup.add(handle);
      disposables.push(handleGeo);
    }
  });

  return cwGroup;
}
