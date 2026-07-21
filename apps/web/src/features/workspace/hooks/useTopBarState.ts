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
  };
}
