import { create } from "zustand";

interface UiState {
  /** Whether the plat / survey report dialog is open. */
  platOpen: boolean;
  /** The element the report should focus on (null = choose within the dialog). */
  platTargetId: string | null;
  /** Whether the command palette is open. */
  commandOpen: boolean;
  /** Whether the keyboard-shortcuts reference dialog is open. */
  shortcutsOpen: boolean;
  /** Whether the display-preferences dialog is open. */
  prefsOpen: boolean;
  /** Whether the alignment / stationing report is open. */
  alignmentOpen: boolean;
  /** Whether the plat-sheet composer is open. */
  sheetOpen: boolean;
  /** Whether the multi-sheet CAD drawing-set composer is open. */
  sheetSetOpen: boolean;

  /** Whether the vertical profile & cross-sections designer is open. */
  profileOpen: boolean;
  /** Whether the pipe network design validator is open. */
  pipeOpen: boolean;
  /** Whether the plan production sheet set wizard is open. */
  productionOpen: boolean;
  /** Whether the corridor assemblies designer is open. */
  corridorOpen: boolean;
  /** Whether the grading pad zero-volume solver is open. */
  gradingOpen: boolean;
  /** Whether superelevation wizard is open. */
  superelevationOpen: boolean;
  /** Whether COGO Metes & Bounds Traverse Plat Builder dialog is open. */
  cogoOpen: boolean;
  /** Parcel ID selected for auto-subdivision, or null if closed. */
  subdivisionTargetId: string | null;
  /** Whether main screen canvas renders in hand-drawn surveyor mode. */
  handDrawnMode: boolean;

  /** Civil 3D Feature Dialog States */
  panoramaOpen: boolean;
  modelBuilderOpen: boolean;
  lineworkOpen: boolean;
  parcelLayoutOpen: boolean;
  sectionGridOpen: boolean;
  scriptsOpen: boolean;
  roadStudioOpen: boolean;
  assemblyOpen: boolean;
  subdivisionStudioOpen: boolean;
  gradingStudioOpen: boolean;
  pipeStudioOpen: boolean;
  modelBuilderStudioOpen: boolean;
  surveyCogoStudioOpen: boolean;
  workspaceLayout: "standard" | "civil-studio";

  openPlat(targetId?: string | null): void;
  closePlat(): void;
  setAlignmentOpen(open: boolean): void;
  setSheetOpen(open: boolean): void;
  setSheetSetOpen(open: boolean): void;
  setProfileOpen(open: boolean): void;
  setPipeOpen(open: boolean): void;
  setProductionOpen(open: boolean): void;
  setCorridorOpen(open: boolean): void;
  setGradingOpen(open: boolean): void;
  setSuperelevationOpen(open: boolean): void;
  setCogoOpen(open: boolean): void;
  setSubdivisionTargetId(id: string | null): void;
  setHandDrawnMode(open: boolean): void;
  toggleHandDrawnMode(): void;
  setCommandOpen(open: boolean): void;
  toggleCommand(): void;
  setShortcutsOpen(open: boolean): void;
  setPrefsOpen(open: boolean): void;

  setPanoramaOpen(open: boolean): void;
  setModelBuilderOpen(open: boolean): void;
  setLineworkOpen(open: boolean): void;
  setParcelLayoutOpen(open: boolean): void;
  setSectionGridOpen(open: boolean): void;
  setScriptsOpen(open: boolean): void;
  setRoadStudioOpen(open: boolean): void;
  setAssemblyOpen(open: boolean): void;
  setSubdivisionStudioOpen(open: boolean): void;
  setGradingStudioOpen(open: boolean): void;
  setPipeStudioOpen(open: boolean): void;
  setModelBuilderStudioOpen(open: boolean): void;
  setSurveyCogoStudioOpen(open: boolean): void;
  setWorkspaceLayout(layout: "standard" | "civil-studio"): void;
  toggleWorkspaceLayout(): void;
}

