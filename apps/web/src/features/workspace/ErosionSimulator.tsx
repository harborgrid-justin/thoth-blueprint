import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useErosionSimulatorState } from "./hooks/useErosionSimulatorState";

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
      <div className="p-3 text-xs text-muted-foreground text-center">
        Initialize a site layout to begin erosion simulation.
      </div>
    );
  }

  const { highSoilLoss, barrierOverflow, complies } = compliance;

  return (
    <div className="flex flex-col gap-4 p-3 text-xs">
      {/* 1. Main Playback Controls */}
      <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-3">
        <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
          Simulation Timeline Playback
        </h4>

        {/* Timeline Slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">T+{activeStep}s</span>
          <input
            type="range"
            min={0}
            max={maxStep}
            value={activeStep}
            onChange={handleScrub}
            className="flex-1 h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-[10px] font-mono text-muted-foreground">T+{maxStep}s</span>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={stepBackward} disabled={activeStep === 0}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant={isPlaying ? "default" : "outline"} className="h-7 w-7 bg-primary text-primary-foreground" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={stepForward} disabled={activeStep === maxStep}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Soil Type and Speed settings */}
          <div className="flex gap-1">
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as any)}
              className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="loam">Loam Soil</option>
              <option value="sand">Sandy Soil</option>
              <option value="clay">Clayey Soil</option>
              <option value="silt">Silty Soil</option>
            </select>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value={200}>0.5x</option>
              <option value={100}>1.0x</option>
              <option value={50}>2.0x</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Real-time Simulation Statistics */}
      <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-3">
        <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
          Soil Runoff &amp; Hydrology metrics
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border/40 rounded p-2 bg-background/50">
            <span className="text-[10px] text-muted-foreground block">Cum. Soil Runoff Loss</span>
            <span className="text-sm font-bold font-mono text-rose-500">{frame.totalSoilLostKg.toFixed(1)} kg</span>
          </div>
          <div className="border border-border/40 rounded p-2 bg-background/50">
            <span className="text-[10px] text-muted-foreground block">Total Water Volume</span>
            <span className="text-sm font-bold font-mono text-blue-500">{frame.totalWaterRunoffLiters.toFixed(0)} L</span>
          </div>
        </div>
      </div>

      {/* 3. Erosion Control Barriers Capacity (Silt Fences & Straw Bales) */}
      <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-2">
        <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
          Mitigation Barriers Load
        </h4>
        {frame.barrierStats.length === 0 ? (
          <div className="text-[10px] text-muted-foreground/80 py-1 text-center">
            No active silt fences or erosion bales drafted in the current design.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {frame.barrierStats.map((stat) => (
              <div key={stat.id} className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-medium text-foreground">
                  <span>{stat.name}</span>
                  <span className="font-mono">{(stat.loadRatio * 100).toFixed(0)}% Cap</span>
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
      <div className="rounded-md border border-border bg-card p-3">
        <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-2">
          EPA Stormwater Compliance Audit
        </h4>
        {complies ? (
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 flex items-start gap-2 text-emerald-500">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[10px]">BMP Standards Met</p>
              <p className="text-[9px] text-emerald-500/80 mt-0.5">
                Runoff sediment levels are inside limits. Silt barriers have sufficient retention capacity.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2 flex items-start gap-2 text-rose-500">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[10px]">Stormwater Runoff Warning</p>
              <ul className="list-disc pl-3 text-[9px] text-rose-500/80 mt-0.5 space-y-0.5">
                {highSoilLoss && <li>Cumulative soil loss exceeds limits (max 50kg per shower).</li>}
                {barrierOverflow && <li>Silt fence / barrier load is exceeding 90% capacity, risk of breakout.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
