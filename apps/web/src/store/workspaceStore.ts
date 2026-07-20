import { create } from "zustand";
import {
  bounds,
  createId,
  getRegionPlugin,
  isPointElement,
  isSpatialElement,
  networkFromPath,
  rewriteCrossReferences,
  unionBounds,
  type DrawingSet,
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
  type SheetRemap,
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
  select(id: string | null, additive?: boolean): void;
  selectMany(ids: string[]): void;
  selectAll(): void;

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
  addDrawnElement(kind: Exclude<ElementKind, "note" | "tree" | "spot">, boundary: Polygon): string | null;
  addPointElement(kind: "note" | "tree" | "spot", position: Point): string | null;
  addNetworkPath(kind: NetworkKind, path: Polyline, edge?: Partial<NetworkEdge>): string | null;
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
  /**
   * Persist the project's primary CAD sheet set. When a renumber `remap` is
   * given, every callout, section/elevation/detail mark, and match line in the
   * site's annotations that referenced the old sheet number is rewritten to the
   * new one, keeping cross-references valid (FE-SHEETSET-004).
   */
  updateSheetSet(next: DrawingSet, remap?: SheetRemap | null): void;

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

/**
 * Session clipboard. Module-scoped so copy/paste survives project switches,
 * satisfying "paste across projects and scenarios" (`FE-EDIT-001`).
 */
let clipboard: PlanElement[] = [];

/** A "nice" paste offset derived from the copied elements' own extent. */
function pasteOffset(elements: PlanElement[]): Point {
  const boxes = elements.filter(isSpatialElement).map((e) => bounds(e.boundary));
  const b = boxes.length ? unionBounds(boxes) : null;
  if (b) {
    const step = Math.max(1, Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.05);
    return { x: step, y: step };
  }
  return { x: 5, y: 5 };
}

/**
 * Re-key edge bulges after inserting a vertex following `afterIndex`. The split
 * edge's arc is dropped (a curve can't be split without recomputation); edges
 * after the insertion shift up by one.
 */
function reindexArcsAfterInsert(
  arcs: Record<string, number>,
  afterIndex: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(arcs)) {
    const i = Number(k);
    if (i === afterIndex) continue;
    out[String(i > afterIndex ? i + 1 : i)] = v;
  }
  return out;
}

/**
 * Re-key edge bulges after deleting vertex `index`. The two edges incident to
 * the removed vertex merge into one straight edge (their arcs are dropped);
 * later edges shift down by one.
 */
function reindexArcsAfterDelete(
  arcs: Record<string, number>,
  index: number,
  n: number,
): Record<string, number> {
  const removedPrev = (index - 1 + n) % n;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(arcs)) {
    const i = Number(k);
    if (i === index || i === removedPrev) continue;
    out[String(i > index ? i - 1 : i)] = v;
  }
  return out;
}

