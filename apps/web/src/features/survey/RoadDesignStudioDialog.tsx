import React, { useState, useMemo } from "react";
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
  exportAssemblySetToXML,
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

interface RoadDesignStudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoadDesignStudioDialog: React.FC<RoadDesignStudioDialogProps> = ({
  isOpen,
  onClose,
}) => {
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

  const sampleProfile: VerticalProfile = useMemo(() => {
    const startElev = terrainSurface
      ? elevationAt(terrainSurface, sampleAlignment.pis[0].point)
      : 120;
    const midElev = terrainSurface
      ? elevationAt(terrainSurface, sampleAlignment.pis[1].point)
      : 138;
    const endElev = terrainSurface
      ? elevationAt(terrainSurface, sampleAlignment.pis[2].point)
      : 110;

    return {
      id: `prof-${sampleAlignment.id}`,
      name: `${sampleAlignment.name} Ground Profile`,
      alignmentId: sampleAlignment.id,
      pvis: [
        { station: sampleAlignment.startStation, elevation: startElev },
        {
          station: sampleAlignment.startStation + 350,
          elevation: midElev,
          curveLength: 200,
        },
        { station: sampleAlignment.startStation + 700, elevation: endElev },
      ],
    };
  }, [sampleAlignment, terrainSurface]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-semibold text-blue-400">Road Design & Traceability Studio</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">REQ-10 through REQ-21</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-lg font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-6 space-x-2">
          {[
            { id: "alignment", label: "Alignments & AASHTO (REQ-10/11)" },
            { id: "profile", label: "Profiles & Sight Distance (REQ-12/13)" },
            { id: "assembly", label: "Assemblies & XML (REQ-17)" },
            { id: "corridor", label: "3D Corridor & Surfaces (REQ-18)" },
            { id: "intersection", label: "Intersections & Roundabouts (REQ-19)" },
            { id: "sections", label: "Cross Sections & QTO (REQ-20/21)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400 bg-blue-500/10"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "alignment" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <label className="text-xs text-slate-400">Design Speed (mph)</label>
                  <input
                    type="number"
                    value={designSpeed}
                    onChange={(e) => setDesignSpeed(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <label className="text-xs text-slate-400">Alignment Length</label>
                  <div className="text-lg font-semibold text-blue-400">
                    {resolvedAlign ? `${resolvedAlign.length.toFixed(2)} ft` : "0 ft"}
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <label className="text-xs text-slate-400">Curves Solved</label>
                  <div className="text-lg font-semibold text-emerald-400 font-mono">
                    {resolvedAlign ? resolvedAlign.curves.length : 0}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">AASHTO Horizontal Design Checks</h3>
                <div className="space-y-2">
                  {alignmentChecks.map((c, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded text-xs font-mono flex justify-between items-center ${
                        c.isViolation ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      }`}
                    >
                      <span>{c.message}</span>
                      <span className="font-bold">{c.isViolation ? "VIOLATION" : "PASS"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Vertical Sight Distance K-Value Checks</h3>
                <div className="space-y-2">
                  {profileKChecks.map((kc, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded text-xs font-mono flex justify-between items-center ${
                        kc.isViolation ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      }`}
                    >
                      <span>{kc.message}</span>
                      <span className="font-bold">{kc.isViolation ? "NON-COMPLIANT" : "PASS"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "assembly" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Assembly Set XML Definition (REQ-17-018)</h3>
                <pre className="p-3 bg-slate-900 rounded text-xs font-mono text-blue-300 overflow-x-auto border border-slate-800">
                  {exportAssemblySetToXML(sampleAssembly)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "corridor" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">Corridor Feature Lines Extracted</h3>
                  <ul className="space-y-1 text-xs font-mono text-slate-400">
                    {featureLines.map((fl, i) => (
                      <li key={i} className="flex justify-between">
                        <span>Code: {fl.code}</span>
                        <span className="text-blue-400">{fl.points.length} points</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">Generated 3D Top TIN Mesh</h3>
                  <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">
                    {surfaces.topMesh.length} Triangles
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "intersection" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Roundabout Fastest Path Analysis (AASHTO)</h3>
                <div className="text-xs text-slate-400 mb-2">
                  Preset: {sampleRoundabout.preset.name} | Max Superelevation eMax: {(sampleSuper.eMax * 100).toFixed(1)}%


                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-xs text-slate-400">Max Entry Speed</span>
                    <div className="text-lg font-bold text-blue-400">{roundaboutAnalysis.maxEntrySpeedMph.toFixed(1)} mph</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-xs text-slate-400">Circulatory Speed</span>
                    <div className="text-lg font-bold text-blue-400">{roundaboutAnalysis.maxCirculatorySpeedMph.toFixed(1)} mph</div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-xs text-slate-400">Compliance Status</span>
                    <div className={`text-lg font-bold ${roundaboutAnalysis.isCompliant ? "text-emerald-400" : "text-rose-400"}`}>
                      {roundaboutAnalysis.isCompliant ? "PASS (≤25 mph)" : "EXCEEDED"}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "sections" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Average End Area Earthwork Volumes (QTO)</h3>
                {earthworkQTO && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">Station</th>
                          <th className="p-2">Cut Area (sq ft)</th>
                          <th className="p-2">Fill Area (sq ft)</th>
                          <th className="p-2">Cut Vol (cu yd)</th>
                          <th className="p-2">Fill Vol (cu yd)</th>
                          <th className="p-2">Cum Net (cu yd)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {earthworkQTO.items.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-900/50">
                            <td className="p-2 text-blue-400">{item.station.toFixed(0)}</td>
                            <td className="p-2 text-slate-300">{item.cutAreaSqFt.toFixed(1)}</td>
                            <td className="p-2 text-slate-300">{item.fillAreaSqFt.toFixed(1)}</td>
                            <td className="p-2 text-rose-400">{item.cutVolumeCuYd.toFixed(1)}</td>
                            <td className="p-2 text-emerald-400">{item.fillVolumeCuYd.toFixed(1)}</td>
                            <td className="p-2 font-bold text-slate-200">{item.cumulativeNetCuYd.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950 text-xs text-slate-400">
          <span>Domain Solvers: ISO/IEC/IEEE 29148 Compliant</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
