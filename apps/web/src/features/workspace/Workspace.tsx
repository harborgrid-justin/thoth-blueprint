import * as React from "react";
import { useParams } from "react-router-dom";
import { Layers, Mountain, Ruler, SlidersHorizontal, HardHat, Waves, Loader2 } from "lucide-react";
import { api, type Project } from "@/api";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useInteropStore } from "@/store/interopStore";
import { useUiStore } from "@/store/uiStore";
import { useFindStore } from "@/store/findStore";
import { usePrefsStore } from "@/store/prefsStore";
import { TOOLS, type ToolId } from "@/lib/tools";
import { PlanningCanvas } from "@/features/canvas/PlanningCanvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { LayerPanel } from "./LayerPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { FindPanel } from "@/features/find/FindPanel";
import type { CommandActions } from "@/features/command/commands";
import { useKeyboardShortcut } from "@/lib/hooks";

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


/** Tool single-letter shortcuts (e.g. "v" → select), for keyboard-first drawing. */
const TOOL_BY_KEY = new Map<string, ToolId>(TOOLS.map((t) => [t.shortcut.toLowerCase(), t.id]));

const AUTOSAVE_MS = 1500;

export function Workspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const loadProject = useWorkspaceStore((s) => s.loadProject);
  const reset = useWorkspaceStore((s) => s.reset);
  const markSaved = useWorkspaceStore((s) => s.markSaved);
  const site = useWorkspaceStore((s) => s.site);
  const dirty = useWorkspaceStore((s) => s.dirty);
  const selection = useWorkspaceStore((s) => s.selection);

  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checkpointsOpen, setCheckpointsOpen] = React.useState(false);
  const [tab, setTab] = React.useState("inspect");

  // Dialog visibility states for lazy loading / conditional mounting
  const platOpen = useUiStore((s) => s.platOpen);
  const alignmentOpen = useUiStore((s) => s.alignmentOpen);
  const profileOpen = useUiStore((s) => s.profileOpen);
  const pipeOpen = useUiStore((s) => s.pipeOpen);
  const productionOpen = useUiStore((s) => s.productionOpen);
  const superelevationOpen = useUiStore((s) => s.superelevationOpen);
  const corridorOpen = useUiStore((s) => s.corridorOpen);
  const gradingOpen = useUiStore((s) => s.gradingOpen);
  const sheetOpen = useUiStore((s) => s.sheetOpen);
  const sheetSetOpen = useUiStore((s) => s.sheetSetOpen);
  const commandOpen = useUiStore((s) => s.commandOpen);
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  const prefsOpen = useUiStore((s) => s.prefsOpen);


  const [sidebarWidth, setSidebarWidth] = React.useState(320);
  const isResizingRef = React.useRef(false);

  const onSidebarPointerDown = React.useCallback((e: React.PointerEvent) => {
    isResizingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onSidebarPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!isResizingRef.current) { return; }
    const container = e.currentTarget.parentElement;
    if (!container) { return; }
    const containerRect = container.getBoundingClientRect();
    const newWidth = containerRect.right - e.clientX;
    setSidebarWidth(Math.max(200, Math.min(600, newWidth)));
  }, []);

  const onSidebarPointerUp = React.useCallback((e: React.PointerEvent) => {
    isResizingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  // Load the project into the workspace store.
  React.useEffect(() => {
    if (!projectId) { return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getProject(projectId)
      .then((p) => {
        if (cancelled) { return; }
        setProject(p);
        loadProject(p);
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      reset();
      useInteropStore.getState().clearAll();
    };
  }, [projectId, loadProject, reset]);

  const save = React.useCallback(async () => {
    const current = useWorkspaceStore.getState();
    if (!projectId || !current.site || !current.dirty) { return; }
    setSaving(true);
    try {
      const updated = await api.saveSite(projectId, current.site);
      setProject(updated);
      markSaved(updated.updatedAt);
    } finally {
      setSaving(false);
    }
  }, [projectId, markSaved]);

  // Debounced autosave whenever the site becomes dirty.
  React.useEffect(() => {
    if (!dirty) { return; }
    const handle = window.setTimeout(() => void save(), AUTOSAVE_MS);
    return () => window.clearTimeout(handle);
  }, [dirty, site, save]);

  // Focus the inspector when the selection changes to something.
  const prevSelLen = React.useRef(0);
  React.useEffect(() => {
    if (selection.length > 0 && prevSelLen.current === 0) { setTab("inspect"); }
    prevSelLen.current = selection.length;
  }, [selection]);

  // --- keyboard shortcuts --------------------------------------------------
  useKeyboardShortcut("mod+k", () => useUiStore.getState().toggleCommand());
  useKeyboardShortcut("mod+z", (e) => {
    const ws = useWorkspaceStore.getState();
    if (e.shiftKey) {
      ws.redo();
    } else {
      ws.undo();
    }
  });
  useKeyboardShortcut("mod+s", () => void save());
  useKeyboardShortcut("mod+c", () => useWorkspaceStore.getState().copySelection());
  useKeyboardShortcut("mod+x", () => useWorkspaceStore.getState().cutSelection());
  useKeyboardShortcut("mod+v", () => useWorkspaceStore.getState().paste());
  useKeyboardShortcut("mod+d", () => useWorkspaceStore.getState().duplicateSelection());
  useKeyboardShortcut("mod+a", () => useWorkspaceStore.getState().selectAll());
  useKeyboardShortcut("mod+f", () => useFindStore.getState().openFind());
  useKeyboardShortcut("delete", () => {
    const ws = useWorkspaceStore.getState();
    if (ws.selection.length > 0) {
      ws.deleteSelection();
    }
  });
  useKeyboardShortcut("backspace", () => {
    const ws = useWorkspaceStore.getState();
    if (ws.selection.length > 0) {
      ws.deleteSelection();
    }
  });
  useKeyboardShortcut("?", () => useUiStore.getState().setShortcutsOpen(true));
  useKeyboardShortcut("1", () => useCanvasStore.getState().requestFit());
  useKeyboardShortcut("2", () => useCanvasStore.getState().requestFitSelection());

  // Unified single-letter tool selection shortcuts (FE-CMD-001)
  React.useEffect(() => {
    function onToolKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) { return; }
      const toolId = TOOL_BY_KEY.get(e.key.toLowerCase());
      if (toolId) {
        e.preventDefault();
        useWorkspaceStore.getState().setTool(toolId);
      }
    }
    window.addEventListener("keydown", onToolKey);
    return () => window.removeEventListener("keydown", onToolKey);
  }, []);

  // Warn before leaving with unsynced edits (FE-STATE-006).
  React.useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (useWorkspaceStore.getState().dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Apply the high-contrast display preference to the document (FE-PREFS-005).
  const highContrast = usePrefsStore((s) => s.highContrast);
  React.useEffect(() => {
    document.documentElement.classList.toggle("contrast", highContrast);
    return () => document.documentElement.classList.remove("contrast");
  }, [highContrast]);

  // Stable command-palette actions (imperative handlers the workspace owns).
  const commandActions = React.useMemo<CommandActions>(
    () => ({
      onSave: () => void save(),
      onOpenCheckpoints: () => setCheckpointsOpen(true),
    }),
    [save],
  );

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
