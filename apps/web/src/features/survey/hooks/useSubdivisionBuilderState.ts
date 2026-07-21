import * as React from "react";
import { type Parcel, createId, subdivideSlideLine } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { findLongestFrontage } from "../helpers/subdivisionHelpers";

export function useSubdivisionBuilderState() {
  const targetId = useUiStore((s) => s.subdivisionTargetId);
  const setTargetId = useUiStore((s) => s.setSubdivisionTargetId);
  const site = useWorkspaceStore((s) => s.site);

  const [targetArea, setTargetArea] = React.useState(10000);
  const [angle, setAngle] = React.useState(90);

  const parcel = React.useMemo(() => {
    if (!site || !targetId) return null;
    return site.elements.find(
      (e) => e.id === targetId && e.kind === "parcel",
    ) as Parcel | null;
  }, [site, targetId]);

  function commitSubdivision() {
    if (!parcel || !site) return;

    const frontage = findLongestFrontage(parcel.boundary);

    try {
      const lots = subdivideSlideLine(parcel.boundary, {
        targetArea,
        frontage,
        angle,
        layerId: parcel.layerId,
        makeId: () => createId("lot"),
        setback: 25,
      });

      useWorkspaceStore.getState().addElements(lots);
      setTargetId(null);
    } catch (e) {
      window.alert(
        `Subdivision failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return {
    targetId,
    setTargetId,
    parcel,
    targetArea,
    setTargetArea,
    angle,
    setAngle,
    commitSubdivision,
  };
}
