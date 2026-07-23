import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { readFileAsArrayBuffer, readFileAsText } from "./fileIo";

import { meshFormatFromName, type MeshFormat } from "@thoth/domain";

export const MESH_ACCEPT = ".obj,.dae,.fbx,.stl,.gltf,.glb";
export { meshFormatFromName, type MeshFormat };

const DEFAULT_MATERIAL = () =>
  new THREE.MeshStandardMaterial({
    color: 0x9aa7b4,
    roughness: 0.7,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

/**
 * Import a mesh file with the matching three.js loader and normalize it to a
 * `THREE.Group`. Geometry-only formats (STL/PLY) get a default material; the
 * result is recentred on the ground so it sits within the plan.
 */
export async function importMeshFile(file: File): Promise<THREE.Group> {
  const format = meshFormatFromName(file.name);
  if (!format) {
    throw new Error(`Unsupported mesh file: ${file.name}`);
  }

  let object: THREE.Object3D;
  switch (format) {
    case "obj": {
      object = new OBJLoader().parse(await readFileAsText(file));
      applyDefaultMaterial(object);
      break;
    }
    case "stl": {
      const geo = new STLLoader().parse(await readFileAsArrayBuffer(file));
      object = new THREE.Mesh(geo, DEFAULT_MATERIAL());
      break;
    }
    case "dae": {
      const collada = new ColladaLoader().parse(await readFileAsText(file), "");
      object = collada.scene;
      break;
    }
    case "gltf": {
      const buffer = await readFileAsArrayBuffer(file);
      const gltf = await new GLTFLoader().parseAsync(buffer, "");
      object = gltf.scene;
      break;
    }
    case "fbx": {
      object = new FBXLoader().parse(await readFileAsArrayBuffer(file), "");
      break;
    }
  }

  return normalizeImported(object);
}

function applyDefaultMaterial(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.material) {
      child.material = DEFAULT_MATERIAL();
    }
  });
}

/** Recentre the model on the origin and seat its base at y = 0. */
function normalizeImported(object: THREE.Object3D): THREE.Group {
  const group = new THREE.Group();
  group.add(object);
  group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) {
    return group;
  }
  const center = box.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
    }
  });
  return group;
}
