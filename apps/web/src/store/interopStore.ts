import { create } from "zustand";
import type { Object3D } from "three";
import type { Bounds, PointCloud } from "@thoth/domain";

/**
 * Imported reference data (point clouds, meshes, raster underlays). These are
 * kept in memory for the session rather than persisted into the project — scans
 * and models are often large, and they act as reference/context alongside the
 * plan. Baking a cloud into spot elevations promotes it into the persisted plan.
 */

export interface ImportedCloud {
  id: string;
  name: string;
  cloud: PointCloud;
  visible: boolean;
}

export interface ImportedMesh {
  id: string;
  name: string;
  object: Object3D;
  visible: boolean;
}

export interface Underlay {
  id: string;
  name: string;
  url: string;
  bounds: Bounds;
  opacity: number;
  visible: boolean;
}

interface InteropState {
  clouds: ImportedCloud[];
  meshes: ImportedMesh[];
  underlay: Underlay | null;

  addCloud(cloud: ImportedCloud): void;
  removeCloud(id: string): void;
  toggleCloud(id: string): void;

  addMesh(mesh: ImportedMesh): void;
  removeMesh(id: string): void;

  setUnderlay(underlay: Underlay): void;
  updateUnderlay(patch: Partial<Underlay>): void;
  clearUnderlay(): void;

  clearAll(): void;
}

export const useInteropStore = create<InteropState>((set, get) => ({
  clouds: [],
  meshes: [],
  underlay: null,

  addCloud(cloud) {
    set((s) => ({ clouds: [...s.clouds, cloud] }));
  },
  removeCloud(id) {
    set((s) => ({ clouds: s.clouds.filter((c) => c.id !== id) }));
  },
  toggleCloud(id) {
    set((s) => ({
      clouds: s.clouds.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
    }));
  },

  addMesh(mesh) {
    set((s) => ({ meshes: [...s.meshes, mesh] }));
  },
  removeMesh(id) {
    set((s) => ({ meshes: s.meshes.filter((m) => m.id !== id) }));
  },

  setUnderlay(underlay) {
    const prev = get().underlay;
    if (prev) {URL.revokeObjectURL(prev.url);}
    set({ underlay });
  },
  updateUnderlay(patch) {
    set((s) => (s.underlay ? { underlay: { ...s.underlay, ...patch } } : s));
  },
  clearUnderlay() {
    const prev = get().underlay;
    if (prev) {URL.revokeObjectURL(prev.url);}
    set({ underlay: null });
  },

  clearAll() {
    const { underlay } = get();
    if (underlay) {URL.revokeObjectURL(underlay.url);}
    set({ clouds: [], meshes: [], underlay: null });
  },
}));
