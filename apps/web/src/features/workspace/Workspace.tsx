import * as React from "react";
import { useParams } from "react-router-dom";
import { Layers, Mountain, Ruler, SlidersHorizontal } from "lucide-react";
import { api, type Project } from "@/api";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useInteropStore } from "@/store/interopStore";
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
import { TerrainPanel } from "@/features/terrain/TerrainPanel";

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

  // Global undo/redo & delete shortcuts.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useWorkspaceStore.getState().redo();
        else useWorkspaceStore.getState().undo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (useWorkspaceStore.getState().selection.length > 0) {
          e.preventDefault();
          useWorkspaceStore.getState().deleteSelection();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

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
          </main>
          <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-card">
            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="m-2 grid grid-cols-4">
                <TabsTrigger value="inspect">
                  <SlidersHorizontal /> Inspect
                </TabsTrigger>
                <TabsTrigger value="layers">
                  <Layers /> Layers
                </TabsTrigger>
                <TabsTrigger value="terrain">
                  <Mountain /> Terrain
                </TabsTrigger>
                <TabsTrigger value="metrics">
                  <Ruler /> Metrics
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
              </ScrollArea>
            </Tabs>
          </aside>
        </div>
        <CheckpointsDialog open={checkpointsOpen} onOpenChange={setCheckpointsOpen} />
        <PlatReportDialog />
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
