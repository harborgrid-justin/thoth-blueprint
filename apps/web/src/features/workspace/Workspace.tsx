import * as React from "react";
import { Layers, Mountain, Ruler, SlidersHorizontal, HardHat, Waves, Loader2 } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { PlanningCanvas } from "@/features/canvas/PlanningCanvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { LayerPanel } from "./LayerPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { FindPanel } from "@/features/find/FindPanel";
import { useWorkspaceLayoutState } from "./hooks/useWorkspaceLayoutState";

// Lazy-loaded dialogs & panels to optimize bundle sizes and speed up initialization
const Scene3D = React.lazy(() => import("@/features/canvas3d/Scene3D").then((m) => ({ default: m.Scene3D })));
const TerrainPanel = React.lazy(() => import("@/features/terrain/TerrainPanel").then((m) => ({ default: m.TerrainPanel })));
const MetricsPanel = React.lazy(() => import("./MetricsPanel").then((m) => ({ default: m.MetricsPanel })));
const QtoPanel = React.lazy(() => import("./QtoPanel").then((m) => ({ default: m.QtoPanel })));
const ErosionSimulatorPanel = React.lazy(() => import("./ErosionSimulator").then((m) => ({ default: m.ErosionSimulatorPanel })));

const CheckpointsDialog = React.lazy(() => import("./CheckpointsDialog").then((m) => ({ default: m.CheckpointsDialog })));
const PlatReportDialog = React.lazy(() => import("@/features/survey/PlatReportDialog").then((m) => ({ default: m.PlatReportDialog })));
const AlignmentReportDialog = React.lazy(() => import("@/features/survey/AlignmentReportDialog").then((m) => ({ default: m.AlignmentReportDialog })));
const ProfileSectionDialog = React.lazy(() => import("@/features/survey/ProfileSectionDialog").then((m) => ({ default: m.ProfileSectionDialog })));
const PipeDesignDialog = React.lazy(() => import("@/features/survey/PipeDesignDialog").then((m) => ({ default: m.PipeDesignDialog })));
const PlanProductionWizard = React.lazy(() => import("@/features/survey/PlanProductionWizard").then((m) => ({ default: m.PlanProductionWizard })));
const SuperelevationWizardDialog = React.lazy(() => import("@/features/survey/SuperelevationWizardDialog").then((m) => ({ default: m.SuperelevationWizardDialog })));
const CorridorDesignerDialog = React.lazy(() => import("@/features/survey/CorridorDesignerDialog").then((m) => ({ default: m.CorridorDesignerDialog })));
const GradingSolverDialog = React.lazy(() => import("@/features/survey/GradingSolverDialog").then((m) => ({ default: m.GradingSolverDialog })));
const PlatSheetDialog = React.lazy(() => import("@/features/survey/PlatSheetDialog").then((m) => ({ default: m.PlatSheetDialog })));
const SheetSetDialog = React.lazy(() => import("@/features/sheets/SheetSetDialog").then((m) => ({ default: m.SheetSetDialog })));
const CommandPalette = React.lazy(() => import("@/features/command/CommandPalette").then((m) => ({ default: m.CommandPalette })));
const ShortcutsDialog = React.lazy(() => import("@/features/command/ShortcutsDialog").then((m) => ({ default: m.ShortcutsDialog })));
const PreferencesDialog = React.lazy(() => import("@/features/preferences/PreferencesDialog").then((m) => ({ default: m.PreferencesDialog })));

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
  } = useWorkspaceLayoutState();

  if (loading) {
    return <CenterMessage>Loading project…</CenterMessage>;
  }
  if (error || !site) {
    return <CenterMessage>Could not load this project.</CenterMessage>;
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background">
        <TopBar
          project={project}
          saving={saving}
          onSave={() => void save()}
          onOpenCheckpoints={() => setCheckpointsOpen(true)}
        />
        <div className="flex min-h-0 flex-1">
          <Toolbar />
          <main className="relative min-w-0 flex-1">
            <CanvasArea />
            <FindPanel />
          </main>

          {/* Resize handle */}
          <div
            className="w-1 hover:w-1.5 active:w-1.5 shrink-0 bg-border hover:bg-primary active:bg-primary cursor-col-resize select-none transition-all duration-150"
            onPointerDown={onSidebarPointerDown}
            onPointerMove={onSidebarPointerMove}
            onPointerUp={onSidebarPointerUp}
          />

          <aside
            style={{ width: sidebarWidth }}
            className="flex shrink-0 flex-col bg-card"
          >
            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="m-2 grid grid-cols-6">
                <TabsTrigger value="inspect" title="Inspect">
                  <SlidersHorizontal className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="layers" title="Layers">
                  <Layers className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="terrain" title="Terrain">
                  <Mountain className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="metrics" title="Metrics">
                  <Ruler className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="qto" title="QTO">
                  <HardHat className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="erosion" title="Erosion">
                  <Waves className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>
              <ScrollArea className="min-h-0 flex-1">
                <TabsContent value="inspect" className="mt-0">
                  <PropertiesPanel />
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
                    <React.Suspense fallback={<TabLoading label="quantities" />}>
                      <QtoPanel />
                    </React.Suspense>
                  )}
                </TabsContent>
                <TabsContent value="erosion" className="mt-0">
                  {tab === "erosion" && (
                    <React.Suspense fallback={<TabLoading label="erosion simulation" />}>
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
            <CheckpointsDialog open={checkpointsOpen} onOpenChange={setCheckpointsOpen} />
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
