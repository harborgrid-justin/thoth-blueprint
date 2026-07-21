import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useInteropStore } from "@/store/interopStore";
import { useErosionStore } from "@/store/erosionStore";
import { buildScene, type SceneResult } from "./buildScene";
import { ThothPhysicsEngine } from "./physics";
import { Erosion3DVisualizer, type ErosionGridConfig } from "./erosion3d";
import { buildTerrainModel } from "@/features/terrain/terrainModel";

// Sun placement (degrees) — a mid-morning light that reads well for massing.
const SUN_ELEVATION = 34;
const SUN_AZIMUTH = 150;

/**
 * A three.js 3D view of the plan: the terrain surface as a shaded mesh with
 * extruded buildings, draped land uses and water, trees, and road ribbons.
 * Orbit to rotate, scroll to zoom, right-drag to pan.
 */
export function Scene3D() {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const hoveredElementId = useWorkspaceStore((s) => s.hoveredElementId);
  const clouds = useInteropStore((s) => s.clouds);
  const meshes = useInteropStore((s) => s.meshes);

  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const cameraRef = React.useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = React.useRef<OrbitControls | null>(null);
  const sunRef = React.useRef<THREE.DirectionalLight | null>(null);
  const sunDirRef = React.useRef<THREE.Vector3 | null>(null);
  const contentRef = React.useRef<SceneResult | null>(null);
  const cloudDisposeRef = React.useRef<Array<{ dispose: () => void }>>([]);
  const framedRef = React.useRef(false);
  const physicsRef = React.useRef<ThothPhysicsEngine | null>(null);
  const visualizerRef = React.useRef<Erosion3DVisualizer | null>(null);
  /** Cache of the last collision result — avoids re-traversing meshes every frame. */
  const lastCollisionsRef = React.useRef<Set<string>>(new Set());

  const currentFrame = useErosionStore((s) => s.currentFrame);

  // Sync erosion frames to ThreeJS visualizer
  React.useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !contentRef.current) {return;}

    if (!visualizerRef.current) {
      // Derive accurate grid dimensions from the terrain model so the elevation
      // lookup in the visualizer uses bilinear interpolation on the correct grid.
      const currentSite = useWorkspaceStore.getState().site;
      let gridConfig: ErosionGridConfig | undefined;
      if (currentSite) {
        const terrain = buildTerrainModel(currentSite);
        if (terrain.existing) {
          const { cols, rows, cellSize, origin } = terrain.existing;
          gridConfig = { cols, rows, cellSize, origin };
        }
      }

      visualizerRef.current = new Erosion3DVisualizer(
        contentRef.current.group,
        contentRef.current.center,
        contentRef.current.exaggeration,
        gridConfig,
      );
    }

    // Use the terrainMesh exposed directly on SceneResult — no group traversal needed.
    const terrainMesh = contentRef.current.terrainMesh;

    if (currentFrame) {
      visualizerRef.current.update(currentFrame, terrainMesh);
    } else {
      visualizerRef.current.clearParticles();
    }
  }, [currentFrame]);

  // --- one-time setup ------------------------------------------------------
  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {return;}

    // A fresh camera is created here, so it must be framed again on next content
    // (StrictMode remounts and HMR recreate this effect while refs persist).
    framedRef.current = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Physically-based output: filmic tone mapping + sRGB, like architectural viz.
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Image-based ambient lighting for soft, realistic material response.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      500000,
    );
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.05;
    controlsRef.current = controls;

    // Sun direction from elevation/azimuth, shared by the sky and the light.
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION);
    const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    sunDirRef.current = sunDir;

    // Physically-based sky dome.
    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    const skyU = sky.material.uniforms;
    skyU["turbidity"].value = 8;
    skyU["rayleigh"].value = 2;
    skyU["mieCoefficient"].value = 0.005;
    skyU["mieDirectionalG"].value = 0.8;
    skyU["sunPosition"].value.copy(sunDir);

    // Sky/ground fill + a shadow-casting sun (positioned once the scene loads).
    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a5540, 0.35);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    scene.add(sun.target);
    sunRef.current = sun;

    // Initialize WebAssembly physics engine
    ThothPhysicsEngine.create().then((engine) => {
      physicsRef.current = engine;
      const currentSite = useWorkspaceStore.getState().site;
      if (currentSite) {
        engine.syncWorld(currentSite, contentRef.current?.exaggeration ?? 1.6);
      }
    });

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();

      // Run collision checking if physics engine is loaded.
      // checkCollisions() is cheap when nothing has changed (needsStep=false),
      // but we still need the last known set to maintain emissive state.
      if (physicsRef.current && contentRef.current) {
        const collisions = physicsRef.current.checkCollisions();
        const buildingMeshes = contentRef.current.buildingMeshes;
        const prev = lastCollisionsRef.current;

        // Only traverse & update materials when the set of colliding IDs changes.
        const changed =
          collisions.size !== prev.size ||
          [...collisions].some((id) => !prev.has(id));

        if (changed) {
          lastCollisionsRef.current = collisions;
          buildingMeshes.forEach((mesh, id) => {
            const isColliding = collisions.has(id);
            mesh.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshStandardMaterial;
                if (mat) {
                  if (isColliding) {
                    mat.emissive.setHex(0xff0000);
                    mat.emissiveIntensity = 0.45;
                  } else {
                    mat.emissive.setHex(0x000000);
                    mat.emissiveIntensity = 0;
                  }
                }
              }
            });
          });
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) {return;}
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      contentRef.current?.dispose();
      if (renderer.domElement.parentNode === mount) {mount.removeChild(renderer.domElement);}
    };
  }, []);

  // --- rebuild content when the site changes -------------------------------
  React.useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || !site) {return;}

    if (contentRef.current) {
      scene.remove(contentRef.current.group);
      contentRef.current.dispose();
      contentRef.current = null;
    }
    if (visualizerRef.current) {
      visualizerRef.current.dispose();
      visualizerRef.current = null;
    }
    cloudDisposeRef.current.forEach((d) => d.dispose());
    cloudDisposeRef.current = [];

    const result = buildScene(site);
    if (!result) {return;}

    if (physicsRef.current) {
      physicsRef.current.syncWorld(site, result.exaggeration);
    }

    // Imported point clouds, in scene space (plan-centered, y-up, exaggerated).
    for (const c of clouds) {
      if (!c.visible) {continue;}
      const pts = cloudPoints(c.cloud.points, result.center, result.exaggeration);
      result.group.add(pts.object);
      cloudDisposeRef.current.push(pts.geometry, pts.material);
    }

    // Imported meshes, seated on the terrain at the plan center.
    for (const m of meshes) {
      if (!m.visible) {continue;}
      m.object.position.set(0, result.baseElevation, 0);
      result.group.add(m.object);
    }

    scene.add(result.group);
    contentRef.current = result;

    // Position the sun and size its shadow frustum to the scene extent.
    const sun = sunRef.current;
    const sunDir = sunDirRef.current;
    if (sun && sunDir) {
      const R = Math.max(60, result.radius);
      sun.position.copy(sunDir).multiplyScalar(R * 3);
      sun.target.position.set(0, result.baseElevation, 0);
      sun.target.updateMatrixWorld();
      const cam = sun.shadow.camera as THREE.OrthographicCamera;
      cam.left = -R * 1.5;
      cam.right = R * 1.5;
      cam.top = R * 1.5;
      cam.bottom = -R * 1.5;
      cam.near = 0.5;
      cam.far = R * 10;
      cam.updateProjectionMatrix();
    }

    // Frame the plan the first time content is available (3/4 aerial view).
    if (!framedRef.current) {
      framedRef.current = true;
      const r = Math.max(50, result.radius);
      camera.position.set(r * 1.25, r * 1.45, r * 1.6);
      controls.target.set(0, result.baseElevation, 0);
      controls.minDistance = r * 0.15;
      controls.maxDistance = r * 12;
      controls.update();
    }
  }, [site, clouds, meshes]);

  // Synchronized Selection and Hover Highlights in 3D View (Feature 6 & 7 & 8)
  React.useEffect(() => {
    const rootGroup = contentRef.current?.group;
    if (!rootGroup) {return;}

    // Restore original colors/emissive properties for all meshes before applying new ones.
    rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) {
          if ("emissive" in mat && mat.emissive instanceof THREE.Color) {
            mat.emissive.setHex(0x000000);
          }
        }
      }
    });

    // If an element is hovered, highlight it in warning yellow
    if (hoveredElementId) {
      rootGroup.traverse((child) => {
        let current: THREE.Object3D | null = child;
        let matched = false;
        while (current && current !== rootGroup) {
          if (current.name === hoveredElementId) {
            matched = true;
            break;
          }
          current = current.parent;
        }
        if (matched && child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) {
            if ("emissive" in mat && mat.emissive instanceof THREE.Color) {
              mat.emissive.setHex(0x332600); // subtle yellow glow
            }
          }
        }
      });
    }

    // If an element is selected, highlight it in cyan-primary
    if (selection.length > 0) {
      const selectedId = selection[0]!;
      rootGroup.traverse((child) => {
        let current: THREE.Object3D | null = child;
        let matched = false;
        while (current && current !== rootGroup) {
          if (current.name === selectedId) {
            matched = true;
            break;
          }
          current = current.parent;
        }
        if (matched && child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) {
            if ("emissive" in mat && mat.emissive instanceof THREE.Color) {
              mat.emissive.setHex(0x001f3f); // subtle blue glow
            }
          }
        }
      });

      // Camera Focal Sync (Feature 7): focus 3D camera onto selected element
      const selectedObj = rootGroup.getObjectByName(selectedId);
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      if (selectedObj && controls && camera) {
        const box = new THREE.Box3().setFromObject(selectedObj);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        controls.target.copy(center);
        controls.update();
      }
    }
  }, [selection, hoveredElementId]);

  return <div ref={mountRef} className="h-full w-full" />;
}

/** Build a THREE.Points cloud from colored points, mapped into scene space. */
function cloudPoints(
  points: Array<{ x: number; y: number; z: number; r?: number; g?: number; b?: number }>,
  center: { x: number; y: number },
  exag: number,
) {
  const positions = new Float32Array(points.length * 3);
  const colors = new Float32Array(points.length * 3);
  points.forEach((p, i) => {
    positions[i * 3] = p.x - center.x;
    positions[i * 3 + 1] = p.z * exag;
    positions[i * 3 + 2] = p.y - center.y;
    colors[i * 3] = (p.r ?? 180) / 255;
    colors[i * 3 + 1] = (p.g ?? 180) / 255;
    colors[i * 3 + 2] = (p.b ?? 180) / 255;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 2, vertexColors: true, sizeAttenuation: true });
  return { object: new THREE.Points(geometry, material), geometry, material };
}
