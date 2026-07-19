import * as React from "react";
import {
  bounds,
  buildableEnvelope,
  bulgeToArc,
  centroid,
  contourLevels,
  DEFAULT_ROAD_WIDTH,
  densifyArc,
  densifyBoundary,
  edgeBulge,
  elevationAt,
  isPointElement,
  isSpatialElement,
  measuredArea,
  pointInPolygon,
  slopeAtNode,
  stitchContours,
  unionBounds,
  unitLabel,
  type Bounds,
  type ElevationGrid,
  type InfrastructureNetwork,
  type PlanElement,
  type Point,
  type Polygon,
  type SpatialContext,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useInteropStore } from "@/store/interopStore";
import { useFindStore } from "@/store/findStore";
import { usePrefsStore } from "@/store/prefsStore";
import { elementColor } from "@/lib/elementMeta";
import { elementMatches } from "@/lib/search";
import { toolDef } from "@/lib/tools";
import { formatCoord, formatDirection, formatLength } from "@/lib/units";
import { buildTerrainModel } from "@/features/terrain/terrainModel";
import { fitBounds, niceGridStep, worldToScreen, zoomAt, type Viewport } from "./viewport";
import { eventToWorld, snapPoint } from "./snapping";
import { ScaleBar, NorthArrow, Legend } from "./CanvasOverlays";
import { AlignmentLayer } from "./AlignmentLayer";
import { CanvasPatterns, patternFor } from "./patterns";
import { CivilLayer } from "./CivilLayer";
import { MonumentLayer } from "./MonumentLayer";
import { FrameworkLayer } from "./FrameworkLayer";
import { SurveyLegend } from "./SurveyLegend";
import { formatArea } from "@/lib/format";

interface Size {
  width: number;
  height: number;
}

type Interaction =
  | { type: "idle" }
  | { type: "panning"; lastScreen: Point }
  | { type: "moving"; startWorld: Point; delta: Point }
  | { type: "vertex"; elementId: string; index: number; boundary: Polygon }
  | { type: "edgeBulge"; elementId: string; index: number; from: Point; to: Point; bulge: number };

