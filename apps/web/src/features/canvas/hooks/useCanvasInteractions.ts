import * as React from "react";
import {
  DEFAULT_ROAD_WIDTH,
  densifyBoundary,
  edgeBulge,
  isSpatialElement,
  pointInPolygon,
  resolveAlignment,
  traceWaterDropPath,
  type Point,
  type Polygon,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useKeyboardShortcut } from "@/lib/hooks";
import {
  niceGridStep,
  worldToScreen,
  zoomAt,
  type Viewport,
} from "../helpers/viewport";
import { eventToWorld, snapPoint } from "../helpers/snapping";
import {
  edgeMidpoint,
  bulgeThroughCursor,
  orderedVisibleElements,
  pointSegmentDistance,
} from "../helpers/canvasHelpers";

export type Interaction =
  | { type: "idle" }
  | { type: "panning"; lastScreen: Point }
  | { type: "moving"; startWorld: Point; delta: Point }
  | { type: "vertex"; elementId: string; index: number; boundary: Polygon }
  | { type: "alignmentPI"; elementId: string; index: number; boundary: Point[] }
  | {
      type: "edgeBulge";
      elementId: string;
      index: number;
      from: Point;
      to: Point;
      bulge: number;
    };

export interface CanvasInteractionsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewport: Viewport;
  setViewport: (v: Viewport) => void;
  state: ReturnType<
    typeof import("./usePlanningCanvasState").usePlanningCanvasState
  >;
}

