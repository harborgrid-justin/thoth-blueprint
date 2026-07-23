import { create } from "zustand";
import {
  createId,
  geoidRegistry,
  initializeSiteSurveyFramework,
  isSpatialElement,
  networkFromPath,
  offsetElement,
  pasteOffset,
  reindexArcsAfterDelete,
  reindexArcsAfterInsert,
  findMatchingKey,
  formatDescription,
  DEFAULT_DESCRIPTION_KEYS,
  type ElementKind,
  type Layer,
  type NetworkEdge,
  type NetworkKind,
  type BuildingModel,
  type Dimension,
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
  hoveredElementId: string | null;
  /** Set when the site diverges from the last saved server state. */
  dirty: boolean;
  lastSavedAt: string | null;

  viewFrames: any[];
  matchLines: any[];
  setViewFrames(frames: any[], matchLines: any[]): void;
  addDrawingSet(set: any): void;

  // --- lifecycle ---
  loadProject(project: Project): void;
  loadSitePreset(site: Site, name?: string): void;
  reset(): void;
  markSaved(savedAt: string): void;

  // --- tool & selection ---
  setTool(tool: ToolId): void;
  setActiveLayer(layerId: string): void;
  select(id: string | null, additive?: boolean): void;
  selectMany(ids: string[]): void;
  selectAll(): void;
  hoverElement(id: string | null): void;

  // --- clipboard & structural editing ---
  copySelection(): void;
  cutSelection(): void;
  /** Paste the clipboard, offset from the originals, selecting the new copies. */
  paste(): void;
  /** Duplicate the current selection in place with an offset. */
  duplicateSelection(): void;
  /** Whether the clipboard currently holds anything to paste. */
  canPaste(): boolean;

  // --- vertex editing ---
  /** Insert a vertex into a spatial element's boundary after `afterIndex`. */
  insertVertex(id: string, afterIndex: number, point: Point): void;
  /** Delete a vertex from a spatial element's boundary (keeps a triangle minimum). */
  deleteVertex(id: string, index: number): void;
  /** Set (or clear, when ~0) the circular-arc bulge of an element's edge. */
  setEdgeBulge(id: string, edgeIndex: number, bulge: number): void;
  /** Straighten every curved edge of an element. */
  clearArcs(id: string): void;

  // --- element mutations (each records history) ---
  addDrawnElement(
    kind: Exclude<ElementKind, "note" | "tree" | "spot">,
    boundary: Polygon,
  ): string | null;
  addPointElement(
    kind: "note" | "tree" | "spot",
    position: Point,
  ): string | null;
  addNetworkPath(
    kind: NetworkKind,
    path: Polyline,
    edge?: Partial<NetworkEdge>,
  ): string | null;
  /** Add a stationed horizontal alignment from a chain of PI points. */
  addAlignment(pis: Point[], radius?: number): string | null;
  addElements(elements: PlanElement[]): void;
  updateElement(id: string, patch: Partial<PlanElement>): void;
  updateBoundary(id: string, boundary: Polygon): void;
  moveSelection(delta: Point): void;
  deleteSelection(): void;
  replaceElements(next: PlanElement[]): void;

  /** Enable a region plug-in (jurisdiction); anchors its survey framework. */
  setJurisdiction(id: string | null): void;

  // --- CAD sheets & building interiors ---
  /** Add or replace a building-interior model. */
  addBuildingModel(model: BuildingModel): void;
  updateBuildingModel(id: string, patch: Partial<BuildingModel>): void;
  /** Add a CAD dimension entity to the plan. */
  addDimension(dim: Dimension): void;

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

  // --- renovation mode ---
  renovationMode: boolean;
  activeRenovationCategory: "existing" | "new" | "demolished";
  toggleRenovationMode(): void;
  setActiveRenovationCategory(
    category: "existing" | "new" | "demolished",
  ): void;
}

function snapshot<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

/**
 * Session clipboard. Module-scoped so copy/paste survives project switches,
 * satisfying "paste across projects and scenarios" (`FE-EDIT-001`).
 */
let clipboard: PlanElement[] = [];



