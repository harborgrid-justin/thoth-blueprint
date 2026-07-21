import _ from "lodash";
import { calculateSuperelevationRunoff } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function computeSuperelevation({
  alignment,
  designSpeed,
  eMax,
  normalCrown,
}: {
  alignment: any;
  designSpeed: number;
  eMax: number;
  normalCrown: number;
}) {
  if (!alignment) {return null;}
  return calculateSuperelevationRunoff(alignment, designSpeed, eMax, normalCrown);
}

export function saveAlignmentSuperelevation({
  alignment,
  site,
  designSpeed,
  superCurve,
}: {
  alignment: any;
  site: any;
  designSpeed: number;
  superCurve: any;
}) {
  if (!alignment) {return;}
  
  const patch = {
    ...alignment,
    designSpeed,
    designSpeeds: [{ station: alignment.startStation, speed: designSpeed }],
  };

  const updatedAlignments = _.map(site?.alignments ?? [], (a: any) => a.id === alignment.id ? patch : a);
  useWorkspaceStore.getState().updateElement(alignment.id, { alignments: updatedAlignments } as any);

  if ((useWorkspaceStore.getState() as any).setSuperelevationCurve) {
    (useWorkspaceStore.getState() as any).setSuperelevationCurve(superCurve);
  }
}
