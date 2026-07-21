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
