import * as React from "react";
import { HardHat, Compass, Link2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
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
  type Assembly,
  getDefaultSubassemblies,
  resolveAssemblyOffset,
  buildCorridorSections,
  extractCorridorFeatureLines,
} from "@thoth/domain";

export function CorridorDesignerDialog() {
  const open = useUiStore((s) => s.corridorOpen);
  const setOpen = useUiStore((s) => s.setCorridorOpen);
  const site = useWorkspaceStore((s) => s.site);

  const alignments = site?.alignments ?? [];
  const [selectedAlignId, setSelectedAlignId] = React.useState<string | null>(null);

  // Profile references
  const [profiles] = React.useState<any[]>([
    { id: "prof-1", name: "Design Profile 1", pvis: [{ station: 0, elevation: 12 }, { station: 400, elevation: 22 }, { station: 800, elevation: 15 }] }
  ]);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>("prof-1");

  // Local Assembly layout state
  const [assembly] = React.useState<Assembly>({
    id: "assembly-main",
    name: "Primary Highway 2-Lane",
    leftSubassemblies: getDefaultSubassemblies("left"),
    rightSubassemblies: getDefaultSubassemblies("right"),
  });

  const [frequency, setFrequency] = React.useState<number>(50); // station frequency

  React.useEffect(() => {
    if (open && alignments.length > 0) {
      setSelectedAlignId(alignments[0].id);
    }
  }, [open, alignments]);

  if (!site) return null;

  const alignment = alignments.find((a) => a.id === selectedAlignId) ?? alignments[0] ?? null;
  const profile = profiles.find((p) => p.id === selectedProfileId) ?? profiles[0] ?? null;

  // Resolve current assembly profile outline coordinates
  const offsetPoints = React.useMemo(() => {
    return resolveAssemblyOffset(assembly, -0.02, -0.02);
  }, [assembly]);

  function handleExtrude() {
    if (!alignment || !profile) return;

    // Simulate 3D corridor build
    const corridor = {
      id: "cor-1",
      name: `Corridor - ${alignment.name}`,
      alignmentId: alignment.id,
      profileId: profile.id,
      assemblyId: assembly.id,
      frequency,
    };

    // Calculate corridor cross sections
    const sections = buildCorridorSections(corridor, alignment, profile, assembly);
    const featureLines = extractCorridorFeatureLines(sections);

    // Save feature lines as spatial elements inside the store
    const newElements = featureLines.map((fl) => ({
      id: `fl-${fl.code}`,
      kind: "corridor" as any,
      layerId: "c-road",
      name: `${fl.code} Feature Line`,
      boundary: fl.points.map((p) => ({ x: p.x, y: p.y })),
      properties: { code: fl.code, points3D: fl.points },
    }));

    if (useWorkspaceStore.getState().addElements) {
      useWorkspaceStore.getState().addElements(newElements as any);
    }

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl bg-card border border-border/80 text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <HardHat className="h-5 w-5 text-primary" /> Corridor Assembly Designer
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Interlock alignments, design profiles, and custom lane templates to model and generate 3D roadway corridors.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 my-2">
          {/* Settings inputs */}
          <div className="flex flex-col gap-4 border-r border-border/40 pr-6">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Compass className="h-4 w-4" /> Baseline References
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground font-medium">Horizontal Alignment</label>
              <select
                className="bg-background border border-border/60 rounded px-2.5 py-1.5 text-xs"
                value={selectedAlignId ?? ""}
                onChange={(e) => setSelectedAlignId(e.target.value)}
              >
                {alignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground font-medium">Vertical Profile</label>
              <select
                className="bg-background border border-border/60 rounded px-2.5 py-1.5 text-xs"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted-foreground font-medium">Corridor Stations Frequency</label>
              <Input
                type="number"
                className="h-8 text-xs bg-background"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
              />
            </div>

            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1 mt-2">
              <Link2 className="h-4 w-4" /> Assemblies Catalog
            </h3>
            
            <div className="text-[11px] text-muted-foreground leading-relaxed bg-muted/20 rounded p-2.5 border border-border/40">
              <span className="font-semibold text-primary block mb-1">Standard AASHTO Subassemblies</span>
              Tool palette holds Lanes, Curb/Gutter joints, concrete sidewalks, and slope daylights.
            </div>

            <Button onClick={handleExtrude} className="mt-auto text-xs bg-primary text-primary-foreground font-semibold">
              Generate &amp; Build 3D Corridor
            </Button>
          </div>

          {/* Interactive designer layout */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left Side Subassemblies */}
              <div className="rounded border border-border/40 bg-muted/10 p-3">
                <h4 className="font-semibold text-[10px] text-blue-400 uppercase tracking-wider mb-2">Left Side Templates</h4>
                <div className="flex flex-col gap-1.5">
                  {assembly.leftSubassemblies.map((sub) => (
                    <div key={sub.id} className="flex justify-between items-center text-[11px] bg-background border border-border/30 rounded p-1.5 px-2">
                      <span className="font-medium text-foreground">{sub.name}</span>
                      <span className="text-[10px] text-muted-foreground">{sub.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side Subassemblies */}
              <div className="rounded border border-border/40 bg-muted/10 p-3">
                <h4 className="font-semibold text-[10px] text-amber-500 uppercase tracking-wider mb-2">Right Side Templates</h4>
                <div className="flex flex-col gap-1.5">
                  {assembly.rightSubassemblies.map((sub) => (
                    <div key={sub.id} className="flex justify-between items-center text-[11px] bg-background border border-border/30 rounded p-1.5 px-2">
                      <span className="font-medium text-foreground">{sub.name}</span>
                      <span className="text-[10px] text-muted-foreground">{sub.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cross-section Graphic */}
            <div className="border border-border/60 rounded p-3 bg-muted/10">
              <h4 className="font-semibold text-muted-foreground text-[10px] uppercase mb-2">Resolved Assembly Cross-Section (2D Profile View)</h4>
              
              <svg viewBox="0 0 500 120" className="w-full h-[120px] bg-background rounded border border-border/40">
                <line x1="250" y1="0" x2="250" y2="120" stroke="#475569" strokeWidth="0.5" strokeDasharray="3" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="#334155" strokeWidth="0.5" />
                
                {/* Drawn Assembly Points */}
                <polyline
                  points={offsetPoints
                    .map((pt) => {
                      const x = 250 + pt.x * 8;
                      const y = 80 - pt.y * 20;
                      return `${x},${y}`;
                    })
                    .sort((a, b) => Number(a.split(",")[0]) - Number(b.split(",")[0]))
                    .join(" ")}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />

                {/* Nodes markers */}
                {offsetPoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={250 + pt.x * 8}
                    cy={80 - pt.y * 20}
                    r="3.5"
                    className="fill-primary stroke-background stroke-2 hover:r-5 cursor-pointer"
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
