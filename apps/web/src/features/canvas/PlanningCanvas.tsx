import * as React from "react";
import { densifyArc, elevationAt, unitLabel } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { elementMatches } from "@/lib/search";
import { worldToScreen, type Viewport } from "./helpers/viewport";
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
import { orderedVisibleElements } from "./helpers/canvasHelpers";
import { ElementShape } from "./ElementShape";
import { BoundaryDimensions, SurveyEdgeLabels } from "./BoundaryDimensions";
import { DraftOverlay, MeasureOverlay, CanvasHud, CrosshairOverlay } from "./DraftOverlays";
import { AlignmentHandles, VertexHandles, EdgeHandles } from "./handles";
import {
  UnderlayImage,
  CloudDots,
  TerrainOverlay,
  NetworkShape,
} from "./overlays";
import {
  useCanvasViewportController,
  type Size,
} from "./hooks/useCanvasViewport";
import { usePlanningCanvasState } from "./hooks/usePlanningCanvasState";
import { useCanvasInteractions } from "./hooks/useCanvasInteractions";
import { useUiStore } from "@/store/uiStore";
import { ElementContextMenu } from "./ElementContextMenu";

export function PlanningCanvas() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const handDrawnMode = useUiStore((s) => s.handDrawnMode);
  const state = usePlanningCanvasState();
  const { site, viewport, setViewport, size } = {
    ...state,
    ...useCanvasViewportController(containerRef, state.site),
  };

  const interactions = useCanvasInteractions({
    containerRef,
    viewport,
    setViewport,
    state,
  });

  if (!site) {
    return null;
  }

  const {
    selection,
    hoveredElementId,
    viewFrames,
    matchLines,
    findQuery,
    findKind,
    findActive,
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
    contourInterval,
    terrainSurface,
    underlay,
    clouds,
    tool,
  } = state;

  const {
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
    boxSelection,
  } = interactions;

  const ordered = orderedVisibleElements(site);
  const interaction = interactionRef.current;
  const moveDelta =
    interaction.type === "moving" ? interaction.delta : { x: 0, y: 0 };
  const vertexPreview =
    interaction.type === "vertex"
      ? { id: interaction.elementId, boundary: interaction.boundary }
      : null;
  const bulgePreview = interaction.type === "edgeBulge" ? interaction : null;
  const selectionSet = new Set(selection);

  const cursorClass =
    tool.mode === "pan"
      ? "cursor-grab"
      : "cursor-none";

  return (
    <ElementContextMenu
      onContextMenu={() => {
        // Automatically select hovered element on right click
        if (hoveredElementId && !selectionSet.has(hoveredElementId)) {
          useWorkspaceStore.getState().select(hoveredElementId);
        } else if (!hoveredElementId && selection.length > 0) {
          useWorkspaceStore.getState().select(null);
        }
      }}
    >
      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-hidden transition-colors ${
          handDrawnMode ? "bg-[#faf8f5]" : "bg-[hsl(var(--canvas))]"
        } ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
      >
      <svg
        width={size.width}
        height={size.height}
        className="absolute inset-0 select-none"
        style={{
          fontFamily: handDrawnMode
            ? "'Architects Daughter', 'Patrick Hand', 'Comic Sans MS', cursive"
            : undefined,
        }}
      >
        <defs>
          <filter id="canvas-hand-sketch" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <CanvasPatterns />
        <g filter={handDrawnMode ? "url(#canvas-hand-sketch)" : undefined}>
        {underlay?.visible && (
          <UnderlayImage underlay={underlay} viewport={viewport} />
        )}
        {showGrid && <Grid viewport={viewport} size={size} step={gridStep} />}
        <FrameworkLayer site={site} viewport={viewport} />
        {clouds.map(
          (c) =>
            c.visible && (
              <CloudDots
                key={c.id}
                points={c.cloud.points}
                viewport={viewport}
              />
            ),
        )}
        {terrainSurface && (showSlope || showContours) && (
          <TerrainOverlay
            surface={terrainSurface}
            viewport={viewport}
            showSlope={showSlope}
            showContours={showContours}
            interval={contourInterval}
          />
        )}
        {showNetworks &&
          (site.networks ?? []).map((network) => (
            <NetworkShape
              key={network.id}
              network={network}
              viewport={viewport}
            />
          ))}
        <AlignmentLayer site={site} viewport={viewport} />
        <CivilLayer site={site} viewport={viewport} />
        <CivilSymbolLayer site={site} viewport={viewport} />
        <MonumentLayer site={site} viewport={viewport} />

        {ordered.map(({ element }) => {
          const shifted =
            selectionSet.has(element.id) &&
            (moveDelta.x !== 0 || moveDelta.y !== 0);
          const previewBoundary =
            vertexPreview?.id === element.id
              ? vertexPreview.boundary
              : undefined;
          const dimmed =
            findActive && !elementMatches(element, findQuery, findKind);
          return (
            <g
              key={element.id}
              opacity={dimmed ? 0.15 : 1}
              onMouseEnter={() =>
                useWorkspaceStore.getState().hoverElement(element.id)
              }
              onMouseLeave={() => {
                if (
                  useWorkspaceStore.getState().hoveredElementId === element.id
                ) {
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

        {showInteriors && (
          <BuildingInteriorLayer site={site} viewport={viewport} />
        )}
        {showDimensions && <DimensionLayer site={site} viewport={viewport} />}
        {showGridBubbles && <GridBubbleLayer site={site} viewport={viewport} />}
        {showAnnotations && <AnnotationLayer site={site} viewport={viewport} />}

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

          const pts = screenPoints
            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(" ");

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

        {showDimensions && (
          <BoundaryDimensions site={site} viewport={viewport} />
        )}
        {showSurveyLabels && (
          <SurveyEdgeLabels
            site={site}
            selection={selection}
            viewport={viewport}
            preview={vertexPreview}
          />
        )}
        <VertexHandles
          site={site}
          selection={selection}
          viewport={viewport}
          preview={vertexPreview}
        />
        <EdgeHandles site={site} selection={selection} viewport={viewport} />
        <AlignmentHandles
          site={site}
          selection={selection}
          viewport={viewport}
        />

        {bulgePreview && (
          <polyline
            points={[
              bulgePreview.from,
              ...densifyArc(
                bulgePreview.from,
                bulgePreview.to,
                bulgePreview.bulge,
              ),
              bulgePreview.to,
            ]
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
              return (
                <circle
                  cx={startScreen.x}
                  cy={startScreen.y}
                  r={5}
                  fill="#3b82f6"
                />
              );
            })()}
            {(() => {
              const endScreen = worldToScreen(
                waterDropPath[waterDropPath.length - 1],
                viewport,
              );
              return (
                <circle
                  cx={endScreen.x}
                  cy={endScreen.y}
                  r={4}
                  fill="#1e3a8a"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                />
              );
            })()}
          </g>
        )}

        {measure.length > 0 && (
          <MeasureOverlay
            points={measure}
            cursor={cursor}
            viewport={viewport}
            spatial={site.spatial}
          />
        )}
        
        {boxSelection && (
          <rect
            x={Math.min(boxSelection.startScreen.x, boxSelection.currentScreen.x)}
            y={Math.min(boxSelection.startScreen.y, boxSelection.currentScreen.y)}
            width={Math.abs(boxSelection.currentScreen.x - boxSelection.startScreen.x)}
            height={Math.abs(boxSelection.currentScreen.y - boxSelection.startScreen.y)}
            fill={boxSelection.currentScreen.x < boxSelection.startScreen.x ? "rgba(34, 197, 94, 0.15)" : "rgba(59, 130, 246, 0.15)"}
            stroke={boxSelection.currentScreen.x < boxSelection.startScreen.x ? "rgb(34, 197, 94)" : "rgb(59, 130, 246)"}
            strokeWidth={1.5}
            strokeDasharray={boxSelection.currentScreen.x < boxSelection.startScreen.x ? "4 4" : undefined}
            className="pointer-events-none"
          />
        )}

        <CrosshairOverlay
          cursorScreen={cursor ? worldToScreen(cursor, viewport) : null}
          viewport={viewport}
          snappedToVertex={cursorSnappedToVertex}
        />
        </g>
      </svg>

      <CanvasHud
        tool={tool.label}
        cursor={cursor}
        cursorScreen={cursor ? worldToScreen(cursor, viewport) : null}
        draft={draft.length}
        elevation={
          terrainSurface && cursor ? elevationAt(terrainSurface, cursor) : null
        }
        units={unitLabel(site.spatial.units)}
        snappedToVertex={cursorSnappedToVertex}
      />
      <NorthArrow />
      <ScaleBar />
      <Legend />
      <SurveyLegend site={site} />
      </div>
    </ElementContextMenu>
  );
}

function Grid({
  viewport,
  size,
  step,
}: {
  viewport: Viewport;
  size: Size;
  step: number;
}) {
  const lines: React.ReactNode[] = [];
  const startWorldX =
    Math.floor((0 - viewport.offsetX) / viewport.zoom / step) * step;
  const endWorldX = (size.width - viewport.offsetX) / viewport.zoom;
  const startWorldY =
    Math.floor((0 - viewport.offsetY) / viewport.zoom / step) * step;
  const endWorldY = (size.height - viewport.offsetY) / viewport.zoom;

  let idx = 0;
  // Adaptive Grid Fading
  const screenStep = viewport.zoom * step;
  const minorOpacity = Math.max(0, Math.min(1, (screenStep - 5) / 15));
  
  if (minorOpacity > 0 || true) {
    for (let x = startWorldX; x <= endWorldX; x += step) {
      const sx = x * viewport.zoom + viewport.offsetX;
      const major = Math.round(x / step) % 5 === 0;
      if (!major && minorOpacity === 0) continue;
      lines.push(
        <line
          key={`vx${idx++}`}
          x1={sx}
          y1={0}
          x2={sx}
          y2={size.height}
          stroke={`hsl(var(${major ? "--canvas-grid-major" : "--canvas-grid"}))`}
          strokeWidth={major ? 1 : 0.5}
          opacity={major ? 1 : minorOpacity}
        />,
      );
    }
    for (let y = startWorldY; y <= endWorldY; y += step) {
      const sy = y * viewport.zoom + viewport.offsetY;
      const major = Math.round(y / step) % 5 === 0;
      if (!major && minorOpacity === 0) continue;
      lines.push(
        <line
          key={`hz${idx++}`}
          x1={0}
          y1={sy}
          x2={size.width}
          y2={sy}
          stroke={`hsl(var(${major ? "--canvas-grid-major" : "--canvas-grid"}))`}
          strokeWidth={major ? 1 : 0.5}
          opacity={major ? 1 : minorOpacity}
        />,
      );
    }
  }
  return <g>{lines}</g>;
}
