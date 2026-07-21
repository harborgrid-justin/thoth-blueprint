import * as React from "react";
import _ from "lodash";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";

export function useAlignmentReportState() {
  const open = useUiStore((s) => s.alignmentOpen);
  const setOpen = useUiStore((s) => s.setAlignmentOpen);
  const site = useWorkspaceStore((s) => s.site);

  const alignments = site?.alignments ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedId(alignments[0]?.id ?? null);
    }
  }, [open, alignments]);

  const selected = React.useMemo(
    () =>
      _.find(alignments, (a) => a.id === selectedId) ?? alignments[0] ?? null,
    [alignments, selectedId],
  );

  function selectAlignment(id: string) {
    setSelectedId(id);
    useWorkspaceStore.getState().select(id);
  }

  function hoverAlignment(id: string | null) {
    useWorkspaceStore.getState().hoverElement(id);
  }

  return {
    open,
    setOpen,
    site,
    alignments,
    selectedId,
    selected,
    selectAlignment,
    hoverAlignment,
  };
}
