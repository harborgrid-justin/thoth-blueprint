import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useErosionSimulatorState } from "./hooks/useErosionSimulatorState";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

export function ErosionSimulatorPanel() {
  const {
    site,
    frames,
    frame,
    maxStep,
    activeStep,
    isPlaying,
    speed,
    setSpeed,
    soilType,
    setSoilType,
    handleScrub,
    togglePlay,
    handleReset,
    stepForward,
    stepBackward,
    compliance,
  } = useErosionSimulatorState();

  if (!site || frames.length === 0 || !frame || !compliance) {
    return (
      <div className={WORKSPACE_STYLES.textMuted + " p-3 text-xs text-center"}>
        Initialize a site layout to begin erosion simulation.
      </div>
    );
  }

  const { highSoilLoss, barrierOverflow, complies } = compliance;

  return (
    <div className="flex flex-col gap-4 p-3 text-xs">
      {/* 1. Main Playback Controls */}
      <div className={WORKSPACE_STYLES.cardSubtle + " flex flex-col gap-3"}>
        <h4 className={WORKSPACE_STYLES.cardHeader}>
          Simulation Timeline Playback
        </h4>

        {/* Timeline Slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            T+{activeStep}s
          </span>
          <input
            type="range"
            min={0}
            max={maxStep}
            value={activeStep}
            onChange={handleScrub}
            className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-[10px] font-mono text-muted-foreground">
            T+{maxStep}s
          </span>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={stepBackward}
              disabled={activeStep === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={isPlaying ? "default" : "outline"}
              className="h-7 w-7 bg-primary text-primary-foreground"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={stepForward}
              disabled={activeStep === maxStep}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Soil Type and Speed settings */}
          <div className="flex gap-1">
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as any)}
              className={WORKSPACE_STYLES.select + " text-[10px] py-0.5 px-2"}
            >
              <option value="loam">Loam Soil</option>
              <option value="sand">Sandy Soil</option>
              <option value="clay">Clayey Soil</option>
              <option value="silt">Silty Soil</option>
            </select>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className={WORKSPACE_STYLES.select + " text-[10px] py-0.5 px-2"}
            >
              <option value={200}>0.5x</option>
              <option value={100}>1.0x</option>
              <option value={50}>2.0x</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Real-time Simulation Statistics */}
      <div className={WORKSPACE_STYLES.cardSubtle + " flex flex-col gap-3"}>
        <h4 className={WORKSPACE_STYLES.cardHeader}>
          Soil Runoff &amp; Hydrology metrics
        </h4>
        <div className={WORKSPACE_STYLES.grid2Col}>
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <span className={WORKSPACE_STYLES.statLabel + " block"}>
              Cum. Soil Runoff Loss
            </span>
            <span className="text-sm font-bold font-mono text-rose-400">
              {frame.totalSoilLostKg.toFixed(1)} kg
            </span>
          </div>
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <span className={WORKSPACE_STYLES.statLabel + " block"}>
              Total Water Volume
            </span>
            <span className="text-sm font-bold font-mono text-cyan-400">
              {frame.totalWaterRunoffLiters.toFixed(0)} L
            </span>
          </div>
        </div>
      </div>

      {/* 3. Erosion Control Barriers Capacity (Silt Fences & Straw Bales) */}
      <div className={WORKSPACE_STYLES.cardSubtle + " flex flex-col gap-2"}>
        <h4 className={WORKSPACE_STYLES.cardHeader}>
          Mitigation Barriers Load
        </h4>
        {frame.barrierStats.length === 0 ? (
          <div className="text-[10px] text-muted-foreground/80 py-1 text-center">
            No active silt fences or erosion bales drafted in the current
            design.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {frame.barrierStats.map((stat) => (
              <div key={stat.id} className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-medium text-foreground">
                  <span>{stat.name}</span>
                  <span className="font-mono">
                    {(stat.loadRatio * 100).toFixed(0)}% Cap
                  </span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-150",
                      stat.loadRatio > 0.8
                        ? "bg-rose-500"
                        : stat.loadRatio > 0.5
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                    style={{ width: `${stat.loadRatio * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground text-right font-mono">
                  {stat.sedimentTrappedKg.toFixed(1)} kg trapped
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. EPA BMP Environmental Compliance Check */}
      <div className={WORKSPACE_STYLES.cardSubtle}>
        <h4 className={WORKSPACE_STYLES.cardHeader + " mb-2"}>
          EPA Stormwater Compliance Audit
        </h4>
        {complies ? (
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 flex items-start gap-2 text-emerald-500">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[10px]">BMP Standards Met</p>
              <p className="text-[9px] text-emerald-500/80 mt-0.5">
                Runoff sediment levels are inside limits. Silt barriers have
                sufficient retention capacity.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2 flex items-start gap-2 text-rose-500">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[10px]">
                Stormwater Runoff Warning
              </p>
              <ul className="list-disc pl-3 text-[9px] text-rose-500/80 mt-0.5 space-y-0.5">
                {highSoilLoss && (
                  <li>
                    Cumulative soil loss exceeds limits (max 50kg per shower).
                  </li>
                )}
                {barrierOverflow && (
                  <li>
                    Silt fence / barrier load is exceeding 90% capacity, risk of
                    breakout.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
