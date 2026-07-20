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
  /** Whether the superelevation runoff wizard is open. */
  superelevationOpen: boolean;

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
  setCommandOpen(open: boolean): void;
  toggleCommand(): void;
  setShortcutsOpen(open: boolean): void;
  setPrefsOpen(open: boolean): void;
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
}));
