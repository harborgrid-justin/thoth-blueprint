import { useState, useMemo, useCallback } from "react";
import {
  autoSolveCutFillBalance,
  autoSizeRetainingWall,
  autoGradeBuildingPad,
  autoGradeADAParkingAisle,
  autoGradeADARamp,
  autoGradeSwaleSlope,
  autoSolveDaylightTie,
  autoGradeTerracedBenching,
  type SpatialElement,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useGradingStudioState() {
  const site = useWorkspaceStore((s) => s.site);
  const selectedIds = useWorkspaceStore((s) => s.selection);

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [targetPadElev, setTargetPadElev] = useState<number>(100.0);
  const [cutRatio, setCutRatio] = useState<number>(2.0); // 2:1 slope
  const [fillRatio, setFillRatio] = useState<number>(3.0); // 3:1 slope
  const [shrinkFactor, setShrinkFactor] = useState<number>(0.15); // 15% shrinkage
  const [swellFactor, setSwellFactor] = useState<number>(0.10); // 10% swell

  // Candidate regions/pads from site
  const candidateRegions = useMemo(() => {
    if (!site) {return [];}
    return site.elements.filter(
      (e): e is SpatialElement =>
        (e.kind === "region" || e.kind === "parcel" || e.kind === "lot" || e.kind === "grade") &&
        "boundary" in e &&
        Array.isArray((e as any).boundary) &&
        (e as any).boundary.length >= 3
    );
  }, [site]);

  const targetRegion = useMemo(() => {
    if (!candidateRegions.length) {return null;}
    if (selectedRegionId) {
      return candidateRegions.find((r) => r.id === selectedRegionId) ?? candidateRegions[0];
    }
    if (selectedIds.length) {
      const match = candidateRegions.find((r) => selectedIds.includes(r.id));
      if (match) {return match;}
    }
    return candidateRegions[0];
  }, [candidateRegions, selectedRegionId, selectedIds]);

  // Compute live earthwork cut/fill volume & zero-volume balance
  const gradingAnalysis = useMemo(() => {
    if (!targetRegion || !targetRegion.boundary || targetRegion.boundary.length < 3) {
      return { areaSqFt: 0, cutVol: 0, fillVol: 0, netVol: 0, balancedElev: targetPadElev, experiences: [] };
    }

    const poly = targetRegion.boundary;
    const areaSqFt = Math.abs(
      poly.reduce((acc, p, i) => {
        const next = poly[(i + 1) % poly.length];
        return acc + (p.x * next.y - next.x * p.y);
      }, 0) / 2
    );

    // Synthetic base terrain elevation estimate
    const avgTerrainElev = 102.5;
    const diff = targetPadElev - avgTerrainElev;

    let cutVol = 0;
    let fillVol = 0;

    if (diff < 0) {
      // Cut
      cutVol = (Math.abs(diff) * areaSqFt * (1 - shrinkFactor)) / 27.0;
    } else {
      // Fill
      fillVol = (Math.abs(diff) * areaSqFt * (1 + swellFactor)) / 27.0;
    }

    const netVol = cutVol - fillVol;
    const balancedElev = avgTerrainElev;

    const experiences = [];
    experiences.push(autoSolveCutFillBalance(netVol, targetPadElev));
    experiences.push(autoSizeRetainingWall(Math.abs(diff)));
    experiences.push(autoGradeBuildingPad(1.5));
    experiences.push(autoGradeADAParkingAisle(0.018, 0.042));
    experiences.push(autoGradeADARamp(7.5));
    experiences.push(autoGradeSwaleSlope(2.5));
    experiences.push(autoSolveDaylightTie(diff < 0));
    experiences.push(autoGradeTerracedBenching(Math.abs(diff)));

    return {
      areaSqFt,
      cutVol: Math.round(cutVol),
      fillVol: Math.round(fillVol),
      netVol: Math.round(netVol),
      balancedElev: Math.round(balancedElev * 100) / 100,
      experiences,
    };
  }, [targetRegion, targetPadElev, shrinkFactor, swellFactor]);

  // Apply zero-volume pad elevation optimization
  const autoOptimizePadElev = useCallback(() => {
    setTargetPadElev(gradingAnalysis.balancedElev);
  }, [gradingAnalysis.balancedElev]);

  // Commit grading pad element to canvas
  const commitGradingPad = useCallback(() => {
    if (!targetRegion) {return;}
    useWorkspaceStore.getState().addElements([
      {
        id: `grading-pad-${Date.now()}`,
        kind: "grade" as const,
        name: `Grading Pad (Elev ${targetPadElev.toFixed(2)}')`,
        layerId: targetRegion.layerId || "grading",
        boundary: targetRegion.boundary,
      } as any,
    ]);
  }, [targetRegion, targetPadElev]);

  return {
    candidateRegions,
    selectedRegionId,
    setSelectedRegionId,
    targetRegion,
    targetPadElev,
    setTargetPadElev,
    cutRatio,
    setCutRatio,
    fillRatio,
    setFillRatio,
    shrinkFactor,
    setShrinkFactor,
    swellFactor,
    setSwellFactor,
    gradingAnalysis,
    autoOptimizePadElev,
    commitGradingPad,
  };
}
