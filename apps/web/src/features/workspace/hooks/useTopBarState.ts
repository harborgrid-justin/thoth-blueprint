import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";
import { useFindStore } from "@/store/findStore";
import { useTheme } from "@/theme/theme-provider";

export function useTopBarState() {
  const projectName = useWorkspaceStore((s) => s.projectName);
  const dirty = useWorkspaceStore((s) => s.dirty);
  const renovationMode = useWorkspaceStore((s) => s.renovationMode);
  const toggleRenovationMode = useWorkspaceStore((s) => s.toggleRenovationMode);
  const activeRenovationCategory = useWorkspaceStore(
    (s) => s.activeRenovationCategory,
  );
  const setActiveRenovationCategory = useWorkspaceStore(
    (s) => s.setActiveRenovationCategory,
  );
  const { theme, toggleTheme } = useTheme();

  const {
    viewport,
    zoomBy,
    requestFit,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    showSurveyLabels,
    toggleSurveyLabels,
    viewMode,
    setViewMode,
  } = useCanvasStore();

  const openPlat = useUiStore((s) => s.openPlat);
  const setAlignmentOpen = useUiStore((s) => s.setAlignmentOpen);
  const setSheetOpen = useUiStore((s) => s.setSheetOpen);
  const setSheetSetOpen = useUiStore((s) => s.setSheetSetOpen);
  const toggleCommand = useUiStore((s) => s.toggleCommand);
  const setPrefsOpen = useUiStore((s) => s.setPrefsOpen);
  const setSuperelevationOpen = useUiStore((s) => s.setSuperelevationOpen);
  const setCorridorOpen = useUiStore((s) => s.setCorridorOpen);
  const setGradingOpen = useUiStore((s) => s.setGradingOpen);
  const setProfileOpen = useUiStore((s) => s.setProfileOpen);
  const setPipeOpen = useUiStore((s) => s.setPipeOpen);
  const setProductionOpen = useUiStore((s) => s.setProductionOpen);
  const setCogoOpen = useUiStore((s) => s.setCogoOpen);
  const handDrawnMode = useUiStore((s) => s.handDrawnMode);
  const toggleHandDrawnMode = useUiStore((s) => s.toggleHandDrawnMode);
  const setPanoramaOpen = useUiStore((s) => s.setPanoramaOpen);
  const setModelBuilderOpen = useUiStore((s) => s.setModelBuilderOpen);
  const setLineworkOpen = useUiStore((s) => s.setLineworkOpen);
  const setParcelLayoutOpen = useUiStore((s) => s.setParcelLayoutOpen);
  const setSectionGridOpen = useUiStore((s) => s.setSectionGridOpen);
  const setScriptsOpen = useUiStore((s) => s.setScriptsOpen);
  const setRoadStudioOpen = useUiStore((s) => s.setRoadStudioOpen);
  const setAssemblyOpen = useUiStore((s) => s.setAssemblyOpen);
  const setSubdivisionStudioOpen = useUiStore((s) => s.setSubdivisionStudioOpen);
  const setGradingStudioOpen = useUiStore((s) => s.setGradingStudioOpen);
  const setPipeStudioOpen = useUiStore((s) => s.setPipeStudioOpen);
  const setModelBuilderStudioOpen = useUiStore((s) => s.setModelBuilderStudioOpen);
  const setSurveyCogoStudioOpen = useUiStore((s) => s.setSurveyCogoStudioOpen);
  const workspaceLayout = useUiStore((s) => s.workspaceLayout);
  const toggleWorkspaceLayout = useUiStore((s) => s.toggleWorkspaceLayout);
  const openFind = useFindStore((s) => s.openFind);

  return {
    projectName,
    dirty,
    renovationMode,
    toggleRenovationMode,
    activeRenovationCategory,
    setActiveRenovationCategory,
    theme,
    toggleTheme,
    viewport,
    zoomBy,
    requestFit,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    showSurveyLabels,
    toggleSurveyLabels,
    viewMode,
    setViewMode,
    openPlat,
    setAlignmentOpen,
    setSheetOpen,
    setSheetSetOpen,
    toggleCommand,
    setPrefsOpen,
    setSuperelevationOpen,
    setCorridorOpen,
    setGradingOpen,
    setProfileOpen,
    setPipeOpen,
    setProductionOpen,
    setCogoOpen,
    handDrawnMode,
    toggleHandDrawnMode,
    openFind,
    setPanoramaOpen,
    setModelBuilderOpen,
    setLineworkOpen,
    setParcelLayoutOpen,
    setSectionGridOpen,
    setScriptsOpen,
    setRoadStudioOpen,
    setAssemblyOpen,
    setSubdivisionStudioOpen,
    setGradingStudioOpen,
    setPipeStudioOpen,
    setModelBuilderStudioOpen,
    setSurveyCogoStudioOpen,
    workspaceLayout,
    toggleWorkspaceLayout,
  };
}
