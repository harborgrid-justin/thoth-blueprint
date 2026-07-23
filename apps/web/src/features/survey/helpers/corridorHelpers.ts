import { extrudeCorridor as domainExtrudeCorridor } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function extrudeCorridor(args: any) {
  const res = domainExtrudeCorridor(args);
  if (res?.newElements && useWorkspaceStore.getState().addElements) {
    useWorkspaceStore.getState().addElements(res.newElements as any);
  }
  return res;
}
