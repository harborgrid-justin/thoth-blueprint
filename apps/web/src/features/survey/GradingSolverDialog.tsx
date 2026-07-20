import * as React from "react";
import { Mountain, Flame, Compass, Calculator } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
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
import {
  type GradingPad,
  calculateGradingVolumes,
  solveBalancedElevation,
} from "@thoth/domain";
import { buildTerrainModel } from "@/features/terrain/terrainModel";

export function GradingSolverDialog() {
  const open = useUiStore((s) => s.gradingOpen);
  const setOpen = useUiStore((s) => s.setGradingOpen);
  const site = useWorkspaceStore((s) => s.site);

  const terrain = React.useMemo(() => (site ? buildTerrainModel(site) : null), [site]);
  const terrainSurface = terrain?.existing ?? null;

  // Local Grading Pad state
  const [cutSlope, setCutSlope] = React.useState<number>(2);
  const [fillSlope, setFillSlope] = React.useState<number>(3);
  const [targetVolume, setTargetVolume] = React.useState<number>(0);
  
  const [padElevation, setPadElevation] = React.useState<number>(15.5);
  const [solving, setSolving] = React.useState<boolean>(false);
  const [volumes, setVolumes] = React.useState<any | null>(null);

  const gradingPad: GradingPad = React.useMemo(() => {
    return {
      id: "pad-1",
      name: "Building Lot Grading Pad",
      points: [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 250 },
        { x: 100, y: 250 },
      ],
      targetElevation: padElevation,
      cutSlope,
      fillSlope,
    };
  }, [padElevation, cutSlope, fillSlope]);

  // Compute volumes on load or elevation change
  React.useEffect(() => {
    if (open && terrainSurface) {
      const report = calculateGradingVolumes(gradingPad, padElevation, terrainSurface, 10);
      setVolumes(report);
    }
  }, [open, padElevation, gradingPad, terrainSurface]);

  if (!site) {return null;}

  function runBalanceSolver() {
    if (!terrainSurface) {return;}
    setSolving(true);
    setTimeout(() => {
      const balancedElev = solveBalancedElevation(gradingPad, terrainSurface, targetVolume, 5);
      setPadElevation(Number(balancedElev.toFixed(2)));
      setSolving(false);
    }, 800);
  }

  function handleSave() {
    // Save pad target elevation back to workspace elements if found
    const matchingPad = site?.elements.find((e) => e.kind === "parcel") ?? site?.elements[0];
    if (matchingPad) {
      const patch = {
        ...matchingPad,
        properties: {
          ...(matchingPad as any).properties,
          elevation: padElevation,
          cutSlope,
          fillSlope,
        }
      };
      useWorkspaceStore.getState().updateElement(matchingPad.id, patch);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl bg-card border border-border/80 text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <Mountain className="h-5 w-5 text-primary" /> Earthworks Volume Balance Solver
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Analyze grading group criteria and solve for balanced elevations to achieve zero net-volume site footprints.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 my-2">
          {/* Inputs Panel */}
          <div className="flex flex-col gap-4 border-r border-border/40 pr-6">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Compass className="h-4 w-4" /> Slope Criteria
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground font-medium">Cut Slope (Horizontal:1)</label>
              <Input
                type="number"
                className="h-8 text-xs bg-background"
                value={cutSlope}
                onChange={(e) => setCutSlope(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground font-medium">Fill Slope (Horizontal:1)</label>
              <Input
                type="number"
                className="h-8 text-xs bg-background"
                value={fillSlope}
                onChange={(e) => setFillSlope(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground font-medium">Target Net Volume (CY)</label>
              <Input
                type="number"
                className="h-8 text-xs bg-background"
                value={targetVolume}
                onChange={(e) => setTargetVolume(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground font-medium">Pad Elevation (ft)</label>
              <Input
                type="number"
                step="0.1"
                className="h-8 text-xs bg-background"
                value={padElevation}
                onChange={(e) => setPadElevation(Number(e.target.value))}
              />
            </div>

            <Button
              onClick={runBalanceSolver}
              disabled={solving}
              className="mt-2 text-xs bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 flex items-center gap-1.5"
            >
              <Calculator className="h-3.5 w-3.5" /> {solving ? "Solving..." : "Run Balance Solver"}
            </Button>

            <Button onClick={handleSave} className="text-xs bg-primary text-primary-foreground font-semibold">
              Save Pad Settings
            </Button>
          </div>

          {/* Results Visualizer Panel */}
          <div className="col-span-2 flex flex-col gap-4">
            {volumes && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded border border-border/50 bg-muted/10 p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Cut Volume</span>
                  <span className="text-xl font-bold text-rose-500 mt-1 font-mono">{volumes.cutVolume.toFixed(1)} <span className="text-xs">CY</span></span>
                </div>
                <div className="rounded border border-border/50 bg-muted/10 p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Fill Volume</span>
                  <span className="text-xl font-bold text-amber-500 mt-1 font-mono">{volumes.fillVolume.toFixed(1)} <span className="text-xs">CY</span></span>
                </div>
                <div className="rounded border border-border/50 bg-muted/10 p-3 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Net Volume</span>
                  <span className={cn("text-xl font-bold mt-1 font-mono", volumes.netVolume >= 0 ? "text-emerald-500" : "text-rose-400")}>
                    {volumes.netVolume >= 0 ? "+" : ""}{volumes.netVolume.toFixed(1)} <span className="text-xs">CY</span>
                  </span>
                </div>
              </div>
            )}

            {/* Earthworks Visual Graphic */}
            <div className="border border-border/60 rounded p-4 bg-muted/10 flex-1 flex flex-col justify-between">
              <h4 className="font-semibold text-muted-foreground text-[10px] uppercase">Grading Daylight Sections Sketch</h4>
              
              <svg viewBox="0 0 500 120" className="w-full h-[120px] bg-background rounded border border-border/40 mt-2">
                <line x1="0" y1="80" x2="500" y2="80" stroke="#334155" strokeWidth="0.5" />
                
                {/* Simulated existing surface line */}
                <path d="M 0 90 Q 150 40 250 80 T 500 70" fill="none" stroke="#6b7280" strokeWidth="1" strokeDasharray="3" />

                {/* Daylight Fill & Cut Slopes */}
                <path
                  d={`M 80 80 L 150 ${80 - (padElevation - 10) * 8} L 350 ${80 - (padElevation - 10) * 8} L 420 80`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />

                <g transform="translate(160, 20)" className="text-[9px] fill-muted-foreground font-medium">
                  <text>Proposed Level Pad: {padElevation} ft</text>
                </g>
              </svg>

              <div className="text-[11px] text-muted-foreground leading-relaxed mt-2 flex items-start gap-1">
                <Flame className="h-4 w-4 text-primary shrink-0" />
                <span>The balance solver automatically increments or decrements the pad Z-elevation to equate total excavation volumes to filling structures.</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
