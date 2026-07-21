import * as React from "react";
import _ from "lodash";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import {
  generatePlanViewFrames,
  createPlanSheets,
} from "../helpers/planProductionHelpers";

export function usePlanProductionWizardState() {
  const open = useUiStore((s) => s.productionOpen);
  const setOpen = useUiStore((s) => s.setProductionOpen);
  const site = useWorkspaceStore((s) => s.site);

  const alignments = site?.alignments ?? [];
  const [selectedAlignId, setSelectedAlignId] = React.useState<string | null>(
    null,
  );

  const [pageSize, setPageSize] = React.useState<string>("ARCH_D");
  const [overlap, setOverlap] = React.useState<number>(15);
  const [scale, setScale] = React.useState<string>("1:500");

  const [generatedFrames, setGeneratedFrames] = React.useState<any[]>([]);
  const [generatedMatches, setGeneratedMatches] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (open && alignments.length > 0) {
      setSelectedAlignId(alignments[0].id);
    }
  }, [open, alignments]);

  const alignment =
    _.find(alignments, (a) => a.id === selectedAlignId) ??
    alignments[0] ??
    null;

  function handleSplit() {
    const vfg = generatePlanViewFrames({ alignment, site, scale, overlap });
    if (vfg) {
      setGeneratedFrames(vfg.frames);
      setGeneratedMatches(vfg.matchLines);
    }
  }

  function handleCreateSheets() {
    createPlanSheets({ alignment, site, scale, overlap });
  }

  return {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    alignment,
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
  };
}
