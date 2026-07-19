import * as React from "react";
import {
  bearingText,
  bounds,
  buildableEnvelope,
  centroid,
  isSpatialElement,
  measuredArea,
  pointInPolygon,
  unionBounds,
  unitLabel,
  type Bounds,
  type PlanElement,
  type Point,
  type Polygon,
  type SpatialContext,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { elementColor } from "@/lib/elementMeta";
import { toolDef } from "@/lib/tools";
import { fitBounds, niceGridStep, worldToScreen, zoomAt, type Viewport } from "./viewport";
import { eventToWorld, snapPoint } from "./snapping";
import { formatArea } from "@/lib/format";

interface Size {
  width: number;
  height: number;
}

type Interaction =
  | { type: "idle" }
  | { type: "panning"; lastScreen: Point }
  | { type: "moving"; startWorld: Point; delta: Point }
  | { type: "vertex"; elementId: string; index: number; boundary: Polygon };

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
  const addNote = useWorkspaceStore((s) => s.addNote);
  const setTool = useWorkspaceStore((s) => s.setTool);

  const {
    viewport,
    setViewport,
    showGrid,
    showLabels,
    showSurveyLabels,
    snapToGrid,
    snapToVertices,
    fitRequestId,
  } = useCanvasStore();

  const [draft, setDraft] = React.useState<Point[]>([]);
  const [cursor, setCursor] = React.useState<Point | null>(null);
  const [measure, setMeasure] = React.useState<Point[]>([]);
  const interactionRef = React.useRef<Interaction>({ type: "idle" });
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  const tool = toolDef(activeTool);

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

  const gridStep = React.useMemo(() => niceGridStep(viewport.zoom), [viewport.zoom]);

  // --- helpers -------------------------------------------------------------
  const getRect = () => containerRef.current!.getBoundingClientRect();

  const resolveWorld = React.useCallback(
    (clientX: number, clientY: number): { world: Point; snapped: Point } => {
      const rect = getRect();
      const raw = eventToWorld(clientX, clientY, rect, viewport);
      const screen = { x: clientX - rect.left, y: clientY - rect.top };
      const { point } = snapPoint(raw, screen, viewport, site?.elements ?? [], {
        gridStep,
        snapToGrid,
        snapToVertices,
      });
      return { world: raw, snapped: point };
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
          if (pointInPolygon(world, element.boundary)) return element.id;
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
    if (!tool.kind || tool.mode !== "polygon") return;
    if (draft.length >= 3) {
      addDrawnElement(tool.kind as Exclude<typeof tool.kind, "note">, draft);
    }
    setDraft([]);
    setTool("select");
  }, [tool, draft, addDrawnElement, setTool]);

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
      if (e.key === "Enter" && draft.length >= 3) completeDraft();
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

    if (tool.mode === "point") {
      addNote(snapped);
      setTool("select");
      return;
    }

    if (tool.mode === "ruler") {
      setMeasure((m) => (m.length >= 2 ? [snapped] : [...m, snapped]));
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
        e.currentTarget.setPointerCapture(e.pointerId);
        interactionRef.current = {
          type: "vertex",
          elementId: selectedElement.id,
          index: idx,
          boundary: selectedElement.boundary.slice(),
        };
        return;
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
    const { snapped } = resolveWorld(e.clientX, e.clientY);
    setCursor(snapped);
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
  }

  function onPointerUp(e: React.PointerEvent) {
    const interaction = interactionRef.current;
    if (interaction.type === "moving") {
      if (interaction.delta.x !== 0 || interaction.delta.y !== 0) moveSelection(interaction.delta);
    } else if (interaction.type === "vertex") {
      updateBoundary(interaction.elementId, interaction.boundary);
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

  function onDoubleClick() {
    if (tool.mode === "polygon" && draft.length >= 3) completeDraft();
  }

  if (!site) return null;

  const ordered = orderedVisibleElements(site);
  const interaction = interactionRef.current;
  const moveDelta = interaction.type === "moving" ? interaction.delta : { x: 0, y: 0 };
  const vertexPreview =
    interaction.type === "vertex" ? { id: interaction.elementId, boundary: interaction.boundary } : null;
  const selectionSet = new Set(selection);

  const cursorClass =
    tool.mode === "pan"
      ? "cursor-grab"
      : tool.mode === "polygon" || tool.mode === "point" || tool.mode === "ruler"
        ? "cursor-crosshair"
        : "cursor-default";

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
        {showGrid && <Grid viewport={viewport} size={size} step={gridStep} />}

        {ordered.map(({ element }) => {
          const shifted =
            selectionSet.has(element.id) && (moveDelta.x !== 0 || moveDelta.y !== 0);
          const previewBoundary =
            vertexPreview?.id === element.id ? vertexPreview.boundary : undefined;
          return (
            <ElementShape
              key={element.id}
              element={element}
              viewport={viewport}
              selected={selectionSet.has(element.id)}
              showLabels={showLabels}
              spatialUnits={site.spatial}
              moveDelta={shifted ? moveDelta : undefined}
              overrideBoundary={previewBoundary}
            />
          );
        })}

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

        {/* In-progress polygon draft. */}
        {draft.length > 0 && (
          <DraftOverlay draft={draft} cursor={cursor} viewport={viewport} kind={tool.kind} />
        )}

        {/* Measurement ruler. */}
        {measure.length > 0 && (
          <MeasureOverlay points={measure} cursor={cursor} viewport={viewport} spatial={site.spatial} />
        )}
      </svg>

      <CanvasHud tool={tool.label} cursor={cursor} draft={draft.length} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
  if (!isSpatialElement(element)) {
    const s = worldToScreen(element.position, viewport);
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
  const category = element.kind === "landuse" ? element.category : undefined;
  const color = elementColor(element.kind, category);
  const path = toPath(boundary, viewport);
  const isLine = element.kind === "row";
  const fillOpacity = element.kind === "building" ? 0.65 : element.kind === "landuse" ? 0.32 : 0.14;

  const label = showLabels && viewport.zoom > 1.4 ? element.name : null;
  const center = label ? worldToScreen(centroid(boundary), viewport) : null;
  const areaLabel =
    label && viewport.zoom > 3.5 ? formatArea(measuredArea(boundary, spatialUnits, "sqm"), "sqm") : null;

  // Setback / buildable envelope for a lot.
  let envelopePath: string | null = null;
  if (element.kind === "lot" && element.setback && element.setback > 0) {
    const shiftedLot = { ...element, boundary };
    const env = buildableEnvelope(shiftedLot);
    if (env) envelopePath = toPath(env, viewport);
  }

  return (
    <g>
      <path
        d={path}
        fill={color}
        fillOpacity={isLine ? 0.25 : fillOpacity}
        stroke={selected ? "hsl(var(--primary))" : color}
        strokeWidth={selected ? 2.5 : element.kind === "building" ? 1.5 : 1.75}
        strokeDasharray={element.kind === "zone" ? "6 4" : undefined}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
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
  if (selection.length !== 1) return null;
  const element = site.elements.find((e) => e.id === selection[0]);
  if (!element || !isSpatialElement(element)) return null;
  // Only worth showing when the boundary is large enough to read.
  if (viewport.zoom < 1) return null;

  const boundary = preview?.id === element.id ? preview.boundary : element.boundary;
  const n = boundary.length;
  const factor = site.spatial.units === "feet" ? 0.3048 : 1;
  const u = unitLabel(site.spatial.units);

  return (
    <g className="pointer-events-none">
      {boundary.map((a, i) => {
        const b = boundary[(i + 1) % n];
        const sa = worldToScreen(a, viewport);
        const sb = worldToScreen(b, viewport);
        const distM = Math.hypot(b.x - a.x, b.y - a.y) * factor;
        if (Math.hypot(sb.x - sa.x, sb.y - sa.y) < 34) return null;
        const mid = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
        let angle = (Math.atan2(sb.y - sa.y, sb.x - sa.x) * 180) / Math.PI;
        if (angle > 90 || angle < -90) angle += 180; // keep text upright
        const label = `${bearingText(a, b)}  ${distM.toFixed(1)} ${u}`;
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
}: {
  draft: Point[];
  cursor: Point | null;
  viewport: Viewport;
  kind?: string;
}) {
  const pts = cursor ? [...draft, cursor] : draft;
  const screenPts = pts.map((p) => worldToScreen(p, viewport));
  const poly = screenPts.map((s) => `${s.x},${s.y}`).join(" ");
  const first = worldToScreen(draft[0], viewport);
  return (
    <g>
      <polyline points={poly} fill="hsl(var(--primary))" fillOpacity={0.08} stroke="hsl(var(--primary))" strokeWidth={1.75} strokeDasharray="5 3" />
      {screenPts.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={i === 0 ? 5 : 3.5} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={1.5} />
      ))}
      {draft.length >= 3 && (
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
  const a = points[0];
  const b = points[1] ?? cursor;
  if (!b) return null;
  const sa = worldToScreen(a, viewport);
  const sb = worldToScreen(b, viewport);
  const dxWorld = b.x - a.x;
  const dyWorld = b.y - a.y;
  const distPlan = Math.hypot(dxWorld, dyWorld);
  const distM = distPlan * (spatial.units === "feet" ? 0.3048 : 1);
  const mid = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
  return (
    <g>
      <line x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} stroke="#f43f5e" strokeWidth={2} />
      <circle cx={sa.x} cy={sa.y} r={4} fill="#f43f5e" />
      <circle cx={sb.x} cy={sb.y} r={4} fill="#f43f5e" />
      <text
        x={mid.x}
        y={mid.y - 8}
        fontSize={12}
        textAnchor="middle"
        fill="#f43f5e"
        style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 3 }}
      >
        {distM.toFixed(1)} m
      </text>
    </g>
  );
}

function CanvasHud({ tool, cursor, draft }: { tool: string; cursor: Point | null; draft: number }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-border bg-card/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">
      <span className="font-medium text-foreground">{tool}</span>
      {cursor && (
        <span className="tabular-nums">
          x {cursor.x.toFixed(1)} · y {cursor.y.toFixed(1)}
        </span>
      )}
      {draft > 0 && <span className="text-primary">{draft} pts · Enter to finish · Esc to cancel</span>}
    </div>
  );
}
