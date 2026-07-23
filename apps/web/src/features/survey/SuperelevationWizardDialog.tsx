import _ from "lodash";
import { SlidersHorizontal, Settings2, Sparkles } from "lucide-react";
import { DialogShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSuperelevationWizardState } from "./hooks/useSuperelevationWizardState";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

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

  if (!site) {
    return null;
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={setOpen}
      title="Superelevation Attainment Wizard"
      description="Calculate AASHTO standard crown runoff transitions, lane tilt adjustments, and critical transition stations."
      icon={<SlidersHorizontal className="h-5 w-5 text-amber-400" />}
      maxWidthClass="max-w-4xl"
    >
      <div className={SURVEY_STYLES.grid3Col + " my-2 text-xs"}>
        {/* Settings Column */}
        <div className={SURVEY_STYLES.sidebar}>
          <h3 className={SURVEY_STYLES.label + " flex items-center gap-1"}>
            <Settings2 className="h-4 w-4" /> Parameters
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className={SURVEY_STYLES.label}>
              Reference Alignment
            </label>
            <select
              className={SURVEY_STYLES.select}
              value={selectedAlignId ?? ""}
              onChange={(e) => setSelectedAlignId(e.target.value)}
            >
              {alignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={SURVEY_STYLES.label}>
              Design Speed (mph)
            </label>
            <Input
              type="number"
              className={SURVEY_STYLES.input}
              value={designSpeed}
              onChange={(e) => setDesignSpeed(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={SURVEY_STYLES.label}>
              Max eRate (eMax)
            </label>
            <select
              className={SURVEY_STYLES.select}
              value={eMax}
              onChange={(e) => setEMax(Number(e.target.value))}
            >
              <option value={0.04}>4.0% (Urban standard)</option>
              <option value={0.06}>6.0% (Standard Highway)</option>
              <option value={0.08}>8.0% (Rural steep standard)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={SURVEY_STYLES.label}>
              Normal Lane Crown Slope
            </label>
            <Input
              type="number"
              step="0.005"
              className={SURVEY_STYLES.input}
              value={normalCrown}
              onChange={(e) => setNormalCrown(Number(e.target.value))}
            />
          </div>

          <div className="mt-auto pt-4">
            <Button
              onClick={handleSave}
              className={SURVEY_STYLES.btnPrimary + " w-full gap-1.5"}
            >
              <Sparkles className="h-3.5 w-3.5" /> Apply to Alignment
            </Button>
          </div>
        </div>

        {/* Table & Chart Columns */}
        <div className="col-span-2 flex flex-col gap-4">
          {superCurve && (
            <>
              <div className="max-h-[220px] flex-1 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2">
                <h4 className="mb-2 text-[10px] font-semibold text-muted-foreground uppercase">
                  Calculated Attainment Stations
                </h4>
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border/60 font-medium text-muted-foreground">
                      <th className="pb-1">Station</th>
                      <th className="pb-1">Left Slope</th>
                      <th className="pb-1">Right Slope</th>
                      <th className="pb-1">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {_.map(superCurve.transitionStations, (st, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/30 hover:bg-muted/10"
                      >
                        <td className="py-1 font-mono text-primary">
                          {st.station.toFixed(2)}
                        </td>
                        <td className="py-1">
                          {(st.leftOuterSlope * 100).toFixed(1)}%
                        </td>
                        <td className="py-1">
                          {(st.rightOuterSlope * 100).toFixed(1)}%
                        </td>
                        <td className="py-1 font-medium text-muted-foreground">
                          {st.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Transition Slope Graph Visualizer */}
              <div className="rounded border border-border/60 bg-muted/10 p-3">
                <h4 className="mb-2 flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase">
                  <span>Transition Runoff Graphic</span>
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] text-primary-foreground/70">
                    eMax: {(eMax * 100).toFixed(0)}%
                  </span>
                </h4>

                <svg
                  viewBox="0 0 500 120"
                  className="h-[120px] w-full rounded border border-border/40 bg-background"
                >
                  <line
                    x1="0"
                    y1="60"
                    x2="500"
                    y2="60"
                    stroke="#475569"
                    strokeWidth="0.75"
                    strokeDasharray="3"
                  />

                  {/* Left and Right Lane slope lines */}
                  <polyline
                    points={_.map(superCurve.transitionStations, (st, i) => {
                      const x =
                        (i / (superCurve.transitionStations.length - 1)) *
                        500;
                      const y = 60 - st.leftOuterSlope * 400;
                      return `${x},${y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                  <polyline
                    points={_.map(superCurve.transitionStations, (st, i) => {
                      const x =
                        (i / (superCurve.transitionStations.length - 1)) *
                        500;
                      const y = 60 - st.rightOuterSlope * 400;
                      return `${x},${y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4"
                  />

                  {/* Legend */}
                  <g
                    transform="translate(10, 10)"
                    className="fill-muted-foreground text-[8px]"
                  >
                    <rect
                      width="130"
                      height="25"
                      fill="black"
                      fillOpacity="0.4"
                      rx="2"
                    />
                    <line
                      x1="5"
                      y1="8"
                      x2="20"
                      y2="8"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    <text x="25" y="11" className="fill-blue-400 font-medium">
                      Left Pavement Edge
                    </text>
                    <line
                      x1="5"
                      y1="18"
                      x2="20"
                      y2="18"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="2"
                    />
                    <text
                      x="25"
                      y="21"
                      className="fill-amber-400 font-medium"
                    >
                      Right Pavement Edge
                    </text>
                  </g>
                </svg>
              </div>
            </>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
