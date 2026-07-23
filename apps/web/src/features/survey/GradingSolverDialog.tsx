import { Mountain, Flame, Compass, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGradingSolverState } from "./hooks/useGradingSolverState";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

export function GradingSolverDialog() {
  const {
    open,
    setOpen,
    site,
    cutSlope,
    setCutSlope,
    fillSlope,
    setFillSlope,
    targetVolume,
    setTargetVolume,
    padElevation,
    setPadElevation,
    solving,
    volumes,
    runBalanceSolver,
    handleSave,
  } = useGradingSolverState();

  if (!site) {
    return null;
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={setOpen}
      title="Earthworks Volume Balance Solver"
      description="Analyze grading group criteria and solve for balanced elevations to achieve zero net-volume site footprints."
      icon={<Mountain className="h-5 w-5 text-amber-400" />}
      maxWidthClass="max-w-4xl"
    >
      <div className={SURVEY_STYLES.grid3Col + " my-2"}>
        {/* Inputs Panel */}
        <div className="flex flex-col gap-4 border-r border-border pr-6">
          <h3 className={SURVEY_STYLES.label + " flex items-center gap-1 text-amber-400"}>
            <Compass className="h-4 w-4" /> Slope Criteria
          </h3>

          <div className="flex flex-col gap-1">
            <label className={SURVEY_STYLES.label}>
              Cut Slope Ratio (H:V)
            </label>
            <Input
              type="number"
              value={cutSlope}
              onChange={(e) => setCutSlope(parseFloat(e.target.value) || 0)}
              className={SURVEY_STYLES.input}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={SURVEY_STYLES.label}>
              Fill Slope Ratio (H:V)
            </label>
            <Input
              type="number"
              value={fillSlope}
              onChange={(e) => setFillSlope(parseFloat(e.target.value) || 0)}
              className={SURVEY_STYLES.input}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={SURVEY_STYLES.label}>
              Target Net Balance (Cu. Yd.)
            </label>
            <Input
              type="number"
              value={targetVolume}
              onChange={(e) =>
                setTargetVolume(parseFloat(e.target.value) || 0)
              }
              className={SURVEY_STYLES.input}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className={SURVEY_STYLES.label}>
              Target Pad Elevation (ft)
            </label>
            <Input
              type="number"
              step="0.5"
              value={padElevation}
              onChange={(e) => setPadElevation(parseFloat(e.target.value) || 0)}
              className={SURVEY_STYLES.input}
            />
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <Button
              onClick={runBalanceSolver}
              disabled={solving}
              className={SURVEY_STYLES.btnPrimary}
            >
              <Calculator className="mr-2 h-4 w-4" />
              {solving ? "Iterating Elevation..." : "Solve Net Zero Elev"}
            </Button>
            <Button
              onClick={handleSave}
              variant="outline"
              className={SURVEY_STYLES.btnSecondary}
            >
              Apply Elevation to Site
            </Button>
          </div>
        </div>

        {/* Results / Cross Section Viz */}
        <div className="col-span-2 flex flex-col gap-4 pl-2">
          <div className={SURVEY_STYLES.grid2Col}>
            <div className={SURVEY_STYLES.cardSubtle}>
              <span className={SURVEY_STYLES.statLabel}>
                Target Pad Z-Elevation
              </span>
              <div className="font-mono text-xl font-bold text-amber-400">
                {padElevation.toFixed(2)} ft
              </div>
            </div>
            <div className={SURVEY_STYLES.cardSubtle}>
              <span className={SURVEY_STYLES.statLabel}>
                Net Difference Volume
              </span>
              <div
                className={cn(
                  "font-mono text-xl font-bold",
                  volumes.net > 0 ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {volumes.net.toFixed(1)} yd³
              </div>
            </div>
          </div>

          <div className={SURVEY_STYLES.card + " flex flex-col gap-2 p-3"}>
            <span className={SURVEY_STYLES.label}>
              Simplified Daylight Profile Preview
            </span>
            <svg
              className="h-32 w-full rounded border border-border/40 bg-slate-950/80"
              viewBox="0 0 500 120"
            >
              {/* Reference Grid */}
              <line
                x1="0"
                y1="80"
                x2="500"
                y2="80"
                stroke="#334155"
                strokeWidth="0.5"
              />

              {/* Simulated existing surface line */}
              <path
                d="M 0 90 Q 150 40 250 80 T 500 70"
                fill="none"
                stroke="#6b7280"
                strokeWidth="1"
                strokeDasharray="3"
              />

              {/* Daylight Fill & Cut Slopes */}
              <path
                d={`M 80 80 L 150 ${80 - (padElevation - 10) * 8} L 350 ${80 - (padElevation - 10) * 8} L 420 80`}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
              />

              <g
                transform="translate(160, 20)"
                className="fill-slate-400 text-[9px] font-medium"
              >
                <text>Proposed Level Pad: {padElevation} ft</text>
              </g>
            </svg>

            <div className={SURVEY_STYLES.textMuted + " mt-2 flex items-start gap-1"}>
              <Flame className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                The balance solver automatically increments or decrements the
                pad Z-elevation to equate total excavation volumes to filling
                structures.
              </span>
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
