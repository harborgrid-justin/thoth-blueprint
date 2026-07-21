import * as React from "react";
import { useParams } from "react-router-dom";
import { api, type Project } from "@/api";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useInteropStore } from "@/store/interopStore";
import { useUiStore } from "@/store/uiStore";
import { useFindStore } from "@/store/findStore";
import { usePrefsStore } from "@/store/prefsStore";
import { TOOLS, type ToolId } from "@/lib/tools";
import { useKeyboardShortcut } from "@/lib/hooks";
import type { CommandActions } from "@/features/command/commands";

const TOOL_BY_KEY = new Map<string, ToolId>(
  TOOLS.map((t) => [t.shortcut.toLowerCase(), t.id]),
);
const AUTOSAVE_MS = 1500;

export function useWorkspaceLayoutState() {
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
    if (!isResizingRef.current) {
      return;
    }
    const container = e.currentTarget.parentElement;
    if (!container) {
      return;
    }
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
    if (!projectId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getProject(projectId)
      .then((p) => {
        if (cancelled) {
          return;
        }
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
    if (!projectId || !current.site || !current.dirty) {
      return;
    }
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
    if (!dirty) {
      return;
    }
    const handle = window.setTimeout(() => void save(), AUTOSAVE_MS);
    return () => window.clearTimeout(handle);
  }, [dirty, site, save]);

  // Focus the inspector when the selection changes to something.
  const prevSelLen = React.useRef(0);
  React.useEffect(() => {
    if (selection.length > 0 && prevSelLen.current === 0) {
      setTab("inspect");
    }
    prevSelLen.current = selection.length;
  }, [selection]);

  // Keyboard shortcuts
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
  useKeyboardShortcut("mod+c", () =>
    useWorkspaceStore.getState().copySelection(),
  );
  useKeyboardShortcut("mod+x", () =>
    useWorkspaceStore.getState().cutSelection(),
  );
  useKeyboardShortcut("mod+v", () => useWorkspaceStore.getState().paste());
  useKeyboardShortcut("mod+d", () =>
    useWorkspaceStore.getState().duplicateSelection(),
  );
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
  useKeyboardShortcut("2", () =>
    useCanvasStore.getState().requestFitSelection(),
  );

  // Unified single-letter tool selection shortcuts (FE-CMD-001)
  React.useEffect(() => {
    function onToolKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
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

  // High-contrast preference
  const highContrast = usePrefsStore((s) => s.highContrast);
  React.useEffect(() => {
    document.documentElement.classList.toggle("contrast", highContrast);
    return () => document.documentElement.classList.remove("contrast");
  }, [highContrast]);

  const commandActions = React.useMemo<CommandActions>(
    () => ({
      onSave: () => void save(),
      onOpenCheckpoints: () => setCheckpointsOpen(true),
    }),
    [save],
  );

  return {
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
  };
}
