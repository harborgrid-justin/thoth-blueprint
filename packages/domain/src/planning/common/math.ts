/** Clamp value between 0 and 1. */
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