/** Midpoint of an edge, honoring an existing bulge (the arc's midpoint). */
function edgeMidpoint(a: Point, b: Point, bulge: number): Point {
  if (bulge) {
    const arc = bulgeToArc(a, b, bulge);
    if (arc) return arc.mid;
  }
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** The bulge that makes edge a→b pass through the cursor at its midpoint. */
function bulgeThroughCursor(a: Point, b: Point, cursor: Point): number {
  const cx = b.x - a.x;
  const cy = b.y - a.y;
  const len = Math.hypot(cx, cy);
  if (len < 1e-6) return 0;
  const nx = -cy / len;
  const ny = cx / len;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const off = (cursor.x - mid.x) * nx + (cursor.y - mid.y) * ny;
  return (2 * off) / len;
}

/** Elements paired with their layer, ordered back-to-front, hidden layers dropped. */
function orderedVisibleElements(
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>,
) {
  const layerById = new Map(site.layers.map((l) => [l.id, l]));
  return site.elements
    .map((element, index) => ({ element, layer: layerById.get(element.layerId), index }))
    .filter((entry) => entry.layer && entry.layer.visible)
    .sort((a, b) => {
      const lo = (a.layer!.order ?? 0) - (b.layer!.order ?? 0);
      return lo !== 0 ? lo : a.index - b.index;
    });
}

export function PlanningCanvas() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });

  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
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
  const interactionRef = React.useRef<Interaction>({ type: "idle" });
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  const tool = toolDef(activeTool);

  // Clear any in-progress draft or measurement when the active tool changes.
  React.useEffect(() => {
    setDraft([]);
    setMeasure([]);
  }, [activeTool]);

  // --- size tracking -------------------------------------------------------
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  // --- fit to bounds on request & first load -------------------------------
  const planBounds = React.useMemo<Bounds | null>(() => {
    if (!site) return null;
    const boxes = site.elements.filter(isSpatialElement).map((e) => bounds(e.boundary));
    return boxes.length ? unionBounds(boxes) : null;
  }, [site]);

  const didInitialFit = React.useRef(false);
  React.useEffect(() => {
    if (!size.width || !size.height) return;
    if (didInitialFit.current) return;
    didInitialFit.current = true;
    if (planBounds) {
      setViewport(fitBounds(planBounds, size.width, size.height));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, planBounds]);

  React.useEffect(() => {
    if (fitRequestId === 0 || !size.width || !size.height) return;
    if (planBounds) setViewport(fitBounds(planBounds, size.width, size.height));
    else setViewport({ offsetX: size.width / 2, offsetY: size.height / 2, zoom: 3 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequestId]);

  // Zoom-to-selection: fit the current selection's extent into view (FE-NAV-004).
  React.useEffect(() => {
    if (fitSelectionRequestId === 0 || !site || !size.width || !size.height) return;
    const ids = new Set(useWorkspaceStore.getState().selection);
    const boxes: Bounds[] = [];
    for (const el of site.elements) {
      if (!ids.has(el.id)) continue;
      if (isSpatialElement(el)) boxes.push(bounds(el.boundary));
      else boxes.push({ minX: el.position.x, minY: el.position.y, maxX: el.position.x, maxY: el.position.y });
    }
    const box = boxes.length ? unionBounds(boxes) : planBounds;
    if (box) setViewport(fitBounds(padBounds(box), size.width, size.height));
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
      if (!site) return null;
      const ordered = orderedVisibleElements(site);
      for (let i = ordered.length - 1; i >= 0; i--) {
        const { element, layer } = ordered[i];
        if (layer?.locked) continue;
        if (isSpatialElement(element)) {
          const ring = element.arcs
            ? densifyBoundary(element.boundary, element.arcs, 4)
            : element.boundary;
          if (pointInPolygon(world, ring)) return element.id;
        } else {
          const s = worldToScreen(element.position, viewport);
          const c = worldToScreen(world, viewport);
          if (Math.hypot(s.x - c.x, s.y - c.y) < 14) return element.id;
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
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Escape") cancelDraft();
      if (e.key === "Enter" && draft.length >= 2) completeDraft();
      if (e.key === "Backspace" && draft.length > 0) {
        e.preventDefault();
        setDraft((d) => d.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft, cancelDraft, completeDraft]);

  // --- pointer handlers ----------------------------------------------------
  function onPointerDown(e: React.PointerEvent) {
    if (!site) return;
    const { world, snapped } = resolveWorld(e.clientX, e.clientY);
    const isMiddle = e.button === 1;
    const isRight = e.button === 2;
    if (isRight) return;

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

    const hitId = hitTest(world);
    if (hitId) {
      if (!selection.includes(hitId)) select(hitId, e.shiftKey);
      else if (e.shiftKey) select(hitId, true);
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

    if (interaction.type === "edgeBulge") {
      interaction.bulge = bulgeThroughCursor(interaction.from, interaction.to, snapped);
      forceRender();
      return;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const interaction = interactionRef.current;
    if (interaction.type === "moving") {
      if (interaction.delta.x !== 0 || interaction.delta.y !== 0) moveSelection(interaction.delta);
    } else if (interaction.type === "vertex") {
      updateBoundary(interaction.elementId, interaction.boundary);
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
    if (tool.mode !== "select" || selection.length !== 1 || !site) return;
    const el = site.elements.find((x) => x.id === selection[0]);
    if (!el || !isSpatialElement(el)) return;
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
    if (bestIdx >= 0) insertVertex(el.id, bestIdx, resolveWorld(e.clientX, e.clientY).snapped);
  }

  if (!site) return null;

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

        {/* Survey monuments with standard symbology. */}
        <MonumentLayer site={site} viewport={viewport} />

        {ordered.map(({ element }) => {
          const shifted =
            selectionSet.has(element.id) && (moveDelta.x !== 0 || moveDelta.y !== 0);
          const previewBoundary =
            vertexPreview?.id === element.id ? vertexPreview.boundary : undefined;
          const dimmed = findActive && !elementMatches(element, findQuery, findKind);
          return (
            <g key={element.id} opacity={dimmed ? 0.15 : 1}>
              <ElementShape
                element={element}
                viewport={viewport}
                selected={selectionSet.has(element.id)}
                showLabels={showLabels}
                spatialUnits={site.spatial}
                moveDelta={shifted ? moveDelta : undefined}
                overrideBoundary={previewBoundary}
              />
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

/** Shortest distance from point `p` to segment `a`–`b`, in the same space. */
function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Expand a bounds by a margin so a tight or zero-size selection keeps context. */
function padBounds(b: Bounds): Bounds {
  const pad = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.15 || 10;
  return { minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad };
}

function toPath(boundary: Polygon, viewport: Viewport): string {
  return (
    boundary
      .map((p, i) => {
        const s = worldToScreen(p, viewport);
        return `${i === 0 ? "M" : "L"}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

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

function ElementShape({
  element,
  viewport,
  selected,
  showLabels,
  spatialUnits,
  moveDelta,
  overrideBoundary,
}: {
  element: PlanElement;
  viewport: Viewport;
  selected: boolean;
  showLabels: boolean;
  spatialUnits: SpatialContext;
  moveDelta?: Point;
  overrideBoundary?: Polygon;
}) {
  if (isPointElement(element)) {
    const shift = moveDelta ?? { x: 0, y: 0 };
    const s = worldToScreen({ x: element.position.x + shift.x, y: element.position.y + shift.y }, viewport);

    if (element.kind === "tree") {
      const r = Math.max(4, element.canopyRadius * viewport.zoom);
      return (
        <g>
          <circle cx={s.x} cy={s.y} r={r} fill="#22c55e" fillOpacity={0.28} stroke="#16a34a" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <circle cx={s.x} cy={s.y} r={3} fill="#15803d" />
          {selected && <circle cx={s.x} cy={s.y} r={r + 3} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />}
        </g>
      );
    }

    if (element.kind === "spot") {
      return (
        <g>
          <path d={`M${s.x} ${s.y - 5} L${s.x + 5} ${s.y} L${s.x} ${s.y + 5} L${s.x - 5} ${s.y} Z`} fill="#d97706" stroke="#fff" strokeWidth={1} />
          {showLabels && (
            <text x={s.x + 8} y={s.y + 4} fontSize={11} fill="hsl(var(--foreground))" style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 3 }}>
              {element.z.toFixed(1)}
            </text>
          )}
          {selected && <circle cx={s.x} cy={s.y} r={9} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />}
        </g>
      );
    }

    // Note.
    return (
      <g>
        <circle cx={s.x} cy={s.y} r={5} fill="#eab308" stroke="#fff" strokeWidth={1.5} />
        {showLabels && (
          <text x={s.x + 9} y={s.y + 4} fontSize={12} fill="hsl(var(--foreground))">
            {element.text}
          </text>
        )}
        {selected && <circle cx={s.x} cy={s.y} r={9} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />}
      </g>
    );
  }

  const shift = moveDelta ?? { x: 0, y: 0 };
  const boundary = (overrideBoundary ?? element.boundary).map((p) => ({
    x: p.x + shift.x,
    y: p.y + shift.y,
  }));
  const hasArc = !!element.arcs && Object.keys(element.arcs).length > 0;
  const displayRing = hasArc ? densifyBoundary(boundary, element.arcs, 2) : boundary;
  const category = element.kind === "landuse" ? element.category : undefined;
  const color = elementColor(element.kind, category);
  const path = toPath(displayRing, viewport);
  const isLine = element.kind === "row";
  const fillOpacity =
    element.kind === "building"
      ? 0.65
      : element.kind === "water"
        ? 0.5
        : element.kind === "landuse" || element.kind === "planting"
          ? 0.32
          : element.kind === "grade"
            ? 0.2
            : element.kind === "region" || element.kind === "easement"
              ? 0.06
              : 0.14;
  const dash =
    element.kind === "zone"
      ? "6 4"
      : element.kind === "region"
        ? "10 6"
        : element.kind === "grade"
          ? "4 3"
          : element.kind === "easement"
            ? "7 3 2 3"
            : undefined;

  const label = showLabels && viewport.zoom > 1.4 ? element.name : null;
  const center = label ? worldToScreen(centroid(boundary), viewport) : null;
  const areaLabel =
    label && viewport.zoom > 3.5
      ? formatArea(measuredArea(displayRing, spatialUnits, "sqm"), "sqm")
      : null;

  // Setback / buildable envelope for a lot.
  let envelopePath: string | null = null;
  if (element.kind === "lot" && element.setback && element.setback > 0) {
    const shiftedLot = { ...element, boundary };
    const env = buildableEnvelope(shiftedLot);
    if (env) envelopePath = toPath(env, viewport);
  }

  const patternId = isLine ? null : patternFor(element);

  return (
    <g>
      <path
        d={path}
        fill={color}
        fillOpacity={isLine ? 0.25 : fillOpacity}
        stroke={selected ? "hsl(var(--primary))" : color}
        strokeWidth={selected ? 2.5 : element.kind === "building" ? 1.5 : 1.75}
        strokeDasharray={dash}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {patternId && <path d={path} fill={`url(#${patternId})`} stroke="none" className="pointer-events-none" />}
      {envelopePath && (
        <path
          d={envelopePath}
          fill="none"
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {label && center && (
        <text
          x={center.x}
          y={center.y}
          fontSize={12}
          textAnchor="middle"
          className="pointer-events-none"
          fill="hsl(var(--foreground))"
          style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 3 }}
        >
          {element.name}
          {areaLabel && (
            <tspan x={center.x} dy={14} fontSize={10} fillOpacity={0.7}>
              {areaLabel}
            </tspan>
          )}
        </text>
      )}
    </g>
  );
}

function VertexHandles({
  site,
  selection,
  viewport,
  preview,
}: {
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>;
  selection: string[];
  viewport: Viewport;
  preview: { id: string; boundary: Polygon } | null;
}) {
  if (selection.length !== 1) return null;
  const element = site.elements.find((e) => e.id === selection[0]);
  if (!element || !isSpatialElement(element)) return null;
  const boundary = preview?.id === element.id ? preview.boundary : element.boundary;
  return (
    <g>
      {boundary.map((v, i) => {
        const s = worldToScreen(v, viewport);
        return (
          <rect
            key={i}
            x={s.x - 4}
            y={s.y - 4}
            width={8}
            height={8}
            rx={1.5}
            fill="hsl(var(--background))"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
          />
        );
      })}
    </g>
  );
}

function EdgeHandles({
  site,
  selection,
  viewport,
}: {
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>;
  selection: string[];
  viewport: Viewport;
}) {
  if (selection.length !== 1) return null;
  const element = site.elements.find((e) => e.id === selection[0]);
  if (!element || !isSpatialElement(element)) return null;
  const ring = element.boundary;
  return (
    <g>
      {ring.map((a, i) => {
        const b = ring[(i + 1) % ring.length];
        const bulge = edgeBulge(element.arcs, i);
        const s = worldToScreen(edgeMidpoint(a, b, bulge), viewport);
        return (
          <rect
            key={i}
            x={s.x - 3.5}
            y={s.y - 3.5}
            width={7}
            height={7}
            transform={`rotate(45 ${s.x} ${s.y})`}
            fill={bulge ? "hsl(var(--primary))" : "hsl(var(--background))"}
            stroke="hsl(var(--primary))"
            strokeWidth={1.2}
            opacity={0.85}
          />
        );
      })}
    </g>
  );
}

function UnderlayImage({
  underlay,
  viewport,
}: {
  underlay: import("@/store/interopStore").Underlay;
  viewport: Viewport;
}) {
  const tl = worldToScreen({ x: underlay.bounds.minX, y: underlay.bounds.minY }, viewport);
  const br = worldToScreen({ x: underlay.bounds.maxX, y: underlay.bounds.maxY }, viewport);
  return (
    <image
      href={underlay.url}
      x={Math.min(tl.x, br.x)}
      y={Math.min(tl.y, br.y)}
      width={Math.abs(br.x - tl.x)}
      height={Math.abs(br.y - tl.y)}
      opacity={underlay.opacity}
      preserveAspectRatio="none"
      className="pointer-events-none"
    />
  );
}

function CloudDots({
  points,
  viewport,
}: {
  points: Array<{ x: number; y: number; r?: number; g?: number; b?: number }>;
  viewport: Viewport;
}) {
  // Cap rendered points for performance on dense scans.
  const MAX = 6000;
  const stride = Math.max(1, Math.ceil(points.length / MAX));
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < points.length; i += stride) {
    const p = points[i];
    const s = worldToScreen(p, viewport);
    const color =
      p.r != null ? `rgb(${p.r},${p.g ?? p.r},${p.b ?? p.r})` : "#38bdf8";
    dots.push(<circle key={i} cx={s.x} cy={s.y} r={1.4} fill={color} />);
  }
  return <g className="pointer-events-none">{dots}</g>;
}

function TerrainOverlay({
  surface,
  viewport,
  showSlope,
  showContours,
  interval,
}: {
  surface: ElevationGrid;
  viewport: Viewport;
  showSlope: boolean;
  showContours: boolean;
  interval: number;
}) {
  const cellPx = surface.cellSize * viewport.zoom;

  // Slope shading: one rect per cell, tinted from green (flat) to red (steep).
  const slopeCells: React.ReactNode[] = [];
  if (showSlope && cellPx >= 2) {
    for (let r = 0; r < surface.rows - 1; r++) {
      for (let c = 0; c < surface.cols - 1; c++) {
        const pct =
          (slopeAtNode(surface, c, r).percent +
            slopeAtNode(surface, c + 1, r).percent +
            slopeAtNode(surface, c, r + 1).percent +
            slopeAtNode(surface, c + 1, r + 1).percent) /
          4;
        const s = worldToScreen(
          { x: surface.origin.x + c * surface.cellSize, y: surface.origin.y + r * surface.cellSize },
          viewport,
        );
        slopeCells.push(
          <rect
            key={`${c}-${r}`}
            x={s.x}
            y={s.y}
            width={cellPx + 0.5}
            height={cellPx + 0.5}
            fill={slopeColor(pct)}
            fillOpacity={0.5}
          />,
        );
      }
    }
  }

  // Contours: stitched polylines per level; every 5th line is an index contour.
  const contourEls: React.ReactNode[] = [];
  if (showContours && interval > 0) {
    const levels = contourLevels(surface, interval);
    for (const { level, segments } of levels) {
      const lines = stitchContours(segments);
      const index = Math.round(level / interval) % 5 === 0;
      for (let i = 0; i < lines.length; i++) {
        const d = lines[i]
          .map((p, j) => {
            const s = worldToScreen(p, viewport);
            return `${j === 0 ? "M" : "L"}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
          })
          .join(" ");
        contourEls.push(
          <path
            key={`${level}-${i}`}
            d={d}
            fill="none"
            stroke="#a16207"
            strokeOpacity={index ? 0.85 : 0.45}
            strokeWidth={index ? 1.4 : 0.8}
            vectorEffect="non-scaling-stroke"
          />,
        );
      }
    }
  }

  return (
    <g className="pointer-events-none">
      {slopeCells}
      {contourEls}
    </g>
  );
}

function slopeColor(percent: number): string {
  // 0% → green, 15% → amber, 30%+ → red.
  const t = Math.min(1, percent / 30);
  const hue = 120 - t * 120;
  return `hsl(${hue}, 70%, 50%)`;
}

function NetworkShape({
  network,
  viewport,
}: {
  network: InfrastructureNetwork;
  viewport: Viewport;
}) {
  const nodes = new Map(network.nodes.map((n) => [n.id, n]));
  const isRoad = network.kind === "road";
  const color =
    network.kind === "road"
      ? "#334155"
      : network.kind === "water"
        ? "#0ea5e9"
        : network.kind === "sewer"
          ? "#84cc16"
          : network.kind === "storm"
            ? "#06b6d4"
            : network.kind === "power"
              ? "#eab308"
              : "#64748b";

  return (
    <g className="pointer-events-none">
      {network.edges.map((e) => {
        const a = nodes.get(e.from);
        const b = nodes.get(e.to);
        if (!a || !b) return null;
        const sa = worldToScreen(a.point, viewport);
        const sb = worldToScreen(b.point, viewport);
        const widthPx = isRoad ? Math.max(2, (e.width ?? 15) * viewport.zoom) : 2;
        return (
          <g key={e.id}>
            {isRoad && (
              <line x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} stroke={color} strokeOpacity={0.35} strokeWidth={widthPx} strokeLinecap="round" />
            )}
            <line
              x1={sa.x}
              y1={sa.y}
              x2={sb.x}
              y2={sb.y}
              stroke={color}
              strokeWidth={isRoad ? 1.5 : 2}
              strokeDasharray={isRoad ? undefined : "6 4"}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
      {network.nodes.map((n) => {
        const s = worldToScreen(n.point, viewport);
        return <circle key={n.id} cx={s.x} cy={s.y} r={2.5} fill={color} />;
      })}
    </g>
  );
}

const DIMENSION_KINDS = new Set(["parcel", "lot", "openspace", "easement", "row", "zone"]);

/** Dense bearing/distance labels on every parcel/lot boundary edge — the packed
 *  metes-and-bounds annotation a recorded plat carries. */
function BoundaryDimensions({
  site,
  viewport,
}: {
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>;
  viewport: Viewport;
}) {
  const lengthPref = usePrefsStore((s) => s.lengthUnit);
  const angleFormat = usePrefsStore((s) => s.angleFormat);
  if (viewport.zoom < 2) return null;

  const items = site.elements.filter((e) => isSpatialElement(e) && DIMENSION_KINDS.has(e.kind));
  return (
    <g className="pointer-events-none">
      {items.flatMap((el) => {
        if (!isSpatialElement(el)) return [];
        const boundary = el.boundary;
        const n = boundary.length;
        return boundary.map((a, i) => {
          const b = boundary[(i + 1) % n];
          const sa = worldToScreen(a, viewport);
          const sb = worldToScreen(b, viewport);
          const lenPx = Math.hypot(sb.x - sa.x, sb.y - sa.y);
          if (lenPx < 42) return null;
          const bulge = el.arcs ? el.arcs[String(i)] : 0;
          const mid = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
          let angle = (Math.atan2(sb.y - sa.y, sb.x - sa.x) * 180) / Math.PI;
          if (angle > 90 || angle < -90) angle += 180;
          const planLen = Math.hypot(b.x - a.x, b.y - a.y);
          const dist = formatLength(planLen, site.spatial, lengthPref);
          const label = bulge ? `⌒ ${dist}` : `${formatDirection(a, b, angleFormat)}  ${dist}`;
          return (
            <text
              key={`${el.id}-${i}`}
              x={mid.x}
              y={mid.y}
              transform={`rotate(${angle} ${mid.x} ${mid.y}) translate(0 -3)`}
              fontSize={8.5}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 2.5 }}
            >
              {label}
            </text>
          );
        });
      })}
    </g>
  );
}

function SurveyEdgeLabels({
  site,
  selection,
  viewport,
  preview,
}: {
  site: NonNullable<ReturnType<typeof useWorkspaceStore.getState>["site"]>;
  selection: string[];
  viewport: Viewport;
  preview: { id: string; boundary: Polygon } | null;
}) {
  const lengthPref = usePrefsStore((s) => s.lengthUnit);
  const angleFormat = usePrefsStore((s) => s.angleFormat);
  if (selection.length !== 1) return null;
  const element = site.elements.find((e) => e.id === selection[0]);
  if (!element || !isSpatialElement(element)) return null;
  // Only worth showing when the boundary is large enough to read.
  if (viewport.zoom < 1) return null;

  const boundary = preview?.id === element.id ? preview.boundary : element.boundary;
  const n = boundary.length;

  return (
    <g className="pointer-events-none">
      {boundary.map((a, i) => {
        const b = boundary[(i + 1) % n];
        const sa = worldToScreen(a, viewport);
        const sb = worldToScreen(b, viewport);
        if (Math.hypot(sb.x - sa.x, sb.y - sa.y) < 34) return null;
        const mid = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
        let angle = (Math.atan2(sb.y - sa.y, sb.x - sa.x) * 180) / Math.PI;
        if (angle > 90 || angle < -90) angle += 180; // keep text upright
        const planLen = Math.hypot(b.x - a.x, b.y - a.y);
        const label = `${formatDirection(a, b, angleFormat)}  ${formatLength(planLen, site.spatial, lengthPref)}`;
        return (
          <text
            key={i}
            x={mid.x}
            y={mid.y}
            transform={`rotate(${angle} ${mid.x} ${mid.y}) translate(0 -4)`}
            fontSize={10}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 3 }}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

function DraftOverlay({
  draft,
  cursor,
  viewport,
  kind,
  polyline,
}: {
  draft: Point[];
  cursor: Point | null;
  viewport: Viewport;
  kind?: string;
  polyline?: boolean;
}) {
  const pts = cursor ? [...draft, cursor] : draft;
  const screenPts = pts.map((p) => worldToScreen(p, viewport));
  const poly = screenPts.map((s) => `${s.x},${s.y}`).join(" ");
  const first = worldToScreen(draft[0], viewport);
  return (
    <g>
      <polyline
        points={poly}
        fill={polyline ? "none" : "hsl(var(--primary))"}
        fillOpacity={polyline ? 0 : 0.08}
        stroke="hsl(var(--primary))"
        strokeWidth={1.75}
        strokeDasharray="5 3"
      />
      {screenPts.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={i === 0 ? 5 : 3.5} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={1.5} />
      ))}
      {!polyline && draft.length >= 3 && (
        <circle cx={first.x} cy={first.y} r={8} fill="none" stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="2 2" />
      )}
      {kind && cursor && (
        <text x={worldToScreen(cursor, viewport).x + 10} y={worldToScreen(cursor, viewport).y - 10} fontSize={11} fill="hsl(var(--muted-foreground))">
          {kind}
        </text>
      )}
    </g>
  );
}

function MeasureOverlay({
  points,
  cursor,
  viewport,
  spatial,
}: {
  points: Point[];
  cursor: Point | null;
  viewport: Viewport;
  spatial: SpatialContext;
}) {
  const lengthPref = usePrefsStore((s) => s.lengthUnit);
  const angleFormat = usePrefsStore((s) => s.angleFormat);

  // The tentative next vertex tracks the cursor while measuring.
  const pts = cursor ? [...points, cursor] : points;
  const screen = pts.map((p) => worldToScreen(p, viewport));

  if (pts.length < 2) {
    const s = screen[0];
    return <circle cx={s.x} cy={s.y} r={4} fill="#f43f5e" />;
  }

  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const bearing = formatDirection(prev, last, angleFormat);
  const readout = `${formatLength(total, spatial, lengthPref)} · ${bearing}`;
  const anchor = screen[screen.length - 1];
  const poly = screen.map((s) => `${s.x},${s.y}`).join(" ");

  return (
    <g className="pointer-events-none">
      <polyline points={poly} fill="none" stroke="#f43f5e" strokeWidth={2} strokeLinejoin="round" />
      {screen.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={i === 0 ? 4.5 : 3.5} fill="#f43f5e" />
      ))}
      <text
        x={anchor.x + 10}
        y={anchor.y - 10}
        fontSize={12}
        fill="#f43f5e"
        style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 3 }}
      >
        {readout}
      </text>
    </g>
  );
}

function CanvasHud({
  tool,
  cursor,
  draft,
  elevation,
  units,
  snappedToVertex,
}: {
  tool: string;
  cursor: Point | null;
  draft: number;
  elevation: number | null;
  units: string;
  snappedToVertex: boolean;
}) {
  const coordFormat = usePrefsStore((s) => s.coordFormat);
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-border bg-card/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">
      <span className="font-medium text-foreground">{tool}</span>
      {cursor && <span className="tabular-nums">{formatCoord(cursor, coordFormat)}</span>}
      {snappedToVertex && <span className="font-medium text-primary">⌖ vertex</span>}
      {elevation != null && (
        <span className="tabular-nums text-amber-600 dark:text-amber-500">
          z {elevation.toFixed(1)} {units}
        </span>
      )}
      {draft > 0 && <span className="text-primary">{draft} pts · Enter to finish · Esc to cancel</span>}
    </div>
  );
}
