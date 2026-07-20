import {
  Box,
  ClipboardPaste,
  Copy,
  Grid3x3,
  History,
  Keyboard,
  Layers,
  Magnet,
  Maximize,
  Redo2,
  Ruler,
  Save,
  Scissors,
  ScrollText,
  Search,
  Settings2,
  SquareDashedMousePointer,
  Tag,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { TOOLS } from "@/lib/tools";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useFindStore } from "@/store/findStore";
import { useUiStore } from "@/store/uiStore";

/** A single invocable command surfaced in the command palette (`FE-CMD-002`). */
export interface Command {
  id: string;
  title: string;
  group: "Tools" | "Edit" | "View" | "Project" | "Help";
  /** Extra terms to match against when searching. */
  keywords?: string;
  /** Human-readable shortcut hint, e.g. "⌘K" or "V". */
  shortcut?: string;
  icon: LucideIcon;
  run(): void;
}

/** Imperative handlers the workspace owns and injects into the registry. */
export interface CommandActions {
  onSave(): void;
  onOpenCheckpoints(): void;
}

const ws = () => useWorkspaceStore.getState();
const cv = () => useCanvasStore.getState();

/**
 * Build the full command list. Pure data + closures over the stores, so both
 * the command palette and the keyboard layer can share one source of truth.
 */
export function buildCommands(actions: CommandActions): Command[] {
  const toolCommands: Command[] = TOOLS.map((t) => ({
    id: `tool.${t.id}`,
    title: `${t.label} tool`,
    group: "Tools",
    keywords: `${t.mode} ${t.group} draw`,
    shortcut: t.shortcut,
    icon: t.icon,
    run: () => ws().setTool(t.id),
  }));

  const editCommands: Command[] = [
    { id: "edit.undo", title: "Undo", group: "Edit", shortcut: "⌘Z", icon: Undo2, run: () => ws().undo() },
    { id: "edit.redo", title: "Redo", group: "Edit", shortcut: "⌘⇧Z", icon: Redo2, run: () => ws().redo() },
    { id: "edit.copy", title: "Copy", group: "Edit", shortcut: "⌘C", icon: Copy, run: () => ws().copySelection() },
    { id: "edit.cut", title: "Cut", group: "Edit", shortcut: "⌘X", icon: Scissors, run: () => ws().cutSelection() },
    { id: "edit.paste", title: "Paste", group: "Edit", shortcut: "⌘V", icon: ClipboardPaste, run: () => ws().paste() },
    { id: "edit.duplicate", title: "Duplicate", group: "Edit", shortcut: "⌘D", icon: Copy, run: () => ws().duplicateSelection() },
    { id: "edit.selectAll", title: "Select all", group: "Edit", shortcut: "⌘A", icon: SquareDashedMousePointer, run: () => ws().selectAll() },
    { id: "edit.delete", title: "Delete selection", group: "Edit", shortcut: "Del", icon: Trash2, run: () => ws().deleteSelection() },
  ];

  const viewCommands: Command[] = [
    { id: "view.fit", title: "Fit plan to view", group: "View", shortcut: "1", icon: Maximize, run: () => cv().requestFit() },
    { id: "view.fitSelection", title: "Zoom to selection", group: "View", shortcut: "2", icon: Maximize, run: () => cv().requestFitSelection() },
    { id: "view.grid", title: "Toggle grid", group: "View", icon: Grid3x3, run: () => cv().toggleGrid() },
    { id: "view.snapGrid", title: "Toggle snap to grid", group: "View", icon: Magnet, run: () => cv().toggleSnapToGrid() },
    { id: "view.snapVertex", title: "Toggle snap to vertices", group: "View", icon: Magnet, run: () => cv().toggleSnapToVertices() },
    { id: "view.labels", title: "Toggle labels", group: "View", icon: Tag, run: () => cv().toggleLabels() },
    { id: "view.legend", title: "Toggle legend", group: "View", icon: Layers, run: () => cv().toggleLegend() },
    { id: "view.interiors", title: "Toggle building interiors", group: "View", keywords: "walls doors windows rooms floor plan", icon: Layers, run: () => cv().toggleInteriors() },
    { id: "view.gridBubbles", title: "Toggle column grid", group: "View", keywords: "grid bubbles structural columns", icon: Grid3x3, run: () => cv().toggleGridBubbles() },
    { id: "view.annotations", title: "Toggle drafting marks", group: "View", keywords: "section elevation detail revision keynote match line", icon: Tag, run: () => cv().toggleAnnotations() },
    { id: "view.2d", title: "Switch to 2D plan", group: "View", icon: Grid3x3, run: () => cv().setViewMode("2d") },
    { id: "view.3d", title: "Switch to 3D scene", group: "View", icon: Box, run: () => cv().setViewMode("3d") },
    { id: "view.find", title: "Find & filter elements", group: "View", keywords: "search select filter", shortcut: "⌘F", icon: Search, run: () => useFindStore.getState().openFind() },
  ];

  const projectCommands: Command[] = [
    { id: "project.save", title: "Save project", group: "Project", shortcut: "⌘S", icon: Save, run: actions.onSave },
    { id: "project.checkpoints", title: "Open checkpoints", group: "Project", icon: History, run: actions.onOpenCheckpoints },
    { id: "project.plat", title: "Open survey / plat report", group: "Project", icon: ScrollText, run: () => useUiStore.getState().openPlat(null) },
    { id: "project.alignment", title: "Alignment & stationing report", group: "Project", keywords: "station curve baseline pc pt civil", icon: ScrollText, run: () => useUiStore.getState().setAlignmentOpen(true) },
    { id: "project.sheet", title: "Plat sheet composer", group: "Project", keywords: "sheet plat title block certificate curve table jurisdiction plugin", icon: ScrollText, run: () => useUiStore.getState().setSheetOpen(true) },
    { id: "project.drawings", title: "CAD drawing set composer", group: "Project", keywords: "cad sheet set drawings pdf title block dimension schedule section elevation detail floor plan ncs", icon: ScrollText, run: () => useUiStore.getState().setSheetSetOpen(true) },
    { id: "project.prefs", title: "Display preferences", group: "Project", keywords: "units theme contrast angle", icon: Settings2, run: () => useUiStore.getState().setPrefsOpen(true) },
  ];

  const helpCommands: Command[] = [
    { id: "help.shortcuts", title: "Keyboard shortcuts", group: "Help", shortcut: "?", icon: Keyboard, run: () => useUiStore.getState().setShortcutsOpen(true) },
    { id: "help.measure", title: "Measure distance & bearing", group: "Help", icon: Ruler, run: () => ws().setTool("measure") },
  ];

  return [...toolCommands, ...editCommands, ...viewCommands, ...projectCommands, ...helpCommands];
}
