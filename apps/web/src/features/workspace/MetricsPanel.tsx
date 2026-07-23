import { areaUnitLabel, type AreaUnit } from "@thoth/domain";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  formatArea,
  formatNumber,
  formatPercent,
  formatRatio,
} from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMetricsState } from "./hooks/useMetricsState";
import { AREA_UNITS } from "./helpers/metricsHelpers";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

/** The live metrics panel: headline figures, land-use allocation, compliance. */
export function MetricsPanel() {
  const {
    site,
    selection,
    select,
    requestFitSelection,
    areaUnit,
    setAreaUnit,
    metrics,
    selectionMetrics,
    community,
    networks,
    findings,
    roadMeters,
    utilityMeters,
  } = useMetricsState();

  if (!site || !metrics || !community) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex items-center justify-between">
        <h3 className={WORKSPACE_STYLES.textSectionTitle}>
          Metrics
        </h3>
        <Select
          value={areaUnit}
          onValueChange={(v) => setAreaUnit(v as AreaUnit)}
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AREA_UNITS.map((u: AreaUnit) => (
              <SelectItem key={u} value={u}>
                {areaUnitLabel(u)} ({u})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={WORKSPACE_STYLES.grid2Col}>
        <Stat
          label="Site area"
          value={formatArea(metrics.siteArea, areaUnit)}
        />
        <Stat label="Lots" value={formatNumber(metrics.lotCount)} />
        <Stat label="Coverage" value={formatPercent(metrics.coverage)} />
        <Stat label="FAR" value={formatRatio(metrics.floorAreaRatio)} />
        <Stat
          label="Dwelling units"
          value={formatNumber(metrics.dwellingUnits)}
        />
        <Stat
          label="Density"
          value={`${formatNumber(metrics.density, 1)} du/ac`}
        />
        <Stat
          label="Impervious"
          value={formatPercent(metrics.imperviousRatio)}
        />
        <Stat
          label="Open space"
          value={formatPercent(metrics.openSpaceRatio)}
        />
      </div>

      {selectionMetrics && (
        <div>
          <h4 className={WORKSPACE_STYLES.textSectionTitle}>
            Selection ({selection.length})
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Area"
              value={formatArea(selectionMetrics.siteArea, areaUnit)}
            />
            <Stat
              label="Lots"
              value={formatNumber(selectionMetrics.lotCount)}
            />
            <Stat
              label="Coverage"
              value={formatPercent(selectionMetrics.coverage)}
            />
            <Stat
              label="FAR"
              value={formatRatio(selectionMetrics.floorAreaRatio)}
            />
            <Stat
              label="Dwellings"
              value={formatNumber(selectionMetrics.dwellingUnits)}
            />
            <Stat
              label="Open space"
              value={formatPercent(selectionMetrics.openSpaceRatio)}
            />
          </div>
        </div>
      )}

      <div>
        <h4 className={WORKSPACE_STYLES.textSectionTitle}>
          Land-use allocation
        </h4>
        {metrics.allocation.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">
            Draw land-use areas to see allocation.
          </p>
        ) : (
          <>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full">
              {metrics.allocation.map((slice) => (
                <div
                  key={slice.category}
                  style={{
                    width: `${slice.share * 100}%`,
                    backgroundColor: slice.color,
                  }}
                  title={`${slice.label} · ${formatPercent(slice.share)}`}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {metrics.allocation.map((slice) => (
                <li
                  key={slice.category}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="flex-1 text-foreground">{slice.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatArea(slice.area, areaUnit)}
                  </span>
                  <span className="w-10 text-right text-muted-foreground tabular-nums">
                    {formatPercent(slice.share)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div>
        <h4 className={WORKSPACE_STYLES.textSectionTitle}>
          Community
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Population"
            value={formatNumber(Math.round(community.population))}
          />
          <Stat
            label="Persons / km²"
            value={formatNumber(community.populationPerSquareKm, 0)}
          />
          <Stat
            label="Open space / capita"
            value={`${formatNumber(community.openSpacePerCapitaSqM, 1)} m²`}
          />
          <Stat
            label="Park / 1,000"
            value={`${formatNumber(community.parkAcresPerThousand, 1)} ac`}
          />
        </div>
      </div>

      {networks.length > 0 && (
        <div>
          <h4 className={WORKSPACE_STYLES.textSectionTitle}>
            Infrastructure
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Roads" value={`${formatNumber(roadMeters, 0)} m`} />
            <Stat
              label="Utility mains"
              value={`${formatNumber(utilityMeters, 0)} m`}
            />
            <Stat label="Networks" value={formatNumber(networks.length)} />
            <Stat
              label="Intersections"
              value={formatNumber(
                networks.reduce((s, n) => s + n.intersections, 0),
              )}
            />
          </div>
          {networks.some((n) => !n.connected) && (
            <p className="mt-1.5 text-[11px] text-amber-500">
              Some networks are disconnected — check for gaps between segments.
            </p>
          )}
        </div>
      )}

      <div>
        <h4 className={WORKSPACE_STYLES.textSectionTitle}>
          Compliance
        </h4>
        <ul className="flex flex-col gap-1.5">
          {findings.map((f, i) => {
            const icon =
              f.severity === "error" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : f.severity === "warning" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : f.code === "compliant" ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              );
            const text = (
              <span
                className={
                  f.severity === "error"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }
              >
                {f.message}
              </span>
            );
            if (f.elementId) {
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      select(f.elementId!);
                      requestFitSelection();
                    }}
                    onMouseEnter={() =>
                      useWorkspaceStore.getState().hoverElement(f.elementId!)
                    }
                    onMouseLeave={() => {
                      if (
                        useWorkspaceStore.getState().hoveredElementId ===
                        f.elementId
                      ) {
                        useWorkspaceStore.getState().hoverElement(null);
                      }
                    }}
                    className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-xs leading-snug transition-colors hover:bg-accent"
                  >
                    {icon}
                    {text}
                  </button>
                </li>
              );
            }
            return (
              <li
                key={i}
                className="flex items-start gap-2 px-1 text-xs leading-snug"
              >
                {icon}
                {text}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={WORKSPACE_STYLES.cardSubtle}>
      <div className={WORKSPACE_STYLES.statLabel}>
        {label}
      </div>
      <div className={`${WORKSPACE_STYLES.statValue} mt-0.5 text-xs`}>
        {value}
      </div>
    </div>
  );
}