export function useCanvasInteractions({
  containerRef,
  viewport,
  setViewport,
  state,
}: CanvasInteractionsProps) {
  const {
    site,
    selection,
    activeTool,
    select,
    moveSelection,
    updateBoundary,
    addDrawnElement,
    addPointElement,
    addNetworkPath,
    addAlignment,
    insertVertex,
    deleteVertex,
    setEdgeBulge,
    setTool,
    snapToGrid,
    snapToVertices,
    terrainSurface,
    tool,
  } = state;

  const [draft, setDraft] = React.useState<Point[]>([]);
  const [cursor, setCursor] = React.useState<Point | null>(null);
  const [cursorSnappedToVertex, setCursorSnappedToVertex] =
    React.useState(false);
  const [measure, setMeasure] = React.useState<Point[]>([]);
  const [waterDropPath, setWaterDropPath] = React.useState<Point[] | null>(
    null,
  );

  const interactionRef = React.useRef<Interaction>({ type: "idle" });
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  // Clear any in-progress draft or measurement when active tool changes.
  React.useEffect(() => {
    setDraft([]);
    setMeasure([]);
    setWaterDropPath(null);
  }, [activeTool]);

  const gridStep = React.useMemo(
    () => niceGridStep(viewport.zoom),
    [viewport.zoom],
  );

  const getRect = React.useCallback(
    () => containerRef.current!.getBoundingClientRect(),
    [containerRef],
  );

  const resolveWorld = React.useCallback(
    (
      clientX: number,
      clientY: number,
    ): { world: Point; snapped: Point; snappedToVertex: boolean } => {
      const rect = getRect();
      const raw = eventToWorld(clientX, clientY, rect, viewport);
      const screen = { x: clientX - rect.left, y: clientY - rect.top };
      const { point, snappedToVertex } = snapPoint(
        raw,
        screen,
        viewport,
        site?.elements ?? [],
        {
          gridStep,
          snapToGrid,
          snapToVertices,
        },
      );
      return { world: raw, snapped: point, snappedToVertex };
    },
    [getRect, viewport, site, gridStep, snapToGrid, snapToVertices],
  );

  const hitTest = React.useCallback(
    (world: Point): string | null => {
      if (!site) {
        return null;
      }
      const ordered = orderedVisibleElements(site);
      for (let i = ordered.length - 1; i >= 0; i--) {
        const { element, layer } = ordered[i];
        if (layer?.locked) {
          continue;
        }
        if (isSpatialElement(element)) {
          const ring = element.arcs
            ? densifyBoundary(element.boundary, element.arcs, 4)
            : element.boundary;
          if (pointInPolygon(world, ring)) {
            return element.id;
          }
        } else {
          const s = worldToScreen(element.position, viewport);
          const c = worldToScreen(world, viewport);
          if (Math.hypot(s.x - c.x, s.y - c.y) < 14) {
            return element.id;
          }
        }
      }

      // Check stationed baseline alignments
      if (site.alignments) {
        for (const align of site.alignments) {
          const resolved = resolveAlignment(align);
          if (!resolved) {
            continue;
          }
          for (const el of resolved.elements) {
            if (el.kind === "tangent") {
              const p1 = worldToScreen(el.from, viewport);
              const p2 = worldToScreen(el.to, viewport);
              const c = worldToScreen(world, viewport);
              if (pointSegmentDistance(c, p1, p2) < 10) {
                return align.id;
              }
            } else if (el.kind === "curve") {
              const c = el.curve;

              const steps = Math.max(2, Math.ceil(c.deltaDeg / 2));
              let prevPt = {
                x: c.center.x + c.radius * Math.cos(c.startAngle),
                y: c.center.y + c.radius * Math.sin(c.startAngle),
              };
              for (let idx = 1; idx <= steps; idx++) {
                const ang = c.startAngle + (c.sweep * idx) / steps;
                const currPt = {
                  x: c.center.x + c.radius * Math.cos(ang),
                  y: c.center.y + c.radius * Math.sin(ang),
                };
                const p1 = worldToScreen(prevPt, viewport);
                const p2 = worldToScreen(currPt, viewport);
                const click = worldToScreen(world, viewport);
                if (pointSegmentDistance(click, p1, p2) < 10) {
                  return align.id;
                }
                prevPt = currPt;
              }
            }
          }
        }
      }
      return null;
    },
    [site, viewport],
  );

  const completeDraft = React.useCallback(() => {
    if (tool.mode === "polygon" && tool.kind && draft.length >= 3) {
      addDrawnElement(
        tool.kind as Exclude<typeof tool.kind, "note" | "tree" | "spot">,
        draft,
      );
      setDraft([]);
      setTool("select");
    } else if (tool.mode === "polyline" && tool.network && draft.length >= 2) {
      const cfg = tool.network;
      addNetworkPath(cfg.kind, draft, {
        roadClass: cfg.roadClass,
        width: cfg.roadClass ? DEFAULT_ROAD_WIDTH[cfg.roadClass] : undefined,
      });
      setDraft([]);
      setTool("select");
    } else if (tool.id === "alignment" && draft.length >= 2) {
      let minSeg = Infinity;
      for (let i = 1; i < draft.length; i++) {
        minSeg = Math.min(
          minSeg,
          Math.hypot(draft[i].x - draft[i - 1].x, draft[i].y - draft[i - 1].y),
        );
      }
      addAlignment(
        draft,
        draft.length > 2 && Number.isFinite(minSeg) ? minSeg * 0.35 : 0,
      );
      setDraft([]);
      setTool("select");
    }
  }, [tool, draft, addDrawnElement, addNetworkPath, addAlignment, setTool]);

  const cancelDraft = React.useCallback(() => {
    setDraft([]);
    setMeasure([]);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcut("escape", () => {
    cancelDraft();
  });

  useKeyboardShortcut("enter", () => {
    if (draft.length >= 2) {
      completeDraft();
    }
  });

  useKeyboardShortcut("backspace", (e) => {
    if (draft.length > 0) {
      e.preventDefault();
      setDraft((d) => d.slice(0, -1));
    }
  });

  // Pointer event handlers
  function onPointerDown(e: React.PointerEvent) {
    if (!site) {
      return;
    }
    const { world, snapped } = resolveWorld(e.clientX, e.clientY);
    const isMiddle = e.button === 1;
    const isRight = e.button === 2;
    if (isRight) {
      return;
    }

    if (isMiddle || tool.mode === "pan") {
      e.currentTarget.setPointerCapture(e.pointerId);
      interactionRef.current = {
        type: "panning",
        lastScreen: { x: e.clientX, y: e.clientY },
      };
      return;
    }

    if (tool.mode === "polygon") {
      if (draft.length >= 3) {
        const first = worldToScreen(draft[0], viewport);
        const rect = getRect();
        const sc = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (Math.hypot(first.x - sc.x, first.y - sc.y) < 12) {
          completeDraft();
          return;
        }
      }
      setDraft((d) => [...d, snapped]);
      return;
    }

    if (tool.mode === "polyline") {
      setDraft((d) => [...d, snapped]);
      return;
    }

    if (activeTool === "waterdrop") {
      if (terrainSurface) {
        const path = traceWaterDropPath(terrainSurface, snapped);
        setWaterDropPath(path);
      }
      return;
    }

    if (tool.mode === "point" && tool.kind) {
      addPointElement(tool.kind as "note" | "tree" | "spot", snapped);
      setTool("select");
      return;
    }

    if (tool.mode === "ruler") {
      setMeasure((m) => [...m, snapped]);
      return;
    }

    const selectedElement =
      selection.length === 1
        ? site.elements.find((el) => el.id === selection[0])
        : undefined;

    if (selectedElement && isSpatialElement(selectedElement)) {
      const rect = getRect();
      const sc = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const idx = selectedElement.boundary.findIndex((v) => {
        const s = worldToScreen(v, viewport);
        return Math.hypot(s.x - sc.x, s.y - sc.y) < 9;
      });
      if (idx >= 0) {
        if (e.altKey) {
          deleteVertex(selectedElement.id, idx);
          return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        interactionRef.current = {
          type: "vertex",
          elementId: selectedElement.id,
          index: idx,
          boundary: selectedElement.boundary.slice(),
        };
        return;
      }

      const ring = selectedElement.boundary;
      for (let ei = 0; ei < ring.length; ei++) {
        const a = ring[ei];
        const b = ring[(ei + 1) % ring.length];
        const bulge = edgeBulge(selectedElement.arcs, ei);
        const ms = worldToScreen(edgeMidpoint(a, b, bulge), viewport);
        if (Math.hypot(ms.x - sc.x, ms.y - sc.y) < 8) {
          e.currentTarget.setPointerCapture(e.pointerId);
          interactionRef.current = {
            type: "edgeBulge",
            elementId: selectedElement.id,
            index: ei,
            from: a,
            to: b,
            bulge,
          };
          return;
        }
      }
    }

    const selectedAlign = site?.alignments?.find((a) => a.id === selection[0]);
    if (selectedAlign) {
      const rect = getRect();
      const sc = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const idx = selectedAlign.pis.findIndex((pi) => {
        const s = worldToScreen(pi.point, viewport);
        return Math.hypot(s.x - sc.x, s.y - sc.y) < 9;
      });
      if (idx >= 0) {
        e.currentTarget.setPointerCapture(e.pointerId);
        interactionRef.current = {
          type: "alignmentPI",
          elementId: selectedAlign.id,
          index: idx,
          boundary: selectedAlign.pis.map((p) => ({ ...p.point })),
        };
        return;
      }
    }

    const hitId = hitTest(world);
    if (hitId) {
      if (!selection.includes(hitId)) {
        select(hitId, e.shiftKey);
      } else if (e.shiftKey) {
        select(hitId, true);
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      interactionRef.current = {
        type: "moving",
        startWorld: snapped,
        delta: { x: 0, y: 0 },
      };
    } else {
      select(null);
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const { snapped, snappedToVertex } = resolveWorld(e.clientX, e.clientY);
    setCursor(snapped);
    setCursorSnappedToVertex(snappedToVertex);
    const interaction = interactionRef.current;

    if (interaction.type === "panning") {
      const dx = e.clientX - interaction.lastScreen.x;
      const dy = e.clientY - interaction.lastScreen.y;
      interactionRef.current = {
        type: "panning",
        lastScreen: { x: e.clientX, y: e.clientY },
      };
      setViewport({
        ...viewport,
        offsetX: viewport.offsetX + dx,
        offsetY: viewport.offsetY + dy,
      });
      return;
    }

    if (interaction.type === "moving") {
      interaction.delta = {
        x: snapped.x - interaction.startWorld.x,
        y: snapped.y - interaction.startWorld.y,
      };
      forceRender();
      return;
    }

    if (interaction.type === "vertex") {
      interaction.boundary = interaction.boundary.map((v, i) =>
        i === interaction.index ? snapped : v,
      );
      forceRender();
      return;
    }

    if (interaction.type === "alignmentPI") {
      interaction.boundary = interaction.boundary.map((v, i) =>
        i === interaction.index ? snapped : v,
      );
      forceRender();
      return;
    }

    if (interaction.type === "edgeBulge") {
      interaction.bulge = bulgeThroughCursor(
        interaction.from,
        interaction.to,
        snapped,
      );
      forceRender();
      return;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const interaction = interactionRef.current;
    if (interaction.type === "moving") {
      if (interaction.delta.x !== 0 || interaction.delta.y !== 0) {
        moveSelection(interaction.delta);
      }
    } else if (interaction.type === "vertex") {
      updateBoundary(interaction.elementId, interaction.boundary);
    } else if (interaction.type === "alignmentPI") {
      const selectedAlign = site?.alignments?.find(
        (a) => a.id === interaction.elementId,
      );
      if (selectedAlign) {
        const patch = {
          ...selectedAlign,
          pis: selectedAlign.pis.map((pi, i) =>
            i === interaction.index
              ? { ...pi, point: interaction.boundary[i] }
              : pi,
          ),
        };
        const updatedAlignments =
          site?.alignments?.map((a) =>
            a.id === selectedAlign.id ? patch : a,
          ) ?? [];
        useWorkspaceStore
          .getState()
          .updateElement(selectedAlign.id, {
            alignments: updatedAlignments,
          } as any);
      }
    } else if (interaction.type === "edgeBulge") {
      setEdgeBulge(interaction.elementId, interaction.index, interaction.bulge);
    }
    interactionRef.current = { type: "idle" };
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer was not captured
    }
  }

  function onWheel(e: React.WheelEvent) {
    const rect = getRect();
    const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setViewport(zoomAt(viewport, anchor, factor));
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (
      (tool.mode === "polygon" || tool.mode === "polyline") &&
      draft.length >= 2
    ) {
      completeDraft();
      return;
    }
    if (tool.mode !== "select" || selection.length !== 1 || !site) {
      return;
    }
    const el = site.elements.find((x) => x.id === selection[0]);
    if (!el || !isSpatialElement(el)) {
      return;
    }
    const rect = getRect();
    const sc = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    let bestIdx = -1;
    let bestDist = 8;
    for (let i = 0; i < el.boundary.length; i++) {
      const a = worldToScreen(el.boundary[i], viewport);
      const b = worldToScreen(
        el.boundary[(i + 1) % el.boundary.length],
        viewport,
      );
      const d = pointSegmentDistance(sc, a, b);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      insertVertex(el.id, bestIdx, resolveWorld(e.clientX, e.clientY).snapped);
    }
  }

  return {
    draft,
    cursor,
    cursorSnappedToVertex,
    measure,
    waterDropPath,
    interactionRef,
    gridStep,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    onDoubleClick,
  };
}
