import { bounds, unionBounds } from "../spatial/geometry";

import { createId } from "../spatial/id";
import { isPointElement, isSpatialElement } from "../spatial/primitives";
import type { PlanElement, Point } from "../spatial/types";

/** A "nice" paste offset derived from the copied elements' own extent. */
export function pasteOffset(elements: PlanElement[]): Point {
  const boxes = elements
    .filter(isSpatialElement)
    .map((e) => bounds(e.boundary));
  const b = boxes.length ? unionBounds(boxes) : null;
  if (b) {
    const step = Math.max(1, Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.05);
    return { x: step, y: step };
  }
  return { x: 5, y: 5 };
}

/**
 * Re-key edge bulges after inserting a vertex following `afterIndex`. The split
 * edge's arc is dropped (a curve can't be split without recomputation); edges
 * after the insertion shift up by one.
 */
export function reindexArcsAfterInsert(
  arcs: Record<string, number>,
  afterIndex: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(arcs)) {
    const i = Number(k);
    if (i === afterIndex) {
      continue;
    }
    out[String(i > afterIndex ? i + 1 : i)] = v;
  }
  return out;
}

/**
 * Re-key edge bulges after deleting vertex `index`. The two edges incident to
 * the removed vertex merge into one straight edge (their arcs are dropped);
 * later edges shift down by one.
 */
export function reindexArcsAfterDelete(
  arcs: Record<string, number>,
  index: number,
  n: number,
): Record<string, number> {
  const removedPrev = (index - 1 + n) % n;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(arcs)) {
    const i = Number(k);
    if (i === index || i === removedPrev) {
      continue;
    }
    out[String(i > index ? i - 1 : i)] = v;
  }
  return out;
}

/** Clone an element with a fresh id, shifted by (dx, dy), reparented if needed. */
export function offsetElement(
  el: PlanElement,
  dx: number,
  dy: number,
  layerExists: (id: string) => boolean,
  fallbackLayer: string,
): PlanElement {
  const layerId = layerExists(el.layerId) ? el.layerId : fallbackLayer;
  const id = createId(el.kind);
  if (isPointElement(el)) {
    return {
      ...el,
      id,
      layerId,
      position: { x: el.position.x + dx, y: el.position.y + dy },
    };
  }
  return {
    ...el,
    id,
    layerId,
    boundary: el.boundary.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  };
}
