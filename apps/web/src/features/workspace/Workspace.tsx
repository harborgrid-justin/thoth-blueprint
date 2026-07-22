import * as React from "react";
import {
  Layers,
  Mountain,
  Ruler,
  SlidersHorizontal,
  HardHat,
  Waves,
  Loader2,
  FolderTree,
} from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { PlanningCanvas } from "@/features/canvas/PlanningCanvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AliasMappingDialog } from "./AliasMappingDialog";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { LayerPanel } from "./LayerPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { FindPanel } from "@/features/find/FindPanel";
import { CommandLine } from "@/features/command/CommandLine";
import { StatusBar } from "./StatusBar";
import { ViewportControls } from "./ViewportControls";
import { useWorkspaceLayoutState } from "./hooks/useWorkspaceLayoutState";
import { useUiStore } from "@/store/uiStore";

// Lazy-loaded dialogs & panels to optimize bundle sizes and speed up initialization
const Scene3D = React.lazy(() =>
  import("@/features/canvas3d/Scene3D").then((m) => ({ default: m.Scene3D })),
);
const TerrainPanel = React.lazy(() =>
  import("@/features/terrain/TerrainPanel").then((m) => ({
    default: m.TerrainPanel,
  })),
);
const MetricsPanel = React.lazy(() =>
  import("./MetricsPanel").then((m) => ({ default: m.MetricsPanel })),
);
const QtoPanel = React.lazy(() =>
  import("./QtoPanel").then((m) => ({ default: m.QtoPanel })),
);
const ErosionSimulatorPanel = React.lazy(() =>
  import("./ErosionSimulator").then((m) => ({
    default: m.ErosionSimulatorPanel,
  })),
);

