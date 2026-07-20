import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useInteropStore } from "@/store/interopStore";
import { buildScene, type SceneResult } from "./buildScene";

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

  // --- one-time setup ------------------------------------------------------
  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

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

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
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
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // --- rebuild content when the site changes -------------------------------
  React.useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls || !site) return;

    if (contentRef.current) {
      scene.remove(contentRef.current.group);
      contentRef.current.dispose();
      contentRef.current = null;
    }
    cloudDisposeRef.current.forEach((d) => d.dispose());
    cloudDisposeRef.current = [];

    const result = buildScene(site);
    if (!result) return;

    // Imported point clouds, in scene space (plan-centered, y-up, exaggerated).
    for (const c of clouds) {
      if (!c.visible) continue;
      const pts = cloudPoints(c.cloud.points, result.center, result.exaggeration);
      result.group.add(pts.object);
      cloudDisposeRef.current.push(pts.geometry, pts.material);
    }

    // Imported meshes, seated on the terrain at the plan center.
    for (const m of meshes) {
      if (!m.visible) continue;
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
