import * as React from "react";
import {
  cutFill,
  elevationRange,
  slopeStats,
  type GradeRegion,
} from "@thoth/domain";
import { Mountain, Waves } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { buildTerrainModel } from "./terrainModel";
import { formatNumber } from "@/lib/format";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { TERRAIN_STYLES } from "./styles/terrainDesignSystem";

/**
 * Terrain panel: control the contour interval and slope shading, read the
 * slope analysis, and see the cut/fill earthwork balance for the whole site or
 * the selected grading region — all computed by the domain terrain engine.
 */
export function TerrainPanel() {
  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const {
    showContours,
    showSlope,
    showProposed,
    contourInterval,
    toggleContours,
    toggleSlope,
    toggleProposed,
    setContourInterval,
  } = useCanvasStore();

  const terrain = React.useMemo(
    () => (site ? buildTerrainModel(site) : null),
    [site],
  );

  if (!site) {
    return null;
  }

  const unit = site.spatial.units === "feet" ? "ft" : "m";

  if (!terrain?.hasTerrain || !terrain.existing) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Terrain
        </h3>
        <div className="rounded-md border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground">
          Place at least two{" "}
          <span className="font-medium text-foreground">spot elevations</span>{" "}
          (the spot-elevation tool) to build a ground surface. Contours, slope
          analysis, and cut/fill earthwork are then computed from it.
        </div>
      </div>
    );
  }

  const { existing, proposed } = terrain;
  const range = elevationRange(existing);
  const slopes = slopeStats(existing, { buildableMaxPercent: 15 });

  // Cut/fill: for the selected grade region if one is selected, else the whole site.
  const selected =
    selection.length === 1
      ? site.elements.find((e) => e.id === selection[0])
      : undefined;
  const gradeRegion =
    selected && selected.kind === "grade"
      ? (selected as GradeRegion)
      : undefined;
  const region = gradeRegion?.boundary;
  const work = proposed
    ? cutFill(existing, proposed, { region, spatial: site.spatial })
    : null;

  return (
    <div className={TERRAIN_STYLES.panel}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Terrain
      </h3>

      <div className="flex flex-col gap-2.5">
        <ToggleRow
          label="Contour lines"
          checked={showContours}
          onChange={toggleContours}
        />
        <ToggleRow
          label="Slope shading"
          checked={showSlope}
          onChange={toggleSlope}
        />
        <ToggleRow
          label="Show proposed grade"
          checked={showProposed}
          onChange={toggleProposed}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Contour interval</Label>
          <span className="text-xs tabular-nums text-foreground">
            {formatNumber(contourInterval, 1)} {unit}
          </span>
        </div>
        <Slider
          min={0.5}
          max={20}
          step={0.5}
          value={[contourInterval]}
          onValueChange={([v]) => setContourInterval(v)}
        />
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Mountain className="h-3.5 w-3.5" /> Ground &amp; slope
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Low point"
            value={`${formatNumber(range.min, 1)} ${unit}`}
          />
          <Stat
            label="High point"
            value={`${formatNumber(range.max, 1)} ${unit}`}
          />
          <Stat
            label="Relief"
            value={`${formatNumber(range.max - range.min, 1)} ${unit}`}
          />
          <Stat
            label="Mean slope"
            value={`${formatNumber(slopes.meanPercent, 1)}%`}
          />
          <Stat
            label="Max slope"
            value={`${formatNumber(slopes.maxPercent, 1)}%`}
          />
          <Stat
            label="Buildable ≤15%"
            value={`${formatNumber(slopes.buildableFraction * 100, 0)}%`}
          />
        </div>
      </div>

      {work && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Waves className="h-3.5 w-3.5" /> Earthwork{" "}
            {gradeRegion ? `· ${gradeRegion.name}` : "· whole site"}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Cut"
              value={`${formatNumber(work.cutCubicMeters, 0)} m³`}
              tone="cut"
            />
            <Stat
              label="Fill"
              value={`${formatNumber(work.fillCubicMeters, 0)} m³`}
              tone="fill"
            />
            <Stat
              label="Net"
              value={`${work.net >= 0 ? "+" : ""}${formatNumber(work.netCubicMeters, 0)} m³`}
            />
            <Stat
              label="Balance"
              value={work.balanced ? "Balanced" : "Import/export"}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {gradeRegion
              ? "Grade the selected region to its target elevation; volumes update live."
              : "Draw grading regions and set target elevations to reshape the ground."}
          </p>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm text-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "cut" | "fill";
}) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "mt-0.5 text-sm font-semibold tabular-nums " +
          (tone === "cut"
            ? "text-rose-500"
            : tone === "fill"
              ? "text-emerald-500"
              : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}
