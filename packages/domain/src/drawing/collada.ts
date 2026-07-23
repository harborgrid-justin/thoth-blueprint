/**
 * Minimal COLLADA (.dae) writer and 3D mesh generator. Emits a valid COLLADA 1.4.1
 * document from a set of triangle meshes so a plan can be exported as a 3D model.
 * Pure string & geometry generation — no three.js, no DOM.
 */

import { buildTerrainModel } from "../civil/terrainModel";
import { elevationAt } from "../civil/terrain";
import { centroid } from "../spatial/geometry";
import type { Point, Polygon, Site } from "../spatial/types";
import { safeId, xmlEscape } from "./common/format";
import type { SimpleMesh } from "./types/collada";

export type { SimpleMesh };

const VERTICAL_EXAGGERATION = 1.6;

export type MeshFormat = "obj" | "dae" | "fbx" | "stl" | "gltf";

export function meshFormatFromName(name: string): MeshFormat | null {
  const ext = name.toLowerCase().split(".").pop();
  switch (ext) {
    case "obj":
      return "obj";
    case "dae":
      return "dae";
    case "fbx":
      return "fbx";
    case "stl":
      return "stl";
    case "gltf":
    case "glb":
      return "gltf";
    default:
      return null;
  }
}

/** Convert a site into triangle meshes: the terrain surface and building solids. */
export function siteToMeshes(site: Site): SimpleMesh[] {
  const meshes: SimpleMesh[] = [];
  const terrain = buildTerrainModel(site);
  const exag = VERTICAL_EXAGGERATION;
  const elevAt = (p: Point) =>
    terrain.existing ? elevationAt(terrain.existing, p) : 0;

  // Terrain surface as a triangulated grid (y-up).
  const grid = terrain.existing;
  if (grid) {
    const positions: number[] = [];
    const indices: number[] = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const i = r * grid.cols + c;
        positions.push(
          grid.origin.x + c * grid.cellSize,
          grid.heights[i] * exag,
          grid.origin.y + r * grid.cellSize,
        );
      }
    }
    for (let r = 0; r < grid.rows - 1; r++) {
      for (let c = 0; c < grid.cols - 1; c++) {
        const a = r * grid.cols + c;
        const b = a + 1;
        const d = a + grid.cols;
        const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
    meshes.push({
      name: "Terrain",
      positions,
      indices,
      color: [0.42, 0.48, 0.32],
    });
  }

  // Buildings as extruded prisms.
  for (const el of site.elements) {
    if (el.kind !== "building") {
      continue;
    }
    const base = elevAt(centroid(el.boundary)) * exag;
    const height = (el.height ?? el.storeys * 3.2) * exag;
    meshes.push(
      prism(el.name, el.boundary, base, base + height, [0.85, 0.58, 0.35]),
    );
  }

  return meshes;
}

/** A closed extruded prism from a boundary between two heights (y-up). */
export function prism(
  name: string,
  boundary: Polygon,
  bottom: number,
  top: number,
  color: [number, number, number],
): SimpleMesh {
  const n = boundary.length;
  const positions: number[] = [];
  const indices: number[] = [];

  // Bottom ring (0..n-1), top ring (n..2n-1).
  for (const p of boundary) {
    positions.push(p.x, bottom, p.y);
  }
  for (const p of boundary) {
    positions.push(p.x, top, p.y);
  }

  // Side walls.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    indices.push(i, j, n + i, j, n + j, n + i);
  }
  // Top cap (fan triangulation — fine for convex-ish footprints).
  for (let i = 1; i < n - 1; i++) {
    indices.push(n, n + i, n + i + 1);
  }
  // Bottom cap (reverse winding).
  for (let i = 1; i < n - 1; i++) {
    indices.push(0, i + 1, i);
  }

  return { name, positions, indices, color };
}

/** Serialize meshes to a COLLADA 1.4.1 document string. */
export function writeCollada(
  meshes: SimpleMesh[],
  author = "Thoth Blueprint",
): string {
  const now = "1970-01-01T00:00:00Z";
  const materials: string[] = [];
  const effects: string[] = [];
  const geometries: string[] = [];
  const nodes: string[] = [];

  meshes.forEach((mesh, i) => {
    const id = safeId(mesh.name, i);
    const idEsc = xmlEscape(id);
    const [r, g, b] = mesh.color;

    effects.push(
      `<effect id="${idEsc}-effect"><profile_COMMON><technique sid="common"><lambert>` +
        `<diffuse><color>${r} ${g} ${b} 1</color></diffuse>` +
        `</lambert></technique></profile_COMMON></effect>`,
    );
    materials.push(
      `<material id="${idEsc}-material" name="${xmlEscape(mesh.name)}">` +
        `<instance_effect url="#${idEsc}-effect"/></material>`,
    );

    const vcount = mesh.positions.length / 3;
    const triCount = mesh.indices.length / 3;
    geometries.push(
      `<geometry id="${idEsc}-geom" name="${xmlEscape(mesh.name)}"><mesh>` +
        `<source id="${idEsc}-pos"><float_array id="${idEsc}-pos-array" count="${mesh.positions.length}">${mesh.positions
          .map(fmt)
          .join(" ")}</float_array>` +
        `<technique_common><accessor source="#${idEsc}-pos-array" count="${vcount}" stride="3">` +
        `<param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>` +
        `</accessor></technique_common></source>` +
        `<vertices id="${idEsc}-vtx"><input semantic="POSITION" source="#${idEsc}-pos"/></vertices>` +
        `<triangles material="${idEsc}-material" count="${triCount}">` +
        `<input semantic="VERTEX" source="#${idEsc}-vtx" offset="0"/>` +
        `<p>${mesh.indices.join(" ")}</p></triangles>` +
        `</mesh></geometry>`,
    );

    nodes.push(
      `<node id="${idEsc}-node" name="${xmlEscape(mesh.name)}"><instance_geometry url="#${idEsc}-geom">` +
        `<bind_material><technique_common>` +
        `<instance_material symbol="${idEsc}-material" target="#${idEsc}-material"/>` +
        `</technique_common></bind_material></instance_geometry></node>`,
    );
  });

  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">` +
    `<asset><contributor><authoring_tool>${xmlEscape(author)}</authoring_tool></contributor>` +
    `<created>${now}</created><modified>${now}</modified>` +
    `<unit name="meter" meter="1"/><up_axis>Y_UP</up_axis></asset>` +
    `<library_effects>${effects.join("")}</library_effects>` +
    `<library_materials>${materials.join("")}</library_materials>` +
    `<library_geometries>${geometries.join("")}</library_geometries>` +
    `<library_visual_scenes><visual_scene id="scene" name="scene">${nodes.join("")}</visual_scene></library_visual_scenes>` +
    `<scene><instance_visual_scene url="#scene"/></scene>` +
    `</COLLADA>`
  );
}

function fmt(v: number): string {
  return Number.isFinite(v) ? (Math.round(v * 10000) / 10000).toString() : "0";
}
