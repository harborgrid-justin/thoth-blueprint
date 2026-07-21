import _ from "lodash";
import { SlidersHorizontal, Settings2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSuperelevationWizardState } from "./hooks/useSuperelevationWizardState";

export function SuperelevationWizardDialog() {
  const {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    designSpeed,
    setDesignSpeed,
    eMax,
    setEMax,
    normalCrown,
    setNormalCrown,
    superCurve,
    handleSave,
  } = useSuperelevationWizardState();

  if (!site) {return null;}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" /> Superelevation Attainment Wizard
          </DialogTitle>
          <DialogDescription>
            Calculate AASHTO standard crown runoff transitions, lane tilt adjustments, and critical transition stations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 my-2">
          {/* Settings Column */}
          <div className="flex flex-col gap-4 border-r border-border/40 pr-6">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Settings2 className="h-4 w-4" /> Parameters
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">Reference Alignment</label>
              <select
                className="rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                value={selectedAlignId ?? ""}
                onChange={(e) => setSelectedAlignId(e.target.value)}
              >
                {_.map(alignments, (a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">Design Speed (MPH)</label>
              <Input
                type="number"
                className="h-8 text-xs bg-background"
                value={designSpeed}
                onChange={(e) => setDesignSpeed(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">Max Superelevation eMax</label>
              <select
                className="rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                value={eMax}
                onChange={(e) => setEMax(Number(e.target.value))}
              >
                <option value={0.04}>4.0% (Urban standard)</option>
                <option value={0.06}>6.0% (Standard Highway)</option>
                <option value={0.08}>8.0% (Rural steep standard)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">Normal Lane Crown Slope</label>
              <Input
                type="number"
                step="0.005"
                className="h-8 text-xs bg-background"
                value={normalCrown}
                onChange={(e) => setNormalCrown(Number(e.target.value))}
              />
            </div>

            <div className="mt-auto pt-4">
              <Button onClick={handleSave} className="w-full text-xs gap-1.5 bg-primary text-primary-foreground font-semibold">
                <Sparkles className="h-3.5 w-3.5" /> Apply to Alignment
              </Button>
            </div>
          </div>

          {/* Table & Chart Columns */}
          <div className="col-span-2 flex flex-col gap-4">
            {superCurve && (
              <>
                <div className="flex-1 rounded-md border border-border/60 bg-muted/20 p-2 overflow-y-auto max-h-[220px]">
                  <h4 className="font-semibold text-muted-foreground text-[10px] uppercase mb-2">Calculated Attainment Stations</h4>
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-medium">
                        <th className="pb-1">Station</th>
                        <th className="pb-1">Left Slope</th>
                        <th className="pb-1">Right Slope</th>
                        <th className="pb-1">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {_.map(superCurve.transitionStations, (st, i) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="py-1 font-mono text-primary">{(st.station).toFixed(2)}</td>
                          <td className="py-1">{(st.leftOuterSlope * 100).toFixed(1)}%</td>
                          <td className="py-1">{(st.rightOuterSlope * 100).toFixed(1)}%</td>
                          <td className="py-1 text-muted-foreground font-medium">{st.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Transition Slope Graph Visualizer */}
                <div className="border border-border/60 rounded p-3 bg-muted/10">
                  <h4 className="font-semibold text-muted-foreground text-[10px] uppercase mb-2 flex items-center justify-between">
                    <span>Transition Runoff Graphic</span>
                    <span className="text-[9px] text-primary-foreground/70 bg-primary/20 px-1.5 py-0.5 rounded">eMax: {(eMax * 100).toFixed(0)}%</span>
                  </h4>
                  
                  <svg viewBox="0 0 500 120" className="w-full h-[120px] bg-background rounded border border-border/40">
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#475569" strokeWidth="0.75" strokeDasharray="3" />
                    
                    {/* Left and Right Lane slope lines */}
                    <polyline
                      points={_.map(superCurve.transitionStations, (st, i) => {
                          const x = (i / (superCurve.transitionStations.length - 1)) * 500;
                          const y = 60 - st.leftOuterSlope * 400;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    <polyline
                      points={_.map(superCurve.transitionStations, (st, i) => {
                          const x = (i / (superCurve.transitionStations.length - 1)) * 500;
                          const y = 60 - st.rightOuterSlope * 400;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4"
                    />

                    {/* Legend */}
                    <g transform="translate(10, 10)" className="text-[8px] fill-muted-foreground">
                      <rect width="130" height="25" fill="black" fillOpacity="0.4" rx="2" />
                      <line x1="5" y1="8" x2="20" y2="8" stroke="#3b82f6" strokeWidth="2" />
                      <text x="25" y="11" className="fill-blue-400 font-medium">Left Pavement Edge</text>
                      <line x1="5" y1="18" x2="20" y2="18" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2" />
                      <text x="25" y="21" className="fill-amber-400 font-medium">Right Pavement Edge</text>
                    </g>
                  </svg>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
