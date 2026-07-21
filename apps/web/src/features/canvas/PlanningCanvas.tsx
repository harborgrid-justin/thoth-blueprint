import * as React from "react";
import {
  bounds,
  DEFAULT_ROAD_WIDTH,
  densifyArc,
  densifyBoundary,
  edgeBulge,
  elevationAt,
  isSpatialElement,
  pointInPolygon,
  unionBounds,
  unitLabel,
  resolveAlignment,
  traceWaterDropPath,
  type Bounds,
  type Point,
  type Polygon,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useInteropStore } from "@/store/interopStore";
import { useFindStore } from "@/store/findStore";
import { elementMatches } from "@/lib/search";
import { toolDef } from "@/lib/tools";
import { buildTerrainModel } from "@/features/terrain/terrainModel";
import { fitBounds, niceGridStep, worldToScreen, zoomAt, type Viewport } from "./viewport";
import { eventToWorld, snapPoint } from "./snapping";
import { ScaleBar, NorthArrow, Legend } from "./CanvasOverlays";
import { AlignmentLayer } from "./AlignmentLayer";
import { CanvasPatterns } from "./patterns";
import { CivilLayer } from "./CivilLayer";
import { CivilSymbolLayer } from "./CivilSymbolLayer";
import { MonumentLayer } from "./MonumentLayer";
import { BuildingInteriorLayer } from "./BuildingInteriorLayer";
import { DimensionLayer } from "./DimensionLayer";
import { GridBubbleLayer } from "./GridBubbleLayer";
import { AnnotationLayer } from "./AnnotationLayer";
import { FrameworkLayer } from "./FrameworkLayer";
import { SurveyLegend } from "./SurveyLegend";
import { useResizeObserver, useKeyboardShortcut } from "@/lib/hooks";
import {
  edgeMidpoint,
  bulgeThroughCursor,
  orderedVisibleElements,
  pointSegmentDistance,
  padBounds,
} from "./canvasHelpers";
import { ElementShape } from "./ElementShape";
import { BoundaryDimensions, SurveyEdgeLabels } from "./BoundaryDimensions";
import { DraftOverlay, MeasureOverlay, CanvasHud } from "./DraftOverlays";
import { AlignmentHandles, VertexHandles, EdgeHandles } from "./handles";
import { UnderlayImage, CloudDots, TerrainOverlay, NetworkShape } from "./overlays";

interface Size {
  width: number;
  height: number;
}

type Interaction =
  | { type: "idle" }
  | { type: "panning"; lastScreen: Point }
  | { type: "moving"; startWorld: Point; delta: Point }
  | { type: "vertex"; elementId: string; index: number; boundary: Polygon }
  | { type: "alignmentPI"; elementId: string; index: number; boundary: Point[] }
  | { type: "edgeBulge"; elementId: string; index: number; from: Point; to: Point; bulge: number };



