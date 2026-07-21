import { type ElevationGrid, type InfrastructureNetwork } from "@thoth/domain";
import { type Viewport } from "./helpers/viewport";
import {
  computeUnderlayBounds,
  computeCloudDots,
  computeSlopeCells,
  computeContourPaths,
  computeNetworkShapeData,
} from "./helpers/overlayHelpers";

export function UnderlayImage({
  underlay,
  viewport,
}: {
  underlay: import("@/store/interopStore").Underlay;
  viewport: Viewport;
}) {
  const rect = computeUnderlayBounds(underlay, viewport);
  return (
    <image
      href={underlay.url}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      opacity={underlay.opacity}
      preserveAspectRatio="none"
      className="pointer-events-none"
    />
  );
}

export function CloudDots({
  points,
  viewport,
}: {
  points: Array<{ x: number; y: number; r?: number; g?: number; b?: number }>;
  viewport: Viewport;
}) {
  const dots = computeCloudDots(points, viewport);
  return (
    <g className="pointer-events-none">
      {dots.map((dot) => (
        <circle key={dot.key} cx={dot.cx} cy={dot.cy} r={1.4} fill={dot.fill} />
      ))}
    </g>
  );
}

export function TerrainOverlay({
  surface,
  viewport,
  showSlope,
  showContours,
  interval,
}: {
  surface: ElevationGrid;
  viewport: Viewport;
  showSlope: boolean;
  showContours: boolean;
  interval: number;
}) {
  const slopeCells = computeSlopeCells(surface, viewport, showSlope);
  const contourEls = computeContourPaths(
    surface,
    viewport,
    showContours,
    interval,
  );

  return (
    <g className="pointer-events-none">
      {slopeCells.map((cell) => (
        <rect
          key={cell.key}
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
          fill={cell.fill}
          fillOpacity={0.5}
        />
      ))}
      {contourEls.map((item) => (
        <path
          key={item.key}
          d={item.d}
          fill="none"
          stroke="#a16207"
          strokeOpacity={item.strokeOpacity}
          strokeWidth={item.strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

export function NetworkShape({
  network,
  viewport,
}: {
  network: InfrastructureNetwork;
  viewport: Viewport;
}) {
  const { edges, nodes, isRoad, color } = computeNetworkShapeData(
    network,
    viewport,
  );

  return (
    <g className="pointer-events-none">
      {edges.map((e) => (
        <g key={e.id}>
          {isRoad && (
            <line
              x1={e.sa.x}
              y1={e.sa.y}
              x2={e.sb.x}
              y2={e.sb.y}
              stroke={color}
              strokeOpacity={0.35}
              strokeWidth={e.widthPx}
              strokeLinecap="round"
            />
          )}
          <line
            x1={e.sa.x}
            y1={e.sa.y}
            x2={e.sb.x}
            y2={e.sb.y}
            stroke={color}
            strokeWidth={isRoad ? 1.5 : 2}
            strokeDasharray={isRoad ? undefined : "6 4"}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
      {nodes.map((n) => (
        <circle key={n.id} cx={n.cx} cy={n.cy} r={2.5} fill={color} />
      ))}
    </g>
  );
}
