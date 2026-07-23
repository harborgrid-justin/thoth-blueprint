import { useState, useMemo } from "react";
import {
  type HorizontalAlignment,
  type VerticalProfile,
  type Assembly,
  type ElevationGrid,
  type SampleLineGroup,
  type Roundabout,
  bounds,
  elevationAt,
  isSpatialElement,
  resolveAlignment,
  validateAlignmentDesignSpeed,
  validateProfileKValues,
  getDefaultSubassemblies,
  mirrorSubassemblies,
  buildCorridorSections,
  extractCorridorFeatureLines,
  buildCorridorSurfaces,
  calculateSuperelevationRunoff,
  analyzeRoundaboutFastestPath,
  generateSampleLines,
  calculateEarthworkVolumes,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { buildTerrainModel } from "@/features/terrain/terrainModel";

export function useRoadDesignStudioState() {
  const site = useWorkspaceStore((s) => s.site);
  const terrain = useMemo(() => (site ? buildTerrainModel(site) : null), [site]);
  const terrainSurface = terrain?.existing ?? null;

  const [activeTab, setActiveTab] = useState<
    "alignment" | "profile" | "assembly" | "corridor" | "intersection" | "sections"
  >("alignment");

  const [designSpeed, setDesignSpeed] = useState<number>(45);
  const [swathWidth] = useState<number>(50);
  const [sampleInterval] = useState<number>(50);

  const sampleAlignment: HorizontalAlignment = useMemo(() => {
    const b = site
      ? bounds(
          site.elements
            .map((e) => (isSpatialElement(e) ? e.boundary : []))
            .flat(),
        )
      : null;
    const minX = b ? b.minX : 0;
    const minY = b ? b.minY : 0;
    const maxX = b ? Math.max(b.maxX, minX + 500) : 1000;
    const maxY = b ? Math.max(b.maxY, minY + 300) : 600;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    return {
      id: `align-${site?.id || "site"}`,
      name: `${site?.name || "Site"} Highway Baseline`,
      startStation: 1000,
      designSpeed,
      pis: [
        { point: { x: minX, y: midY }, radius: 0 },
        { point: { x: midX, y: midY }, radius: Math.min(300, (maxX - minX) / 3) },
        { point: { x: maxX, y: maxY }, radius: 0 },
      ],
    };
  }, [site, designSpeed]);

  const resolvedAlign = useMemo(() => resolveAlignment(sampleAlignment), [sampleAlignment]);

  const alignmentChecks = useMemo(() => {
    if (!resolvedAlign) return [];
    return validateAlignmentDesignSpeed(sampleAlignment, resolvedAlign);
  }, [sampleAlignment, resolvedAlign]);

  const sampleProfile: VerticalProfile = useMemo(
    () => ({
      id: "prof-studio-1",
      name: `${site?.name || "Site"} Finished Grade`,
      alignmentId: sampleAlignment.id,
      pvis: [
        { station: 1000, elevation: 120 },
        { station: 1350, elevation: 138, curveLength: 150 },
        { station: 1700, elevation: 110, curveLength: 200 },
        { station: 2000, elevation: 125 },
      ],
    }),
    [sampleAlignment.id, site]
  );

  const profileKChecks = useMemo(
    () => validateProfileKValues(sampleProfile, designSpeed),
    [sampleProfile, designSpeed]
  );

  const sampleAssembly: Assembly = useMemo(
    () => ({
      id: "assy-studio-1",
      name: `${site?.name || "Site"} 2-Lane Arterial Assembly`,
      leftSubassemblies: getDefaultSubassemblies("left"),
      rightSubassemblies: mirrorSubassemblies(getDefaultSubassemblies("left"), "right"),
    }),
    [site]
  );

  const sampleGrid: ElevationGrid = useMemo(() => {
    const b = site
      ? bounds(
          site.elements
            .map((e) => (isSpatialElement(e) ? e.boundary : []))
            .flat(),
        )
      : null;
    const minX = b ? b.minX - 100 : -500;
    const minY = b ? b.minY - 100 : -500;
    const maxX = b ? b.maxX + 100 : 500;
    const maxY = b ? b.maxY + 100 : 500;
    const cols = 20;
    const rows = 20;
    const cellSize = Math.max((maxX - minX) / cols, (maxY - minY) / rows, 10);
    const heights = Array(cols * rows)
      .fill(0)
      .map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const px = minX + c * cellSize;
        const py = minY + r * cellSize;
        return terrainSurface ? elevationAt(terrainSurface, { x: px, y: py }) : 115;
      });

    return { origin: { x: minX, y: minY }, cellSize, cols, rows, heights };
  }, [site, terrainSurface]);

  const corridorSections = useMemo(() => {
    if (!resolvedAlign) return [];
    return buildCorridorSections(
      { id: "c1", name: "Corridor-1", alignmentId: sampleAlignment.id, profileId: sampleProfile.id, assemblyId: sampleAssembly.id, frequency: sampleInterval },
      sampleAlignment,
      sampleProfile,
      sampleAssembly,
      undefined,
      sampleGrid
    );
  }, [resolvedAlign, sampleAlignment, sampleProfile, sampleAssembly, sampleInterval, sampleGrid]);

  const featureLines = useMemo(() => extractCorridorFeatureLines(corridorSections), [corridorSections]);
  const surfaces = useMemo(() => buildCorridorSurfaces(corridorSections), [corridorSections]);

  const sampleSuper = useMemo(
    () => calculateSuperelevationRunoff(sampleAlignment, designSpeed),
    [sampleAlignment, designSpeed]
  );

  const sampleRoundabout: Roundabout = useMemo(
    () => ({
      id: "rb-1",
      name: "Community Interchange Roundabout",
      centerPoint: { x: 600, y: 300 },
      preset: {
        id: "std-1",
        name: "Standard Single-Lane Roundabout",
        outerRadius: 65,
        circulatoryWidth: 20,
        apronWidth: 8,
        entryWidth: 16,
        exitWidth: 16,
        splitterIsland: { constructionTriangleLength: 35, splitterIslandWidth: 6, crosswalkOffset: 10 },
      },
      approachAlignmentIds: [sampleAlignment.id],
    }),
    [sampleAlignment.id]
  );

  const roundaboutAnalysis = useMemo(
    () => analyzeRoundaboutFastestPath(65, 16, 20),
    []
  );

  const sampleLinesGroup: SampleLineGroup = useMemo(() => {
    if (!resolvedAlign) return { id: "slg-1", name: "Sample Lines", alignmentId: sampleAlignment.id, sampleLines: [] };
    return generateSampleLines(sampleAlignment, resolvedAlign, sampleInterval, swathWidth);
  }, [resolvedAlign, sampleAlignment, sampleInterval, swathWidth]);

  const earthworkQTO = useMemo(() => {
    if (!resolvedAlign) return null;
    return calculateEarthworkVolumes(sampleLinesGroup, sampleGrid, sampleGrid, resolvedAlign);
  }, [sampleLinesGroup, sampleGrid, resolvedAlign]);

  return {
    site,
    activeTab,
    setActiveTab,
    designSpeed,
    setDesignSpeed,
    sampleAlignment,
    resolvedAlign,
    alignmentChecks,
    sampleProfile,
    profileKChecks,
    sampleAssembly,
    corridorSections,
    featureLines,
    surfaces,
    sampleSuper,
    sampleRoundabout,
    roundaboutAnalysis,
    sampleLinesGroup,
    earthworkQTO,
  };
}
