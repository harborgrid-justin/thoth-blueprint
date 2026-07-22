import { useState, useMemo, useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";

export interface TraverseLeg {
  id: string;
  bearing: string;
  distanceFt: number;
  radiusFt?: number;
  curveLengthFt?: number;
}

export function useSurveyCogoStudioState() {
  const [legs, setLegs] = useState<TraverseLeg[]>([
    { id: "leg-1", bearing: "N 45° 00' 00\" E", distanceFt: 150.0 },
    { id: "leg-2", bearing: "S 45° 00' 00\" E", distanceFt: 150.0 },
    { id: "leg-3", bearing: "S 45° 00' 00\" W", distanceFt: 150.0 },
    { id: "leg-4", bearing: "N 45° 00' 00\" W", distanceFt: 150.0 },
  ]);

  const [newBearing, setNewBearing] = useState<string>("N 90° 00' 00\" E");
  const [newDistance, setNewDistance] = useState<number>(100.0);

  const addLeg = useCallback(() => {
    setLegs((prev) => [
      ...prev,
      {
        id: `leg-${Date.now()}`,
        bearing: newBearing,
        distanceFt: newDistance,
      },
    ]);
  }, [newBearing, newDistance]);

  const removeLeg = useCallback((id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const traverseResult = useMemo(() => {
    const totalDist = legs.reduce((acc, l) => acc + l.distanceFt, 0);
    // Synthetic closure calculation
    const closureErrorFt = 0.02;
    const closureRatio = totalDist > 0 ? Math.round(totalDist / closureErrorFt) : 50000;
    const isCompliant = closureRatio >= 10000;

    return {
      totalDist: Math.round(totalDist * 100) / 100,
      closureErrorFt,
      closureRatio,
      isCompliant,
    };
  }, [legs]);

  const commitTraversePlat = useCallback(() => {
    // Convert bearings & distances to polygon points starting at 0,0
    let currX = 0;
    let currY = 0;
    const boundaryPoints: { x: number; y: number }[] = [{ x: 0, y: 0 }];

    legs.forEach((leg) => {
      // Simplified bearing conversion for demonstration
      const angleRad = Math.PI / 4;
      currX += leg.distanceFt * Math.cos(angleRad);
      currY += leg.distanceFt * Math.sin(angleRad);
      boundaryPoints.push({ x: Math.round(currX * 100) / 100, y: Math.round(currY * 100) / 100 });
    });

    useWorkspaceStore.getState().addElements([
      {
        id: `cogo-traverse-${Date.now()}`,
        kind: "parcel" as const,
        name: `COGO Metes & Bounds Parcel (${legs.length} Legs)`,
        layerId: "cogo-survey",
        boundary: boundaryPoints,
      } as any,
    ]);
  }, [legs]);

  return {
    legs,
    newBearing,
    setNewBearing,
    newDistance,
    setNewDistance,
    addLeg,
    removeLeg,
    traverseResult,
    commitTraversePlat,
  };
}
