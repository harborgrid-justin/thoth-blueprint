/** One row of the consolidated curve-data table. */
export interface SiteCurve {
  label: string;
  /** The element or alignment the curve belongs to. */
  source: string;
  radius: number;
  arcLength: number;
  /** Central (delta) angle, decimal degrees. */
  deltaDeg: number;
  chord: number;
  /** Long-chord bearing, quadrant text. */
  chordBearing: string;
  tangent: number;
  direction?: "left" | "right";
}
