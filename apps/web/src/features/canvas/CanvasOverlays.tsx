import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  landUseColor,
  METERS_PER_UNIT,
  unitLabel,
  type LandUseCategory,
  type Site,
} from "@thoth/domain";
import { LAND_USE_DEFINITIONS } from "@thoth/domain";
import { useCanvasStore } from "@/store/canvasStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { usePrefsStore } from "@/store/prefsStore";
import { resolveLengthUnit } from "@/lib/units";

/** Round a value to the nearest 1-2-5 × 10ⁿ below it (for tick spacing). */
function niceNumber(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  const factor = residual >= 5 ? 5 : residual >= 2 ? 2 : 1;
  return factor * magnitude;
}

/**
 * A cartographic scale bar (`FE-NAV-002`): a round distance in the user's
 * display units, drawn to the correct on-screen length for the current zoom.
 */
export function ScaleBar() {
  const zoom = useCanvasStore((s) => s.viewport.zoom);
  const spatial = useWorkspaceStore((s) => s.site?.spatial);
  const lengthPref = usePrefsStore((s) => s.lengthUnit);
  if (!spatial) return null;

  const unit = resolveLengthUnit(spatial, lengthPref);
  // Display units per screen pixel at the current zoom.
  const metersPerPx = (1 / zoom) * METERS_PER_UNIT[spatial.units];
  const perPx = metersPerPx / METERS_PER_UNIT[unit];
  const targetPx = 120;
  const nice = niceNumber(targetPx * perPx);
  const widthPx = nice / perPx;
  const label = `${nice.toLocaleString()} ${unitLabel(unit)}`;

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-end gap-0.5">
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{label}</span>
      <div
        className="relative h-2 border-x border-b border-foreground/70"
        style={{ width: `${widthPx}px` }}
      >
        <div className="absolute left-1/2 top-0 h-2 w-px bg-foreground/70" />
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
    <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-center text-foreground/80">
      <svg width={26} height={30} viewBox="0 0 26 30" aria-hidden>
        <path d="M13 2 L20 20 L13 15 L6 20 Z" fill="currentColor" />
      </svg>
      <span className="text-[10px] font-semibold leading-none">N</span>
    </div>
  );
}

/** Categories actually present among the plan's land-use elements. */
function presentCategories(site: Site): LandUseCategory[] {
  const set = new Set<LandUseCategory>();
  for (const el of site.elements) {
    if (el.kind === "landuse") set.add(el.category);
    else if (el.kind === "building" && el.use) set.add(el.use);
  }
  return LAND_USE_DEFINITIONS.map((d) => d.category).filter((c) => set.has(c));
}

/** A legend reflecting the active land-use styling (`FE-STYLE-002`). */
export function Legend() {
  const show = useCanvasStore((s) => s.showLegend);
  const site = useWorkspaceStore((s) => s.site);
  const [collapsed, setCollapsed] = React.useState(false);

  if (!show || !site) return null;
  const categories = presentCategories(site);
  if (categories.length === 0) return null;

  const labelFor = (c: LandUseCategory) =>
    LAND_USE_DEFINITIONS.find((d) => d.category === c)?.label ?? c;

  return (
    <div className="absolute bottom-3 left-1/2 w-44 -translate-x-1/2 rounded-md border border-border bg-card/90 shadow-md backdrop-blur">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Land use
        {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {!collapsed && (
        <ul className="flex flex-col gap-1 px-2.5 pb-2">
          {categories.map((c) => (
            <li key={c} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: landUseColor(c) }} />
              <span className="truncate text-foreground">{labelFor(c)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
