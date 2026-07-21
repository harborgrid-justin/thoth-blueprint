import * as React from "react";
import { ChevronDown, ChevronUp, Compass } from "lucide-react";
import {
  landUseColor,
  METERS_PER_UNIT,
  unitLabel,
  type LandUseCategory,
} from "@thoth/domain";
import { LAND_USE_DEFINITIONS } from "@thoth/domain";
import { useCanvasStore } from "@/store/canvasStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { usePrefsStore } from "@/store/prefsStore";
import { resolveLengthUnit } from "@/lib/units";
import { niceNumber, presentCategories } from "./helpers/canvasOverlayHelpers";

/**
 * A cartographic scale bar (`FE-NAV-002`): a round distance in the user's
 * display units, drawn to the correct on-screen length for the current zoom.
 */
export function ScaleBar() {
  const zoom = useCanvasStore((s) => s.viewport.zoom);
  const spatial = useWorkspaceStore((s) => s.site?.spatial);
  const lengthPref = usePrefsStore((s) => s.lengthUnit);
  if (!spatial) {return null;}

  const unit = resolveLengthUnit(spatial, lengthPref);
  const metersPerPx = (1 / zoom) * METERS_PER_UNIT[spatial.units];
  const perPx = metersPerPx / METERS_PER_UNIT[unit];
  const targetPx = 120;
  const nice = niceNumber(targetPx * perPx);
  const widthPx = nice / perPx;
  const label = `${nice.toLocaleString()} ${unitLabel(unit)}`;

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex select-none flex-col items-end gap-1 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-md transition-all duration-200">
      <span className="font-mono text-[11px] font-medium tabular-nums text-muted-foreground">{label}</span>
      <div
        className="relative h-2 border-x-2 border-b-2 border-foreground/80"
        style={{ width: `${widthPx}px` }}
      >
        <div className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-foreground/80" />
      </div>
    </div>
  );
}

/**
 * A north-arrow orientation indicator (`FE-NAV-007`). The plan is axis-aligned
 * with survey north (−Y) up, so the arrow points up.
 */
export function NorthArrow() {
  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-10 flex cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-xl border border-border/60 bg-card/80 p-2 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-card/95 hover:shadow-xl">
      <div className="relative flex items-center justify-center">
        <Compass className="h-6 w-6 text-primary/80 transition-transform duration-300" />
        <svg width={18} height={20} viewBox="0 0 26 30" aria-hidden className="absolute -top-0.5">
          <path d="M13 2 L20 20 L13 15 L6 20 Z" fill="hsl(var(--primary))" />
        </svg>
      </div>
      <span className="font-mono text-[10px] font-bold tracking-wider text-foreground">N</span>
    </div>
  );
}

/** A legend reflecting the active land-use styling (`FE-STYLE-002`). */
export function Legend() {
  const show = useCanvasStore((s) => s.showLegend);
  const site = useWorkspaceStore((s) => s.site);
  const [collapsed, setCollapsed] = React.useState(false);

  if (!show || !site) {return null;}
  const categories = presentCategories(site);
  if (categories.length === 0) {return null;}

  const labelFor = (c: LandUseCategory) =>
    LAND_USE_DEFINITIONS.find((d) => d.category === c)?.label ?? c;

  return (
    <div className="absolute bottom-4 left-1/2 z-10 w-52 -translate-x-1/2 select-none rounded-xl border border-border/60 bg-card/85 p-2.5 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-card/95">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Land Use Legend</span>
        {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {!collapsed && (
        <ul className="mt-2 flex flex-col gap-1 px-1">
          {categories.map((c) => (
            <li key={c} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-accent/50">
              <span
                className="h-3 w-3 shrink-0 rounded-sm shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: landUseColor(c) }}
              />
              <span className="truncate font-medium text-foreground">{labelFor(c)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
