import _ from "lodash";
import { Layout, FileText, ChevronRight, HelpCircle } from "lucide-react";
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
import { usePlanProductionWizardState } from "./hooks/usePlanProductionWizardState";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

export function PlanProductionWizard() {
  const {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    pageSize,
    setPageSize,
    overlap,
    setOverlap,
    scale,
    setScale,
    generatedFrames,
    generatedMatches,
    handleSplit,
    handleCreateSheets,
  } = usePlanProductionWizardState();

  if (!site) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={SURVEY_STYLES.dialogContainer + " max-w-4xl"}>
        <DialogHeader>
          <DialogTitle className={SURVEY_STYLES.dialogTitle}>
            <Layout className="h-5 w-5 text-amber-400" /> Plan Production Sheet
            Set Wizard
          </DialogTitle>
          <DialogDescription className={SURVEY_STYLES.textSubtitle}>
            Segment horizontal baselines into print-ready page layouts using
            View Frames and boundary Match Lines.
          </DialogDescription>
        </DialogHeader>

        {alignments.length === 0 ? (
          <div className={SURVEY_STYLES.cardSubtle + " py-12 text-center text-sm text-muted-foreground"}>
            No alignments found. Please create an alignment baseline first.
          </div>
        ) : (
          <div className={SURVEY_STYLES.layoutSidebar}>
            {/* Left Options panel */}
            <div className={SURVEY_STYLES.sidebar + " text-xs"}>
              <div>
                <label className={SURVEY_STYLES.label}>
                  Select Alignment
                </label>
                <div className="flex flex-col gap-1">
                  {_.map(alignments, (a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAlignId(a.id);
                      }}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        a.id === selectedAlignId
                          ? "bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={SURVEY_STYLES.label}>
                  Sheet Size Template (DWT)
                </label>
                <select
                  className={SURVEY_STYLES.select}
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
                  <label className={SURVEY_STYLES.label}>
                    Plot Scale
                  </label>
                  <select
                    className={SURVEY_STYLES.select}
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                  >
                    <option value="1:250">1" = 20' (1:240)</option>
                    <option value="1:500">1" = 40' (1:480)</option>
                    <option value="1:1000">1" = 80' (1:960)</option>
                  </select>
                </div>
                <div>
                  <label className={SURVEY_STYLES.label}>
                    Frame Overlap
                  </label>
                  <select
                    className={SURVEY_STYLES.select}
                    value={overlap}
                    onChange={(e) => setOverlap(parseInt(e.target.value))}
                  >
                    <option value="10">10% Overlap</option>
                    <option value="15">15% Overlap</option>
                    <option value="20">20% Overlap</option>
                  </select>
                </div>
              </div>

              <Button className={SURVEY_STYLES.btnSecondary + " mt-2 w-full"} onClick={handleSplit}>
                Calculate View Frames
              </Button>
            </div>

            {/* Right Results list */}
            <div className="flex flex-col gap-4 min-w-0">
              <ScrollArea className={SURVEY_STYLES.card + " max-h-[220px] p-2 text-xs"}>
                {generatedFrames.length === 0 ? (
                  <div className="flex h-[150px] items-center justify-center text-muted-foreground text-center">
                    No layout frames calculated. Select options and click
                    "Calculate View Frames" to run sheet segmentation.
                  </div>
                ) : (
                  <div>
                    <h4 className={SURVEY_STYLES.label + " mb-2"}>
                      Generated Layout Pages List ({generatedFrames.length}{" "}
                      Sheets)
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      {_.map(generatedFrames, (f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between border-b border-border pb-1.5"
                        >
                          <span className="flex items-center gap-1.5 text-foreground font-medium">
                            <FileText className="h-4 w-4 text-amber-400" />{" "}
                            {f.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Center: ({f.center.x.toFixed(0)},{" "}
                            {f.center.y.toFixed(0)}) | Scale: {scale}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              {generatedFrames.length > 0 && (
                <div className={SURVEY_STYLES.cardSubtle + " flex flex-col gap-3 p-3"}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      Calculated {generatedMatches.length} Match Lines
                      boundaries along the baseline centerline.
                    </span>
                    <Button
                      size="sm"
                      onClick={handleCreateSheets}
                      className={SURVEY_STYLES.btnPrimary + " gap-1"}
                    >
                      Create Sheets Set <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className={SURVEY_STYLES.textMuted + " text-[11px] leading-relaxed flex gap-2"}>
                    <HelpCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      Creating the Sheet Set will generate a collection of
                      layouts matching the US National CAD Standard sequence.
                      The view frames will render as rectangular overlays on the
                      planning workspace canvas.
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
