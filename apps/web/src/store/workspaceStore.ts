import { create } from "zustand";
import {
  createId,
  isSpatialElement,
  networkFromPath,
  type AreaUnit,
  type ElementKind,
  type Layer,
  type NetworkEdge,
  type NetworkKind,
  type PlanElement,
  type Point,
  type Polygon,
  type Polyline,
  type Site,
} from "@thoth/domain";
import type { Project } from "@/api";
import { createPointElement, createSpatialElement } from "@/lib/elementFactory";
import { elementMeta } from "@/lib/elementMeta";
import type { ToolId } from "@/lib/tools";

const HISTORY_LIMIT = 60;

/** Snapshot-based undo history of the working site. */
interface History {
  past: Site[];
  future: Site[];
}

export interface WorkspaceState {
  projectId: string | null;
  projectName: string;
  site: Site | null;
  history: History;

  activeTool: ToolId;
  activeLayerId: string | null;
  selection: string[];
  areaUnit: AreaUnit;
  /** Set when the site diverges from the last saved server state. */
  dirty: boolean;
  lastSavedAt: string | null;

  // --- lifecycle ---
  loadProject(project: Project): void;
  reset(): void;
  markSaved(savedAt: string): void;

  // --- tool & selection ---
  setTool(tool: ToolId): void;
  setActiveLayer(layerId: string): void;
  setAreaUnit(unit: AreaUnit): void;
  select(id: string | null, additive?: boolean): void;
  selectMany(ids: string[]): void;

  // --- element mutations (each records history) ---
  addDrawnElement(kind: Exclude<ElementKind, "note" | "tree" | "spot">, boundary: Polygon): string | null;
  addPointElement(kind: "note" | "tree" | "spot", position: Point): string | null;
  addNetworkPath(kind: NetworkKind, path: Polyline, edge?: Partial<NetworkEdge>): string | null;
  updateElement(id: string, patch: Partial<PlanElement>): void;
  updateBoundary(id: string, boundary: Polygon): void;
  moveSelection(delta: Point): void;
  deleteSelection(): void;
  replaceElements(next: PlanElement[]): void;

  // --- layers ---
  addLayer(name: string): void;
  updateLayer(id: string, patch: Partial<Layer>): void;
  removeLayer(id: string): void;
  reorderLayer(id: string, direction: "up" | "down"): void;

  // --- history ---
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

function snapshot<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  /** Apply a pure change to the site, recording the previous state for undo. */
  function mutate(recipe: (site: Site) => Site) {
    const { site, history } = get();
    if (!site) return;
    const nextSite = recipe(snapshot(site));
    const past = [...history.past, site].slice(-HISTORY_LIMIT);
    set({ site: nextSite, history: { past, future: [] }, dirty: true });
  }

