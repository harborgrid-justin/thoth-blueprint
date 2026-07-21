import * as React from "react";
import _ from "lodash";
import {
  resolveAlignment,
  elevationAt,
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
  const [selectedAlignId, setSelectedAlignId] = React.useState<string | null>(
    null,
  );

  const terrain = React.useMemo(
    () => (site ? buildTerrainModel(site) : null),
    [site],
  );
  const terrainSurface = terrain?.existing ?? null;

  const alignment =
    _.find(alignments, (a) => a.id === selectedAlignId) ??
    alignments[0] ??
    null;
  const resolved = alignment ? resolveAlignment(alignment) : null;

  const dynamicProfile = React.useMemo<VerticalProfile>(() => {
    const startStn = alignment?.startStation ?? 0;
    const len = resolved?.length ?? 800;
    const midStn = startStn + len / 2;
    const endStn = startStn + len;

    const startP = alignment?.pis[0]?.point ?? { x: 0, y: 0 };
    const midP = alignment?.pis[1]?.point ?? { x: 400, y: 0 };
    const endP = alignment?.pis[alignment.pis.length - 1]?.point ?? { x: 800, y: 0 };

    const e1 = terrainSurface ? elevationAt(terrainSurface, startP) : 100;
    const e2 = terrainSurface ? elevationAt(terrainSurface, midP) : 110;
    const e3 = terrainSurface ? elevationAt(terrainSurface, endP) : 105;


    return {
      id: `vp-${alignment?.id ?? "1"}`,
      name: `${alignment?.name ?? "Design"} Finished Grade`,
      alignmentId: alignment?.id ?? "",
      pvis: [
        { station: startStn, elevation: e1 },
        { station: midStn, elevation: e2, curveLength: Math.min(200, len / 4) },
        { station: endStn, elevation: e3 },
      ],
    };
  }, [alignment, resolved, terrainSurface]);

  const [profile, setProfile] = React.useState<VerticalProfile>(dynamicProfile);

  React.useEffect(() => {
    setProfile(dynamicProfile);
  }, [dynamicProfile]);

  const [selectedStation, setSelectedStation] = React.useState<number>(200);
  const [swathWidth, setSwathWidth] = React.useState<number>(50);

  React.useEffect(() => {
    if (open && alignments.length > 0) {
      setSelectedAlignId(alignments[0].id);
    }
  }, [open, alignments]);


  const crossSection = React.useMemo<CrossSection | null>(() => {
    return computeCrossSection({
      resolved,
      terrainSurface,
      selectedStation,
      swathWidth,
    });
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
