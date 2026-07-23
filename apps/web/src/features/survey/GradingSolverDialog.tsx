import { Mountain, Flame, Compass, Calculator } from "lucide-react";
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl bg-background border-border text-foreground animate-dialog-in">
        <DialogHeader>
          <DialogTitle className={SURVEY_STYLES.dialogTitle}>
            <Mountain className="h-5 w-5 text-amber-400" /> Earthworks Volume
            Balance Solver
          </DialogTitle>
          <DialogDescription>
            Analyze grading group criteria and solve for balanced elevations to
            achieve zero net-volume site footprints.
          </DialogDescription>
        </DialogHeader>

        <div className={SURVEY_STYLES.grid3Col + " my-2"}>
          {/* Inputs Panel */}
          <div className="flex flex-col gap-4 border-r border-border pr-6">
            <h3 className={SURVEY_STYLES.label + " flex items-center gap-1 text-amber-400"}>
              <Compass className="h-4 w-4" /> Slope Criteria
            </h3>

            <div className="flex flex-col gap-1">
              <label className={SURVEY_STYLES.label}>
                Cut Slope (Horizontal:1)
              </label>
              <Input
                type="number"
                className={SURVEY_STYLES.input}
                value={cutSlope}
                onChange={(e) => setCutSlope(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={SURVEY_STYLES.label}>
                Fill Slope (Horizontal:1)
              </label>
              <Input
                type="number"
                className={SURVEY_STYLES.input}
                value={fillSlope}
                onChange={(e) => setFillSlope(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={SURVEY_STYLES.label}>
                Target Net Volume (CY)
              </label>
              <Input
                type="number"
                className={SURVEY_STYLES.input}
                value={targetVolume}
                onChange={(e) => setTargetVolume(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={SURVEY_STYLES.label}>
                Pad Elevation (ft)
              </label>
              <Input
                type="number"
                step="0.1"
                className={SURVEY_STYLES.input}
                value={padElevation}
                onChange={(e) => setPadElevation(Number(e.target.value))}
              />
            </div>

            <Button
              variant="secondary"
              onClick={runBalanceSolver}
              disabled={solving}
              className={SURVEY_STYLES.btnSecondary + " mt-2"}
            >
              <Calculator className="h-3.5 w-3.5 mr-1" />{" "}
              {solving ? "Solving..." : "Run Balance Solver"}
            </Button>

            <Button
              onClick={handleSave}
              className={SURVEY_STYLES.btnPrimary}
            >
              Save Pad Settings
            </Button>
          </div>

          {/* Results Visualizer Panel */}
          <div className="col-span-2 flex flex-col gap-4">
            {volumes && (
              <div className="grid grid-cols-3 gap-3">
                <div className={SURVEY_STYLES.cardSubtle + " flex flex-col items-center justify-center"}>
                  <span className={SURVEY_STYLES.statLabel}>
                    Cut Volume
                  </span>
                  <span className="text-xl font-bold text-rose-500 mt-1 font-mono">
                    {volumes.cutVolume.toFixed(1)}{" "}
                    <span className="text-xs">CY</span>
                  </span>
                </div>
                <div className={SURVEY_STYLES.cardSubtle + " flex flex-col items-center justify-center"}>
                  <span className={SURVEY_STYLES.statLabel}>
                    Fill Volume
                  </span>
                  <span className="text-xl font-bold text-amber-500 mt-1 font-mono">
                    {volumes.fillVolume.toFixed(1)}{" "}
                    <span className="text-xs">CY</span>
                  </span>
                </div>
                <div className={SURVEY_STYLES.cardSubtle + " flex flex-col items-center justify-center"}>
                  <span className={SURVEY_STYLES.statLabel}>
                    Net Volume
                  </span>
                  <span
                    className={cn(
                      "text-xl font-bold mt-1 font-mono",
                      volumes.netVolume >= 0
                        ? "text-emerald-500"
                        : "text-rose-400",
                    )}
                  >
                    {volumes.netVolume >= 0 ? "+" : ""}
                    {volumes.netVolume.toFixed(1)}{" "}
                    <span className="text-xs">CY</span>
                  </span>
                </div>
              </div>
            )}

            {/* Earthworks Visual Graphic */}
            <div className={SURVEY_STYLES.card + " flex-1 flex flex-col justify-between"}>
              <h4 className={SURVEY_STYLES.label}>
                Grading Daylight Sections Sketch
              </h4>

              <svg
                viewBox="0 0 500 120"
                className="w-full h-[120px] bg-background rounded border border-border mt-2"
              >
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
                  className="text-[9px] fill-slate-400 font-medium"
                >
                  <text>Proposed Level Pad: {padElevation} ft</text>
                </g>
              </svg>

              <div className={SURVEY_STYLES.textMuted + " mt-2 flex items-start gap-1"}>
                <Flame className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  The balance solver automatically increments or decrements the
                  pad Z-elevation to equate total excavation volumes to filling
                  structures.
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
