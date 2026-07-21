import { distance, area as polygonArea, add, scale, subtract, length, type Point, type Polygon } from "../spatial/geometry";
import type { Lot } from "../spatial/primitives";

/**
 * Split a polygon by an infinite line passing through p1 and p2.
 * Returns [leftPolygon, rightPolygon] or null if no split occurs.
 * Left/Right are determined relative to the line direction p1 -> p2.
 */
export function splitPolygonByLine(polygon: Polygon, p1: Point, p2: Point): Polygon[] | null {
  const A = p2.y - p1.y;
  const B = p1.x - p2.x;
  const C = p2.x * p1.y - p1.x * p2.y;

  const left: Point[] = [];
  const right: Point[] = [];
  const n = polygon.length;
  if (n < 3) {return null;}

  const side = (p: Point) => A * p.x + B * p.y + C;

  for (let i = 0; i < n; i++) {
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];

    const sCurr = side(curr);
    const sNext = side(next);

    // Add current vertex to appropriate side(s)
    if (sCurr >= -1e-6) {
      left.push(curr);
    }
    if (sCurr <= 1e-6) {
      right.push(curr);
    }

    // Check for intersection on the edge curr -> next
    if ((sCurr > 1e-6 && sNext < -1e-6) || (sCurr < -1e-6 && sNext > 1e-6)) {
      const t = sCurr / (sCurr - sNext);
      const intersect = {
        x: curr.x + t * (next.x - curr.x),
        y: curr.y + t * (next.y - curr.y),
      };
      left.push(intersect);
      right.push(intersect);
    }
  }

  // Filter out duplicate consecutive vertices
  const clean = (pts: Point[]) => {
    const res: Point[] = [];
    for (const p of pts) {
      if (res.length === 0 || distance(p, res[res.length - 1]) > 1e-4) {
        res.push(p);
      }
    }
    if (res.length > 1 && distance(res[0], res[res.length - 1]) < 1e-4) {
      res.pop();
    }
    return res;
  };

  const cleanLeft = clean(left);
  const cleanRight = clean(right);

  if (cleanLeft.length < 3 || cleanRight.length < 3) {return null;}
  if (Math.abs(polygonArea(cleanLeft)) < 1e-3 || Math.abs(polygonArea(cleanRight)) < 1e-3) {return null;}

  return [cleanLeft, cleanRight];
}

import type { SlideLineOptions, SwingLineOptions } from "./types/subdivision";

export type { SlideLineOptions, SwingLineOptions };

/**
 * Slide Line Subdivision: Walk along a frontage path and slide a lot partition line
 * perpendicular (or at an angle) to the frontage to cut off a lot of targetArea.
 */
