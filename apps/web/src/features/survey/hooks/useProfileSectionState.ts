import * as React from "react";
import _ from "lodash";
import {
  resolveAlignment,
  type VerticalProfile,
  type VerticalPVI,
  type CrossSection,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { buildTerrainModel } from "@/features/terrain/terrainModel";
import {
  computeCrossSection,
  updateProfilePvi,
  addProfilePvi,
  removeProfilePvi,
} from "../helpers/profileHelpers";

export function useProfileSectionState() {
  const open = useUiStore((s) => s.profileOpen);
  const setOpen = useUiStore((s) => s.setProfileOpen);
  const site = useWorkspaceStore((s) => s.site);

  const alignments = site?.alignments ?? [];
  const [selectedAlignId, setSelectedAlignId] = React.useState<string | null>(null);
  
  const terrain = React.useMemo(() => (site ? buildTerrainModel(site) : null), [site]);
  const terrainSurface = terrain?.existing ?? null;

  const [profile, setProfile] = React.useState<VerticalProfile>({
    id: "vp-1",
    name: "Design Profile 1",
    alignmentId: "",
    pvis: [
      { station: 0, elevation: 12 },
      { station: 400, elevation: 22, curveLength: 100 },
      { station: 800, elevation: 15 },
    ],
  });

  const [selectedStation, setSelectedStation] = React.useState<number>(200);
  const [swathWidth, setSwathWidth] = React.useState<number>(50);

  React.useEffect(() => {
    if (open && alignments.length > 0) {
      setSelectedAlignId(alignments[0].id);
    }
  }, [open, alignments]);

  const alignment = _.find(alignments, (a) => a.id === selectedAlignId) ?? alignments[0] ?? null;
  const resolved = alignment ? resolveAlignment(alignment) : null;

  const crossSection = React.useMemo<CrossSection | null>(() => {
    return computeCrossSection({ resolved, terrainSurface, selectedStation, swathWidth });
  }, [terrainSurface, resolved, selectedStation, swathWidth]);

  function updatePvi(index: number, field: keyof VerticalPVI, value: number) {
    setProfile((prev) => updateProfilePvi(prev, index, field, value));
  }

  function addPvi() {
    setProfile((prev) => addProfilePvi(prev));
  }

  function removePvi(index: number) {
    setProfile((prev) => removeProfilePvi(prev, index));
  }

  return {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    alignment,
    resolved,
    profile,
    selectedStation,
    setSelectedStation,
    swathWidth,
    setSwathWidth,
    crossSection,
    updatePvi,
    addPvi,
    removePvi,
  };
}
