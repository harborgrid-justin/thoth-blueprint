import { type Point, type SpatialContext } from "@thoth/domain";
import { usePrefsStore } from "@/store/prefsStore";
import { formatCoord } from "@/lib/units";
import { type Viewport } from "./helpers/viewport";
import { computeDraftPoints, computeMeasureReadout } from "./helpers/draftHelpers";

export function CrosshairOverlay({
  cursorScreen,
  viewport: _viewport,
  snappedToVertex,
}: {
  cursorScreen: Point | null;
  viewport?: Viewport;
  snappedToVertex?: boolean;
}) {
  if (!cursorScreen) {return null;}
  const { x, y } = cursorScreen;

  return (
    <g className="pointer-events-none select-none">
      {/* White Halo Background Outline for 100% Visibility on Dark or Light Terrain */}
      <g stroke="#ffffff" strokeWidth={3} strokeOpacity={0.7}>
        <line x1={-10000} y1={y} x2={10000} y2={y} />
        <line x1={x} y1={-10000} x2={x} y2={10000} />
      </g>

      {/* High-Contrast CAD Crosshair Lines */}
      <g stroke="#0f172a" strokeWidth={1.25}>
        <line x1={-10000} y1={y} x2={10000} y2={y} />
        <line x1={x} y1={-10000} x2={x} y2={10000} />
      </g>

      {/* AutoCAD Central Aperture Pickbox */}
      <rect
        x={x - 4}
        y={y - 4}
        width={8}
        height={8}
        fill="rgba(37, 99, 235, 0.15)"
        stroke="#2563eb"
        strokeWidth={1.5}
      />

      {/* Center Target Dot */}
      <circle cx={x} cy={y} r={1} fill="#2563eb" />

      {/* OSNAP Snap Indicator */}
      {snappedToVertex && (
        <g className="animate-pulse">
          <rect
            x={x - 7}
            y={y - 7}
            width={14}
            height={14}
            fill="none"
            stroke="rgb(16, 185, 129)"
            strokeWidth={2}
          />
          <rect
            x={x - 4}
            y={y - 4}
            width={8}
            height={8}
            fill="rgba(16, 185, 129, 0.35)"
            stroke="rgb(16, 185, 129)"
            strokeWidth={1.5}
            transform={`rotate(45 ${x} ${y})`}
          />
        </g>
      )}
    </g>
  );
}

export function DraftOverlay({
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
  const { screenPts, polyString, firstScreen, cursorScreen } =
    computeDraftPoints(draft, cursor, viewport);

  return (
    <g>
      <polyline
        points={polyString}
        fill={polyline ? "none" : "hsl(var(--primary))"}
        fillOpacity={polyline ? 0 : 0.08}
        stroke="hsl(var(--primary))"
        strokeWidth={1.75}
        strokeDasharray="5 3"
      />
      
      {/* Polar Tracking Vector */}
      {draft.length > 0 && cursorScreen && (() => {
        const lastScreen = screenPts[screenPts.length - 2]; // the last clicked point
        if (!lastScreen) {return null;}
        
        const dx = Math.abs(cursorScreen.x - lastScreen.x);
        const dy = Math.abs(cursorScreen.y - lastScreen.y);
        
        // Tolerance for polar tracking visual (5 pixels)
        const isHorizontal = dy < 5;
        const isVertical = dx < 5;
        
        if (!isHorizontal && !isVertical) {return null;}
        
        return (
          <line
            x1={isHorizontal ? -10000 : lastScreen.x}
            y1={isHorizontal ? lastScreen.y : -10000}
            x2={isHorizontal ? 10000 : lastScreen.x}
            y2={isHorizontal ? lastScreen.y : 10000}
            stroke="rgb(34, 197, 94)"
            strokeWidth={1}
            strokeDasharray="8 4"
            className="pointer-events-none opacity-60"
          />
        );
      })()}

      {screenPts.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={i === 0 ? 5 : 3.5}
          fill="hsl(var(--background))"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
        />
      ))}
      {!polyline && draft.length >= 3 && (
        <circle
          cx={firstScreen.x}
          cy={firstScreen.y}
          r={8}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}
      {kind && cursorScreen && (
        <text
          x={cursorScreen.x + 10}
          y={cursorScreen.y - 10}
          fontSize={11}
          fill="hsl(var(--muted-foreground))"
        >
          {kind}
        </text>
      )}
    </g>
  );
}

export function MeasureOverlay({
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

  const { screen, anchor, polyString, readout, isSinglePoint } =
    computeMeasureReadout(
      points,
      cursor,
      viewport,
      spatial,
      lengthPref,
      angleFormat,
    );

  if (isSinglePoint) {
    const s = screen[0];
    return <circle cx={s.x} cy={s.y} r={4} fill="#f43f5e" />;
  }

  return (
    <g className="pointer-events-none">
      <polyline
        points={polyString}
        fill="none"
        stroke="#f43f5e"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {screen.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={i === 0 ? 4.5 : 3.5}
          fill="#f43f5e"
        />
      ))}
      <text
        x={anchor.x + 10}
        y={anchor.y - 10}
        fontSize={12}
        fill="#f43f5e"
        style={{
          paintOrder: "stroke",
          stroke: "hsl(var(--canvas))",
          strokeWidth: 3,
        }}
      >
        {readout}
      </text>
    </g>
  );
}

export function CanvasHud({
  tool,
  cursor,
  cursorScreen,
  draft,
  elevation,
  units,
  snappedToVertex,
}: {
  tool: string;
  cursor: Point | null;
  cursorScreen: Point | null;
  draft: number;
  elevation: number | null;
  units: string;
  snappedToVertex: boolean;
}) {
  const coordFormat = usePrefsStore((s) => s.coordFormat);

  if (!cursorScreen) {return null;}

  return (
    <div
      className="pointer-events-none absolute z-20 flex flex-col gap-1.5 rounded-lg border border-border/40 bg-background/90 p-2 text-xs text-muted-foreground shadow-2xl backdrop-blur-md transition-opacity duration-150 select-none"
      style={{
        left: cursorScreen.x + 20,
        top: cursorScreen.y + 20,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary uppercase">
          {tool}
        </span>
        {cursor && (
          <span className="font-cad text-foreground tabular-nums">
            {formatCoord(cursor, coordFormat)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {snappedToVertex && (
          <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 uppercase dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Snapping
          </span>
        )}
        {elevation != null && (
          <span className="font-cad text-amber-600 tabular-nums dark:text-amber-400">
            Z: {elevation.toFixed(1)} {units}
          </span>
        )}
      </div>

      {draft > 0 && (
        <span className="mt-1 text-[10px] font-medium text-primary">
          {draft} pts ·{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-cad text-foreground">Enter</kbd>{" "}
          finish ·{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-cad text-foreground">Esc</kbd>{" "}
          cancel
        </span>
      )}
    </div>
  );
}