export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  /** Apply a pure change to the site, recording the previous state for undo. */
  function mutate(recipe: (site: Site) => Site) {
    const { site, history } = get();
    if (!site) {
      return;
    }
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
    hoveredElementId: null,
    dirty: false,
    lastSavedAt: null,
    viewFrames: [],
    matchLines: [],
    renovationMode: false,
    activeRenovationCategory: "new",
    toggleRenovationMode: () =>
      set((state) => ({ renovationMode: !state.renovationMode })),
    setActiveRenovationCategory: (category) =>
      set({ activeRenovationCategory: category }),

    loadProject(project) {
      set({
        projectId: project.id,
        projectName: project.name,
        site: snapshot(project.site),
        history: { past: [], future: [] },
        activeTool: "select",
        activeLayerId: project.site.layers[0]?.id ?? null,
        selection: [],
        hoveredElementId: null,
        dirty: false,
        lastSavedAt: project.updatedAt,
        viewFrames: [],
        matchLines: [],
      });
    },

    loadSitePreset(presetSite, name) {
      set({
        site: snapshot(presetSite),
        projectName: name ?? presetSite.name ?? "Site Plan Preset",
        history: { past: [], future: [] },
        activeTool: "select",
        activeLayerId: presetSite.layers[0]?.id ?? null,
        selection: [],
        hoveredElementId: null,
        dirty: true,
        viewFrames: [],
        matchLines: [],
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
        viewFrames: [],
        matchLines: [],
      });
    },

    setViewFrames(viewFrames, matchLines) {
      set({ viewFrames, matchLines });
    },

    addDrawingSet(setObj) {
      mutate((site) => {
        if (!site.drawingSets) {
          site.drawingSets = [];
        }
        site.drawingSets.unshift(setObj);
        return site;
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

    selectAll() {
      const { site } = get();
      if (!site) {
        return;
      }
      set({ selection: site.elements.map((e) => e.id) });
    },

    hoverElement(id) {
      set({ hoveredElementId: id });
    },

    copySelection() {
      const { site, selection } = get();
      if (!site || selection.length === 0) {
        return;
      }
      const ids = new Set(selection);
      clipboard = site.elements
        .filter((e) => ids.has(e.id))
        .map((e) => snapshot(e));
    },

    cutSelection() {
      if (get().selection.length === 0) {
        return;
      }
      get().copySelection();
      get().deleteSelection();
    },

    paste() {
      const { site, activeLayerId } = get();
      if (!site || clipboard.length === 0) {
        return;
      }
      const fallback = activeLayerId ?? site.layers[0]?.id ?? "";
      const layerExists = (id: string) => site.layers.some((l) => l.id === id);
      const off = pasteOffset(clipboard);
      const copies = clipboard.map((e) =>
        offsetElement(snapshot(e), off.x, off.y, layerExists, fallback),
      );
      mutate((s) => ({ ...s, elements: [...s.elements, ...copies] }));
      set({ selection: copies.map((c) => c.id) });
    },

    duplicateSelection() {
      const { site, selection, activeLayerId } = get();
      if (!site || selection.length === 0) {
        return;
      }
      const ids = new Set(selection);
      const originals = site.elements.filter((e) => ids.has(e.id));
      if (originals.length === 0) {
        return;
      }
      const fallback = activeLayerId ?? site.layers[0]?.id ?? "";
      const layerExists = (id: string) => site.layers.some((l) => l.id === id);
      const off = pasteOffset(originals);
      const copies = originals.map((e) =>
        offsetElement(snapshot(e), off.x, off.y, layerExists, fallback),
      );
      mutate((s) => ({ ...s, elements: [...s.elements, ...copies] }));
      set({ selection: copies.map((c) => c.id) });
    },

    canPaste() {
      return clipboard.length > 0;
    },

    insertVertex(id, afterIndex, point) {
      const { site, renovationMode } = get();
      if (site) {
        const el = site.elements.find((e) => e.id === id);
        if (
          el &&
          renovationMode &&
          (el.renovationStatus || "existing") === "existing"
        ) {
          alert(
            "Renovation Mode Lock: Elements with status 'Existing' cannot be modified.",
          );
          return;
        }
      }
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== id || !isSpatialElement(e)) {
            return e;
          }
          const boundary = e.boundary.slice();
          boundary.splice(afterIndex + 1, 0, point);
          const arcs = e.arcs
            ? reindexArcsAfterInsert(e.arcs, afterIndex)
            : undefined;
          return { ...e, boundary, arcs };
        }),
      }));
    },

    deleteVertex(id, index) {
      const { site, renovationMode } = get();
      if (site) {
        const el = site.elements.find((e) => e.id === id);
        if (
          el &&
          renovationMode &&
          (el.renovationStatus || "existing") === "existing"
        ) {
          alert(
            "Renovation Mode Lock: Elements with status 'Existing' cannot be modified.",
          );
          return;
        }
      }
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== id || !isSpatialElement(e) || e.boundary.length <= 3) {
            return e;
          }
          const arcs = e.arcs
            ? reindexArcsAfterDelete(e.arcs, index, e.boundary.length)
            : undefined;
          return {
            ...e,
            boundary: e.boundary.filter((_, i) => i !== index),
            arcs,
          };
        }),
      }));
    },

    setEdgeBulge(id, edgeIndex, bulge) {
      const { site, renovationMode } = get();
      if (site) {
        const el = site.elements.find((e) => e.id === id);
        if (
          el &&
          renovationMode &&
          (el.renovationStatus || "existing") === "existing"
        ) {
          alert(
            "Renovation Mode Lock: Elements with status 'Existing' cannot be modified.",
          );
          return;
        }
      }
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== id || !isSpatialElement(e)) {
            return e;
          }
          const arcs: Record<string, number> = { ...(e.arcs ?? {}) };
          if (Math.abs(bulge) < 1e-4) {
            delete arcs[String(edgeIndex)];
          } else {
            arcs[String(edgeIndex)] = bulge;
          }
          return { ...e, arcs };
        }),
      }));
    },

    clearArcs(id) {
      const { site, renovationMode } = get();
      if (site) {
        const el = site.elements.find((e) => e.id === id);
        if (
          el &&
          renovationMode &&
          (el.renovationStatus || "existing") === "existing"
        ) {
          alert(
            "Renovation Mode Lock: Elements with status 'Existing' cannot be modified.",
          );
          return;
        }
      }
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id && isSpatialElement(e) ? { ...e, arcs: {} } : e,
        ),
      }));
    },

    addDrawnElement(kind, boundary) {
      const { site, activeLayerId, renovationMode, activeRenovationCategory } =
        get();
      if (!site) {
        return null;
      }
      let layerId = activeLayerId ?? elementMeta(kind).defaultLayerId;

      // Demolition layer auto-routing (REQ-UNIMP-002)
      if (renovationMode && activeRenovationCategory === "demolished") {
        layerId = `D-${layerId}`;
        const layerExists = site.layers.some((l) => l.id === layerId);
        if (!layerExists) {
          const originalLayer = site.layers.find(
            (l) => l.id === (activeLayerId || elementMeta(kind).defaultLayerId),
          );
          const demoLayer: Layer = {
            id: layerId,
            name: `Demolition - ${originalLayer?.name || kind.toUpperCase()}`,
            order: (originalLayer?.order ?? 0) - 100,
            visible: true,
            locked: false,
            color: "#ef4444",
          };
          mutate((s) => ({ ...s, layers: [...s.layers, demoLayer] }));
        }
      }

      const element = createSpatialElement(site, kind, boundary, layerId);

      // Auto classify renovation status (REQ-UNIMP-005)
      if (renovationMode) {
        element.renovationStatus = activeRenovationCategory;
      }

      mutate((s) => ({ ...s, elements: [...s.elements, element] }));
      set({ selection: [element.id] });
      return element.id;
    },

    addPointElement(kind, position) {
      const { site, activeLayerId, renovationMode, activeRenovationCategory } =
        get();
      if (!site) {
        return null;
      }
      const rawDesc =
        prompt(
          "Enter COGO Point Description (e.g. TR-Oak, MH-Storm, BM-Main):",
        ) || "";
      let layerId = activeLayerId ?? elementMeta(kind).defaultLayerId;
      let finalKind = kind;
      let finalDesc = rawDesc || `${kind.toUpperCase()}`;
      let matchedSym = undefined;

      const matchingKey = findMatchingKey(rawDesc, DEFAULT_DESCRIPTION_KEYS);
      if (matchingKey) {
        layerId = matchingKey.layerId;
        finalKind = matchingKey.elementKind as "note" | "tree" | "spot";
        finalDesc = formatDescription(rawDesc, matchingKey.format);
        if (matchingKey.symbolName) {
          matchedSym = matchingKey.symbolName;
        }
      }

      // Demolition layer auto-routing (REQ-UNIMP-002)
      if (renovationMode && activeRenovationCategory === "demolished") {
        layerId = `D-${layerId}`;
        const layerExists = site.layers.some((l) => l.id === layerId);
        if (!layerExists) {
          const originalLayer = site.layers.find(
            (l) =>
              l.id ===
              (matchingKey?.layerId ||
                activeLayerId ||
                elementMeta(kind).defaultLayerId),
          );
          const demoLayer: Layer = {
            id: layerId,
            name: `Demolition - ${originalLayer?.name || kind.toUpperCase()}`,
            order: (originalLayer?.order ?? 0) - 100,
            visible: true,
            locked: false,
            color: "#ef4444",
          };
          mutate((s) => ({ ...s, layers: [...s.layers, demoLayer] }));
        }
      }

      const element = createPointElement(
        site,
        finalKind,
        position,
        layerId,
      ) as any;
      element.description = rawDesc;
      element.label = finalDesc;
      if (finalKind === "tree") {
        element.species = finalDesc;
      }
      if (matchedSym) {
        element.symbol = matchedSym;
      }

      // Auto classify renovation status (REQ-UNIMP-005)
      if (renovationMode) {
        element.renovationStatus = activeRenovationCategory;
      }

      mutate((s) => ({ ...s, elements: [...s.elements, element] }));
      set({ selection: [element.id] });
      return element.id;
    },

    addNetworkPath(kind, path, edge) {
      const { site } = get();
      if (!site || path.length < 2) {
        return null;
      }
      const count = (site.networks ?? []).filter((n) => n.kind === kind).length;
      const name = `${kind === "road" ? "Road" : "Main"} ${count + 1}`;
      const network = networkFromPath(
        createId("net"),
        name,
        kind,
        path,
        () => createId("nn"),
        edge,
      );
      mutate((s) => ({ ...s, networks: [...(s.networks ?? []), network] }));
      return network.id;
    },

    addAlignment(pis, radius = 0) {
      const { site } = get();
      if (!site || pis.length < 2) {
        return null;
      }
      const count = (site.alignments ?? []).length;
      const id = createId("algn");
      const alignment = {
        id,
        name: `Baseline ${count + 1}`,
        startStation: 0,
        pis: pis.map((point, i) => ({
          point,
          // Interior PIs get a default curve radius; endpoints stay sharp.
          radius:
            radius > 0 && i > 0 && i < pis.length - 1 ? radius : undefined,
        })),
      };
      mutate((s) => ({
        ...s,
        alignments: [...(s.alignments ?? []), alignment],
      }));
      return id;
    },

    addElements(elements) {
      if (elements.length === 0) {
        return;
      }
      mutate((s) => ({ ...s, elements: [...s.elements, ...elements] }));
    },

    updateElement(id, patch) {
      const { site, renovationMode } = get();
      if (site) {
        const el = site.elements.find((e) => e.id === id);
        if (
          el &&
          renovationMode &&
          (el.renovationStatus || "existing") === "existing"
        ) {
          const keys = Object.keys(patch);
          if (keys.length > 1 || keys[0] !== "renovationStatus") {
            alert(
              "Renovation Mode Lock: Elements with status 'Existing' cannot be modified.",
            );
            return;
          }
        }
      }
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id ? ({ ...e, ...patch } as PlanElement) : e,
        ),
      }));
    },

    updateBoundary(id, boundary) {
      const { site, renovationMode } = get();
      if (site) {
        const el = site.elements.find((e) => e.id === id);
        if (
          el &&
          renovationMode &&
          (el.renovationStatus || "existing") === "existing"
        ) {
          alert(
            "Renovation Mode Lock: Elements with status 'Existing' boundary cannot be modified.",
          );
          return;
        }
      }
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id && isSpatialElement(e) ? { ...e, boundary } : e,
        ),
      }));
    },

    moveSelection(delta) {
      const { selection, site, renovationMode } = get();
      if (selection.length === 0 || !site) {
        return;
      }
      const ids = new Set(selection);
      if (renovationMode) {
        const hasExisting = site.elements.some(
          (e) =>
            ids.has(e.id) && (e.renovationStatus || "existing") === "existing",
        );
        if (hasExisting) {
          alert(
            "Renovation Mode Lock: Elements with status 'Existing' cannot be translated or edited.",
          );
          return;
        }
      }
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (!ids.has(e.id)) {
            return e;
          }
          if (isSpatialElement(e)) {
            return {
              ...e,
              boundary: e.boundary.map((p) => ({
                x: p.x + delta.x,
                y: p.y + delta.y,
              })),
            };
          }
          return {
            ...e,
            position: { x: e.position.x + delta.x, y: e.position.y + delta.y },
          };
        }),
      }));
    },

    deleteSelection() {
      const { selection, site, renovationMode } = get();
      if (selection.length === 0 || !site) {
        return;
      }
      const ids = new Set(selection);
      if (renovationMode) {
        const hasExisting = site.elements.some(
          (e) =>
            ids.has(e.id) && (e.renovationStatus || "existing") === "existing",
        );
        if (hasExisting) {
          alert(
            "Renovation Mode Lock: Elements with status 'Existing' cannot be deleted.",
          );
          return;
        }
      }
      mutate((s) => ({
        ...s,
        elements: s.elements.filter((e) => !ids.has(e.id)),
      }));
      set({ selection: [] });
    },

    replaceElements(next) {
      mutate((s) => ({ ...s, elements: next }));
    },

    addBuildingModel(model) {
      mutate((s) => ({
        ...s,
        buildingModels: [...(s.buildingModels ?? []), model],
      }));
    },

    updateBuildingModel(id, patch) {
      mutate((s) => ({
        ...s,
        buildingModels: (s.buildingModels ?? []).map((m) =>
          m.id === id ? { ...m, ...patch } : m,
        ),
      }));
    },

    addDimension(dim) {
      mutate((s) => ({ ...s, dimensions: [...(s.dimensions ?? []), dim] }));
    },

    setJurisdiction(id) {
      mutate((s) => {
        const resolvedCode = geoidRegistry.resolve(id ?? "51153");
        const next: Site = { ...s, jurisdictionId: id ?? undefined, geoid: id ?? undefined };
        return initializeSiteSurveyFramework(next, resolvedCode);
      });
    },

    addLayer(name) {
      mutate((s) => {
        const order =
          s.layers.reduce((max, l) => Math.max(max, l.order), -1) + 1;
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
      if (!site || site.layers.length <= 1) {
        return;
      }
      const fallback = site.layers.find((l) => l.id !== id)!;
      mutate((s) => ({
        ...s,
        layers: s.layers.filter((l) => l.id !== id),
        elements: s.elements.map((e) =>
          e.layerId === id ? { ...e, layerId: fallback.id } : e,
        ),
      }));
      if (get().activeLayerId === id) {
        set({ activeLayerId: fallback.id });
      }
    },

    reorderLayer(id, direction) {
      mutate((s) => {
        const sorted = [...s.layers].sort((a, b) => a.order - b.order);
        const index = sorted.findIndex((l) => l.id === id);
        if (index < 0) {
          return s;
        }
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= sorted.length) {
          return s;
        }
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
      if (!site || history.past.length === 0) {
        return;
      }
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
      if (!site || history.future.length === 0) {
        return;
      }
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
