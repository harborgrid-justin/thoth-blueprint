import * as React from "react";
import { toolDef } from "@/lib/tools";
import { buildTerrainModel } from "@/features/terrain/terrainModel";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useInteropStore } from "@/store/interopStore";
import { useFindStore } from "@/store/findStore";

export function usePlanningCanvasState() {
  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const hoveredElementId = useWorkspaceStore((s) => s.hoveredElementId);
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const select = useWorkspaceStore((s) => s.select);
  const moveSelection = useWorkspaceStore((s) => s.moveSelection);
  const updateBoundary = useWorkspaceStore((s) => s.updateBoundary);
  const addDrawnElement = useWorkspaceStore((s) => s.addDrawnElement);
  const addPointElement = useWorkspaceStore((s) => s.addPointElement);
  const addNetworkPath = useWorkspaceStore((s) => s.addNetworkPath);
  const addAlignment = useWorkspaceStore((s) => s.addAlignment);
  const insertVertex = useWorkspaceStore((s) => s.insertVertex);
  const deleteVertex = useWorkspaceStore((s) => s.deleteVertex);
  const setEdgeBulge = useWorkspaceStore((s) => s.setEdgeBulge);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const viewFrames = useWorkspaceStore((s) => s.viewFrames ?? []);
  const matchLines = useWorkspaceStore((s) => s.matchLines ?? []);

  // Find & filter: dim non-matching elements when canvas filtering is on.
  const findQuery = useFindStore((s) => s.query);
  const findKind = useFindStore((s) => s.kind);
  const findFilter = useFindStore((s) => s.filterOnCanvas);
  const findActive = findFilter && (findQuery.trim().length > 0 || findKind !== "all");

  const {
    showGrid,
    showLabels,
    showSurveyLabels,
    showDimensions,
    showGridBubbles,
    showAnnotations,
    showInteriors,
    showNetworks,
    showContours,
    showSlope,
    showProposed,
    contourInterval,
    snapToGrid,
    snapToVertices,
  } = useCanvasStore();

  const terrain = React.useMemo(() => (site ? buildTerrainModel(site) : null), [site]);
  const terrainSurface = showProposed ? terrain?.proposed : terrain?.existing;

  const underlay = useInteropStore((s) => s.underlay);
  const clouds = useInteropStore((s) => s.clouds);

  const tool = toolDef(activeTool);

  return {
    site,
    selection,
    hoveredElementId,
    activeTool,
    select,
    moveSelection,
    updateBoundary,
    addDrawnElement,
    addPointElement,
    addNetworkPath,
    addAlignment,
    insertVertex,
    deleteVertex,
    setEdgeBulge,
    setTool,
    viewFrames,
    matchLines,
    findQuery,
    findKind,
    findActive,
    showGrid,
    showLabels,
    showSurveyLabels,
    showDimensions,
    showGridBubbles,
    showAnnotations,
    showInteriors,
    showNetworks,
    showContours,
    showSlope,
    contourInterval,
    snapToGrid,
    snapToVertices,
    terrainSurface,
    underlay,
    clouds,
    tool,
  };
}
