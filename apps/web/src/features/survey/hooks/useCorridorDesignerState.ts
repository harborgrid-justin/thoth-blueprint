import * as React from "react";
import _ from "lodash";
import {
  type Assembly,
  getDefaultSubassemblies,
  resolveAssemblyOffset,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { extrudeCorridor } from "../helpers/corridorHelpers";

export function useCorridorDesignerState() {
  const open = useUiStore((s) => s.corridorOpen);
  const setOpen = useUiStore((s) => s.setCorridorOpen);
  const site = useWorkspaceStore((s) => s.site);

  const alignments = site?.alignments ?? [];
  const [selectedAlignId, setSelectedAlignId] = React.useState<string | null>(
    null,
  );

  const [profiles] = React.useState<any[]>([
    {
      id: "prof-1",
      name: "Design Profile 1",
      pvis: [
        { station: 0, elevation: 12 },
        { station: 400, elevation: 22 },
        { station: 800, elevation: 15 },
      ],
    },
  ]);
  const [selectedProfileId, setSelectedProfileId] =
    React.useState<string>("prof-1");

  const [assembly] = React.useState<Assembly>({
    id: "assembly-main",
    name: "Primary Highway 2-Lane",
    leftSubassemblies: getDefaultSubassemblies("left"),
    rightSubassemblies: getDefaultSubassemblies("right"),
  });

  const [frequency, setFrequency] = React.useState<number>(50);

  React.useEffect(() => {
    if (open && alignments.length > 0) {
      setSelectedAlignId(alignments[0].id);
    }
  }, [open, alignments]);

  const offsetPoints = React.useMemo(() => {
    return resolveAssemblyOffset(assembly, -0.02, -0.02);
  }, [assembly]);

  const alignment =
    _.find(alignments, (a) => a.id === selectedAlignId) ??
    alignments[0] ??
    null;
  const profile =
    _.find(profiles, (p) => p.id === selectedProfileId) ?? profiles[0] ?? null;

  function handleExtrude() {
    if (!alignment || !profile) {
      return;
    }
    extrudeCorridor({ alignment, profile, assembly, frequency });
    setOpen(false);
  }

  return {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    assembly,
    frequency,
    setFrequency,
    offsetPoints,
    alignment,
    profile,
    handleExtrude,
  };
}
