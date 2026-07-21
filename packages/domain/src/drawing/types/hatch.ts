import type { LineWeightName } from "./drafting";

/** How a hatch fills an area. */
export type HatchKind = "lines" | "crosshatch" | "dots" | "solid" | "grid";

/** A hatch pattern specification. */
export interface HatchPattern {
  id: string;
  label: string;
  kind: HatchKind;
  /** Hatch line angle in degrees (0 = horizontal). */
  angleDeg: number;
  /** Spacing between hatch lines in paper millimetres. */
  spacing: number;
  lineWeight: LineWeightName;
  /** Optional fill colour beneath the hatch. */
  background?: string;
  color?: string;
}
