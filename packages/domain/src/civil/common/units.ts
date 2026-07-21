/** Constant conversion factor: feet to meters */
export const FEET_TO_METERS = 0.3048;

/** Degrees a 100-unit arc subtends at radius R (arc definition of degree of curve). */
export const DEGREE_OF_CURVE_CONST = (100 * 180) / Math.PI;

/**
 * Convert length in plan units to meters based on unit system.
 */
export function toMeters(value: number, units: "feet" | "meters" = "feet"): number {
  return value * (units === "feet" ? FEET_TO_METERS : 1);
}

/**
 * Format a station value in engineer's notation, e.g. 176043.32 → "1760+43.32".
 */
export function formatStation(value: number, precision = 2): string {
  const neg = value < 0;
  const v = Math.abs(value);
  const sta = Math.floor(v / 100 + 1e-9);
  const plus = (v - sta * 100).toFixed(precision).padStart(precision + 3, "0");
  return `${neg ? "-" : ""}${sta}+${plus}`;
}