  return {
    projectId: null,
    projectName: "",
    site: null,
    history: { past: [], future: [] },
    activeTool: "select",
    activeLayerId: null,
    selection: [],
    areaUnit: "acres",
    dirty: false,
    lastSavedAt: null,

    loadProject(project) {
      set({
        projectId: project.id,
        projectName: project.name,
        site: snapshot(project.site),
        history: { past: [], future: [] },
        activeTool: "select",
        activeLayerId: project.site.layers[0]?.id ?? null,
        selection: [],
        dirty: false,
        lastSavedAt: project.updatedAt,
      });
    },

    reset() {
      set({
        projectId: null,
        projectName: "",
        site: null,
        history: { past: [], future: [] },
        selection: [],
        activeTool: "select",
        activeLayerId: null,
        dirty: false,
        lastSavedAt: null,
      });
    },

    markSaved(savedAt) {
      set({ dirty: false, lastSavedAt: savedAt });
    },

    setTool(tool) {
      set({ activeTool: tool });
    },

    setActiveLayer(layerId) {
      set({ activeLayerId: layerId });
    },

    setAreaUnit(unit) {
      set({ areaUnit: unit });
    },

    select(id, additive = false) {
      if (id === null) {
        set({ selection: [] });
        return;
      }
      const { selection } = get();
      if (additive) {
        set({
          selection: selection.includes(id)
            ? selection.filter((s) => s !== id)
            : [...selection, id],
        });
      } else {
        set({ selection: [id] });
      }
    },

    selectMany(ids) {
      set({ selection: ids });
    },

    addDrawnElement(kind, boundary) {
      const { site, activeLayerId } = get();
      if (!site) return null;
      const layerId = activeLayerId ?? elementMeta(kind).defaultLayerId;
      const element = createSpatialElement(site, kind, boundary, layerId);
      mutate((s) => ({ ...s, elements: [...s.elements, element] }));
      set({ selection: [element.id] });
      return element.id;
    },

    addPointElement(kind, position) {
      const { site, activeLayerId } = get();
      if (!site) return null;
      const layerId = activeLayerId ?? elementMeta(kind).defaultLayerId;
      const element = createPointElement(site, kind, position, layerId);
      mutate((s) => ({ ...s, elements: [...s.elements, element] }));
      set({ selection: [element.id] });
      return element.id;
    },

    addNetworkPath(kind, path, edge) {
      const { site } = get();
      if (!site || path.length < 2) return null;
      const count = (site.networks ?? []).filter((n) => n.kind === kind).length;
      const name = `${kind === "road" ? "Road" : "Main"} ${count + 1}`;
      const network = networkFromPath(createId("net"), name, kind, path, () => createId("nn"), edge);
      mutate((s) => ({ ...s, networks: [...(s.networks ?? []), network] }));
      return network.id;
    },

    updateElement(id, patch) {
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as PlanElement) : e)),
      }));
    },

    updateBoundary(id, boundary) {
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id && isSpatialElement(e) ? { ...e, boundary } : e,
        ),
      }));
    },

    moveSelection(delta) {
      const { selection } = get();
      if (selection.length === 0) return;
      const ids = new Set(selection);
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (!ids.has(e.id)) return e;
          if (isSpatialElement(e)) {
            return { ...e, boundary: e.boundary.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y })) };
          }
          return { ...e, position: { x: e.position.x + delta.x, y: e.position.y + delta.y } };
        }),
      }));
    },

    deleteSelection() {
      const { selection } = get();
      if (selection.length === 0) return;
      const ids = new Set(selection);
      mutate((s) => ({ ...s, elements: s.elements.filter((e) => !ids.has(e.id)) }));
      set({ selection: [] });
    },

    replaceElements(next) {
      mutate((s) => ({ ...s, elements: next }));
    },

    addLayer(name) {
      mutate((s) => {
        const order = s.layers.reduce((max, l) => Math.max(max, l.order), -1) + 1;
        const layer: Layer = {
          id: `layer-${order}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          order,
          visible: true,
          locked: false,
        };
        return { ...s, layers: [...s.layers, layer] };
      });
    },

    updateLayer(id, patch) {
      mutate((s) => ({
        ...s,
        layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }));
    },

    removeLayer(id) {
      const { site } = get();
      if (!site || site.layers.length <= 1) return;
      const fallback = site.layers.find((l) => l.id !== id)!;
      mutate((s) => ({
        ...s,
        layers: s.layers.filter((l) => l.id !== id),
        elements: s.elements.map((e) => (e.layerId === id ? { ...e, layerId: fallback.id } : e)),
      }));
      if (get().activeLayerId === id) set({ activeLayerId: fallback.id });
    },

    reorderLayer(id, direction) {
      mutate((s) => {
        const sorted = [...s.layers].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex((l) => l.id === id);
        if (index < 0) return s;
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= sorted.length) return s;
        const a = sorted[index];
        const b = sorted[swapWith];
        const aOrder = a.order;
        a.order = b.order;
        b.order = aOrder;
        return { ...s, layers: sorted };
      });
    },

    undo() {
      const { site, history } = get();
      if (!site || history.past.length === 0) return;
      const previous = history.past[history.past.length - 1];
      set({
        site: previous,
        history: {
          past: history.past.slice(0, -1),
          future: [site, ...history.future].slice(0, HISTORY_LIMIT),
        },
        dirty: true,
      });
    },

    redo() {
      const { site, history } = get();
      if (!site || history.future.length === 0) return;
      const next = history.future[0];
      set({
        site: next,
        history: {
          past: [...history.past, site].slice(-HISTORY_LIMIT),
          future: history.future.slice(1),
        },
        dirty: true,
      });
    },

    canUndo() {
      return get().history.past.length > 0;
    },

    canRedo() {
      return get().history.future.length > 0;
    },
  };
});
