import { type Polygon } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { type Viewport } from "./helpers/viewport";
import {
  getAlignmentHandlesPoints,
  getVertexHandlesPoints,
  getEdgeHandlesPoints,
} from "./helpers/handleHelpers";

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
  if (points.length === 0) {
    return null;
  }

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
          className="hover:r-7 cursor-pointer"
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
  if (points.length === 0) {
    return null;
  }

  return (
    <g>
      {points.map((s, i) => (
        <rect
          key={i}
          x={s.x - 4}
          y={s.y - 4}
          width={8}
          height={8}
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth={1}
          className="cad-hot-grip hover:scale-110"
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
  if (handles.length === 0) {
    return null;
  }

  return (
    <g>
      {handles.map((h, i) => (
        <rect
          key={i}
          x={h.x - 3.5}
          y={h.y - 3.5}
          width={7}
          height={7}
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth={1}
          transform={`rotate(45 ${h.x} ${h.y})`}
          className="cad-hot-grip hover:scale-125"
        />
      ))}
    </g>
  );
}
