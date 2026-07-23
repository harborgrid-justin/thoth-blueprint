import _ from "lodash";
import { Activity, ShieldAlert, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogShell } from "@/components/layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePipeDesignState } from "./hooks/usePipeDesignState";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

export function PipeDesignDialog() {
  const {
    open,
    setOpen,
    site,
    hoveredElementId,
    hoverElement,
    select,
    networks,
    selectedNetId,
    setSelectedNetId,
    rules,
    setRules,
    inverts,
    validation,
    handleInvertChange,
  } = usePipeDesignState();

  if (!site) {
    return null;
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={setOpen}
      title="Pipe Network Design Checks"
      description="Audit pipeline cover depths, sumps, and gradient slopes against gravity flow engineering constraints."
      icon={<Activity className="h-5 w-5 text-amber-400" />}
      maxWidthClass="max-w-5xl"
    >
      {networks.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No utility pipe networks found in this site. Add some
          water/sewer/storm paths using the network tools.
        </div>
      ) : (
        <div className="grid grid-cols-[220px_1fr] gap-6">
          {/* Left panel: Network selector and design rules config */}
          <div className="flex flex-col gap-4 border-r border-border pr-4">
            <div>
              <label className={SURVEY_STYLES.label + " mb-1 block"}>
                Active Utility System
              </label>
              <select
                value={selectedNetId ?? ""}
                onChange={(e) => setSelectedNetId(e.target.value)}
                className={SURVEY_STYLES.select}
              >
                {_.map(networks, (n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({(n as any).type ?? 'utility'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <h4 className={SURVEY_STYLES.label}>
                Engineering Design Rules
              </h4>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">
                  Min Ground Cover (ft)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  className={SURVEY_STYLES.input}
                  value={rules.minCover}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      minCover: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">
                  Max Ground Cover (ft)
                </label>
                <Input
                  type="number"
                  step="1"
                  className={SURVEY_STYLES.input}
                  value={(rules as any).maxCover ?? 12.0}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      maxCover: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">
                  Min Pipe Slope (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  className={SURVEY_STYLES.input}
                  value={rules.minSlope * 100}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      minSlope: Number(e.target.value) / 100,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">
                  Max Flow Velocity (ft/s)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  className={SURVEY_STYLES.input}
                  value={(rules as any).maxVelocity ?? 10.0}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      maxVelocity: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Right panel: Pipes and structures table */}
          <div className="flex flex-col gap-4">
            <ScrollArea className="h-[220px] rounded-md border border-border">
              <div className="p-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className={SURVEY_STYLES.tableTh}>Element ID</th>
                      <th className={SURVEY_STYLES.tableTh}>Type</th>
                      <th className={SURVEY_STYLES.tableTh}>Rim / Ground (ft)</th>
                      <th className={SURVEY_STYLES.tableTh}>Invert / Slope</th>
                      <th className={SURVEY_STYLES.tableTh}>Cover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation?.nodeElevations.map((inv: any, idx: number) => {
                      const isHovered = hoveredElementId === inv.nodeId;
                      return (
                        <tr
                          key={idx}
                          className={cn(
                            SURVEY_STYLES.tableRow,
                            isHovered && "bg-muted/60",
                          )}
                          onMouseEnter={() => hoverElement(inv.nodeId)}
                          onMouseLeave={() => hoverElement(null)}
                          onClick={() => select(inv.nodeId)}
                        >
                          <td className={SURVEY_STYLES.tableTd + " font-mono"}>{inv.nodeId}</td>
                          <td className={SURVEY_STYLES.tableTd}>Node</td>
                          <td className={SURVEY_STYLES.tableTd}>{inv.rimElevation.toFixed(2)}</td>
                          <td className={SURVEY_STYLES.tableTd}>
                            <Input
                              type="number"
                              step="0.01"
                              className="h-6 w-20 px-1 font-mono text-xs"
                              value={inverts[inv.nodeId] ?? inv.invertElevation.toFixed(2)}
                              onChange={(e) => handleInvertChange(inv.nodeId, Number(e.target.value))}
                            />
                          </td>
                          <td className={SURVEY_STYLES.tableTd}>{(inv.depthCover ?? 0).toFixed(2)} ft</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>

            {/* Warnings and violations logs */}
            <div className="min-h-[160px] flex-1 rounded-md border border-border bg-background/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Design Rules Violations Audit Report
                </h4>
                {validation && validation.violations.length === 0 ? (
                  <Badge className="gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                    <CheckCircle className="h-3 w-3" /> Fully Compliant
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="h-3 w-3" />{" "}
                    {validation?.violations.length} warnings
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[120px] text-xs">
                {validation && validation.violations.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-6 text-center text-muted-foreground">
                    No design checking warnings. Utility pipe depth and slope
                    ranges are within limits.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {_.map(validation?.violations, (v, i) => (
                      <div
                        key={i}
                        className="flex gap-2 rounded border border-yellow-500/20 bg-yellow-500/5 p-2 text-yellow-600 dark:text-yellow-400"
                      >
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <div>
                          <span className="block text-[10px] font-semibold tracking-wide uppercase">
                            {v.type.replace("_", " ")} ({v.severity})
                          </span>
                          <span>{v.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      )}
    </DialogShell>
  );
}
