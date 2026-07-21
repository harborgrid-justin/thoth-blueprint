import * as React from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { validateSiteAlignments } from "../helpers/propertiesHelpers";

export function usePropertiesState() {
  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const updateElement = useWorkspaceStore((s) => s.updateElement);
  const deleteSelection = useWorkspaceStore((s) => s.deleteSelection);
  const clearArcs = useWorkspaceStore((s) => s.clearArcs);
  const openPlat = useUiStore((s) => s.openPlat);

  const selectedElement = React.useMemo(() => {
    if (!site || selection.length !== 1) {
      return null;
    }
    return site.elements.find((e) => e.id === selection[0]) ?? null;
  }, [site, selection]);

  const validatedAlignments = React.useMemo(() => {
    return site?.alignments ? validateSiteAlignments(site.alignments) : [];
  }, [site]);

  return {
    site,
    selection,
    selectedElement,
    validatedAlignments,
    updateElement,
    deleteSelection,
    clearArcs,
    openPlat,
  };
}