export function PlanningCanvas() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });

  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const hoveredElementId = useWorkspaceStore((s) => s.hoveredElementId);
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const select = useWorkspaceStore((s) => s.select);
  const moveSelection = useWorkspaceStore((s) => s.moveSelection);
  const updateBoundary = useWorkspaceStore((s) => s.updateBoundary);
  const addDrawnElement = useWorkspaceStore((s) => s.addDrawnElement);
  const addPointElement = useWorkspaceStore((s) => s.addPointElement);
  const addNetworkPath = useWorkspaceStore((s) => s.addNetworkPath);
  const addAlignment = useWorkspaceStore((s) => s.addAlignment);
  const insertVertex = useWorkspaceStore((s) => s.insertVertex);
  const deleteVertex = useWorkspaceStore((s) => s.deleteVertex);
  const setEdgeBulge = useWorkspaceStore((s) => s.setEdgeBulge);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const viewFrames = useWorkspaceStore((s) => s.viewFrames ?? []);
  const matchLines = useWorkspaceStore((s) => s.matchLines ?? []);

  // Find & filter: dim non-matching elements when canvas filtering is on.
  const findQuery = useFindStore((s) => s.query);
  const findKind = useFindStore((s) => s.kind);
  const findFilter = useFindStore((s) => s.filterOnCanvas);
  const findActive = findFilter && (findQuery.trim().length > 0 || findKind !== "all");

  const {
    viewport,
    setViewport,
    showGrid,
    showLabels,
    showSurveyLabels,
    showDimensions,
    showGridBubbles,
    showAnnotations,
    showInteriors,
    showNetworks,
    showContours,
    showSlope,
    showProposed,
    contourInterval,
    snapToGrid,
    snapToVertices,
    fitRequestId,
    fitSelectionRequestId,
  } = useCanvasStore();

  const terrain = React.useMemo(() => (site ? buildTerrainModel(site) : null), [site]);
  const terrainSurface = showProposed ? terrain?.proposed : terrain?.existing;

  const underlay = useInteropStore((s) => s.underlay);
  const clouds = useInteropStore((s) => s.clouds);

  const [draft, setDraft] = React.useState<Point[]>([]);
  const [cursor, setCursor] = React.useState<Point | null>(null);
  const [cursorSnappedToVertex, setCursorSnappedToVertex] = React.useState(false);
  const [measure, setMeasure] = React.useState<Point[]>([]);
  const [waterDropPath, setWaterDropPath] = React.useState<Point[] | null>(null);
  const interactionRef = React.useRef<Interaction>({ type: "idle" });
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  const tool = toolDef(activeTool);

  // Clear any in-progress draft or measurement when the active tool changes.
  React.useEffect(() => {
    setDraft([]);
    setMeasure([]);
    setWaterDropPath(null);
  }, [activeTool]);

  // --- size tracking -------------------------------------------------------
  useResizeObserver(containerRef.current, (entry) => {
    const rect = entry.contentRect;
    setSize({ width: rect.width, height: rect.height });
  });

  React.useEffect(() => {
    const el = containerRef.current;
    if (el) {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    }
  }, []);

  const prevSizeRef = React.useRef<Size>({ width: 0, height: 0 });
  React.useEffect(() => {
    if (prevSizeRef.current.width > 0 && prevSizeRef.current.height > 0 && size.width > 0 && size.height > 0) {
      const dw = size.width - prevSizeRef.current.width;
      const dh = size.height - prevSizeRef.current.height;
      if (dw !== 0 || dh !== 0) {
        const currentViewport = useCanvasStore.getState().viewport;
        setViewport({
          zoom: currentViewport.zoom,
          offsetX: currentViewport.offsetX + dw / 2,
          offsetY: currentViewport.offsetY + dh / 2,
        });
      }
    }
    prevSizeRef.current = size;
  }, [size, setViewport]);

  // --- fit to bounds on request & first load -------------------------------
  const planBounds = React.useMemo<Bounds | null>(() => {
    if (!site) {return null;}
    const boxes = site.elements.filter(isSpatialElement).map((e) => bounds(e.boundary));
    return boxes.length ? unionBounds(boxes) : null;
  }, [site]);

  const didInitialFit = React.useRef(false);
  React.useEffect(() => {
    if (!size.width || !size.height) {return;}
    if (didInitialFit.current) {return;}
    didInitialFit.current = true;
    if (planBounds) {
      setViewport(fitBounds(planBounds, size.width, size.height));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, planBounds]);

  React.useEffect(() => {
    if (fitRequestId === 0 || !size.width || !size.height) {return;}
    if (planBounds) {setViewport(fitBounds(planBounds, size.width, size.height));}
    else {setViewport({ offsetX: size.width / 2, offsetY: size.height / 2, zoom: 3 });}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequestId]);

  // Zoom-to-selection: fit the current selection's extent into view (FE-NAV-004).
  React.useEffect(() => {
    if (fitSelectionRequestId === 0 || !site || !size.width || !size.height) {return;}
    const ids = new Set(useWorkspaceStore.getState().selection);
    const boxes: Bounds[] = [];
    for (const el of site.elements) {
      if (!ids.has(el.id)) {continue;}
      if (isSpatialElement(el)) {boxes.push(bounds(el.boundary));}
      else {boxes.push({ minX: el.position.x, minY: el.position.y, maxX: el.position.x, maxY: el.position.y });}
    }
    const box = boxes.length ? unionBounds(boxes) : planBounds;
    if (box) {setViewport(fitBounds(padBounds(box), size.width, size.height));}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSelectionRequestId]);

  const gridStep = React.useMemo(() => niceGridStep(viewport.zoom), [viewport.zoom]);

  // --- helpers -------------------------------------------------------------
  const getRect = () => containerRef.current!.getBoundingClientRect();

  const resolveWorld = React.useCallback(
    (clientX: number, clientY: number): { world: Point; snapped: Point; snappedToVertex: boolean } => {
      const rect = getRect();
      const raw = eventToWorld(clientX, clientY, rect, viewport);
      const screen = { x: clientX - rect.left, y: clientY - rect.top };
      const { point, snappedToVertex } = snapPoint(raw, screen, viewport, site?.elements ?? [], {
        gridStep,
        snapToGrid,
        snapToVertices,
      });
      return { world: raw, snapped: point, snappedToVertex };
    },
    [viewport, site, gridStep, snapToGrid, snapToVertices],
  );

  const hitTest = React.useCallback(
    (world: Point): string | null => {
      if (!site) {return null;}
      const ordered = orderedVisibleElements(site);
      for (let i = ordered.length - 1; i >= 0; i--) {
        const { element, layer } = ordered[i];
        if (layer?.locked) {continue;}
        if (isSpatialElement(element)) {
          const ring = element.arcs
            ? densifyBoundary(element.boundary, element.arcs, 4)
            : element.boundary;
          if (pointInPolygon(world, ring)) {return element.id;}
        } else {
          const s = worldToScreen(element.position, viewport);
          const c = worldToScreen(world, viewport);
          if (Math.hypot(s.x - c.x, s.y - c.y) < 14) {return element.id;}
        }
      }

      // Check stationed baseline alignments
      if (site.alignments) {
        for (const align of site.alignments) {
          const resolved = resolveAlignment(align);
          if (!resolved) {continue;}
          for (const el of resolved.elements) {
            if (el.kind === "tangent") {
              const p1 = worldToScreen(el.from, viewport);
              const p2 = worldToScreen(el.to, viewport);
              const c = worldToScreen(world, viewport);
              if (pointSegmentDistance(c, p1, p2) < 10) {return align.id;}
            } else {
              const c = el.curve;
              const steps = Math.max(2, Math.ceil(c.deltaDeg / 2));
              let prevPt = { x: c.center.x + c.radius * Math.cos(c.startAngle), y: c.center.y + c.radius * Math.sin(c.startAngle) };
              for (let idx = 1; idx <= steps; idx++) {
                const ang = c.startAngle + (c.sweep * idx) / steps;
                const currPt = { x: c.center.x + c.radius * Math.cos(ang), y: c.center.y + c.radius * Math.sin(ang) };
                const p1 = worldToScreen(prevPt, viewport);
                const p2 = worldToScreen(currPt, viewport);
                const click = worldToScreen(world, viewport);
                if (pointSegmentDistance(click, p1, p2) < 10) {return align.id;}
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

  // --- draft completion ----------------------------------------------------
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
      // Default curve radius scaled to the drawn tangents so curves fit.
      let minSeg = Infinity;
      for (let i = 1; i < draft.length; i++) {
        minSeg = Math.min(minSeg, Math.hypot(draft[i].x - draft[i - 1].x, draft[i].y - draft[i - 1].y));
      }
      addAlignment(draft, draft.length > 2 && Number.isFinite(minSeg) ? minSeg * 0.35 : 0);
      setDraft([]);
      setTool("select");
    }
  }, [tool, draft, addDrawnElement, addNetworkPath, addAlignment, setTool]);

  const cancelDraft = React.useCallback(() => {
    setDraft([]);
    setMeasure([]);
  }, []);

  // --- keyboard ------------------------------------------------------------
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

  // --- pointer handlers ----------------------------------------------------
  function onPointerDown(e: React.PointerEvent) {
    if (!site) {return;}
    const { world, snapped } = resolveWorld(e.clientX, e.clientY);
    const isMiddle = e.button === 1;
    const isRight = e.button === 2;
    if (isRight) {return;}

    // Panning: middle mouse, or the pan tool, or space-drag on any tool.
    if (isMiddle || tool.mode === "pan") {
      e.currentTarget.setPointerCapture(e.pointerId);
      interactionRef.current = { type: "panning", lastScreen: { x: e.clientX, y: e.clientY } };
      return;
    }

    if (tool.mode === "polygon") {
      // Close the ring by clicking near the first vertex.
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
      // Accumulate a multi-point measurement path; Esc starts a new one.
      setMeasure((m) => [...m, snapped]);
      return;
    }

    // Select tool.
    const selectedElement =
      selection.length === 1 ? site.elements.find((el) => el.id === selection[0]) : undefined;

    // Vertex editing: grab a handle of the single selected spatial element.
    if (selectedElement && isSpatialElement(selectedElement)) {
      const rect = getRect();
      const sc = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const idx = selectedElement.boundary.findIndex((v) => {
        const s = worldToScreen(v, viewport);
        return Math.hypot(s.x - sc.x, s.y - sc.y) < 9;
      });
      if (idx >= 0) {
        // Alt-click removes a vertex (keeps a triangle minimum); FE-CANVAS-004.
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

      // Edge midpoint handles: drag to curve an edge (set its arc bulge).
      const ring = selectedElement.boundary;
      for (let ei = 0; ei < ring.length; ei++) {
        const a = ring[ei];
        const b = ring[(ei + 1) % ring.length];
        const bulge = edgeBulge(selectedElement.arcs, ei);
        const ms = worldToScreen(edgeMidpoint(a, b, bulge), viewport);
        if (Math.hypot(ms.x - sc.x, ms.y - sc.y) < 8) {
          e.currentTarget.setPointerCapture(e.pointerId);
          interactionRef.current = { type: "edgeBulge", elementId: selectedElement.id, index: ei, from: a, to: b, bulge };
          return;
        }
      }
    }

    // Grip PI editing on horizontal alignment
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
          type: "alignmentPI" as any,
          elementId: selectedAlign.id,
          index: idx,
          boundary: selectedAlign.pis.map((p) => ({ ...p.point })) as any,
        };
        return;
      }
    }

    const hitId = hitTest(world);
    if (hitId) {
      if (!selection.includes(hitId)) {select(hitId, e.shiftKey);}
      else if (e.shiftKey) {select(hitId, true);}
      e.currentTarget.setPointerCapture(e.pointerId);
      interactionRef.current = { type: "moving", startWorld: snapped, delta: { x: 0, y: 0 } };
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
      interactionRef.current = { type: "panning", lastScreen: { x: e.clientX, y: e.clientY } };
      setViewport({ ...viewport, offsetX: viewport.offsetX + dx, offsetY: viewport.offsetY + dy });
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
      interaction.boundary = interaction.boundary.map((v, i) => (i === interaction.index ? snapped : v));
      forceRender();
      return;
    }

    if (interaction.type === "alignmentPI") {
      interaction.boundary = (interaction.boundary as any).map((v: any, i: number) => (i === interaction.index ? snapped : v));
      forceRender();
      return;
    }

    if (interaction.type === "edgeBulge") {
      interaction.bulge = bulgeThroughCursor(interaction.from, interaction.to, snapped);
      forceRender();
      return;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const interaction = interactionRef.current;
    if (interaction.type === "moving") {
      if (interaction.delta.x !== 0 || interaction.delta.y !== 0) {moveSelection(interaction.delta);}
    } else if (interaction.type === "vertex") {
      updateBoundary(interaction.elementId, interaction.boundary);
    } else if (interaction.type === "alignmentPI") {
      const selectedAlign = site?.alignments?.find((a) => a.id === interaction.elementId);
      if (selectedAlign) {
        const patch = {
          ...selectedAlign,
          pis: selectedAlign.pis.map((pi, i) => i === interaction.index ? { ...pi, point: (interaction.boundary as any)[i] } : pi),
        };
        const updatedAlignments = site?.alignments?.map((a) => a.id === selectedAlign.id ? patch : a) ?? [];
        useWorkspaceStore.getState().updateElement(selectedAlign.id, { alignments: updatedAlignments } as any);
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
    if ((tool.mode === "polygon" || tool.mode === "polyline") && draft.length >= 2) {
      completeDraft();
      return;
    }
    // Double-click an edge of the selected element to insert a vertex (FE-CANVAS-004).
    if (tool.mode !== "select" || selection.length !== 1 || !site) {return;}
    const el = site.elements.find((x) => x.id === selection[0]);
    if (!el || !isSpatialElement(el)) {return;}
    const rect = getRect();
    const sc = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    let bestIdx = -1;
    let bestDist = 8;
    for (let i = 0; i < el.boundary.length; i++) {
      const a = worldToScreen(el.boundary[i], viewport);
      const b = worldToScreen(el.boundary[(i + 1) % el.boundary.length], viewport);
      const d = pointSegmentDistance(sc, a, b);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {insertVertex(el.id, bestIdx, resolveWorld(e.clientX, e.clientY).snapped);}
  }

  if (!site) {return null;}

  const ordered = orderedVisibleElements(site);
  const interaction = interactionRef.current;
  const moveDelta = interaction.type === "moving" ? interaction.delta : { x: 0, y: 0 };
  const vertexPreview =
    interaction.type === "vertex" ? { id: interaction.elementId, boundary: interaction.boundary } : null;
  const bulgePreview = interaction.type === "edgeBulge" ? interaction : null;
  const selectionSet = new Set(selection);

  const cursorClass =
    tool.mode === "pan"
      ? "cursor-grab"
      : tool.mode === "select"
        ? "cursor-default"
        : "cursor-crosshair";

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-[hsl(var(--canvas))] ${cursorClass}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg width={size.width} height={size.height} className="absolute inset-0 select-none">
        <CanvasPatterns />
        {/* Imported raster blueprint underlay, beneath everything. */}
        {underlay?.visible && (
          <UnderlayImage underlay={underlay} viewport={viewport} />
        )}

        {showGrid && <Grid viewport={viewport} size={size} step={gridStep} />}

        {/* Survey framework (PLSS section or GA land lot), beneath the plan. */}
        <FrameworkLayer site={site} viewport={viewport} />

        {/* Imported reference point clouds. */}
        {clouds.map(
          (c) =>
            c.visible && <CloudDots key={c.id} points={c.cloud.points} viewport={viewport} />,
        )}

        {/* Terrain: slope shading and contour lines, beneath the plan. */}
        {terrainSurface && (showSlope || showContours) && (
          <TerrainOverlay
            surface={terrainSurface}
            viewport={viewport}
            showSlope={showSlope}
            showContours={showContours}
            interval={contourInterval}
          />
        )}

        {/* Road and utility networks. */}
        {showNetworks &&
          (site.networks ?? []).map((network) => (
            <NetworkShape key={network.id} network={network} viewport={viewport} />
          ))}

        {/* Stationed horizontal alignments (civil baselines). */}
        <AlignmentLayer site={site} viewport={viewport} />

        {/* Civil / erosion-control line features (silt fence, tree line, flow). */}
        <CivilLayer site={site} viewport={viewport} />

        {/* Civil / erosion-control point symbols (inlet protection, ditch check). */}
        <CivilSymbolLayer site={site} viewport={viewport} />

        {/* Survey monuments with standard symbology. */}
        <MonumentLayer site={site} viewport={viewport} />

        {ordered.map(({ element }) => {
          const shifted =
            selectionSet.has(element.id) && (moveDelta.x !== 0 || moveDelta.y !== 0);
          const previewBoundary =
            vertexPreview?.id === element.id ? vertexPreview.boundary : undefined;
          const dimmed = findActive && !elementMatches(element, findQuery, findKind);
          return (
            <g
              key={element.id}
              opacity={dimmed ? 0.15 : 1}
              onMouseEnter={() => useWorkspaceStore.getState().hoverElement(element.id)}
              onMouseLeave={() => {
                if (useWorkspaceStore.getState().hoveredElementId === element.id) {
                  useWorkspaceStore.getState().hoverElement(null);
                }
              }}
            >
              <ElementShape
                element={element}
                viewport={viewport}
                selected={selectionSet.has(element.id)}
                hovered={hoveredElementId === element.id}
                showLabels={showLabels}
                spatialUnits={site.spatial}
                moveDelta={shifted ? moveDelta : undefined}
                overrideBoundary={previewBoundary}
              />
            </g>
          );
        })}

        {/* Building interiors: walls, doors, windows, rooms (architectural plan). */}
        {showInteriors && <BuildingInteriorLayer site={site} viewport={viewport} />}

        {/* CAD dimension entities (linear/aligned/angular/radial/…). */}
        {showDimensions && <DimensionLayer site={site} viewport={viewport} />}

        {/* Structural / column grid bubbles. */}
        {showGridBubbles && <GridBubbleLayer site={site} viewport={viewport} />}

        {/* Drafting reference marks (sections, elevations, details, revisions). */}
        {showAnnotations && <AnnotationLayer site={site} viewport={viewport} />}

        {/* View Frames for Plan Production sheet splits. */}
        {viewFrames.map((f: any) => {
          const halfW = f.width / 2;
          const halfH = f.height / 2;
          const rad = (f.rotationDeg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          const localCorners = [
            { x: -halfW, y: -halfH },
            { x: halfW, y: -halfH },
            { x: halfW, y: halfH },
            { x: -halfW, y: halfH },
          ];

          const screenPoints = localCorners.map((p) => {
            const wx = f.center.x + (p.x * cos - p.y * sin);
            const wy = f.center.y + (p.x * sin + p.y * cos);
            return worldToScreen({ x: wx, y: wy }, viewport);
          });

          const pts = screenPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

          return (
            <g key={f.id}>
              <polygon
                points={pts}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.8}
                strokeDasharray="6 4"
              />
              <text
                x={screenPoints[0].x}
                y={screenPoints[0].y - 6}
                fill="#3b82f6"
                fontSize={10}
                fontWeight="bold"
              >
                {f.name}
              </text>
            </g>
          );
        })}

        {/* Match Lines for Plan Production sheet splits. */}
        {matchLines.map((m: any) => {
          const p1 = worldToScreen(m.cutLine[0], viewport);
          const p2 = worldToScreen(m.cutLine[1], viewport);

          return (
            <g key={m.id}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="10 5"
              />
              <text
                x={(p1.x + p2.x) / 2}
                y={(p1.y + p2.y) / 2 - 8}
                textAnchor="middle"
                fill="#ef4444"
                fontSize={9}
                fontWeight="bold"
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Dense metes-and-bounds on every parcel/lot boundary (plat style). */}
        {showDimensions && <BoundaryDimensions site={site} viewport={viewport} />}

        {/* Surveyor bearing/distance labels on the selected boundary's edges. */}
        {showSurveyLabels && (
          <SurveyEdgeLabels
            site={site}
            selection={selection}
            viewport={viewport}
            preview={vertexPreview}
          />
        )}

        {/* Vertex handles for a single selected spatial element. */}
        <VertexHandles
          site={site}
          selection={selection}
          viewport={viewport}
          preview={vertexPreview}
        />

        {/* Edge midpoint handles: drag to curve an edge. */}
        <EdgeHandles site={site} selection={selection} viewport={viewport} />

        {/* Alignment grip handles: drag to move PIs. */}
        <AlignmentHandles site={site} selection={selection} viewport={viewport} />

        {/* Live preview of the arc while dragging an edge handle. */}
        {bulgePreview && (
          <polyline
            points={[bulgePreview.from, ...densifyArc(bulgePreview.from, bulgePreview.to, bulgePreview.bulge), bulgePreview.to]
              .map((p) => {
                const s = worldToScreen(p, viewport);
                return `${s.x},${s.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="4 3"
            className="pointer-events-none"
          />
        )}

        {/* In-progress polygon/polyline draft. */}
        {draft.length > 0 && (
          <DraftOverlay
            draft={draft}
            cursor={cursor}
            viewport={viewport}
            kind={tool.kind ?? tool.label}
            polyline={tool.mode === "polyline"}
          />
        )}

        {waterDropPath && waterDropPath.length > 1 && (
          <g className="pointer-events-none">
            <polyline
              points={waterDropPath
                .map((p) => {
                  const s = worldToScreen(p, viewport);
                  return `${s.x},${s.y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={3}
              strokeDasharray="4 3"
            />
            {(() => {
              const startScreen = worldToScreen(waterDropPath[0], viewport);
              return <circle cx={startScreen.x} cy={startScreen.y} r={5} fill="#3b82f6" />;
            })()}
            {(() => {
              const endScreen = worldToScreen(waterDropPath[waterDropPath.length - 1], viewport);
              return <circle cx={endScreen.x} cy={endScreen.y} r={4} fill="#1e3a8a" stroke="#3b82f6" strokeWidth={1.5} />;
            })()}
          </g>
        )}

        {/* Measurement ruler. */}
        {measure.length > 0 && (
          <MeasureOverlay points={measure} cursor={cursor} viewport={viewport} spatial={site.spatial} />
        )}
      </svg>

      <CanvasHud
        tool={tool.label}
        cursor={cursor}
        draft={draft.length}
        elevation={terrainSurface && cursor ? elevationAt(terrainSurface, cursor) : null}
        units={unitLabel(site.spatial.units)}
        snappedToVertex={cursorSnappedToVertex}
      />
      <NorthArrow />
      <ScaleBar />
      <Legend />
      <SurveyLegend site={site} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------



function Grid({ viewport, size, step }: { viewport: Viewport; size: Size; step: number }) {
  const lines: React.ReactNode[] = [];
  const startWorldX = Math.floor((0 - viewport.offsetX) / viewport.zoom / step) * step;
  const endWorldX = (size.width - viewport.offsetX) / viewport.zoom;
  const startWorldY = Math.floor((0 - viewport.offsetY) / viewport.zoom / step) * step;
  const endWorldY = (size.height - viewport.offsetY) / viewport.zoom;

  let idx = 0;
  for (let x = startWorldX; x <= endWorldX; x += step) {
    const sx = x * viewport.zoom + viewport.offsetX;
    const major = Math.round(x / step) % 5 === 0;
    lines.push(
      <line
        key={`vx${idx++}`}
        x1={sx}
        y1={0}
        x2={sx}
        y2={size.height}
        stroke={`hsl(var(${major ? "--canvas-grid-major" : "--canvas-grid"}))`}
        strokeWidth={major ? 1 : 0.5}
      />,
    );
  }
  for (let y = startWorldY; y <= endWorldY; y += step) {
    const sy = y * viewport.zoom + viewport.offsetY;
    const major = Math.round(y / step) % 5 === 0;
    lines.push(
      <line
        key={`hz${idx++}`}
        x1={0}
        y1={sy}
        x2={size.width}
        y2={sy}
        stroke={`hsl(var(${major ? "--canvas-grid-major" : "--canvas-grid"}))`}
        strokeWidth={major ? 1 : 0.5}
      />,
    );
  }
  return <g>{lines}</g>;
}

