/**
 * Minimal COLLADA (.dae) writer. Emits a valid COLLADA 1.4.1 document from a
 * set of triangle meshes so a plan can be exported as a 3D model. Pure string
 * generation — no three.js, no DOM. (Mesh *import* of .dae/.obj/.fbx/etc. is
 * handled in the client with three.js loaders; only export lives here, where it
 * is framework-agnostic and testable.)
 */

/** A triangle mesh: flat XYZ positions and triangle index triples. */
export interface SimpleMesh {
  name: string;
  /** Flat [x,y,z, x,y,z, …] vertex positions. */
  positions: number[];
  /** Flat triangle indices into `positions`/3. */
  indices: number[];
  /** Diffuse color as [r,g,b] in 0–1. */
  color: [number, number, number];
}

function xmlEscape(s: string): string {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function safeId(name: string, index: number): string {
  const base = name.replace(/[^A-Za-z0-9_]/g, "_") || "mesh";
  return `${base}_${index}`;
}

/** Serialize meshes to a COLLADA 1.4.1 document string. */
export function writeCollada(meshes: SimpleMesh[], author = "Thoth Blueprint"): string {
  const now = "1970-01-01T00:00:00Z"; // deterministic; callers may substitute a real time
  const materials: string[] = [];
  const effects: string[] = [];
  const geometries: string[] = [];
  const nodes: string[] = [];

  meshes.forEach((mesh, i) => {
    const id = safeId(mesh.name, i);
    const [r, g, b] = mesh.color;

    effects.push(
      `<effect id="${id}-effect"><profile_COMMON><technique sid="common"><lambert>` +
        `<diffuse><color>${r} ${g} ${b} 1</color></diffuse>` +
        `</lambert></technique></profile_COMMON></effect>`,
    );
    materials.push(
      `<material id="${id}-material" name="${xmlEscape(mesh.name)}">` +
        `<instance_effect url="#${id}-effect"/></material>`,
    );

    const vcount = mesh.positions.length / 3;
    const triCount = mesh.indices.length / 3;
    geometries.push(
      `<geometry id="${id}-geom" name="${xmlEscape(mesh.name)}"><mesh>` +
        `<source id="${id}-pos"><float_array id="${id}-pos-array" count="${mesh.positions.length}">${mesh.positions
          .map(fmt)
          .join(" ")}</float_array>` +
        `<technique_common><accessor source="#${id}-pos-array" count="${vcount}" stride="3">` +
        `<param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>` +
        `</accessor></technique_common></source>` +
        `<vertices id="${id}-vtx"><input semantic="POSITION" source="#${id}-pos"/></vertices>` +
        `<triangles material="${id}-material" count="${triCount}">` +
        `<input semantic="VERTEX" source="#${id}-vtx" offset="0"/>` +
        `<p>${mesh.indices.join(" ")}</p></triangles>` +
        `</mesh></geometry>`,
    );

    nodes.push(
      `<node id="${id}-node" name="${xmlEscape(mesh.name)}"><instance_geometry url="#${id}-geom">` +
        `<bind_material><technique_common>` +
        `<instance_material symbol="${id}-material" target="#${id}-material"/>` +
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
  return Number.isFinite(v) ? Number(v.toFixed(4)).toString() : "0";
}
