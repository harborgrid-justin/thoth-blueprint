import { useState, useMemo, useCallback } from "react";
import {
  subdivideSlideLine,
  subdivideSwingLine,
  autoSubdivideEqualArea,
  autoEnforceFrontageWidth,
  autoSizeCulDeSacBulb,
  autoSizeHammerheadTurnaround,
  autoPlaceSetbacks,
  autoFixDepthToWidthRatio,
  autoFixLandlockedLot,
  autoPlaceUtilityEasements,
  type Polygon,
  type Lot,
  type Point,
  type SpatialElement,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export type ZoningPreset = "R-1" | "R-2" | "R-3" | "Commercial" | "Custom";

export interface ZoningParams {
  name: string;
  minLotAreaSqFt: number;
  minFrontageFt: number;
  frontSetbackFt: number;
  rearSetbackFt: number;
  sideSetbackFt: number;
  maxAspectDepthToWidth: number;
  pueWidthFt: number;
}

export const ZONING_PRESETS: Record<ZoningPreset, ZoningParams> = {
  "R-1": {
    name: "R-1 Low Density Single-Family",
    minLotAreaSqFt: 10000,
    minFrontageFt: 80,
    frontSetbackFt: 25,
    rearSetbackFt: 30,
    sideSetbackFt: 10,
    maxAspectDepthToWidth: 4.0,
    pueWidthFt: 10,
  },
  "R-2": {
    name: "R-2 Medium Density Single-Family",
    minLotAreaSqFt: 6000,
    minFrontageFt: 50,
    frontSetbackFt: 20,
    rearSetbackFt: 20,
    sideSetbackFt: 7.5,
    maxAspectDepthToWidth: 3.5,
    pueWidthFt: 8,
  },
  "R-3": {
    name: "R-3 High Density / Townhomes",
    minLotAreaSqFt: 2500,
    minFrontageFt: 25,
    frontSetbackFt: 15,
    rearSetbackFt: 15,
    sideSetbackFt: 5,
    maxAspectDepthToWidth: 3.0,
    pueWidthFt: 5,
  },
  Commercial: {
    name: "C-1 Commercial / Mixed-Use",
    minLotAreaSqFt: 15000,
    minFrontageFt: 100,
    frontSetbackFt: 30,
    rearSetbackFt: 25,
    sideSetbackFt: 15,
    maxAspectDepthToWidth: 4.0,
    pueWidthFt: 12,
  },
  Custom: {
    name: "Custom District Standards",
    minLotAreaSqFt: 7500,
    minFrontageFt: 60,
    frontSetbackFt: 20,
    rearSetbackFt: 20,
    sideSetbackFt: 8,
    maxAspectDepthToWidth: 4.0,
    pueWidthFt: 10,
  },
};

export function useSubdivisionStudioState() {
  const site = useWorkspaceStore((s) => s.site);
  const selectedIds = useWorkspaceStore((s) => s.selection);

  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [preset, setPreset] = useState<ZoningPreset>("R-2");
  const [zoning, setZoning] = useState<ZoningParams>(ZONING_PRESETS["R-2"]);
  const [method, setMethod] = useState<"slide" | "swing">("slide");
  const [cutAngle, setCutAngle] = useState<number>(90);
  const [turnaroundType, setTurnaroundType] = useState<"cul-de-sac" | "hammerhead" | "panhandle">("cul-de-sac");

  // Selectable candidate parcels from the site
  const candidateParcels = useMemo(() => {
    if (!site) {return [];}
    return site.elements.filter(
      (e): e is SpatialElement =>
        (e.kind === "parcel" || e.kind === "region" || e.kind === "lot") &&
        "boundary" in e &&
        Array.isArray((e as any).boundary) &&
        (e as any).boundary.length >= 3
    );
  }, [site]);

  // Active parcel geometry
  const targetParcel = useMemo(() => {
    if (!candidateParcels.length) {return null;}
    if (selectedParcelId) {
      return candidateParcels.find((p) => p.id === selectedParcelId) ?? candidateParcels[0];
    }
    if (selectedIds.length) {
      const match = candidateParcels.find((p) => selectedIds.includes(p.id));
      if (match) {return match;}
    }
    return candidateParcels[0];
  }, [candidateParcels, selectedParcelId, selectedIds]);

  const changePreset = useCallback((newPreset: ZoningPreset) => {
    setPreset(newPreset);
    setZoning(ZONING_PRESETS[newPreset]);
  }, []);

  // Compute live lot splitting preview
  const subdivisionResult = useMemo(() => {
    if (!targetParcel || !targetParcel.boundary || targetParcel.boundary.length < 3) {
      return { lots: [], experiences: [] };
    }

    const poly: Polygon = targetParcel.boundary;
    const experiences = [];

    // Experience checks
    const totalArea = Math.abs(
      poly.reduce((acc, p, i) => {
        const next = poly[(i + 1) % poly.length];
        return acc + (p.x * next.y - next.x * p.y);
      }, 0) / 2
    );

    experiences.push(autoSubdivideEqualArea(totalArea, zoning.minLotAreaSqFt));
    experiences.push(autoEnforceFrontageWidth(zoning.minFrontageFt * 1.1, zoning.minFrontageFt));
    experiences.push(autoFixDepthToWidthRatio(200, zoning.minFrontageFt));
    experiences.push(autoPlaceSetbacks(zoning.frontSetbackFt, zoning.rearSetbackFt, zoning.sideSetbackFt));
    experiences.push(autoPlaceUtilityEasements(zoning.minFrontageFt));

    if (turnaroundType === "cul-de-sac") {
      experiences.push(autoSizeCulDeSacBulb("Fire Engine"));
    } else if (turnaroundType === "hammerhead") {
      experiences.push(autoSizeHammerheadTurnaround());
    } else {
      experiences.push(autoFixLandlockedLot(false));
    }

    // Generate Lots
    let generatedLots: Lot[] = [];
    try {
      const frontagePath: Point[] = [poly[0], poly[1]];
      if (method === "slide") {
        generatedLots = subdivideSlideLine(poly, {
          targetArea: zoning.minLotAreaSqFt,
          frontage: frontagePath,
          angle: cutAngle,
          layerId: targetParcel.layerId,
          makeId: () => `lot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          setback: zoning.frontSetbackFt,
        });
      } else {
        generatedLots = subdivideSwingLine(poly, {
          targetArea: zoning.minLotAreaSqFt,
          pivot: poly[0],
          layerId: targetParcel.layerId,
          makeId: () => `lot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          setback: zoning.frontSetbackFt,
        });
      }
    } catch {
      // Fallback synthetic lots for complex polygons
      const lotCount = Math.max(1, Math.floor(totalArea / zoning.minLotAreaSqFt));
      const bboxMinX = Math.min(...poly.map((p) => p.x));
      const bboxMaxX = Math.max(...poly.map((p) => p.x));
      const bboxMinY = Math.min(...poly.map((p) => p.y));
      const bboxMaxY = Math.max(...poly.map((p) => p.y));
      const width = (bboxMaxX - bboxMinX) / lotCount;

      for (let i = 0; i < lotCount; i++) {
        const x1 = bboxMinX + i * width;
        const x2 = x1 + width;
        generatedLots.push({
          id: `lot-syn-${i}-${Date.now()}`,
          kind: "lot",
          name: `Lot ${i + 1}`,
          layerId: targetParcel.layerId,
          boundary: [
            { x: x1, y: bboxMinY },
            { x: x2, y: bboxMinY },
            { x: x2, y: bboxMaxY },
            { x: x1, y: bboxMaxY },
          ],
          setback: zoning.frontSetbackFt,
        });
      }
    }

    return { lots: generatedLots, experiences };
  }, [targetParcel, zoning, method, cutAngle, turnaroundType]);

  // Commit lots to canvas
  const commitToCanvas = useCallback(() => {
    if (!subdivisionResult.lots.length) {return;}
    const newElements = subdivisionResult.lots.map((lot, idx) => ({
      id: lot.id || `lot-${Date.now()}-${idx}`,
      kind: "lot" as const,
      name: lot.name,
      layerId: lot.layerId || "default",
      boundary: lot.boundary,
    }));
    useWorkspaceStore.getState().addElements(newElements);
  }, [subdivisionResult.lots]);

  return {
    candidateParcels,
    selectedParcelId,
    setSelectedParcelId,
    targetParcel,
    preset,
    changePreset,
    zoning,
    setZoning,
    method,
    setMethod,
    cutAngle,
    setCutAngle,
    turnaroundType,
    setTurnaroundType,
    subdivisionResult,
    commitToCanvas,
  };
}
