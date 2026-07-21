import { type Point, type SpatialContext } from "@thoth/domain";
import { usePrefsStore } from "@/store/prefsStore";
import { formatCoord } from "@/lib/units";
import { type Viewport } from "./helpers/viewport";
import {
  computeDraftPoints,
  computeMeasureReadout,
} from "./helpers/draftHelpers";

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
  const { screenPts, polyString, firstScreen, cursorScreen } = computeDraftPoints(draft, cursor, viewport);

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
      {screenPts.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={i === 0 ? 5 : 3.5} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={1.5} />
      ))}
      {!polyline && draft.length >= 3 && (
        <circle cx={firstScreen.x} cy={firstScreen.y} r={8} fill="none" stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="2 2" />
      )}
      {kind && cursorScreen && (
        <text x={cursorScreen.x + 10} y={cursorScreen.y - 10} fontSize={11} fill="hsl(var(--muted-foreground))">
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

  const { screen, anchor, polyString, readout, isSinglePoint } = computeMeasureReadout(
    points,
    cursor,
    viewport,
    spatial,
    lengthPref,
    angleFormat
  );

  if (isSinglePoint) {
    const s = screen[0];
    return <circle cx={s.x} cy={s.y} r={4} fill="#f43f5e" />;
  }

  return (
    <g className="pointer-events-none">
      <polyline points={polyString} fill="none" stroke="#f43f5e" strokeWidth={2} strokeLinejoin="round" />
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

export function CanvasHud({
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
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex select-none items-center gap-2.5 rounded-xl border border-border/60 bg-card/85 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-card/95">
      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">{tool}</span>
      {cursor && <span className="font-mono tabular-nums text-foreground">{formatCoord(cursor, coordFormat)}</span>}
      {snappedToVertex && (
        <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ⌖ vertex
        </span>
      )}
      {elevation != null && (
        <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
          z {elevation.toFixed(1)} {units}
        </span>
      )}
      {draft > 0 && (
        <span className="font-medium text-primary">
          {draft} pts · <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] text-foreground">Enter</kbd> to finish · <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] text-foreground">Esc</kbd> to cancel
        </span>
      )}
    </div>
  );
}
