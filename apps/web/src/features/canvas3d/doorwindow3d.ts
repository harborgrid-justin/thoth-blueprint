import * as THREE from "three";
import { type Point, type DoorElement, type WindowElement } from "@thoth/domain";

export function enterpriseDoor(
  door: DoorElement,
  center: Point,
  baseElevation: number,
  exag: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const dGroup = new THREE.Group();
  dGroup.name = door.name;

  let pLeft = { x: 0, y: 0 };
  let pRight = { x: 1, y: 0 };
  if (door.boundary && door.boundary.length >= 2) {
    pLeft = door.boundary[0];
    pRight = door.boundary[1];
  }

  const dx = pRight.x - pLeft.x;
  const dy = pRight.y - pLeft.y;
  const width = door.width || Math.hypot(dx, dy) || 0.9;
  const cos = dx / (width || 1);
  const sin = dy / (width || 1);
  const wallAngle = Math.atan2(dy, dx);

  const frameWidth = 0.05;
  const thickness = door.depth || 0.15;
  const height = door.height || 2.1;
  const swingAngle = door.swingAngle || 90;
  const swingRad = (swingAngle * Math.PI) / 180;

  const woodMat = new THREE.MeshStandardMaterial({
    color: door.frameProfile === "vinyl" ? 0xe2e8f0 : door.frameProfile === "metal" ? 0x64748b : 0x7c2d12,
    roughness: 0.7,
    metalness: 0.1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.2,
    metalness: 0.95,
  });
  disposables.push(woodMat, metalMat);

  // 1. Frame posts (Left, Right, Header)
  {
    const geo = new THREE.BoxGeometry(frameWidth, height * exag, thickness);
    disposables.push(geo);

    const lp = new THREE.Mesh(geo, woodMat);
    lp.position.set(pLeft.x + (frameWidth / 2) * cos - center.x, baseElevation + (height * exag) / 2, pLeft.y + (frameWidth / 2) * sin - center.y);
    lp.rotation.y = -wallAngle;
    lp.castShadow = true;
    dGroup.add(lp);

    const rp = new THREE.Mesh(geo, woodMat);
    rp.position.set(pRight.x - (frameWidth / 2) * cos - center.x, baseElevation + (height * exag) / 2, pRight.y - (frameWidth / 2) * sin - center.y);
    rp.rotation.y = -wallAngle;
    rp.castShadow = true;
    dGroup.add(rp);
  }
  {
    const geo = new THREE.BoxGeometry(width, frameWidth * exag, thickness);
    disposables.push(geo);

    const hp = new THREE.Mesh(geo, woodMat);
    hp.position.set((pLeft.x + pRight.x) / 2 - center.x, baseElevation + height * exag - (frameWidth / 2) * exag, (pLeft.y + pRight.y) / 2 - center.y);
    hp.rotation.y = -wallAngle;
    hp.castShadow = true;
    dGroup.add(hp);
  }

  // 2. Door Panel (rotated around hinge pLeft)
  {
    const panelW = width - 2 * frameWidth;
    const panelH = height - frameWidth;
    const panelThick = 0.04;
    const geo = new THREE.BoxGeometry(panelW, panelH * exag, panelThick);
    disposables.push(geo);

    const mesh = new THREE.Mesh(geo, woodMat);
    
    let px = pLeft.x + frameWidth * cos;
    let py = pLeft.y + frameWidth * sin;
    let rotY = -wallAngle;

    if (door.doorOperation === "swing") {
      rotY = -wallAngle - swingRad;
      px += (panelW / 2) * Math.cos(wallAngle + swingRad);
      py += (panelW / 2) * Math.sin(wallAngle + swingRad);
    } else if (door.doorOperation === "double-swing") {
      rotY = -wallAngle - swingRad;
      px += (panelW / 2) * Math.cos(wallAngle + swingRad);
      py += (panelW / 2) * Math.sin(wallAngle + swingRad);
    } else if (door.doorOperation === "pocket" || door.doorOperation === "slide") {
      px += (panelW / 2 + panelW * 0.8) * cos;
      py += (panelW / 2 + panelW * 0.8) * sin;
    } else {
      px += (panelW / 2) * cos;
      py += (panelW / 2) * sin;
    }

    mesh.position.set(px - center.x, baseElevation + (panelH * exag) / 2, py - center.y);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    dGroup.add(mesh);

    if (door.hardwareTrim) {
      const knobGeo = new THREE.SphereGeometry(0.025, 8, 8);
      disposables.push(knobGeo);
      const knob = new THREE.Mesh(knobGeo, metalMat);
      
      let kx = pLeft.x + frameWidth * cos;
      let ky = pLeft.y + frameWidth * sin;
      if (door.doorOperation === "swing") {
        kx += (panelW * 0.85) * Math.cos(wallAngle + swingRad);
        ky += (panelW * 0.85) * Math.sin(wallAngle + swingRad);
      } else {
        kx += (panelW * 0.85) * cos;
        ky += (panelW * 0.85) * sin;
      }
      
      knob.position.set(kx - center.x, baseElevation + 0.95 * exag, ky - center.y);
      dGroup.add(knob);
    }
  }

  // 3. Sill / Threshold blocks
  {
    const sillOver = door.sillOverhang || 0.03;
    const sillThick = door.sillThickness || 0.05;
    const geo = new THREE.BoxGeometry(width + 2 * sillOver, sillThick * exag, thickness + 0.04);
    disposables.push(geo);

    const m = new THREE.Mesh(geo, woodMat);
    m.position.set((pLeft.x + pRight.x) / 2 - center.x, baseElevation + (sillThick * exag) / 2, (pLeft.y + pRight.y) / 2 - center.y);
    m.rotation.y = -wallAngle;
    m.receiveShadow = true;
    dGroup.add(m);
  }

  return dGroup;
}

