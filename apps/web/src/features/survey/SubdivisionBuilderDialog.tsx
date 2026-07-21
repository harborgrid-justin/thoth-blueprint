import { Grid2x2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubdivisionBuilderState } from "./hooks/useSubdivisionBuilderState";

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
    <Dialog open={!!targetId} onOpenChange={(open) => !open && setTargetId(null)}>
      <DialogContent className="max-w-md bg-background/80 backdrop-blur-3xl border-white/10 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid2x2 className="h-5 w-5 text-primary" /> Auto Subdivide Parcel
          </DialogTitle>
          <DialogDescription>
            Automatically split <strong>{parcel.name}</strong> into multiple lots using the slide-line method along its longest edge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label>Target Lot Area (sq units)</Label>
            <Input 
              type="number" 
              value={targetArea} 
              onChange={(e) => setTargetArea(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Cut Angle (deg relative to frontage)</Label>
            <Input 
              type="number" 
              value={angle} 
              onChange={(e) => setAngle(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setTargetId(null)}>Cancel</Button>
          <Button onClick={commitSubdivision}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Subdivide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
