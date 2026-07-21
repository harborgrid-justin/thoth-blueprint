import _ from "lodash";
import { AreaChart, Plus, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfileSectionState } from "./hooks/useProfileSectionState";

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AreaChart className="h-5 w-5 text-primary" /> Vertical Design
            Profile &amp; Cross Sections
          </DialogTitle>
          <DialogDescription>
            Configure finished grade vertical curves (PVIs) and slice real-time
            cross-sections along the baseline.
          </DialogDescription>
        </DialogHeader>

        {alignments.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No alignments found. Please draw a horizontal alignment baseline
            first.
          </div>
        ) : (
          <div className="grid grid-cols-[300px_1fr] gap-6">
            {/* Sidebar Controls */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                          ? "bg-primary/15 text-primary font-medium"
                          : "hover:bg-accent text-muted-foreground",
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vertical PVIs
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-primary"
                    onClick={addPvi}
                  >
                    <Plus className="mr-0.5 h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                <div className="mt-2 max-h-[220px] overflow-y-auto rounded-md border border-border bg-card p-2 text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-1 text-left">Station</th>
                        <th className="py-1 text-left">Elev</th>
                        <th className="py-1 text-left">L (Curve)</th>
                        <th className="py-1 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {_.map(profile.pvis, (pvi, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-1">
                            <input
                              type="number"
                              className="w-16 bg-transparent outline-none focus:text-foreground"
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
                          <td className="py-1">
                            <input
                              type="number"
                              className="w-12 bg-transparent outline-none"
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
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Vertical Profile View (TIN ground vs Proposed Grade)
                </h4>
                <div className="relative h-[200px] w-full bg-slate-950/60 rounded-md overflow-hidden border border-border/80">
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
                      <span className="h-1 w-4 bg-[#10b981] inline-block" />{" "}
                      Existing Ground (TIN)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1 w-4 bg-[#f43f5e] inline-block" />{" "}
                      Proposed finished grade
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1 w-4 bg-[#eab308] border-t border-dashed inline-block" />{" "}
                      Sample Station
                    </span>
                  </div>
                </div>
              </div>

              {/* Cross Section Graph */}
              <div className="rounded-md border border-border bg-background p-3">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Cross Section View at STA {selectedStation.toFixed(0)}
                </h4>
                <div className="relative h-[200px] w-full bg-slate-950/60 rounded-md overflow-hidden border border-border/80">
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
                  <div className="absolute bottom-2 right-2 text-[10px] text-white/50">
                    Swath Width: {swathWidth} | Offset Scale: ±{swathWidth}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
