import _ from "lodash";
import { AreaChart, Plus, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { cn } from "@/lib/utils";
import { DialogShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfileSectionState } from "./hooks/useProfileSectionState";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

export function ProfileSectionDialog() {
  const {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    resolved,
    profile,
    selectedStation,
    setSelectedStation,
    swathWidth,
    setSwathWidth,
    crossSection,
    updatePvi,
    addPvi,
    removePvi,
  } = useProfileSectionState();

  if (!site) {
    return null;
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={setOpen}
      title="Vertical Design Profile & Cross Sections"
      description="Configure finished grade vertical curves (PVIs) and slice real-time cross-sections along the baseline."
      icon={<AreaChart className="h-5 w-5 text-amber-400" />}
      maxWidthClass="max-w-6xl"
    >
      {alignments.length === 0 ? (
        <div className={SURVEY_STYLES.cardSubtle + " py-12 text-center text-sm text-muted-foreground"}>
          No alignments found. Please draw a horizontal alignment baseline first.
        </div>
      ) : (
        <div className={SURVEY_STYLES.layoutSidebarLg}>
          {/* Sidebar Controls */}
          <div className={SURVEY_STYLES.sidebar}>
            <div>
              <label className={SURVEY_STYLES.label}>
                Select Alignment
              </label>
              <div className="mt-1 flex flex-col gap-1">
                {_.map(alignments, (a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setSelectedAlignId(a.id);
                      useWorkspaceStore.getState().select(a.id);
                    }}
                    onMouseEnter={() =>
                      useWorkspaceStore.getState().hoverElement(a.id)
                    }
                    onMouseLeave={() =>
                      useWorkspaceStore.getState().hoverElement(null)
                    }
                    className={cn(
                      "rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      a.id === selectedAlignId
                        ? "border border-amber-500/30 bg-amber-500/20 font-medium text-amber-300"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={SURVEY_STYLES.label}>
                  Vertical PVIs
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-amber-400 hover:text-amber-300"
                  onClick={addPvi}
                >
                  <Plus className="mr-0.5 h-3.5 w-3.5" /> Add
                </Button>
              </div>
              <div className={SURVEY_STYLES.card + " mt-2 max-h-[220px] overflow-y-auto p-2 text-xs"}>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={SURVEY_STYLES.tableTh}>Station</th>
                      <th className={SURVEY_STYLES.tableTh}>Elev</th>
                      <th className={SURVEY_STYLES.tableTh}>L (Curve)</th>
                      <th className={SURVEY_STYLES.tableTh + " text-right"}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {_.map(profile.pvis, (pvi, idx) => (
                      <tr key={idx} className={SURVEY_STYLES.tableRow}>
                        <td className={SURVEY_STYLES.tableTd}>
                          <input
                            type="number"
                            className={SURVEY_STYLES.input + " w-16"}
                            value={pvi.station}
                            onChange={(e) =>
                              updatePvi(
                                idx,
                                "station",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </td>
                        <td className={SURVEY_STYLES.tableTd}>
                          <input
                            type="number"
                            className={SURVEY_STYLES.input + " w-12"}
                            value={pvi.elevation}
                            onChange={(e) =>
                              updatePvi(
                                idx,
                                "elevation",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </td>
                        <td className="py-1">
                          <input
                            type="number"
                            className="w-12 bg-transparent outline-none"
                            value={pvi.curveLength ?? 0}
                            onChange={(e) =>
                              updatePvi(
                                idx,
                                "curveLength",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </td>
                        <td className="py-1 text-right">
                          <button
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removePvi(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Cross Section Sampling
              </label>
              <div className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-card p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Sample Station:</span>
                  <Input
                    type="number"
                    className="h-7 w-24 text-right"
                    value={selectedStation}
                    onChange={(e) =>
                      setSelectedStation(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Swath Width:</span>
                  <Input
                    type="number"
                    className="h-7 w-24 text-right"
                    value={swathWidth}
                    onChange={(e) =>
                      setSwathWidth(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Graphs Render */}
          <div className="flex flex-col gap-4">
            {/* Profile Graph */}
            <div className="rounded-md border border-border bg-background p-3">
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Vertical Profile View (TIN ground vs Proposed Grade)
              </h4>
              <div className="relative h-[200px] w-full overflow-hidden rounded-md border border-border/80 bg-background/60">
                <svg
                  className="h-full w-full"
                  viewBox="0 0 600 200"
                  preserveAspectRatio="none"
                >
                  {/* Grid lines */}
                  <line
                    x1="0"
                    y1="50"
                    x2="600"
                    y2="50"
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="4"
                  />
                  <line
                    x1="0"
                    y1="100"
                    x2="600"
                    y2="100"
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="4"
                  />
                  <line
                    x1="0"
                    y1="150"
                    x2="600"
                    y2="150"
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="4"
                  />

                  {/* Terrain ground profile line */}
                  <polyline
                    points="0,140 150,110 300,160 450,120 600,130"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                  />

                  {/* Proposed finished vertical profile */}
                  {profile.pvis.length >= 2 && (
                    <polyline
                      points={profile.pvis
                        .map((p) => {
                          const x = (p.station / 1000) * 600;
                          const y = 200 - (p.elevation / 30) * 200;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                    />
                  )}

                  {/* PVIs dot markers */}
                  {profile.pvis.map((p, i) => {
                    const cx = (p.station / 1000) * 600;
                    const cy = 200 - (p.elevation / 30) * 200;
                    return (
                      <circle key={i} cx={cx} cy={cy} r="4" fill="#fb7185" />
                    );
                  })}

                  {/* Current sample station vertical marker */}
                  {resolved && (
                    <line
                      x1={
                        (selectedStation / Math.max(1, resolved.endStation)) *
                        600
                      }
                      y1="0"
                      x2={
                        (selectedStation / Math.max(1, resolved.endStation)) *
                        600
                      }
                      y2="200"
                      stroke="#eab308"
                      strokeWidth="1"
                      strokeDasharray="2"
                    />
                  )}
                </svg>
                <div className="absolute top-2 left-2 flex gap-4 text-[10px] text-white/70">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1 w-4 bg-[#10b981]" />{" "}
                    Existing Ground (TIN)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1 w-4 bg-[#f43f5e]" />{" "}
                    Proposed finished grade
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1 w-4 border-t border-dashed bg-[#eab308]" />{" "}
                    Sample Station
                  </span>
                </div>
              </div>
            </div>

            {/* Cross Section Graph */}
            <div className="rounded-md border border-border bg-background p-3">
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Cross Section View at STA {selectedStation.toFixed(0)}
              </h4>
              <div className="relative h-[200px] w-full overflow-hidden rounded-md border border-border/80 bg-background/60">
                {crossSection ? (
                  <svg
                    className="h-full w-full"
                    viewBox="0 0 600 200"
                    preserveAspectRatio="none"
                  >
                    <line
                      x1="300"
                      y1="0"
                      x2="300"
                      y2="200"
                      stroke="#475569"
                      strokeWidth="0.5"
                    />

                    {/* Terrain elevations line (existing) */}
                    <polyline
                      points={crossSection.existingPoints
                        .map((pt) => {
                          const x = 300 + (pt.offset / swathWidth) * 300;
                          const y = 140 + (10 - pt.elevation) * 10;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                    />

                    {/* Proposed grading profile (flattened pad mock) */}
                    <polyline
                      points={`100,100 200,100 300,100 400,100 500,100`}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                    />
                  </svg>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Enter a station valid within the alignment baseline range.
                  </div>
                )}
                <div className="absolute right-2 bottom-2 text-[10px] text-white/50">
                  Swath Width: {swathWidth} | Offset Scale: ±{swathWidth}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogShell>
  );
}
