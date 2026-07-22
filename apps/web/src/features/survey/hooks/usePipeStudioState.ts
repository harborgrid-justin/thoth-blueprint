import { useState, useMemo, useCallback } from "react";
import {
  autoSizeStormPipe,
  autoSizeSanitarySlope,
  autoSizeWaterMain,
  autoSizeDetentionBasin,
  autoSizeCulvert,
  autoSizeTrenchDrain,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function usePipeStudioState() {
  const [pipeType, setPipeType] = useState<"storm" | "sanitary" | "water">("storm");
  const [designFlowCfs, setDesignFlowCfs] = useState<number>(15.5);
  const [pipeSlope, setPipeSlope] = useState<number>(0.01); // 1%
  const [manningN, setManningN] = useState<number>(0.013); // Concrete pipe
  const [coverDepthFt, setCoverDepthFt] = useState<number>(3.5);

  // Hydraulic Calculations
  const hydraulicResult = useMemo(() => {
    const reqDiameterInches = Math.max(12, Math.ceil(Math.pow((designFlowCfs * manningN) / (0.463 * Math.sqrt(pipeSlope)), 3 / 8) * 12));
    const hglElev = 98.5;
    const isCoverOk = coverDepthFt >= 3.0;

    const experiences = [];
    experiences.push(autoSizeStormPipe(designFlowCfs, pipeSlope, manningN));
    experiences.push(autoSizeSanitarySlope(designFlowCfs, reqDiameterInches));
    experiences.push(autoSizeWaterMain(designFlowCfs * 448.83)); // convert cfs to gpm
    experiences.push(autoSizeDetentionBasin(5.0, 0.35, 0.85, 3.2));
    experiences.push(autoSizeCulvert(designFlowCfs, 10.0));
    experiences.push(autoSizeTrenchDrain(designFlowCfs));

    return {
      reqDiameterInches,
      hglElev,
      isCoverOk,
      experiences,
    };
  }, [designFlowCfs, pipeSlope, manningN, coverDepthFt]);

  // Commit Pipe Network to Canvas
  const commitPipeNetwork = useCallback(() => {
    useWorkspaceStore.getState().addElements([
      {
        id: `pipe-network-${Date.now()}`,
        kind: "pipeNetwork" as const,
        name: `${pipeType.toUpperCase()} Pipe Network (${hydraulicResult.reqDiameterInches}" Pipe)`,
        layerId: `${pipeType}-pipes`,
        pipes: [],
        structures: [],
      } as any,
    ]);
  }, [pipeType, hydraulicResult.reqDiameterInches]);

  return {
    pipeType,
    setPipeType,
    designFlowCfs,
    setDesignFlowCfs,
    pipeSlope,
    setPipeSlope,
    manningN,
    setManningN,
    coverDepthFt,
    setCoverDepthFt,
    hydraulicResult,
    commitPipeNetwork,
  };
}
