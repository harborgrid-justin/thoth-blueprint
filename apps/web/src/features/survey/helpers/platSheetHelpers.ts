import _ from "lodash";
import {
  bounds as boundsOf,
  isSpatialElement,
  unionBounds,
  METERS_PER_UNIT,
  type Bounds,
  type Site,
} from "@thoth/domain";

export const INK = "#0f172a";
export const MUTED = "#475569";
export const SHEET = "#ffffff";

export const W = 1180;
export const H = 820;
export const MAIN = { x: 24, y: 44, w: 812, h: 720 };
export const STRIP = { x: 848, y: 44, w: 308, h: 720 };

export function planExtent(site: Site): Bounds | null {
  const boxes = _.map(_.filter(site.elements, isSpatialElement), (e) =>
    boundsOf(e.boundary),
  );
  for (const m of site.monuments ?? []) {
    boxes.push({
      minX: m.position.x,
      minY: m.position.y,
      maxX: m.position.x,
      maxY: m.position.y,
    });
  }
  return boxes.length ? unionBounds(boxes) : null;
}

export function computeGraphicScaleBar(scalePx: number, site: Site) {
  const metersPerPx =
    (1 / Math.max(scalePx, 1e-6)) * METERS_PER_UNIT[site.spatial.units];
  const perPx = metersPerPx / METERS_PER_UNIT[site.spatial.units];
  const target = 120 * perPx;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(target, 1e-6))));
  const r = target / mag;
  const nice = (r >= 5 ? 5 : r >= 2 ? 2 : 1) * mag;
  const barPx = nice / perPx;
  const seg = barPx / 4;
  return { nice, barPx, seg };
}
