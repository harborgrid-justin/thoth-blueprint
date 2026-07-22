import { useState, useMemo, useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useModelBuilderStudioState() {
  const [crs, setCrs] = useState<string>("EPSG:4326 (WGS 84)");
  const [minLat, setMinLat] = useState<number>(37.7749);
  const [maxLat, setMaxLat] = useState<number>(37.7849);
  const [minLon, setMinLon] = useState<number>(-122.4194);
  const [maxLon, setMaxLon] = useState<number>(-122.4094);

  const [importRoads, setImportRoads] = useState<boolean>(true);
  const [importBuildings, setImportBuildings] = useState<boolean>(true);
  const [importTerrain, setImportTerrain] = useState<boolean>(true);

  const boundsInfo = useMemo(() => {
    const latDistFt = Math.abs(maxLat - minLat) * 364000;
    const lonDistFt = Math.abs(maxLon - minLon) * 288000;
    const totalAreaSqFt = latDistFt * lonDistFt;
    const acres = totalAreaSqFt / 43560;

    return {
      latDistFt: Math.round(latDistFt),
      lonDistFt: Math.round(lonDistFt),
      acres: Math.round(acres * 10) / 10,
    };
  }, [minLat, maxLat, minLon, maxLon]);

  const commitGisModel = useCallback(() => {
    useWorkspaceStore.getState().addElements([
      {
        id: `gis-model-${Date.now()}`,
        kind: "region" as const,
        name: `GIS Import Region (${boundsInfo.acres} Acres)`,
        layerId: "gis-layers",
        boundary: [
          { x: 0, y: 0 },
          { x: boundsInfo.lonDistFt, y: 0 },
          { x: boundsInfo.lonDistFt, y: boundsInfo.latDistFt },
          { x: 0, y: boundsInfo.latDistFt },
        ],
      } as any,
    ]);
  }, [boundsInfo]);

  return {
    crs,
    setCrs,
    minLat,
    setMinLat,
    maxLat,
    setMaxLat,
    minLon,
    setMinLon,
    maxLon,
    setMaxLon,
    importRoads,
    setImportRoads,
    importBuildings,
    setImportBuildings,
    importTerrain,
    setImportTerrain,
    boundsInfo,
    commitGisModel,
  };
}
