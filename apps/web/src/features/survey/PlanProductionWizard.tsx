import _ from "lodash";
import { Layout, FileText, ChevronRight, HelpCircle } from "lucide-react";
import { DialogShell } from "@/components/layout";
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
    <DialogShell
      open={open}
      onOpenChange={setOpen}
      title="Plan Production Sheet Set Wizard"
      description="Segment horizontal baselines into print-ready page layouts using View Frames and boundary Match Lines."
      icon={<Layout className="h-5 w-5 text-amber-400" />}
      maxWidthClass="max-w-4xl"
    >
      {alignments.length === 0 ? (
        <div className={SURVEY_STYLES.cardSubtle + " py-12 text-center text-sm text-muted-foreground"}>
          No alignments found. Please create an alignment baseline first.
        </div>
      ) : (
        <div className={SURVEY_STYLES.layoutSidebar}>
          {/* Left Options panel */}
          <div className="flex flex-col gap-4 border-r border-border pr-4">
            <div className="flex flex-col gap-1">
              <label className={SURVEY_STYLES.label}>
                Alignment Baseline
              </label>
              <select
                value={selectedAlignId ?? ""}
                onChange={(e) => setSelectedAlignId(e.target.value)}
                className={SURVEY_STYLES.select}
              >
                {alignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={SURVEY_STYLES.label}>
                Sheet Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className={SURVEY_STYLES.select}
              >
                <option value="ANSI D (22x34)">ANSI D (22" x 34")</option>
                <option value="ARCH D (24x36)">ARCH D (24" x 36")</option>
                <option value="ANSI B (11x17)">ANSI B (11" x 17")</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={SURVEY_STYLES.label}>
                Drawing Scale (1" =)
              </label>
              <select
                value={String(scale)}
                onChange={(e) => (setScale as any)(e.target.value)}
                className={SURVEY_STYLES.select}
              >
                <option value="20">1" = 20'</option>
                <option value="30">1" = 30'</option>
                <option value="50">1" = 50'</option>
                <option value="100">1" = 100'</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={SURVEY_STYLES.label}>
                Match Line Overlap (ft)
              </label>
              <input
                type="number"
                value={overlap}
                onChange={(e) => setOverlap(Number(e.target.value))}
                className={SURVEY_STYLES.input}
              />
            </div>

            <Button
              onClick={handleSplit}
              className={SURVEY_STYLES.btnPrimary + " mt-2"}
            >
              Generate View Frames
            </Button>
          </div>

          {/* Right Frames List & Actions */}
          <div className="flex min-w-0 flex-col gap-4 pl-2">
            <ScrollArea className="h-[260px]">
              {generatedFrames.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed border-border/80 text-xs text-muted-foreground">
                  Click 'Generate View Frames' to calculate layout tiles.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <h4 className={SURVEY_STYLES.label}>
                    Generated View Frames ({generatedFrames.length})
                  </h4>

                  <div className="flex flex-col gap-1">
                    {generatedFrames.map((f) => (
                      <div
                        key={f.id}
                        className={SURVEY_STYLES.cardSubtle + " flex items-center justify-between p-2 text-xs"}
                      >
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          <FileText className="h-3.5 w-3.5 text-amber-400" />
                          {f.name}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
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
                <div className="flex items-center justify-between text-xs">
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
    </DialogShell>
  );
}
