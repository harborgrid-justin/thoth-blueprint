/**
 * Minimal COLLADA (.dae) writer. Emits a valid COLLADA 1.4.1 document from a
 * set of triangle meshes so a plan can be exported as a 3D model. Pure string
 * generation — no three.js, no DOM. (Mesh *import* of .dae/.obj/.fbx/etc. is
 * handled in the client with three.js loaders; only export lives here, where it
 * is framework-agnostic and testable.)
 */

import type { SimpleMesh } from "./types/collada";

export type { SimpleMesh };

import { xmlEscape, safeId } from "./common/format";

/** Serialize meshes to a COLLADA 1.4.1 document string. */
export function writeCollada(meshes: SimpleMesh[], author = "Thoth Blueprint"): string {
  const now = "1970-01-01T00:00:00Z"; // deterministic; callers may substitute a real time
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
