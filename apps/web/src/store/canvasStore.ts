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
  /** Show bearing/distance on every parcel/lot boundary (dense plat annotation). */
  showDimensions: boolean;
  /** Show structural/column grid bubbles. */
  showGridBubbles: boolean;
  /** Show drafting reference marks (sections, elevations, details, revisions). */
  showAnnotations: boolean;
  /** Show building interiors (walls/doors/windows/rooms). */
  showInteriors: boolean;
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
  /** Show the land-use legend overlay on the canvas. */
  showLegend: boolean;
  /** 2D plan canvas or 3D scene. */
  viewMode: "2d" | "3d";
  /** Incremented to ask the canvas to fit the plan into view. */
  fitRequestId: number;
  /** Incremented to ask the canvas to zoom to the current selection. */
  fitSelectionRequestId: number;

  setViewport(viewport: Viewport): void;
  zoomBy(factor: number): void;
  toggleGrid(): void;
  toggleSnapToGrid(): void;
  toggleSnapToVertices(): void;
  toggleLabels(): void;
  toggleSurveyLabels(): void;
  toggleDimensions(): void;
  toggleGridBubbles(): void;
  toggleAnnotations(): void;
  toggleInteriors(): void;
  toggleNetworks(): void;
  toggleContours(): void;
  toggleSlope(): void;
  toggleProposed(): void;
  toggleLegend(): void;
  setContourInterval(interval: number): void;
  setViewMode(mode: "2d" | "3d"): void;
  requestFit(): void;
  requestFitSelection(): void;
  namedViews: { name: string; viewport: Viewport }[];
  addNamedView(name: string): void;
  deleteNamedView(name: string): void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  viewport: { offsetX: 0, offsetY: 0, zoom: 3 },
  showGrid: true,
  snapToGrid: true,
  snapToVertices: true,
  showLabels: true,
  showSurveyLabels: true,
  showDimensions: true,
  showGridBubbles: true,
  showAnnotations: true,
  showInteriors: true,
  showNetworks: true,
  showContours: true,
  showSlope: false,
  contourInterval: 2,
  showProposed: false,
  showLegend: true,
  viewMode: "2d",
  fitRequestId: 0,
  fitSelectionRequestId: 0,

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
  toggleDimensions() {
    set((s) => ({ showDimensions: !s.showDimensions }));
  },
  toggleGridBubbles() {
    set((s) => ({ showGridBubbles: !s.showGridBubbles }));
  },
  toggleAnnotations() {
    set((s) => ({ showAnnotations: !s.showAnnotations }));
  },
  toggleInteriors() {
    set((s) => ({ showInteriors: !s.showInteriors }));
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
  toggleLegend() {
    set((s) => ({ showLegend: !s.showLegend }));
  },
  setContourInterval(interval) {
    set({ contourInterval: Math.max(0.1, interval) });
  },
  setViewMode(mode) {
    set({ viewMode: mode });
  },
  requestFit() {
    set((s) => ({ fitRequestId: s.fitRequestId + 1 }));
  },
  requestFitSelection() {
    set((s) => ({ fitSelectionRequestId: s.fitSelectionRequestId + 1 }));
  },

  namedViews: [
    { name: "Site View", viewport: { offsetX: 0, offsetY: 0, zoom: 3 } },
    { name: "South Subdivision", viewport: { offsetX: 100, offsetY: 150, zoom: 5 } },
    { name: "Retention Pond", viewport: { offsetX: -120, offsetY: -200, zoom: 6 } },
  ],
  addNamedView(name) {
    const viewport = get().viewport;
    set((s) => ({
      namedViews: [...s.namedViews.filter((v) => v.name !== name), { name, viewport }],
    }));
  },
  deleteNamedView(name) {
    set((s) => ({
      namedViews: s.namedViews.filter((v) => v.name !== name),
    }));
  },
}));
