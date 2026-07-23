import {
  createGradingPad,
  saveGradingPadElevation as domainSaveGradingPadElevation,
  solveGradingBalance,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export { createGradingPad, solveGradingBalance };

export function saveGradingPadElevation(args: any) {
  const res = domainSaveGradingPadElevation(args);
  if (res) {
    useWorkspaceStore.getState().updateElement(res.matchingPadId, res.patch);
  }
}
