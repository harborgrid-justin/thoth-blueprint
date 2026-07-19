import { create } from "zustand";
import { clampZoom, type Viewport } from "@/features/canvas/viewport";

interface CanvasState {
  viewport: Viewport;
  showGrid: boolean;
  snapToGrid: boolean;
  snapToVertices: boolean;
  showLabels: boolean;
  /** Incremented to ask the canvas to fit the plan into view. */
  fitRequestId: number;

  setViewport(viewport: Viewport): void;
  zoomBy(factor: number): void;
  toggleGrid(): void;
  toggleSnapToGrid(): void;
  toggleSnapToVertices(): void;
  toggleLabels(): void;
  requestFit(): void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  viewport: { offsetX: 0, offsetY: 0, zoom: 3 },
  showGrid: true,
  snapToGrid: true,
  snapToVertices: true,
  showLabels: true,
  fitRequestId: 0,

  setViewport(viewport) {
    set({ viewport });
  },
  zoomBy(factor) {
    const v = get().viewport;
    set({ viewport: { ...v, zoom: clampZoom(v.zoom * factor) } });
  },
  toggleGrid() {
    set((s) => ({ showGrid: !s.showGrid }));
  },
  toggleSnapToGrid() {
    set((s) => ({ snapToGrid: !s.snapToGrid }));
  },
  toggleSnapToVertices() {
    set((s) => ({ snapToVertices: !s.snapToVertices }));
  },
  toggleLabels() {
    set((s) => ({ showLabels: !s.showLabels }));
  },
  requestFit() {
    set((s) => ({ fitRequestId: s.fitRequestId + 1 }));
  },
}));
