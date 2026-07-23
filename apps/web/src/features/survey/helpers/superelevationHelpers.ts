import {
  computeSuperelevation,
  saveAlignmentSuperelevation as domainSaveAlignmentSuperelevation,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export { computeSuperelevation };

export function saveAlignmentSuperelevation(args: any) {
  const res = domainSaveAlignmentSuperelevation(args);
  if (res) {
    useWorkspaceStore
      .getState()
      .updateElement(args.alignment.id, res.patch as any);
    if ((useWorkspaceStore.getState() as any).setSuperelevationCurve) {
      (useWorkspaceStore.getState() as any).setSuperelevationCurve(args.superCurve);
    }
  }
}
