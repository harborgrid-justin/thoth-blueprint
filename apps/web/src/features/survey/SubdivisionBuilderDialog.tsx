import { Grid2x2, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogShell } from "@/components/layout";
import { useSubdivisionBuilderState } from "./hooks/useSubdivisionBuilderState";
import { useUiStore } from "@/store/uiStore";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

export function SubdivisionBuilderDialog() {
  const {
    targetId,
    setTargetId,
    parcel,
    targetArea,
    setTargetArea,
    angle,
    setAngle,
    commitSubdivision,
  } = useSubdivisionBuilderState();

  if (!parcel) {
    return null;
  }

  return (
    <DialogShell
      open={!!targetId}
      onOpenChange={(open) => !open && setTargetId(null)}
      title="Auto Subdivide Parcel"
      description={
        <span>
          Automatically split <strong>{parcel.name}</strong> into multiple lots using the slide-line method along its longest edge.
        </span>
      }
      icon={<Grid2x2 className="h-5 w-5 text-amber-400" />}
      maxWidthClass="max-w-md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTargetId(null);
              useUiStore.getState().setSubdivisionStudioOpen(true);
            }}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Subdivision Studio
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTargetId(null)} className={SURVEY_STYLES.btnSecondary}>
              Cancel
            </Button>
            <Button onClick={commitSubdivision} className={SURVEY_STYLES.btnPrimary}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Subdivide
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <Label className={SURVEY_STYLES.label}>Target Lot Area (sq units)</Label>
          <Input 
            type="number" 
            value={targetArea} 
            onChange={(e) => setTargetArea(Number(e.target.value))}
            className={SURVEY_STYLES.input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className={SURVEY_STYLES.label}>Cut Angle (deg relative to frontage)</Label>
          <Input 
            type="number" 
            value={angle} 
            onChange={(e) => setAngle(Number(e.target.value))}
            className={SURVEY_STYLES.input}
          />
        </div>
      </div>
    </DialogShell>
  );
}