/** Clone an element with a fresh id, shifted by (dx, dy), reparented if needed. */
function offsetElement(
  el: PlanElement,
  dx: number,
  dy: number,
  layerExists: (id: string) => boolean,
  fallbackLayer: string,
): PlanElement {
  const layerId = layerExists(el.layerId) ? el.layerId : fallbackLayer;
  const id = createId(el.kind);
  if (isPointElement(el)) {
    return { ...el, id, layerId, position: { x: el.position.x + dx, y: el.position.y + dy } };
  }
  return { ...el, id, layerId, boundary: el.boundary.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
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
      if (!site) return;
      set({ selection: site.elements.map((e) => e.id) });
    },

    copySelection() {
      const { site, selection } = get();
      if (!site || selection.length === 0) return;
      const ids = new Set(selection);
      clipboard = site.elements.filter((e) => ids.has(e.id)).map((e) => snapshot(e));
    },

    cutSelection() {
      if (get().selection.length === 0) return;
      get().copySelection();
      get().deleteSelection();
    },

    paste() {
      const { site, activeLayerId } = get();
      if (!site || clipboard.length === 0) return;
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
      if (!site || selection.length === 0) return;
      const ids = new Set(selection);
      const originals = site.elements.filter((e) => ids.has(e.id));
      if (originals.length === 0) return;
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
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== id || !isSpatialElement(e)) return e;
          const boundary = e.boundary.slice();
          boundary.splice(afterIndex + 1, 0, point);
          const arcs = e.arcs ? reindexArcsAfterInsert(e.arcs, afterIndex) : undefined;
          return { ...e, boundary, arcs };
        }),
      }));
    },

    deleteVertex(id, index) {
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== id || !isSpatialElement(e) || e.boundary.length <= 3) return e;
          const arcs = e.arcs ? reindexArcsAfterDelete(e.arcs, index, e.boundary.length) : undefined;
          return { ...e, boundary: e.boundary.filter((_, i) => i !== index), arcs };
        }),
      }));
    },

    setEdgeBulge(id, edgeIndex, bulge) {
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== id || !isSpatialElement(e)) return e;
          const arcs: Record<string, number> = { ...(e.arcs ?? {}) };
          if (Math.abs(bulge) < 1e-4) delete arcs[String(edgeIndex)];
          else arcs[String(edgeIndex)] = bulge;
          return { ...e, arcs };
        }),
      }));
    },

    clearArcs(id) {
      mutate((s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id && isSpatialElement(e) ? { ...e, arcs: {} } : e,
        ),
      }));
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

    addAlignment(pis, radius = 0) {
      const { site } = get();
      if (!site || pis.length < 2) return null;
      const count = (site.alignments ?? []).length;
      const id = createId("algn");
      const alignment = {
        id,
        name: `Baseline ${count + 1}`,
        startStation: 0,
        pis: pis.map((point, i) => ({
          point,
          // Interior PIs get a default curve radius; endpoints stay sharp.
          radius: radius > 0 && i > 0 && i < pis.length - 1 ? radius : undefined,
        })),
      };
      mutate((s) => ({ ...s, alignments: [...(s.alignments ?? []), alignment] }));
      return id;
    },

    addElements(elements) {
      if (elements.length === 0) return;
      mutate((s) => ({ ...s, elements: [...s.elements, ...elements] }));
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

    addBuildingModel(model) {
      mutate((s) => ({ ...s, buildingModels: [...(s.buildingModels ?? []), model] }));
    },

    updateBuildingModel(id, patch) {
      mutate((s) => ({
        ...s,
        buildingModels: (s.buildingModels ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
    },

    addDimension(dim) {
      mutate((s) => ({ ...s, dimensions: [...(s.dimensions ?? []), dim] }));
    },

    updateSheetSet(next, remap) {
      mutate((s) => {
        const rest = (s.drawingSets ?? []).filter((d) => d.id !== next.id);
        const drawingSets = [next, ...rest];
        if (!remap) return { ...s, drawingSets };
        const ann = s.annotations;
        if (!ann) return { ...s, drawingSets };
        return {
          ...s,
          drawingSets,
          annotations: {
            ...ann,
            sectionMarks: ann.sectionMarks && rewriteCrossReferences(ann.sectionMarks, remap),
            elevationMarks: ann.elevationMarks && rewriteCrossReferences(ann.elevationMarks, remap),
            detailMarks: ann.detailMarks && rewriteCrossReferences(ann.detailMarks, remap),
            matchLines: ann.matchLines && rewriteCrossReferences(ann.matchLines, remap),
          },
        };
      });
    },

    setJurisdiction(id) {
      mutate((s) => {
        const plugin = getRegionPlugin(id);
        const next: Site = { ...s, jurisdictionId: id ?? undefined };
        // Anchor the Georgia Land Lot framework if the jurisdiction needs it.
        if (plugin?.surveyFramework === "georgia-land-lot" && !s.landLot) {
          const boxes = s.elements.filter(isSpatialElement).map((e) => bounds(e.boundary));
          const b = boxes.length ? unionBounds(boxes) : null;
          const nwCorner = b ? { x: b.minX - 20, y: b.minY - 20 } : { x: 0, y: 0 };
          next.landLot = {
            ref: { district: 9, landLot: 12, acres: plugin.standards?.landLotAcres ?? 202.5 },
            nwCorner,
          };
        }
        return next;
      });
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
