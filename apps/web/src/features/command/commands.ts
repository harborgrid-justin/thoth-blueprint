import {
  Box,
  ClipboardPaste,
  Cloud,
  Compass,
  Copy,
  Droplets,
  Grid3x3,
  History,
  Keyboard,
  Layers,
  Magnet,
  Mountain,
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
    {
      id: "edit.undo",
      title: "Undo",
      group: "Edit",
      shortcut: "⌘Z",
      icon: Undo2,
      run: () => ws().undo(),
    },
    {
      id: "edit.redo",
      title: "Redo",
      group: "Edit",
      shortcut: "⌘⇧Z",
      icon: Redo2,
      run: () => ws().redo(),
    },
    {
      id: "edit.copy",
      title: "Copy",
      group: "Edit",
      shortcut: "⌘C",
      icon: Copy,
      run: () => ws().copySelection(),
    },
    {
      id: "edit.cut",
      title: "Cut",
      group: "Edit",
      shortcut: "⌘X",
      icon: Scissors,
      run: () => ws().cutSelection(),
    },
    {
      id: "edit.paste",
      title: "Paste",
      group: "Edit",
      shortcut: "⌘V",
      icon: ClipboardPaste,
      run: () => ws().paste(),
    },
    {
      id: "edit.duplicate",
      title: "Duplicate",
      group: "Edit",
      shortcut: "⌘D",
      icon: Copy,
      run: () => ws().duplicateSelection(),
    },
    {
      id: "edit.selectAll",
      title: "Select all",
      group: "Edit",
      shortcut: "⌘A",
      icon: SquareDashedMousePointer,
      run: () => ws().selectAll(),
    },
    {
      id: "edit.delete",
      title: "Delete selection",
      group: "Edit",
      shortcut: "Del",
      icon: Trash2,
      run: () => ws().deleteSelection(),
    },
  ];

  const viewCommands: Command[] = [
    {
      id: "view.fit",
      title: "Fit plan to view",
      group: "View",
      shortcut: "1",
      icon: Maximize,
      run: () => cv().requestFit(),
    },
    {
      id: "view.fitSelection",
      title: "Zoom to selection",
      group: "View",
      shortcut: "2",
      icon: Maximize,
      run: () => cv().requestFitSelection(),
    },
    {
      id: "view.grid",
      title: "Toggle grid",
      group: "View",
      icon: Grid3x3,
      run: () => cv().toggleGrid(),
    },
    {
      id: "view.snapGrid",
      title: "Toggle snap to grid",
      group: "View",
      icon: Magnet,
      run: () => cv().toggleSnapToGrid(),
    },
    {
      id: "view.snapVertex",
      title: "Toggle snap to vertices",
      group: "View",
      icon: Magnet,
      run: () => cv().toggleSnapToVertices(),
    },
    {
      id: "view.labels",
      title: "Toggle labels",
      group: "View",
      icon: Tag,
      run: () => cv().toggleLabels(),
    },
    {
      id: "view.legend",
      title: "Toggle legend",
      group: "View",
      icon: Layers,
      run: () => cv().toggleLegend(),
    },
    {
      id: "view.interiors",
      title: "Toggle building interiors",
      group: "View",
      keywords: "walls doors windows rooms floor plan",
      icon: Layers,
      run: () => cv().toggleInteriors(),
    },
    {
      id: "view.gridBubbles",
      title: "Toggle column grid",
      group: "View",
      keywords: "grid bubbles structural columns",
      icon: Grid3x3,
      run: () => cv().toggleGridBubbles(),
    },
    {
      id: "view.annotations",
      title: "Toggle drafting marks",
      group: "View",
      keywords: "section elevation detail revision keynote match line",
      icon: Tag,
      run: () => cv().toggleAnnotations(),
    },
    {
      id: "view.2d",
      title: "Switch to 2D plan",
      group: "View",
      icon: Grid3x3,
      run: () => cv().setViewMode("2d"),
    },
    {
      id: "view.3d",
      title: "Switch to 3D scene",
      group: "View",
      icon: Box,
      run: () => cv().setViewMode("3d"),
    },
    {
      id: "view.find",
      title: "Find & filter elements",
      group: "View",
      keywords: "search select filter",
      shortcut: "⌘F",
      icon: Search,
      run: () => useFindStore.getState().openFind(),
    },
  ];

  const projectCommands: Command[] = [
    {
      id: "project.save",
      title: "Save project",
      group: "Project",
      shortcut: "⌘S",
      icon: Save,
      run: actions.onSave,
    },
    {
      id: "project.checkpoints",
      title: "Open checkpoints",
      group: "Project",
      icon: History,
      run: actions.onOpenCheckpoints,
    },
    {
      id: "project.plat",
      title: "Open survey / plat report",
      group: "Project",
      icon: ScrollText,
      run: () => useUiStore.getState().openPlat(null),
    },
    {
      id: "project.cogo",
      title: "COGO Metes & Bounds Plat Builder",
      group: "Project",
      keywords: "metes bounds survey bearing distance cogo traverse draw",
      icon: Compass,
      run: () => useUiStore.getState().setCogoOpen(true),
    },
    {
      id: "project.alignment",
      title: "Alignment & stationing report",
      group: "Project",
      keywords: "station curve baseline pc pt civil",
      icon: ScrollText,
      run: () => useUiStore.getState().setAlignmentOpen(true),
    },
    {
      id: "project.sheet",
      title: "Plat sheet composer",
      group: "Project",
      keywords:
        "sheet plat title block certificate curve table jurisdiction plugin",
      icon: ScrollText,
      run: () => useUiStore.getState().setSheetOpen(true),
    },
    {
      id: "project.drawings",
      title: "CAD drawing set composer",
      group: "Project",
      keywords:
        "cad sheet set drawings pdf title block dimension schedule section elevation detail floor plan ncs",
      icon: ScrollText,
      run: () => useUiStore.getState().setSheetSetOpen(true),
    },
    {
      id: "project.subdivisionStudio",
      title: "Subdivision Studio & Layout Solvers",
      group: "Project",
      keywords: "subdivision lot split slide swing line cul de sac zoning frontage",
      icon: Grid3x3,
      run: () => useUiStore.getState().setSubdivisionStudioOpen(true),
    },
    {
      id: "project.roadStudio",
      title: "Road Design Studio & AASHTO Suite",
      group: "Project",
      keywords: "road design speed aashto curve sight distance intersection roundabout",
      icon: Compass,
      run: () => useUiStore.getState().setRoadStudioOpen(true),
    },
    {
      id: "project.gradingStudio",
      title: "Grading & Earthwork Studio",
      group: "Project",
      keywords: "grading earthwork cut fill pad elevation zero volume daylight mass haul",
      icon: Mountain,
      run: () => useUiStore.getState().setGradingStudioOpen(true),
    },
    {
      id: "project.pipeStudio",
      title: "Pipe Network & Stormwater Hydrology Studio",
      group: "Project",
      keywords: "pipe storm sanitary water hydraulic grade line hgl manning velocity rational",
      icon: Droplets,
      run: () => useUiStore.getState().setPipeStudioOpen(true),
    },
    {
      id: "project.modelBuilderStudio",
      title: "GIS & Model Builder Studio",
      group: "Project",
      keywords: "gis model builder dem osm terrain wgs84 state plane crs 3d city",
      icon: Cloud,
      run: () => useUiStore.getState().setModelBuilderStudioOpen(true),
    },
    {
      id: "project.surveyCogoStudio",
      title: "Survey & COGO Plat Studio",
      group: "Project",
      keywords: "survey cogo traverse metes bounds compass rule closure legal description",
      icon: Compass,
      run: () => useUiStore.getState().setSurveyCogoStudioOpen(true),
    },
    {
      id: "project.modelBuilder",
      title: "Model Builder GIS Cloud Generator",
      group: "Project",
      keywords: "model builder gis dem shp osm terrain 3d mesh generator",
      icon: Box,
      run: () => useUiStore.getState().setModelBuilderOpen(true),
    },
    {
      id: "project.linework",
      title: "Advanced Linework & Curve Calculator",
      group: "Project",
      keywords: "linework geometry spiral curve reverse compound offset boundary",
      icon: Ruler,
      run: () => useUiStore.getState().setLineworkOpen(true),
    },
    {
      id: "project.panorama",
      title: "Panorama Elevation Editor",
      group: "Project",
      keywords: "panorama elevation feature line grading profile grid editor",
      icon: Settings2,
      run: () => useUiStore.getState().setPanoramaOpen(true),
    },
    {
      id: "project.parcelLayout",
      title: "Parcel Sizing & Slide-Line Layout",
      group: "Project",
      keywords: "parcel lot sizing frontage setback slide line subdivision",
      icon: Grid3x3,
      run: () => useUiStore.getState().setParcelLayoutOpen(true),
    },
    {
      id: "project.sectionGrid",
      title: "Section Plotting Grid & QTO",
      group: "Project",
      keywords: "section plotting cross sections qto earthwork cut fill grid",
      icon: Grid3x3,
      run: () => useUiStore.getState().setSectionGridOpen(true),
    },
    {
      id: "project.scripts",
      title: "Scripts & 3D Objects Placer",
      group: "Project",
      keywords: "dynamo python scripts 3d mesh objects BIM IFC STEP",
      icon: Box,
      run: () => useUiStore.getState().setScriptsOpen(true),
    },
    {
      id: "project.assembly",
      title: "Corridor Subassembly Composer",
      group: "Project",
      keywords: "assembly subassembly corridor lane curb sidewalk shoulder",
      icon: Layers,
      run: () => useUiStore.getState().setAssemblyOpen(true),
    },
    {
      id: "project.ribbonToggle",
      title: "Toggle Full Civil 3D Ribbon Bar Mode",
      group: "Project",
      keywords: "ribbon mode workspace civil 3d layout toggle",
      icon: Layers,
      run: () => useUiStore.getState().toggleWorkspaceLayout(),
    },
    {
      id: "project.prefs",
      title: "Display preferences",
      group: "Project",
      keywords: "units theme contrast angle",
      icon: Settings2,
      run: () => useUiStore.getState().setPrefsOpen(true),
    },
  ];

  const helpCommands: Command[] = [
    {
      id: "help.shortcuts",
      title: "Keyboard shortcuts",
      group: "Help",
      shortcut: "?",
      icon: Keyboard,
      run: () => useUiStore.getState().setShortcutsOpen(true),
    },
    {
      id: "help.measure",
      title: "Measure distance & bearing",
      group: "Help",
      icon: Ruler,
      run: () => ws().setTool("measure"),
    },
  ];

  return [
    ...toolCommands,
    ...editCommands,
    ...viewCommands,
    ...projectCommands,
    ...helpCommands,
  ];
}
