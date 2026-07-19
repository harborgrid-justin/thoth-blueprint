import { create } from "zustand";
import { clampZoom, type Viewport } from "@/features/canvas/viewport";

interface CanvasState {
  viewport: Viewport;
  showGrid: boolean;
  snapToGrid: boolean;
  snapToVertices: boolean;
  showLabels: boolean;
  /** Show surveyor bearing/distance labels on the selected boundary's edges. */
  showSurveyLabels: boolean;
  /** Show road/utility networks. */
  showNetworks: boolean;
  /** Show terrain contour lines. */
  showContours: boolean;
  /** Shade the canvas by slope steepness. */
  showSlope: boolean;
  /** Contour interval in plan units. */
  contourInterval: number;
  /** Show the proposed (graded) surface instead of existing ground. */
  showProposed: boolean;
  /** Incremented to ask the canvas to fit the plan into view. */
  fitRequestId: number;

  setViewport(viewport: Viewport): void;
  zoomBy(factor: number): void;
  toggleGrid(): void;
  toggleSnapToGrid(): void;
  toggleSnapToVertices(): void;
  toggleLabels(): void;
  toggleSurveyLabels(): void;
  toggleNetworks(): void;
  toggleContours(): void;
  toggleSlope(): void;
  toggleProposed(): void;
  setContourInterval(interval: number): void;
  requestFit(): void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  viewport: { offsetX: 0, offsetY: 0, zoom: 3 },
  showGrid: true,
  snapToGrid: true,
  snapToVertices: true,
  showLabels: true,
  showSurveyLabels: true,
  showNetworks: true,
  showContours: true,
  showSlope: false,
  contourInterval: 2,
  showProposed: false,
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
  toggleSurveyLabels() {
    set((s) => ({ showSurveyLabels: !s.showSurveyLabels }));
  },
  toggleNetworks() {
    set((s) => ({ showNetworks: !s.showNetworks }));
  },
  toggleContours() {
    set((s) => ({ showContours: !s.showContours }));
  },
  toggleSlope() {
    set((s) => ({ showSlope: !s.showSlope }));
  },
  toggleProposed() {
    set((s) => ({ showProposed: !s.showProposed }));
  },
  setContourInterval(interval) {
    set({ contourInterval: Math.max(0.1, interval) });
  },
  requestFit() {
    set((s) => ({ fitRequestId: s.fitRequestId + 1 }));
  },
}));
