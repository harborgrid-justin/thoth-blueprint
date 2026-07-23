import {
  buildView,
  dms,
  formatPlatValue,
  niceNumber,
  offset,
  outwardNormal,
  screenPair,
  type View,
} from "@thoth/domain";

export {
  buildView,
  dms,
  niceNumber,
  offset,
  outwardNormal,
  screenPair,
  type View,
};

export const INK = "#0f172a";
export const INK_MUTED = "#475569";
export const SHEET = "#ffffff";

export const W = 800;
export const H = 620;
export const M = { left: 76, right: 76, top: 58, bottom: 128 };
export const CW = W - M.left - M.right;
export const CH = H - M.top - M.bottom;

export function fmt(v: number, digits = 2): string {
  return formatPlatValue(v, digits);
}

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tract"
  );
}
