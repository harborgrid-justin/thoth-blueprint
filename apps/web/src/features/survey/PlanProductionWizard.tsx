import * as React from "react";
import _ from "lodash";
import { Layout, FileText, ChevronRight, HelpCircle } from "lucide-react";
import {
  resolveAlignment,
  generateViewFrames,
  createSheetSetFromFrames,
} from "@thoth/domain";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export function PlanProductionWizard() {
  const open = useUiStore((s) => s.productionOpen);
  const setOpen = useUiStore((s) => s.setProductionOpen);
  const site = useWorkspaceStore((s) => s.site);

  const alignments = site?.alignments ?? [];
  const [selectedAlignId, setSelectedAlignId] = React.useState<string | null>(null);
  
  // Sheet Templates options
  const [pageSize, setPageSize] = React.useState<string>("ARCH_D"); // 24x36
  const [overlap, setOverlap] = React.useState<number>(15); // 15% overlap
  const [scale, setScale] = React.useState<string>("1:500");

  const [generatedFrames, setGeneratedFrames] = React.useState<any[]>([]);
  const [generatedMatches, setGeneratedMatches] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (open && alignments.length > 0) {
      setSelectedAlignId(alignments[0].id);
    }
  }, [open, alignments]);

  if (!site) {return null;}
  const alignment = _.find(alignments, (a) => a.id === selectedAlignId) ?? alignments[0] ?? null;

  function handleSplit() {
    if (!alignment || !site) {return;}
    const resolved = resolveAlignment(alignment);
    if (!resolved) {return;}

    // Standard ARCH D viewport dimensions in inches: w=30in, h=18in
    const w = 30;
    const h = 18;

    const vfg = generateViewFrames(
      resolved,
      alignment.id,
      scale,
      w,
      h,
      site.spatial.units,
      overlap / 100
    );

    setGeneratedFrames(vfg.frames);
    setGeneratedMatches(vfg.matchLines);

    // Dynamic store update to render frames on canvas
    if (useWorkspaceStore.getState().setViewFrames) {
      useWorkspaceStore.getState().setViewFrames(vfg.frames, vfg.matchLines);
    }
  }

  function handleCreateSheets() {
    if (!alignment || generatedFrames.length === 0 || !site) {return;}
    const resolved = resolveAlignment(alignment);
    if (!resolved) {return;}

    const w = 30;
    const h = 18;
    const vfg = generateViewFrames(resolved, alignment.id, scale, w, h, site.spatial.units, overlap / 100);
    const set = createSheetSetFromFrames(vfg, `Sheet Set - ${alignment.name}`);

    // Update drawing sets list in the store
    if (useWorkspaceStore.getState().addDrawingSet) {
      useWorkspaceStore.getState().addDrawingSet(set);
    }
    
    // Switch to sheet set composer tab
    useUiStore.getState().setProductionOpen(false);
    useUiStore.getState().setSheetSetOpen(true);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" /> Plan Production Sheet Set Wizard
          </DialogTitle>
          <DialogDescription>
            Segment horizontal baselines into print-ready page layouts using View Frames and boundary Match Lines.
          </DialogDescription>
        </DialogHeader>

        {alignments.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No alignments found. Please create an alignment baseline first.
          </div>
        ) : (
          <div className="grid grid-cols-[280px_1fr] gap-6">
            {/* Left Options panel */}
            <div className="flex flex-col gap-4 border-r border-border pr-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Select Alignment
                </label>
                <div className="flex flex-col gap-1">
                  {_.map(alignments, (a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAlignId(a.id);
                        setGeneratedFrames([]);
                        setGeneratedMatches([]);
                      }}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        a.id === selectedAlignId ? "bg-primary/15 text-primary font-medium" : "hover:bg-accent text-muted-foreground"
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Sheet Size Template (DWT)
                </label>
                <select
                  className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                >
                  <option value="ARCH_D">ARCH D Layout (24" x 36")</option>
                  <option value="ARCH_E1">ARCH E1 Layout (30" x 42")</option>
                  <option value="ISO_A1">ISO A1 Layout (594mm x 841mm)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Plot Scale
                  </label>
                  <select
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                  >
                    <option value="1:250">1" = 20' (1:240)</option>
                    <option value="1:500">1" = 40' (1:480)</option>
                    <option value="1:1000">1" = 80' (1:960)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Frame Overlap
                  </label>
                  <select
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    value={overlap}
                    onChange={(e) => setOverlap(parseInt(e.target.value))}
                  >
                    <option value="10">10% Overlap</option>
                    <option value="15">15% Overlap</option>
                    <option value="20">20% Overlap</option>
                  </select>
                </div>
              </div>

              <Button className="mt-2 w-full text-xs" onClick={handleSplit}>
                Calculate View Frames
              </Button>
            </div>

            {/* Right Results list */}
            <div className="flex flex-col gap-4 min-w-0">
              <ScrollArea className="max-h-[220px] rounded-md border border-border bg-card p-2 text-xs">
                {generatedFrames.length === 0 ? (
                  <div className="flex h-[150px] items-center justify-center text-muted-foreground text-center">
                    No layout frames calculated. Select options and click "Calculate View Frames" to run sheet segmentation.
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Generated Layout Pages List ({generatedFrames.length} Sheets)
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      {_.map(generatedFrames, (f) => (
                        <div key={f.id} className="flex items-center justify-between border-b border-border/40 pb-1.5">
                          <span className="flex items-center gap-1.5 text-foreground font-medium">
                            <FileText className="h-4 w-4 text-primary" /> {f.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Center: ({f.center.x.toFixed(0)}, {f.center.y.toFixed(0)}) | Scale: {scale}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              {generatedFrames.length > 0 && (
                <div className="flex flex-col gap-3 rounded-md border border-border bg-slate-950/20 p-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      Calculated {generatedMatches.length} Match Lines boundaries along the baseline centerline.
                    </span>
                    <Button size="sm" onClick={handleCreateSheets} className="gap-1 text-xs">
                      Create Sheets Set <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed flex gap-2">
                    <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
                    <span>
                      Creating the Sheet Set will generate a collection of layouts matching the US National CAD Standard sequence. The view frames will render as rectangular overlays on the planning workspace canvas.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