export const useUiStore = create<UiState>((set) => ({
  platOpen: false,
  platTargetId: null,
  commandOpen: false,
  shortcutsOpen: false,
  prefsOpen: false,
  alignmentOpen: false,
  sheetOpen: false,
  sheetSetOpen: false,
  profileOpen: false,
  pipeOpen: false,
  productionOpen: false,
  corridorOpen: false,
  gradingOpen: false,
  superelevationOpen: false,
  cogoOpen: false,
  subdivisionTargetId: null,
  handDrawnMode: true,

  panoramaOpen: false,
  modelBuilderOpen: false,
  lineworkOpen: false,
  parcelLayoutOpen: false,
  sectionGridOpen: false,
  scriptsOpen: false,
  roadStudioOpen: false,
  assemblyOpen: false,
  subdivisionStudioOpen: false,
  gradingStudioOpen: false,
  pipeStudioOpen: false,
  modelBuilderStudioOpen: false,
  surveyCogoStudioOpen: false,
  workspaceLayout: "standard",

  openPlat(targetId = null) {
    set({ platOpen: true, platTargetId: targetId });
  },
  closePlat() {
    set({ platOpen: false });
  },
  setAlignmentOpen(alignmentOpen) {
    set({ alignmentOpen });
  },
  setSheetOpen(sheetOpen) {
    set({ sheetOpen });
  },
  setSheetSetOpen(sheetSetOpen) {
    set({ sheetSetOpen });
  },
  setProfileOpen(profileOpen) {
    set({ profileOpen });
  },
  setPipeOpen(pipeOpen) {
    set({ pipeOpen });
  },
  setProductionOpen(productionOpen) {
    set({ productionOpen });
  },
  setCorridorOpen(corridorOpen) {
    set({ corridorOpen });
  },
  setGradingOpen(gradingOpen) {
    set({ gradingOpen });
  },
  setSuperelevationOpen(superelevationOpen) {
    set({ superelevationOpen });
  },
  setCogoOpen(cogoOpen) {
    set({ cogoOpen });
  },
  setSubdivisionTargetId(subdivisionTargetId) {
    set({ subdivisionTargetId });
  },
  setHandDrawnMode(handDrawnMode) {
    set({ handDrawnMode });
  },
  toggleHandDrawnMode() {
    set((s) => ({ handDrawnMode: !s.handDrawnMode }));
  },
  setCommandOpen(commandOpen) {
    set({ commandOpen });
  },
  toggleCommand() {
    set((s) => ({ commandOpen: !s.commandOpen }));
  },
  setShortcutsOpen(shortcutsOpen) {
    set({ shortcutsOpen });
  },
  setPrefsOpen(prefsOpen) {
    set({ prefsOpen });
  },

  setPanoramaOpen(panoramaOpen) {
    set({ panoramaOpen });
  },
  setModelBuilderOpen(modelBuilderOpen) {
    set({ modelBuilderOpen });
  },
  setLineworkOpen(lineworkOpen) {
    set({ lineworkOpen });
  },
  setParcelLayoutOpen(parcelLayoutOpen) {
    set({ parcelLayoutOpen });
  },
  setSectionGridOpen(sectionGridOpen) {
    set({ sectionGridOpen });
  },
  setScriptsOpen(scriptsOpen) {
    set({ scriptsOpen });
  },
  setRoadStudioOpen(roadStudioOpen) {
    set({ roadStudioOpen });
  },
  setAssemblyOpen(assemblyOpen) {
    set({ assemblyOpen });
  },
  setSubdivisionStudioOpen(subdivisionStudioOpen) {
    set({ subdivisionStudioOpen });
  },
  setGradingStudioOpen(gradingStudioOpen) {
    set({ gradingStudioOpen });
  },
  setPipeStudioOpen(pipeStudioOpen) {
    set({ pipeStudioOpen });
  },
  setModelBuilderStudioOpen(modelBuilderStudioOpen) {
    set({ modelBuilderStudioOpen });
  },
  setSurveyCogoStudioOpen(surveyCogoStudioOpen) {
    set({ surveyCogoStudioOpen });
  },
  setWorkspaceLayout(workspaceLayout) {
    set({ workspaceLayout });
  },
  toggleWorkspaceLayout() {
    set((s) => ({
      workspaceLayout: s.workspaceLayout === "standard" ? "civil-studio" : "standard",
    }));
  },
}));
