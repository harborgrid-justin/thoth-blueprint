import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { buildScene, type SceneResult } from "./buildScene";

/**
 * A three.js 3D view of the plan: the terrain surface as a shaded mesh with
 * extruded buildings, draped land uses and water, trees, and road ribbons.
 * Orbit to rotate, scroll to zoom, right-drag to pan.
 */
export function Scene3D() {
  const mountRef = React.useRef<HTMLDivElement>(null);
  const site = useWorkspaceStore((s) => s.site);

  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const cameraRef = React.useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = React.useRef<OrbitControls | null>(null);
  const contentRef = React.useRef<SceneResult | null>(null);
  const framedRef = React.useRef(false);

  // --- one-time setup ------------------------------------------------------
  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = new THREE.Fog(0x0b1220, 4000, 40000);
    sceneRef.current = scene;

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

    // Lighting: sky/ground hemisphere + a shadow-casting sun.
    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x36402f, 1.05);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2df, 1.4);
    sun.position.set(1, 2, 1.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    const grid = new THREE.GridHelper(200000, 400, 0x1e293b, 0x111827);
    (grid.material as THREE.Material).opacity = 0.35;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.2;
    scene.add(grid);

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

    const result = buildScene(site);
    if (!result) return;
    scene.add(result.group);
    contentRef.current = result;

    // Frame the plan the first time content is available.
    if (!framedRef.current) {
      framedRef.current = true;
      const r = Math.max(50, result.radius);
      camera.position.set(r * 0.9, r * 0.8, r * 1.2);
      controls.target.set(0, result.baseElevation, 0);
      controls.update();
    }
  }, [site]);

  return <div ref={mountRef} className="h-full w-full" />;
}
