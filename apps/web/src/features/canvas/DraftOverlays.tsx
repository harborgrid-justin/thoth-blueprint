import { type Point, type SpatialContext } from "@thoth/domain";
import { usePrefsStore } from "@/store/prefsStore";
import { formatCoord } from "@/lib/units";
import { type Viewport } from "./viewport";
import {
  computeDraftPoints,
  computeMeasureReadout,
} from "./draftHelpers";

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
