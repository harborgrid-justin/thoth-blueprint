import * as React from "react";
import { useParams } from "react-router-dom";
import { Layers, Mountain, Ruler, SlidersHorizontal, HardHat } from "lucide-react";
import { api, type Project } from "@/api";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useInteropStore } from "@/store/interopStore";
import { useUiStore } from "@/store/uiStore";
import { useFindStore } from "@/store/findStore";
import { usePrefsStore } from "@/store/prefsStore";
import { TOOLS, type ToolId } from "@/lib/tools";
import { PlanningCanvas } from "@/features/canvas/PlanningCanvas";
import { Scene3D } from "@/features/canvas3d/Scene3D";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { LayerPanel } from "./LayerPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { MetricsPanel } from "./MetricsPanel";
import { CheckpointsDialog } from "./CheckpointsDialog";
import { PlatReportDialog } from "@/features/survey/PlatReportDialog";
import { AlignmentReportDialog } from "@/features/survey/AlignmentReportDialog";
import { PlatSheetDialog } from "@/features/survey/PlatSheetDialog";
import { SheetSetDialog } from "@/features/sheets/SheetSetDialog";
import { TerrainPanel } from "@/features/terrain/TerrainPanel";
import { CommandPalette } from "@/features/command/CommandPalette";
import { ShortcutsDialog } from "@/features/command/ShortcutsDialog";
import { PreferencesDialog } from "@/features/preferences/PreferencesDialog";
import { FindPanel } from "@/features/find/FindPanel";
import { QtoPanel } from "./QtoPanel";
import { ProfileSectionDialog } from "@/features/survey/ProfileSectionDialog";
import { PipeDesignDialog } from "@/features/survey/PipeDesignDialog";
import { PlanProductionWizard } from "@/features/survey/PlanProductionWizard";
import { SuperelevationWizardDialog } from "@/features/survey/SuperelevationWizardDialog";
import { CorridorDesignerDialog } from "@/features/survey/CorridorDesignerDialog";
import { GradingSolverDialog } from "@/features/survey/GradingSolverDialog";
import type { CommandActions } from "@/features/command/commands";

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

  // Load the project into the workspace store.
  React.useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getProject(projectId)
      .then((p) => {
        if (cancelled) return;
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
    if (!projectId || !current.site || !current.dirty) return;
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
    if (!dirty) return;
    const handle = window.setTimeout(() => void save(), AUTOSAVE_MS);
    return () => window.clearTimeout(handle);
  }, [dirty, site, save]);

  // Focus the inspector when the selection changes to something.
  const prevSelLen = React.useRef(0);
  React.useEffect(() => {
    if (selection.length > 0 && prevSelLen.current === 0) setTab("inspect");
    prevSelLen.current = selection.length;
  }, [selection]);

  // Unified keyboard shortcuts: command palette, editing, navigation, and
  // single-letter tool selection (FE-CMD-001/002/003, FE-EDIT-001/002).
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      const ws = useWorkspaceStore.getState();

      // The command palette toggles even while typing in a field.
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useUiStore.getState().toggleCommand();
        return;
      }
      if (typing) return;

      if (mod) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            e.shiftKey ? ws.redo() : ws.undo();
            return;
          case "s":
            e.preventDefault();
            void save();
            return;
          case "c":
            e.preventDefault();
            ws.copySelection();
            return;
          case "x":
            e.preventDefault();
            ws.cutSelection();
            return;
          case "v":
            e.preventDefault();
            ws.paste();
            return;
          case "d":
            e.preventDefault();
            ws.duplicateSelection();
            return;
          case "a":
            e.preventDefault();
            ws.selectAll();
            return;
          case "f":
            e.preventDefault();
            useFindStore.getState().openFind();
            return;
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (ws.selection.length > 0) {
          e.preventDefault();
          ws.deleteSelection();
        }
        return;
      }
      if (e.key === "?") {
        useUiStore.getState().setShortcutsOpen(true);
        return;
      }
      if (e.key === "1") {
        useCanvasStore.getState().requestFit();
        return;
      }
      if (e.key === "2") {
        useCanvasStore.getState().requestFitSelection();
        return;
      }
      const toolId = TOOL_BY_KEY.get(e.key.toLowerCase());
      if (toolId) {
        e.preventDefault();
        ws.setTool(toolId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

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
          <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-card">
            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="m-2 grid grid-cols-5">
                <TabsTrigger value="inspect">
                  <SlidersHorizontal className="h-3 w-3" /> Inspect
                </TabsTrigger>
                <TabsTrigger value="layers">
                  <Layers className="h-3 w-3" /> Layers
                </TabsTrigger>
                <TabsTrigger value="terrain">
                  <Mountain className="h-3 w-3" /> Terrain
                </TabsTrigger>
                <TabsTrigger value="metrics">
                  <Ruler className="h-3 w-3" /> Metrics
                </TabsTrigger>
                <TabsTrigger value="qto">
                  <HardHat className="h-3 w-3" /> QTO
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
                  <TerrainPanel />
                </TabsContent>
                <TabsContent value="metrics" className="mt-0">
                  <MetricsPanel />
                </TabsContent>
                <TabsContent value="qto" className="mt-0">
                  <QtoPanel />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </aside>
        </div>
        <CheckpointsDialog open={checkpointsOpen} onOpenChange={setCheckpointsOpen} />
        <PlatReportDialog />
        <AlignmentReportDialog />
        <ProfileSectionDialog />
        <PipeDesignDialog />
        <PlanProductionWizard />
        <SuperelevationWizardDialog />
        <CorridorDesignerDialog />
        <GradingSolverDialog />
        <PlatSheetDialog />
        <SheetSetDialog />
        <CommandPalette actions={commandActions} />
        <ShortcutsDialog />
        <PreferencesDialog />
      </div>
    </TooltipProvider>
  );
}

function CanvasArea() {
  const viewMode = useCanvasStore((s) => s.viewMode);
  return viewMode === "3d" ? <Scene3D /> : <PlanningCanvas />;
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      {children}
    </div>
  );
}
