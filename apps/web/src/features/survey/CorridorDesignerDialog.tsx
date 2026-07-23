import * as React from "react";
import _ from "lodash";
import { HardHat, Compass, Link2, X, PenTool, LayoutTemplate, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  
  if (!site || !open) {
    return null;
  }

  return (
    <>
      <AssemblyBuilderPanel
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        assembly={assembly}
      />
      <div className="absolute top-20 right-8 z-40 flex flex-col w-[450px] rounded-xl border border-border shadow-2xl overflow-hidden bg-card/90 backdrop-blur-md text-foreground animate-dialog-in">
        {/* Header */}
        <div className={SURVEY_STYLES.dialogHeader + " px-4 py-3 bg-background/60"}>
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-400" />
            <h2 className={SURVEY_STYLES.dialogTitle}>
              Corridor Engine
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className={SURVEY_STYLES.btnIcon}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Base Geometry */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <Compass className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={SURVEY_STYLES.label}>
                Geometry References
              </span>
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
              <Network className="w-3.5 h-3.5 text-muted-foreground" />
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
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={SURVEY_STYLES.label}>
                Assembly Template
              </span>
            </div>

            <div className={SURVEY_STYLES.card + " flex items-center justify-between"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <LayoutTemplate className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{assembly.name}</div>
                  <div className="text-[10px] text-muted-foreground">{assembly.leftSubassemblies.length + assembly.rightSubassemblies.length} subassemblies</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                onClick={() => setBuilderOpen(true)}
              >
                <PenTool className="w-3.5 h-3.5 mr-2" /> Edit
              </Button>
            </div>
          </div>
          
          {/* Generation */}
          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              onClick={handleExtrude}
              className={SURVEY_STYLES.btnPrimary + " w-full"}
            >
              <HardHat className="w-4 h-4 mr-2" /> Model Corridor
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

