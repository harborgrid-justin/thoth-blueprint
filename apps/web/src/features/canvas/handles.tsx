import { type Polygon } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { type Viewport } from "./viewport";
import {
  getAlignmentHandlesPoints,
  getVertexHandlesPoints,
  getEdgeHandlesPoints,
} from "./handleHelpers";

export function AlignmentHandles({
  site,
  selection,
  viewport,
}: {
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>;
  selection: string[];
  viewport: Viewport;
}) {
  const points = getAlignmentHandlesPoints(site, selection, viewport);
  if (points.length === 0) {return null;}

  return (
    <g>
      {points.map((s, idx) => (
        <circle
          key={idx}
          cx={s.x}
          cy={s.y}
          r={5.5}
          fill="hsl(var(--background))"
          stroke="#b91c1c"
          strokeWidth={1.8}
          className="cursor-pointer hover:r-7"
        />
      ))}
    </g>
  );
}

export function VertexHandles({
  site,
  selection,
  viewport,
  preview,
}: {
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>;
  selection: string[];
  viewport: Viewport;
  preview: { id: string; boundary: Polygon } | null;
}) {
  const points = getVertexHandlesPoints(site, selection, viewport, preview);
  if (points.length === 0) {return null;}

  return (
    <g>
      {points.map((s, i) => (
        <rect
          key={i}
          x={s.x - 4}
          y={s.y - 4}
          width={8}
          height={8}
          rx={1.5}
          fill="hsl(var(--background))"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}

export function EdgeHandles({
  site,
  selection,
  viewport,
}: {
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>;
  selection: string[];
  viewport: Viewport;
}) {
  const handles = getEdgeHandlesPoints(site, selection, viewport);
  if (handles.length === 0) {return null;}

  return (
    <g>
      {handles.map((h, i) => (
        <rect
          key={i}
          x={h.x - 3.5}
          y={h.y - 3.5}
          width={7}
          height={7}
          transform={`rotate(45 ${h.x} ${h.y})`}
          fill={h.bulge ? "hsl(var(--primary))" : "hsl(var(--background))"}
          stroke="hsl(var(--primary))"
          strokeWidth={1.2}
          opacity={0.85}
        />
      ))}
    </g>
  );
}
