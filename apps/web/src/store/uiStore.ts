import { create } from "zustand";

interface UiState {
  /** Whether the plat / survey report dialog is open. */
  platOpen: boolean;
  /** The element the report should focus on (null = choose within the dialog). */
  platTargetId: string | null;
  openPlat(targetId?: string | null): void;
  closePlat(): void;
}

export const useUiStore = create<UiState>((set) => ({
  platOpen: false,
  platTargetId: null,
  openPlat(targetId = null) {
    set({ platOpen: true, platTargetId: targetId });
  },
  closePlat() {
    set({ platOpen: false });
  },
}));