export function enterpriseWindow(
  win: WindowElement,
  center: Point,
  baseElevation: number,
  exag: number,
  disposables: Array<{ dispose: () => void }>,
): THREE.Group {
  const wGroup = new THREE.Group();
  wGroup.name = win.name;

  let pLeft = { x: 0, y: 0 };
  let pRight = { x: 1.2, y: 0 };
  if (win.boundary && win.boundary.length >= 2) {
    pLeft = win.boundary[0];
    pRight = win.boundary[1];
  }

  const dx = pRight.x - pLeft.x;
  const dy = pRight.y - pLeft.y;
  const width = win.width || Math.hypot(dx, dy) || 1.2;
  const wallAngle = Math.atan2(dy, dx);

  const frameWidth = 0.05;
  const thickness = win.depth || 0.15;
  const height = win.height || 1.2;
  const sillThick = win.sillThickness || 0.06;

  const frameMat = new THREE.MeshStandardMaterial({
    color: win.frameProfile === "vinyl" ? 0xf1f5f9 : win.frameProfile === "metal" ? 0x475569 : 0x7c2d12,
    roughness: 0.5,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.9,
  });
  disposables.push(frameMat, glassMat);

  const frameGeo = new THREE.BoxGeometry(width, height * exag, thickness);
  disposables.push(frameGeo);
  
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.set((pLeft.x + pRight.x) / 2 - center.x, baseElevation + (height * exag) / 2, (pLeft.y + pRight.y) / 2 - center.y);
  frameMesh.rotation.y = -wallAngle;
  frameMesh.castShadow = true;
  wGroup.add(frameMesh);

  const glassW = width - 2 * frameWidth;
  const glassH = height - 2 * frameWidth;
  const glassGeo = new THREE.BoxGeometry(glassW, glassH * exag, 0.02);
  disposables.push(glassGeo);

  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set((pLeft.x + pRight.x) / 2 - center.x, baseElevation + (height * exag) / 2, (pLeft.y + pRight.y) / 2 - center.y);
  glassMesh.rotation.y = -wallAngle;
  wGroup.add(glassMesh);

  const sillGeo = new THREE.BoxGeometry(width + 0.08, sillThick * exag, thickness + 0.04);
  disposables.push(sillGeo);
  const sillMesh = new THREE.Mesh(sillGeo, frameMat);
  sillMesh.position.set((pLeft.x + pRight.x) / 2 - center.x, baseElevation - (sillThick * exag) / 2, (pLeft.y + pRight.y) / 2 - center.y);
  sillMesh.rotation.y = -wallAngle;
  sillMesh.receiveShadow = true;
  wGroup.add(sillMesh);

  return wGroup;
}