export function subdivideSlideLine(boundary: Polygon, options: SlideLineOptions): Lot[] {
  const { targetArea, frontage, angle = 90, layerId, makeId, setback } = options;
  if (frontage.length < 2) {
    throw new Error("Invalid frontage: must contain at least 2 points.");
  }
  if (targetArea <= 0) {
    throw new Error("Invalid target area: must be greater than 0.");
  }
  const totalArea = polygonArea(boundary);
  if (targetArea > totalArea) {
    throw new Error(`Unrealistic subdivision: target area (${targetArea.toFixed(2)}) exceeds total parcel area (${totalArea.toFixed(2)}).`);
  }
  if (totalArea < 10) {
    throw new Error("Parcel area is too small to subdivide.");
  }

  let remainder = boundary.slice();
  const lots: Lot[] = [];

  // Iterate along the frontage segments
  for (let idx = 0; idx < frontage.length - 1; idx++) {
    const startPt = frontage[idx];
    const endPt = frontage[idx + 1];
    
    // Frontage direction vector
    const ab = subtract(endPt, startPt);
    const segLen = length(ab);
    if (segLen < 1e-4) {continue;}

    const dx = ab.x;
    const dy = ab.y;

    // Angle of partition line in radians
    const theta = Math.atan2(dy, dx) + (angle * Math.PI) / 180;
    const px = Math.cos(theta);
    const py = Math.sin(theta);

    // We do binary search over t in [0, 1] to find the exact slide distance
    const getSplit = (t: number) => {
      const splitPt = { x: startPt.x + t * dx, y: startPt.y + t * dy };
      const p2 = { x: splitPt.x + px, y: splitPt.y + py };
      const split = splitPolygonByLine(remainder, splitPt, p2);
      if (!split) {return null;}

      // Line equation to check which side contains the frontage start point
      const lineA = p2.y - splitPt.y;
      const lineB = splitPt.x - p2.x;
      const lineC = p2.x * splitPt.y - splitPt.x * p2.y;

      const sideF0 = lineA * frontage[0].x + lineB * frontage[0].y + lineC;
      const containsFrontStart = sideF0 >= 0;

      return containsFrontStart ? { lot: split[0], rem: split[1] } : { lot: split[1], rem: split[0] };
    };

    // First check: does the whole remainder segment fit?
    const maxSplit = getSplit(1);
    if (maxSplit && polygonArea(maxSplit.lot) < targetArea) {
      // Entire segment does not have enough area to meet targetArea,
      // so we cut at t=1, create a lot, and update remainder to the rest
      lots.push({
        id: makeId(),
        kind: "lot",
        name: `Lot ${lots.length + 1}`,
        layerId,
        boundary: maxSplit.lot,
        setback,
      });
      remainder = maxSplit.rem;
      continue;
    }

    // Binary search for t in [0, 1]
    let low = 0;
    let high = 1;
    let bestLot: Polygon | null = null;
    let bestRem: Polygon | null = null;
    
    for (let iter = 0; iter < 20; iter++) {
      const mid = (low + high) / 2;
      const res = getSplit(mid);
      if (!res) {
        high = mid; // split failed, try smaller t
        continue;
      }
      const area = polygonArea(res.lot);
      if (Math.abs(area - targetArea) < 1e-2) {
        bestLot = res.lot;
        bestRem = res.rem;
        break;
      }
      if (area < targetArea) {
        low = mid;
      } else {
        high = mid;
        bestLot = res.lot;
        bestRem = res.rem;
      }
    }

    if (bestLot && bestRem) {
      lots.push({
        id: makeId(),
        kind: "lot",
        name: `Lot ${lots.length + 1}`,
        layerId,
        boundary: bestLot,
        setback,
      });
      remainder = bestRem;
      break;
    }
  }

  return lots;
}



/**
 * Swing Line Subdivision: Pivot a partition line from a fixed point on the parcel boundary
 * and binary search the sweep fraction s in [0, 1] between the two adjacent corner edges.
 */
export function subdivideSwingLine(boundary: Polygon, options: SwingLineOptions): Lot[] {
  const { targetArea, pivot, layerId, makeId, setback } = options;
  if (boundary.length < 3) {
    throw new Error("Invalid boundary: must contain at least 3 points.");
  }
  if (targetArea <= 0) {
    throw new Error("Invalid target area: must be greater than 0.");
  }
  const totalArea = polygonArea(boundary);
  if (targetArea > totalArea) {
    throw new Error(`Unrealistic subdivision: target area (${targetArea.toFixed(2)}) exceeds total parcel area (${totalArea.toFixed(2)}).`);
  }

  // Find pivot vertex index in boundary
  let idx = -1;
  let minDist = Infinity;
  for (let i = 0; i < boundary.length; i++) {
    const d = distance(boundary[i], pivot);
    if (d < minDist) {
      minDist = d;
      idx = i;
    }
  }

  let prevPt: Point;
  let nextPt: Point;
  if (minDist > 1e-2) {
    // Pivot is on an edge. Find the edge.
    let edgeIdx = 0;
    let minEdgeDist = Infinity;
    for (let i = 0; i < boundary.length; i++) {
      const p1 = boundary[i];
      const p2 = boundary[(i + 1) % boundary.length];
      const ab = subtract(p2, p1);
      const len = length(ab);
      if (len < 1e-4) {continue;}
      const dx = ab.x;
      const dy = ab.y;
      const t = ((pivot.x - p1.x) * dx + (pivot.y - p1.y) * dy) / (len * len);
      if (t >= 0 && t <= 1) {
        const pLoc = add(p1, scale(ab, t));
        const d = distance(pivot, pLoc);
        if (d < minEdgeDist) {
          minEdgeDist = d;
          edgeIdx = i;
        }
      }
    }
    prevPt = boundary[edgeIdx];
    nextPt = boundary[(edgeIdx + 1) % boundary.length];
  } else {
    const n = boundary.length;
    prevPt = boundary[(idx - 1 + n) % n];
    nextPt = boundary[(idx + 1) % n];
  }

  // Angles to prev and next vertices
  const v1 = subtract(prevPt, pivot);
  const v2 = subtract(nextPt, pivot);
  const theta1 = Math.atan2(v1.y, v1.x);
  const theta2 = Math.atan2(v2.y, v2.x);

  // Compute interior sweep angle
  let sweepAngle = theta2 - theta1;
  while (sweepAngle <= -Math.PI) {sweepAngle += 2 * Math.PI;}
  while (sweepAngle > Math.PI) {sweepAngle -= 2 * Math.PI;}

  const getSplit = (s: number) => {
    const rad = theta1 + s * sweepAngle;
    const dir = { x: Math.cos(rad), y: Math.sin(rad) };
    const p2 = add(pivot, dir);
    const split = splitPolygonByLine(boundary, pivot, p2);
    if (!split) {return null;}

    // Line equation to find which side contains prevPt
    const lineA = p2.y - pivot.y;
    const lineB = pivot.x - p2.x;
    const lineC = p2.x * pivot.y - pivot.x * p2.y;
    
    const sidePrev = lineA * prevPt.x + lineB * prevPt.y + lineC;
    const containsPrev = sidePrev >= 0;
    
    return containsPrev ? { lot: split[0], rem: split[1] } : { lot: split[1], rem: split[0] };
  };

  // Binary search sweep fraction s in [0, 1]
  let low = 0;
  let high = 1;
  let bestLot: Polygon | null = null;

  for (let iter = 0; iter < 20; iter++) {
    const mid = (low + high) / 2;
    const res = getSplit(mid);
    if (!res) {
      if (mid < 0.5) {
        low = mid;
      } else {
        high = mid;
      }
      continue;
    }
    const area = polygonArea(res.lot);
    if (Math.abs(area - targetArea) < 1e-2) {
      bestLot = res.lot;
      break;
    }
    if (area < targetArea) {
      low = mid;
    } else {
      high = mid;
      bestLot = res.lot;
    }
  }

  if (bestLot) {
    return [{
      id: makeId(),
      kind: "lot",
      name: `Lot ${boundary.length + 1}`,
      layerId,
      boundary: bestLot,
      setback,
    }];
  }

  return [];
}

