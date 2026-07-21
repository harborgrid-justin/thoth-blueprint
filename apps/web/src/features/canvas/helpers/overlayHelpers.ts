import {
  contourLevels,
  slopeAtNode,
  stitchContours,
  type ElevationGrid,
  type InfrastructureNetwork,
  type Point,
} from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";
import { slopeColor } from "./canvasHelpers";

export interface UnderlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeUnderlayBounds(
  underlay: import("@/store/interopStore").Underlay,
  viewport: Viewport,
): UnderlayRect {
  const tl = worldToScreen(
    { x: underlay.bounds.minX, y: underlay.bounds.minY },
    viewport,
  );
  const br = worldToScreen(
    { x: underlay.bounds.maxX, y: underlay.bounds.maxY },
    viewport,
  );
  return {
    x: Math.min(tl.x, br.x),
    y: Math.min(tl.y, br.y),
    width: Math.abs(br.x - tl.x),
    height: Math.abs(br.y - tl.y),
  };
}

export interface CloudDotItem {
  key: number;
  cx: number;
  cy: number;
  fill: string;
}

export function computeCloudDots(
  points: Array<{ x: number; y: number; r?: number; g?: number; b?: number }>,
  viewport: Viewport,
): CloudDotItem[] {
  const MAX = 6000;
  const stride = Math.max(1, Math.ceil(points.length / MAX));
  const dots: CloudDotItem[] = [];

  for (let i = 0; i < points.length; i += stride) {
    const p = points[i];
    const s = worldToScreen(p, viewport);
    const fill =
      p.r != null ? `rgb(${p.r},${p.g ?? p.r},${p.b ?? p.r})` : "#38bdf8";
    dots.push({ key: i, cx: s.x, cy: s.y, fill });
  }

  return dots;
}

export interface SlopeCellItem {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export function computeSlopeCells(
  surface: ElevationGrid,
  viewport: Viewport,
  showSlope: boolean,
): SlopeCellItem[] {
  const cellPx = surface.cellSize * viewport.zoom;
  if (!showSlope || cellPx < 2) {
    return [];
  }

  const cells: SlopeCellItem[] = [];
  for (let r = 0; r < surface.rows - 1; r++) {
    for (let c = 0; c < surface.cols - 1; c++) {
      const pct =
        (slopeAtNode(surface, c, r).percent +
          slopeAtNode(surface, c + 1, r).percent +
          slopeAtNode(surface, c, r + 1).percent +
          slopeAtNode(surface, c + 1, r + 1).percent) /
        4;
      const s = worldToScreen(
        {
          x: surface.origin.x + c * surface.cellSize,
          y: surface.origin.y + r * surface.cellSize,
        },
        viewport,
      );
      cells.push({
        key: `${c}-${r}`,
        x: s.x,
        y: s.y,
        width: cellPx + 0.5,
        height: cellPx + 0.5,
        fill: slopeColor(pct),
      });
    }
  }

  return cells;
}

export interface ContourPathItem {
  key: string;
  d: string;
  strokeOpacity: number;
  strokeWidth: number;
}

export function computeContourPaths(
  surface: ElevationGrid,
  viewport: Viewport,
  showContours: boolean,
  interval: number,
): ContourPathItem[] {
  if (!showContours || interval <= 0) {
    return [];
  }

  const items: ContourPathItem[] = [];
  const levels = contourLevels(surface, interval);

  for (const { level, segments } of levels) {
    const lines = stitchContours(segments);
    const index = Math.round(level / interval) % 5 === 0;
    for (let i = 0; i < lines.length; i++) {
      const d = lines[i]
        .map((p, j) => {
          const s = worldToScreen(p, viewport);
          return `${j === 0 ? "M" : "L"}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
        })
        .join(" ");
      items.push({
        key: `${level}-${i}`,
        d,
        strokeOpacity: index ? 0.85 : 0.45,
        strokeWidth: index ? 1.4 : 0.8,
      });
    }
  }

  return items;
}

export interface NetworkEdgeItem {
  id: string;
  sa: Point;
  sb: Point;
  widthPx: number;
}

export interface NetworkNodeItem {
  id: string;
  cx: number;
  cy: number;
}

export interface NetworkShapeData {
  edges: NetworkEdgeItem[];
  nodes: NetworkNodeItem[];
  isRoad: boolean;
  color: string;
}

export function computeNetworkShapeData(
  network: InfrastructureNetwork,
  viewport: Viewport,
): NetworkShapeData {
  const nodeMap = new Map(network.nodes.map((n) => [n.id, n]));
  const isRoad = network.kind === "road";
  const color =
    network.kind === "road"
      ? "#334155"
      : network.kind === "water"
        ? "#0ea5e9"
        : network.kind === "sewer"
          ? "#84cc16"
          : network.kind === "storm"
            ? "#06b6d4"
            : network.kind === "power"
              ? "#eab308"
              : "#64748b";

  const edges: NetworkEdgeItem[] = [];
  for (const e of network.edges) {
    const a = nodeMap.get(e.from);
    const b = nodeMap.get(e.to);
    if (!a || !b) {
      continue;
    }
    const sa = worldToScreen(a.point, viewport);
    const sb = worldToScreen(b.point, viewport);
    const widthPx = isRoad ? Math.max(2, (e.width ?? 15) * viewport.zoom) : 2;
    edges.push({ id: e.id, sa, sb, widthPx });
  }

  const nodes: NetworkNodeItem[] = network.nodes.map((n) => {
    const s = worldToScreen(n.point, viewport);
    return { id: n.id, cx: s.x, cy: s.y };
  });

  return { edges, nodes, isRoad, color };
}
