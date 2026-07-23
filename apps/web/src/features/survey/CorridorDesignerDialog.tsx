import * as React from "react";
import _ from "lodash";
import { HardHat, Compass, Link2, PenTool, LayoutTemplate, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/layout";
import { useCorridorDesignerState } from "./hooks/useCorridorDesignerState";
import { AssemblyBuilderPanel } from "./AssemblyBuilderPanel";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

export function CorridorDesignerDialog() {
  const {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    assembly,
    handleExtrude,
  } = useCorridorDesignerState();

  const [builderOpen, setBuilderOpen] = React.useState(false);
  
  if (!site) {
    return null;
  }

  return (
    <>
      <AssemblyBuilderPanel
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        assembly={assembly}
      />
      <DialogShell
        open={open}
        onOpenChange={setOpen}
        title="Corridor Engine"
        description="Sweep subassemblies along horizontal alignment & vertical profile baseline"
        icon={<HardHat className="h-4 w-4 text-amber-400" />}
        maxWidthClass="max-w-md"
        footer={
          <Button
            onClick={handleExtrude}
            className={SURVEY_STYLES.btnPrimary + " w-full"}
          >
            <HardHat className="mr-2 h-4 w-4" /> Model Corridor
          </Button>
        }
      >
        <div className="space-y-6 text-xs">
          {/* Base Geometry */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <Compass className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={SURVEY_STYLES.label}>Base Geometry</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={SURVEY_STYLES.label}>
                Horizontal Alignment
              </label>
              <select
                className={SURVEY_STYLES.select}
                value={selectedAlignId ?? ""}
                onChange={(e) => setSelectedAlignId(e.target.value)}
              >
                {_.map(alignments, (a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={SURVEY_STYLES.label}>
                Vertical Profile
              </label>
              <select
                className={SURVEY_STYLES.select}
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                {_.map(profiles, (p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className={SURVEY_STYLES.label}>
                Target Surface (Daylight)
              </label>
              <select className={SURVEY_STYLES.select}>
                <option value="eg">Existing Ground (EG_Topo)</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {/* Intersections & Islands */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <Network className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={SURVEY_STYLES.label}>
                Intersections & Islands
              </span>
            </div>
            <div className={SURVEY_STYLES.cardSubtle + " text-[11px]"}>
              Draw overlapping alignments or closed polylines in the viewport to automatically drape and extrude Medians or Splitter islands.
            </div>
          </div>

          {/* Assembly */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={SURVEY_STYLES.label}>
                Assembly Template
              </span>
            </div>

            <div className={SURVEY_STYLES.card + " flex items-center justify-between"}>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <LayoutTemplate className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{assembly.name}</div>
                  <div className="text-[10px] text-muted-foreground">{assembly.leftSubassemblies.length + assembly.rightSubassemblies.length} subassemblies</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-amber-400 hover:bg-amber-400/10 hover:text-amber-300"
                onClick={() => setBuilderOpen(true)}
              >
                <PenTool className="mr-2 h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </div>
        </div>
      </DialogShell>
    </>
  );
}

