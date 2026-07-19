import { create } from "zustand";
import type { ElementKind } from "@thoth/domain";

/**
 * State for the Find & Filter panel (`FE-FIND-*`): a free-text query, an
 * optional kind filter, and whether matches should be isolated on the canvas
 * (non-matching elements dimmed).
 */
interface FindState {
  open: boolean;
  query: string;
  kind: ElementKind | "all";
  /** When true, the canvas dims elements that don't match the query. */
  filterOnCanvas: boolean;

  openFind(): void;
  close(): void;
  toggle(): void;
  setQuery(query: string): void;
  setKind(kind: ElementKind | "all"): void;
  setFilterOnCanvas(on: boolean): void;
  /** Whether a query or kind filter is currently active. */
  isActive(): boolean;
}

export const useFindStore = create<FindState>((set, get) => ({
  open: false,
  query: "",
  kind: "all",
  filterOnCanvas: false,

  openFind() {
    set({ open: true });
  },
  close() {
    set({ open: false });
  },
  toggle() {
    set((s) => ({ open: !s.open }));
  },
  setQuery(query) {
    set({ query });
  },
  setKind(kind) {
    set({ kind });
  },
  setFilterOnCanvas(filterOnCanvas) {
    set({ filterOnCanvas });
  },
  isActive() {
    const { query, kind } = get();
    return query.trim().length > 0 || kind !== "all";
  },
}));