const CheckpointsDialog = React.lazy(() =>
  import("./CheckpointsDialog").then((m) => ({ default: m.CheckpointsDialog })),
);
const PlatReportDialog = React.lazy(() =>
  import("@/features/survey/PlatReportDialog").then((m) => ({
    default: m.PlatReportDialog,
  })),
);
const AlignmentReportDialog = React.lazy(() =>
  import("@/features/survey/AlignmentReportDialog").then((m) => ({
    default: m.AlignmentReportDialog,
  })),
);
const ProfileSectionDialog = React.lazy(() =>
  import("@/features/survey/ProfileSectionDialog").then((m) => ({
    default: m.ProfileSectionDialog,
  })),
);
const PipeDesignDialog = React.lazy(() =>
  import("@/features/survey/PipeDesignDialog").then((m) => ({
    default: m.PipeDesignDialog,
  })),
);
const PlanProductionWizard = React.lazy(() =>
  import("@/features/survey/PlanProductionWizard").then((m) => ({
    default: m.PlanProductionWizard,
  })),
);
const SuperelevationWizardDialog = React.lazy(() =>
  import("@/features/survey/SuperelevationWizardDialog").then((m) => ({
    default: m.SuperelevationWizardDialog,
  })),
);
const CorridorDesignerDialog = React.lazy(() =>
  import("@/features/survey/CorridorDesignerDialog").then((m) => ({
    default: m.CorridorDesignerDialog,
  })),
);
const GradingSolverDialog = React.lazy(() =>
  import("@/features/survey/GradingSolverDialog").then((m) => ({
    default: m.GradingSolverDialog,
  })),
);
const PlatSheetDialog = React.lazy(() =>
  import("@/features/survey/PlatSheetDialog").then((m) => ({
    default: m.PlatSheetDialog,
  })),
);
const SheetSetDialog = React.lazy(() =>
  import("@/features/sheets/SheetSetDialog").then((m) => ({
    default: m.SheetSetDialog,
  })),
);
const CommandPalette = React.lazy(() =>
  import("@/features/command/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
const ShortcutsDialog = React.lazy(() =>
  import("@/features/command/ShortcutsDialog").then((m) => ({
    default: m.ShortcutsDialog,
  })),
);
const PreferencesDialog = React.lazy(() =>
  import("@/features/preferences/PreferencesDialog").then((m) => ({
    default: m.PreferencesDialog,
  })),
);
const MetesAndBoundsDialog = React.lazy(() =>
  import("@/features/survey/MetesAndBoundsDialog").then((m) => ({
    default: m.MetesAndBoundsDialog,
  })),
);
const SubdivisionBuilderDialog = React.lazy(() =>
  import("@/features/survey/SubdivisionBuilderDialog").then((m) => ({
    default: m.SubdivisionBuilderDialog,
  })),
);

// Civil 3D Suite & Feature Dialogs
const CivilStudioWorkspace = React.lazy(() =>
  import("@/features/civil/CivilStudioWorkspace").then((m) => ({
    default: m.CivilStudioWorkspace,
  })),
);
const ProspectorTreePalette = React.lazy(() =>
  import("@/features/civil/ProspectorTreePalette").then((m) => ({
    default: m.ProspectorTreePalette,
  })),
);
const PanoramaElevationEditorDialog = React.lazy(() =>
  import("@/features/civil/PanoramaElevationEditorDialog").then((m) => ({
    default: m.PanoramaElevationEditorDialog,
  })),
);
const ModelBuilderGISDialog = React.lazy(() =>
  import("@/features/civil/ModelBuilderGISDialog").then((m) => ({
    default: m.ModelBuilderGISDialog,
  })),
);
const AdvancedLineworkGeometryDialog = React.lazy(() =>
  import("@/features/civil/AdvancedLineworkGeometryDialog").then((m) => ({
    default: m.AdvancedLineworkGeometryDialog,
  })),
);
const ParcelSizingLayoutDialog = React.lazy(() =>
  import("@/features/civil/ParcelSizingLayoutDialog").then((m) => ({
    default: m.ParcelSizingLayoutDialog,
  })),
);
const SectionPlottingGridDialog = React.lazy(() =>
  import("@/features/civil/SectionPlottingGridDialog").then((m) => ({
    default: m.SectionPlottingGridDialog,
  })),
);
const Scripts3DObjectsDialog = React.lazy(() =>
  import("@/features/civil/Scripts3DObjectsDialog").then((m) => ({
    default: m.Scripts3DObjectsDialog,
  })),
);
const RoadDesignStudioDialog = React.lazy(() =>
  import("@/features/survey/RoadDesignStudioDialog").then((m) => ({
    default: m.RoadDesignStudioDialog,
  })),
);
const AssemblyBuilderPanel = React.lazy(() =>
  import("@/features/survey/AssemblyBuilderPanel").then((m) => ({
    default: m.AssemblyBuilderPanel,
  })),
);
const SubdivisionStudioDialog = React.lazy(() =>
  import("@/features/survey/SubdivisionStudioDialog").then((m) => ({
    default: m.SubdivisionStudioDialog,
  })),
);
const GradingStudioDialog = React.lazy(() =>
  import("@/features/civil/GradingStudioDialog").then((m) => ({
    default: m.GradingStudioDialog,
  })),
);
const PipeNetworkStudioDialog = React.lazy(() =>
  import("@/features/survey/PipeNetworkStudioDialog").then((m) => ({
    default: m.PipeNetworkStudioDialog,
  })),
);
const ModelBuilderStudioDialog = React.lazy(() =>
  import("@/features/civil/ModelBuilderStudioDialog").then((m) => ({
    default: m.ModelBuilderStudioDialog,
  })),
);
const SurveyCogoStudioDialog = React.lazy(() =>
  import("@/features/survey/SurveyCogoStudioDialog").then((m) => ({
    default: m.SurveyCogoStudioDialog,
  })),
);

export function Workspace() {
  const {
    project,
    loading,
    saving,
    error,
    site,
    tab,
    setTab,
    sidebarWidth,
    onSidebarPointerDown,
    onSidebarPointerMove,
    onSidebarPointerUp,
    checkpointsOpen,
    setCheckpointsOpen,
    save,
    commandActions,
    // Dialog states
    platOpen,
    alignmentOpen,
    profileOpen,
    pipeOpen,
    productionOpen,
    superelevationOpen,
    corridorOpen,
    gradingOpen,
    sheetOpen,
    sheetSetOpen,
    commandOpen,
    shortcutsOpen,
    prefsOpen,
    cogoOpen,
    panoramaOpen,
    modelBuilderOpen,
    lineworkOpen,
    parcelLayoutOpen,
    sectionGridOpen,
    scriptsOpen,
    roadStudioOpen,
    assemblyOpen,
    subdivisionStudioOpen,
    gradingStudioOpen,
    pipeStudioOpen,
    modelBuilderStudioOpen,
    surveyCogoStudioOpen,
    workspaceLayout,
  } = useWorkspaceLayoutState();

  const [aliasOpen, setAliasOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // alt + a to open alias mapping
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAliasOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Initialize workspace from DB ID
  React.useEffect(() => {
    useCanvasStore.getState().setCursor(null);
  }, []);

  if (loading) {
    return <CenterMessage>Loading project…</CenterMessage>;
  }
  if (error || !site) {
    return <CenterMessage>Could not load this project.</CenterMessage>;
  }

  if (workspaceLayout === "civil-studio") {
    return (
      <React.Suspense fallback={<CenterMessage>Loading Civil 3D Studio Workspace…</CenterMessage>}>
        <CivilStudioWorkspace />
      </React.Suspense>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        {/* Edge-to-edge canvas */}
        <main className="absolute inset-0 z-0">
          <CanvasArea />
          <FindPanel />
        </main>

        {/* Floating TopBar */}
        <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
          <div className="pointer-events-auto glass-panel rounded-xl overflow-hidden shadow-sm">
            <TopBar
              project={project}
              saving={saving}
              onSave={() => void save()}
              onOpenCheckpoints={() => setCheckpointsOpen(true)}
            />
          </div>
        </div>

        {/* Floating Toolbar */}
        <div className="absolute top-20 left-4 bottom-4 z-10 pointer-events-none flex">
          <div className="pointer-events-auto glass-panel rounded overflow-hidden shadow-lg p-1 flex">
            <Toolbar />
          </div>
        </div>

        <ViewportControls />
        <CommandLine />
        <StatusBar />

        {/* Floating Sidebar (Properties / Layers / etc.) */}
        <div className="absolute top-20 right-4 bottom-4 z-10 flex pointer-events-none">
          {/* Resize handle */}
          <div
            className="w-3 shrink-0 cursor-col-resize pointer-events-auto flex items-center justify-center group"
            onPointerDown={onSidebarPointerDown}
            onPointerMove={onSidebarPointerMove}
            onPointerUp={onSidebarPointerUp}
          >
            <div className="h-12 w-1 rounded-full bg-border/40 group-hover:bg-primary transition-colors duration-200" />
          </div>

          <aside
            style={{ width: sidebarWidth }}
            className="flex flex-col glass-panel rounded-xl pointer-events-auto ml-1 overflow-hidden shadow-2xl"
          >
            <Tabs
              value={tab}
              onValueChange={setTab}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="m-2 grid grid-cols-7 bg-muted/50 rounded-lg">
                <TabsTrigger value="inspect" title="Inspect" className="rounded-md">
                  <SlidersHorizontal className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="prospector" title="Prospector Tree" className="rounded-md">
                  <FolderTree className="h-4 w-4 text-cyan-400" />
                </TabsTrigger>
                <TabsTrigger value="layers" title="Layers" className="rounded-md">
                  <Layers className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="terrain" title="Terrain" className="rounded-md">
                  <Mountain className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="metrics" title="Metrics" className="rounded-md">
                  <Ruler className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="qto" title="QTO" className="rounded-md">
                  <HardHat className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="erosion" title="Erosion" className="rounded-md">
                  <Waves className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
              <ScrollArea className="min-h-0 flex-1">
                <TabsContent value="inspect" className="mt-0">
                  <PropertiesPanel />
                </TabsContent>
                <TabsContent value="prospector" className="mt-0">
                  {tab === "prospector" && (
                    <React.Suspense fallback={<TabLoading label="prospector tree" />}>
                      <ProspectorTreePalette />
                    </React.Suspense>
                  )}
                </TabsContent>
                <TabsContent value="layers" className="mt-0 py-2">
                  <LayerPanel />
                </TabsContent>
                <TabsContent value="terrain" className="mt-0">
                  {tab === "terrain" && (
                    <React.Suspense fallback={<TabLoading label="terrain" />}>
                      <TerrainPanel />
                    </React.Suspense>
                  )}
                </TabsContent>
                <TabsContent value="metrics" className="mt-0">
                  {tab === "metrics" && (
                    <React.Suspense fallback={<TabLoading label="metrics" />}>
                      <MetricsPanel />
                    </React.Suspense>
                  )}
                </TabsContent>
                <TabsContent value="qto" className="mt-0">
                  {tab === "qto" && (
                    <React.Suspense
                      fallback={<TabLoading label="quantities" />}
                    >
                      <QtoPanel />
                    </React.Suspense>
                  )}
                </TabsContent>
                <TabsContent value="erosion" className="mt-0">
                  {tab === "erosion" && (
                    <React.Suspense
                      fallback={<TabLoading label="erosion simulation" />}
                    >
                      <ErosionSimulatorPanel />
                    </React.Suspense>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </aside>
        </div>
        {checkpointsOpen && (
          <React.Suspense fallback={null}>
            <CheckpointsDialog
              open={checkpointsOpen}
              onOpenChange={setCheckpointsOpen}
            />
          </React.Suspense>
        )}
        {platOpen && (
          <React.Suspense fallback={null}>
            <PlatReportDialog />
          </React.Suspense>
        )}
        {alignmentOpen && (
          <React.Suspense fallback={null}>
            <AlignmentReportDialog />
          </React.Suspense>
        )}
        {profileOpen && (
          <React.Suspense fallback={null}>
            <ProfileSectionDialog />
          </React.Suspense>
        )}
        {pipeOpen && (
          <React.Suspense fallback={null}>
            <PipeDesignDialog />
          </React.Suspense>
        )}
        {productionOpen && (
          <React.Suspense fallback={null}>
            <PlanProductionWizard />
          </React.Suspense>
        )}
        {superelevationOpen && (
          <React.Suspense fallback={null}>
            <SuperelevationWizardDialog />
          </React.Suspense>
        )}
        {corridorOpen && (
          <React.Suspense fallback={null}>
            <CorridorDesignerDialog />
          </React.Suspense>
        )}
        {gradingOpen && (
          <React.Suspense fallback={null}>
            <GradingSolverDialog />
          </React.Suspense>
        )}
        {sheetOpen && (
          <React.Suspense fallback={null}>
            <PlatSheetDialog />
          </React.Suspense>
        )}
        {sheetSetOpen && (
          <React.Suspense fallback={null}>
            <SheetSetDialog />
          </React.Suspense>
        )}
        {commandOpen && (
          <React.Suspense fallback={null}>
            <CommandPalette actions={commandActions} />
          </React.Suspense>
        )}
        {shortcutsOpen && (
          <React.Suspense fallback={null}>
            <ShortcutsDialog />
          </React.Suspense>
        )}
        {prefsOpen && (
          <React.Suspense fallback={null}>
            <PreferencesDialog />
          </React.Suspense>
        )}
        {cogoOpen && (
          <React.Suspense fallback={null}>
            <MetesAndBoundsDialog />
          </React.Suspense>
        )}
        {panoramaOpen && (
          <React.Suspense fallback={null}>
            <PanoramaElevationEditorDialog
              isOpen={panoramaOpen}
              onClose={() => useUiStore.getState().setPanoramaOpen(false)}
            />
          </React.Suspense>
        )}
        {modelBuilderOpen && (
          <React.Suspense fallback={null}>
            <ModelBuilderGISDialog
              isOpen={modelBuilderOpen}
              onClose={() => useUiStore.getState().setModelBuilderOpen(false)}
            />
          </React.Suspense>
        )}
        {lineworkOpen && (
          <React.Suspense fallback={null}>
            <AdvancedLineworkGeometryDialog
              isOpen={lineworkOpen}
              onClose={() => useUiStore.getState().setLineworkOpen(false)}
            />
          </React.Suspense>
        )}
        {parcelLayoutOpen && (
          <React.Suspense fallback={null}>
            <ParcelSizingLayoutDialog
              isOpen={parcelLayoutOpen}
              onClose={() => useUiStore.getState().setParcelLayoutOpen(false)}
            />
          </React.Suspense>
        )}
        {sectionGridOpen && (
          <React.Suspense fallback={null}>
            <SectionPlottingGridDialog
              isOpen={sectionGridOpen}
              onClose={() => useUiStore.getState().setSectionGridOpen(false)}
            />
          </React.Suspense>
        )}
        {scriptsOpen && (
          <React.Suspense fallback={null}>
            <Scripts3DObjectsDialog
              isOpen={scriptsOpen}
              onClose={() => useUiStore.getState().setScriptsOpen(false)}
            />
          </React.Suspense>
        )}
        {roadStudioOpen && (
          <React.Suspense fallback={null}>
            <RoadDesignStudioDialog
              isOpen={roadStudioOpen}
              onClose={() => useUiStore.getState().setRoadStudioOpen(false)}
            />
          </React.Suspense>
        )}
        {assemblyOpen && (
          <React.Suspense fallback={null}>
            <AssemblyBuilderPanel
              open={assemblyOpen}
              onClose={() => useUiStore.getState().setAssemblyOpen(false)}
              assembly={{
                id: "assy-workspace-1",
                name: "Standard Road Cross-Section Assembly",
                leftSubassemblies: [],
                rightSubassemblies: [],
              }}
            />
          </React.Suspense>
        )}
        {subdivisionStudioOpen && (
          <React.Suspense fallback={null}>
            <SubdivisionStudioDialog
              isOpen={subdivisionStudioOpen}
              onClose={() => useUiStore.getState().setSubdivisionStudioOpen(false)}
            />
          </React.Suspense>
        )}
        {gradingStudioOpen && (
          <React.Suspense fallback={null}>
            <GradingStudioDialog
              isOpen={gradingStudioOpen}
              onClose={() => useUiStore.getState().setGradingStudioOpen(false)}
            />
          </React.Suspense>
        )}
        {pipeStudioOpen && (
          <React.Suspense fallback={null}>
            <PipeNetworkStudioDialog
              isOpen={pipeStudioOpen}
              onClose={() => useUiStore.getState().setPipeStudioOpen(false)}
            />
          </React.Suspense>
        )}
        {modelBuilderStudioOpen && (
          <React.Suspense fallback={null}>
            <ModelBuilderStudioDialog
              isOpen={modelBuilderStudioOpen}
              onClose={() => useUiStore.getState().setModelBuilderStudioOpen(false)}
            />
          </React.Suspense>
        )}
        {surveyCogoStudioOpen && (
          <React.Suspense fallback={null}>
            <SurveyCogoStudioDialog
              isOpen={surveyCogoStudioOpen}
              onClose={() => useUiStore.getState().setSurveyCogoStudioOpen(false)}
            />
          </React.Suspense>
        )}
        <AliasMappingDialog open={aliasOpen} onOpenChange={setAliasOpen} />
        <React.Suspense fallback={null}>
          <SubdivisionBuilderDialog />
        </React.Suspense>
      </div>
    </TooltipProvider>
  );
}

function CanvasArea() {
  const viewMode = useCanvasStore((s) => s.viewMode);
  return (
    <React.Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            Initializing 3D viewport...
          </div>
        </div>
      }
    >
      {viewMode === "3d" ? <Scene3D /> : <PlanningCanvas />}
    </React.Suspense>
  );
}

function TabLoading({ label }: { label: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      Loading {label}...
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      {children}
    </div>
  );
}