/**
 * Merge adjacent lots by dissolving their shared boundaries.
 * Collects edges, discards matching reverse edges, and reconstructs the outer loop.
 */
export function mergeLots(lots: Lot[], layerId: string, makeId: () => string): Lot {
  if (lots.length === 0) {
    throw new Error("No lots provided for merge");
  }
  if (lots.length === 1) {return { ...lots[0] };}

  const pointKey = (p: Point) => `${Math.round(p.x * 1000)}:${Math.round(p.y * 1000)}`;

  interface DirectedEdge {
    from: Point;
    to: Point;
    keyFrom: string;
    keyTo: string;
  }
  const allEdges: DirectedEdge[] = [];
  const edgeCounts = new Map<string, number>();

  for (const lot of lots) {
    const poly = lot.boundary;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const from = poly[i];
      const to = poly[(i + 1) % n];
      const kFrom = pointKey(from);
      const kTo = pointKey(to);
      allEdges.push({ from, to, keyFrom: kFrom, keyTo: kTo });

      const normKey = kFrom < kTo ? `${kFrom}_${kTo}` : `${kTo}_${kFrom}`;
      edgeCounts.set(normKey, (edgeCounts.get(normKey) ?? 0) + 1);
    }
  }

  const outerEdges = allEdges.filter((e) => {
    const normKey = e.keyFrom < e.keyTo ? `${e.keyFrom}_${e.keyTo}` : `${e.keyTo}_${e.keyFrom}`;
    return edgeCounts.get(normKey) === 1;
  });

  if (outerEdges.length < 3) {
    throw new Error("Invalid adjacent lot layout: no outer boundary found");
  }

  const nextEdgeMap = new Map<string, DirectedEdge>();
  for (const e of outerEdges) {
    nextEdgeMap.set(e.keyFrom, e);
  }

  const boundaryPoints: Point[] = [];
  const startEdge = outerEdges[0];
  let currEdge: DirectedEdge | undefined = startEdge;
  const visited = new Set<DirectedEdge>();

  while (currEdge && !visited.has(currEdge)) {
    visited.add(currEdge);
    boundaryPoints.push(currEdge.from);
    currEdge = nextEdgeMap.get(currEdge.keyTo);
  }

  if (visited.size < outerEdges.length || boundaryPoints.length < 3) {
    throw new Error("Cannot merge disjoint lots: boundaries do not connect");
  }

  return {
    id: makeId(),
    kind: "lot",
    name: `Merged Lot`,
    layerId,
    boundary: boundaryPoints,
    setback: lots[0].setback,
  };
}
