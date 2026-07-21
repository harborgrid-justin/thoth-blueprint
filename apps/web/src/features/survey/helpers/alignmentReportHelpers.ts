import { type ResolvedAlignment } from "@thoth/domain";

export function curveLabel(r: ResolvedAlignment, piIndex: number): string {
  const cIdx = r.curves.findIndex((c) => c.piIndex === piIndex);
  return cIdx >= 0 ? `C${cIdx + 1}` : `PI-${piIndex}`;
}
