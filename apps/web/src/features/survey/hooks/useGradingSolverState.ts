import * as React from "react";
import _ from "lodash";
import { calculateGradingVolumes, elevationAt } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { buildTerrainModel } from "@/features/terrain/terrainModel";
import {
  createGradingPad,
  saveGradingPadElevation,
  solveGradingBalance,
} from "../helpers/gradingHelpers";

export function useGradingSolverState() {
  const open = useUiStore((s) => s.gradingOpen);
  const setOpen = useUiStore((s) => s.setGradingOpen);
  const site = useWorkspaceStore((s) => s.site);

  const terrain = React.useMemo(
    () => (site ? buildTerrainModel(site) : null),
    [site],
  );
  const terrainSurface = terrain?.existing ?? null;

  const [cutSlope, setCutSlope] = React.useState<number>(2);
  const [fillSlope, setFillSlope] = React.useState<number>(3);
  const [targetVolume, setTargetVolume] = React.useState<number>(0);

  const defaultElev = React.useMemo(() => {
    if (terrainSurface) {
      return elevationAt(terrainSurface, { x: 0, y: 0 });
    }
    return 100;
  }, [terrainSurface]);



  const [padElevation, setPadElevation] = React.useState<number>(defaultElev);

  React.useEffect(() => {
    if (defaultElev !== 100) {
      setPadElevation(defaultElev);
    }
  }, [defaultElev]);

  const [solving, setSolving] = React.useState<boolean>(false);
  const [volumes, setVolumes] = React.useState<any | null>(null);

  const gradingPad = React.useMemo(
    () => createGradingPad({ padElevation, cutSlope, fillSlope }),
    [padElevation, cutSlope, fillSlope],
  );


  React.useEffect(() => {
    if (open && site) {
      const matchingPad =
        _.find(site.elements, (e) => e.kind === "parcel") ?? site.elements[0];
      if (matchingPad) {
        useWorkspaceStore.getState().hoverElement(matchingPad.id);
      }
    } else if (!open) {
      useWorkspaceStore.getState().hoverElement(null);
    }
  }, [open, site]);

  React.useEffect(() => {
    if (open && terrainSurface) {
      const report = calculateGradingVolumes(
        gradingPad,
        padElevation,
        terrainSurface,
        10,
      );
      setVolumes(report);
    }
  }, [open, padElevation, gradingPad, terrainSurface]);

  function runBalanceSolver() {
    if (!terrainSurface) {
      return;
    }
    setSolving(true);
    solveGradingBalance({
      gradingPad,
      terrainSurface,
      targetVolume,
      onComplete: (elev) => {
        setPadElevation(elev);
        setSolving(false);
      },
    });
  }

  function handleSave() {
    saveGradingPadElevation({ site, padElevation, cutSlope, fillSlope });
    setOpen(false);
  }

  return {
    open,
    setOpen,
    site,
    cutSlope,
    setCutSlope,
    fillSlope,
    setFillSlope,
    targetVolume,
    setTargetVolume,
    padElevation,
    setPadElevation,
    solving,
    volumes,
    runBalanceSolver,
    handleSave,
  };
}
