import { describe, expect, it } from "vitest";
import { writeCollada, type SimpleMesh } from "../collada";

const tri: SimpleMesh = {
  name: "Test Mesh",
  positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
  indices: [0, 1, 2],
  color: [0.5, 0.25, 0.1],
};

describe("writeCollada", () => {
  it("emits a valid COLLADA document with geometry", () => {
    const dae = writeCollada([tri]);
    expect(dae).toContain('<?xml version="1.0"');
    expect(dae).toContain("<COLLADA");
    expect(dae).toContain('version="1.4.1"');
    expect(dae).toContain("<library_geometries>");
    expect(dae).toContain("<float_array");
    expect(dae).toContain("0 1 2"); // the triangle indices
  });

  it("includes one geometry and material per mesh", () => {
    const dae = writeCollada([tri, { ...tri, name: "Second" }]);
    expect((dae.match(/<geometry /g) ?? []).length).toBe(2);
    expect((dae.match(/<material /g) ?? []).length).toBe(2);
  });

  it("escapes names safely", () => {
    const dae = writeCollada([{ ...tri, name: "Bad <name> & stuff" }]);
    expect(dae).not.toContain("<name>");
  });
});
