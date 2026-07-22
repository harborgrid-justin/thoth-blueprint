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
  if (!cursorScreen) return null;
  return (
    <g className="pointer-events-none">
      <g className="opacity-50 mix-blend-difference" stroke="white" strokeWidth={0.5}>
        <line x1={-10000} y1={cursorScreen.y} x2={10000} y2={cursorScreen.y} />
        <line x1={cursorScreen.x} y1={-10000} x2={cursorScreen.x} y2={10000} />
        <rect x={cursorScreen.x - 3} y={cursorScreen.y - 3} width={6} height={6} fill="none" />
      </g>
      {snappedToVertex && (
        <rect
          x={cursorScreen.x - 5}
          y={cursorScreen.y - 5}
          width={10}
          height={10}
          fill="none"
          stroke="rgb(34, 197, 94)"
          strokeWidth={2}
          className="animate-pulse"
        />
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
        if (!lastScreen) return null;
        
        const dx = Math.abs(cursorScreen.x - lastScreen.x);
        const dy = Math.abs(cursorScreen.y - lastScreen.y);
        
        // Tolerance for polar tracking visual (5 pixels)
        const isHorizontal = dy < 5;
        const isVertical = dx < 5;
        
        if (!isHorizontal && !isVertical) return null;
        
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

  if (!cursorScreen) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 flex select-none flex-col gap-1.5 rounded-lg border border-border/40 bg-background/90 p-2 text-xs text-muted-foreground shadow-2xl backdrop-blur-md transition-opacity duration-150"
      style={{
        left: cursorScreen.x + 20,
        top: cursorScreen.y + 20,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary text-[10px] uppercase tracking-wider">
          {tool}
        </span>
        {cursor && (
          <span className="font-cad tabular-nums text-foreground">
            {formatCoord(cursor, coordFormat)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {snappedToVertex && (
          <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Snapping
          </span>
        )}
        {elevation != null && (
          <span className="font-cad tabular-nums text-amber-600 dark:text-amber-400">
            Z: {elevation.toFixed(1)} {units}
          </span>
        )}
      </div>

      {draft > 0 && (
        <span className="mt-1 font-medium text-primary text-[10px]">
          {draft} pts ·{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 text-foreground font-cad">Enter</kbd>{" "}
          finish ·{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 text-foreground font-cad">Esc</kbd>{" "}
          cancel
        </span>
      )}
    </div>
  );
}
