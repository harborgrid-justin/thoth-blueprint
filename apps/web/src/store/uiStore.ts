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

  openPlat(targetId?: string | null): void;
  closePlat(): void;
  setAlignmentOpen(open: boolean): void;
  setSheetOpen(open: boolean): void;
  setSheetSetOpen(open: boolean): void;
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
