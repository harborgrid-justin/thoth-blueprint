import * as React from "react";
import _ from "lodash";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import {
  computeSuperelevation,
  saveAlignmentSuperelevation,
} from "../helpers/superelevationHelpers";

export function useSuperelevationWizardState() {
  const open = useUiStore((s) => s.superelevationOpen);
  const setOpen = useUiStore((s) => s.setSuperelevationOpen);
  const site = useWorkspaceStore((s) => s.site);

  const alignments = site?.alignments ?? [];
  const [selectedAlignId, setSelectedAlignId] = React.useState<string | null>(null);
  
  const [designSpeed, setDesignSpeed] = React.useState<number>(45);
  const [eMax, setEMax] = React.useState<number>(0.06);
  const [normalCrown, setNormalCrown] = React.useState<number>(-0.02);

  React.useEffect(() => {
    if (open && alignments.length > 0) {
      setSelectedAlignId(alignments[0].id);
    }
  }, [open, alignments]);

  const alignment = _.find(alignments, (a) => a.id === selectedAlignId) ?? alignments[0] ?? null;

  const superCurve = React.useMemo(() => {
    return computeSuperelevation({ alignment, designSpeed, eMax, normalCrown });
  }, [alignment, designSpeed, eMax, normalCrown]);

  function handleSave() {
    saveAlignmentSuperelevation({ alignment, site, designSpeed, superCurve });
    setOpen(false);
  }

  return {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    alignment,
    designSpeed,
    setDesignSpeed,
    eMax,
    setEMax,
    normalCrown,
    setNormalCrown,
    superCurve,
    handleSave,
  };
}
