import { type Polygon } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { usePrefsStore } from "@/store/prefsStore";
import { type Viewport } from "./helpers/viewport";
import {
  computeBoundaryDimensions,
  computeSurveyEdgeLabels,
} from "./helpers/boundaryHelpers";

export function BoundaryDimensions({
  site,
  viewport,
}: {
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>;
  viewport: Viewport;
}) {
  const lengthPref = usePrefsStore((s) => s.lengthUnit);
  const angleFormat = usePrefsStore((s) => s.angleFormat);
  const labels = computeBoundaryDimensions(site.elements, site.spatial, viewport, lengthPref, angleFormat);

  if (labels.length === 0) {return null;}

  return (
    <g className="pointer-events-none">
      {labels.map((item) => (
        <text
          key={item.key}
          x={item.x}
          y={item.y}
          transform={`rotate(${item.angle} ${item.x} ${item.y}) translate(0 ${item.translateY})`}
          fontSize={item.fontSize}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: item.strokeWidth }}
        >
          {item.label}
        </text>
      ))}
    </g>
  );
}

export function SurveyEdgeLabels({
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
  const lengthPref = usePrefsStore((s) => s.lengthUnit);
  const angleFormat = usePrefsStore((s) => s.angleFormat);

  if (selection.length !== 1) {return null;}
  const element = site.elements.find((e) => e.id === selection[0]);
  const labels = computeSurveyEdgeLabels(element, site.spatial, viewport, preview, lengthPref, angleFormat);

  if (labels.length === 0) {return null;}

  return (
    <g className="pointer-events-none">
      {labels.map((item) => (
        <text
          key={item.key}
          x={item.x}
          y={item.y}
          transform={`rotate(${item.angle} ${item.x} ${item.y}) translate(0 ${item.translateY})`}
          fontSize={item.fontSize}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: item.strokeWidth }}
        >
          {item.label}
        </text>
      ))}
    </g>
  );
}
