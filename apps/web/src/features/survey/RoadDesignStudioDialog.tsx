import React from "react";
import { cn } from "@/lib/utils";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";
import { exportAssemblySetToXML } from "@thoth/domain";
import { useRoadDesignStudioState } from "./hooks/useRoadDesignStudioState";

interface RoadDesignStudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoadDesignStudioDialog: React.FC<RoadDesignStudioDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeTab,
    setActiveTab,
    designSpeed,
    setDesignSpeed,
    resolvedAlign,
    alignmentChecks,
    profileKChecks,
    sampleAssembly,
    featureLines,
    surfaces,
    sampleSuper,
    sampleRoundabout,
    roundaboutAnalysis,
    earthworkQTO,
  } = useRoadDesignStudioState();

  if (!isOpen) return null;

  return (
    <div className={SURVEY_STYLES.dialogOverlay}>
      <div className={SURVEY_STYLES.dialogContainer}>
        {/* Header */}
        <div className={SURVEY_STYLES.dialogHeader}>
          <div className="flex items-center space-x-3">
            <span className={SURVEY_STYLES.dialogTitle}>Road Design & Traceability Studio</span>
            <span className={SURVEY_STYLES.badge}>REQ-10 through REQ-21</span>
          </div>
          <button
            onClick={onClose}
            className={SURVEY_STYLES.btnClose}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={SURVEY_STYLES.tabBar}>
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
              className={activeTab === tab.id ? SURVEY_STYLES.btnTabActive : SURVEY_STYLES.btnTab}
            >
              {tab.label}
            </button>
          ))}
        </div>        {/* Tab Content */}
        <div className={SURVEY_STYLES.dialogBody}>
          {activeTab === "alignment" && (
            <div className="space-y-4">
              <div className={SURVEY_STYLES.grid3Col}>
                <div className={SURVEY_STYLES.card}>
                  <label className={SURVEY_STYLES.label}>Design Speed (mph)</label>
                  <input
                    type="number"
                    value={designSpeed}
                    onChange={(e) => setDesignSpeed(Number(e.target.value))}
                    className={SURVEY_STYLES.input}
                  />
                </div>
                <div className={SURVEY_STYLES.card}>
                  <label className={SURVEY_STYLES.statLabel}>Alignment Length</label>
                  <div className={SURVEY_STYLES.statValue}>
                    {resolvedAlign ? `${resolvedAlign.length.toFixed(2)} ft` : "0 ft"}
                  </div>
                </div>
                <div className={SURVEY_STYLES.card}>
                  <label className={SURVEY_STYLES.statLabel}>Curves Solved</label>
                  <div className={SURVEY_STYLES.statValue}>
                    {resolvedAlign ? resolvedAlign.curves.length : 0}
                  </div>
                </div>
              </div>

              <div className={SURVEY_STYLES.card}>
                <h3 className={SURVEY_STYLES.textSectionTitle}>AASHTO Horizontal Design Checks</h3>
                <div className="space-y-2 mt-3">
                  {alignmentChecks.map((c, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded text-xs font-mono flex justify-between items-center",
                        c.isViolation
                          ? "bg-rose-950/40 text-rose-300 border border-rose-800/60"
                          : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                      )}
                    >
                      <span>{c.message}</span>
                      <span className={c.isViolation ? "font-bold text-rose-400" : "font-bold text-emerald-400"}>
                        {c.isViolation ? "VIOLATION" : "PASS"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className={SURVEY_STYLES.card}>
                <h3 className={SURVEY_STYLES.textSectionTitle}>Vertical Sight Distance K-Value Checks</h3>
                <div className="space-y-2 mt-3">
                  {profileKChecks.map((kc, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded text-xs font-mono flex justify-between items-center",
                        kc.isViolation
                          ? "bg-rose-950/40 text-rose-300 border border-rose-800/60"
                          : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
                      )}
                    >
                      <span>{kc.message}</span>
                      <span className={kc.isViolation ? "font-bold text-rose-400" : "font-bold text-emerald-400"}>
                        {kc.isViolation ? "NON-COMPLIANT" : "PASS"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "assembly" && (
            <div className="space-y-4">
              <div className={SURVEY_STYLES.card}>
                <h3 className={SURVEY_STYLES.textSectionTitle}>Assembly Set XML Definition (REQ-17-018)</h3>
                <pre className="p-3 bg-background rounded text-xs font-mono text-amber-300 overflow-x-auto border border-border mt-3">
                  {exportAssemblySetToXML(sampleAssembly)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "corridor" && (
            <div className="space-y-4">
              <div className={SURVEY_STYLES.grid2Col}>
                <div className={SURVEY_STYLES.card}>
                  <h3 className={SURVEY_STYLES.textSectionTitle}>Corridor Feature Lines Extracted</h3>
                  <ul className="space-y-1 text-xs font-mono text-muted-foreground mt-3">
                    {featureLines.map((fl, i) => (
                      <li key={i} className="flex justify-between border-b border-border/50 py-1">
                        <span>Code: {fl.code}</span>
                        <span className="text-amber-400 font-bold">{fl.points.length} points</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={SURVEY_STYLES.card}>
                  <h3 className={SURVEY_STYLES.textSectionTitle}>Generated 3D Top TIN Mesh</h3>
                  <div className={SURVEY_STYLES.statValue + " mt-3 text-2xl"}>
                    {surfaces.topMesh.length} Triangles
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "intersection" && (
            <div className="space-y-4">
              <div className={SURVEY_STYLES.card}>
                <h3 className={SURVEY_STYLES.textSectionTitle}>Roundabout Fastest Path Analysis (AASHTO)</h3>
                <div className={SURVEY_STYLES.textMuted + " mt-1 mb-3"}>
                  Preset: {sampleRoundabout.preset.name} | Max Superelevation eMax: {(sampleSuper.eMax * 100).toFixed(1)}%
                </div>
                <div className={SURVEY_STYLES.grid3Col}>
                  <div className={SURVEY_STYLES.cardSubtle}>
                    <span className={SURVEY_STYLES.statLabel}>Max Entry Speed</span>
                    <div className={SURVEY_STYLES.statValue}>{roundaboutAnalysis.maxEntrySpeedMph.toFixed(1)} mph</div>
                  </div>
                  <div className={SURVEY_STYLES.cardSubtle}>
                    <span className={SURVEY_STYLES.statLabel}>Circulatory Speed</span>
                    <div className={SURVEY_STYLES.statValue}>{roundaboutAnalysis.maxCirculatorySpeedMph.toFixed(1)} mph</div>
                  </div>
                  <div className={SURVEY_STYLES.cardSubtle}>
                    <span className={SURVEY_STYLES.statLabel}>Compliance Status</span>
                    <div className={roundaboutAnalysis.isCompliant ? "text-lg font-bold text-emerald-400" : "text-lg font-bold text-rose-400"}>
                      {roundaboutAnalysis.isCompliant ? "PASS (≤25 mph)" : "EXCEEDED"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sections" && (
            <div className="space-y-4">
              <div className={SURVEY_STYLES.card}>
                <h3 className={SURVEY_STYLES.textSectionTitle}>Average End Area Earthwork Volumes (QTO)</h3>
                {earthworkQTO && (
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr>
                          <th className={SURVEY_STYLES.tableTh}>Station</th>
                          <th className={SURVEY_STYLES.tableTh}>Cut Area (sq ft)</th>
                          <th className={SURVEY_STYLES.tableTh}>Fill Area (sq ft)</th>
                          <th className={SURVEY_STYLES.tableTh}>Cut Vol (cu yd)</th>
                          <th className={SURVEY_STYLES.tableTh}>Fill Vol (cu yd)</th>
                          <th className={SURVEY_STYLES.tableTh}>Cum Net (cu yd)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {earthworkQTO.items.map((item, i) => (
                          <tr key={i} className={SURVEY_STYLES.tableRow}>
                            <td className={SURVEY_STYLES.tableTd + " text-amber-400 font-bold"}>{item.station.toFixed(0)}</td>
                            <td className={SURVEY_STYLES.tableTd}>{item.cutAreaSqFt.toFixed(1)}</td>
                            <td className={SURVEY_STYLES.tableTd}>{item.fillAreaSqFt.toFixed(1)}</td>
                            <td className={SURVEY_STYLES.tableTd + " text-rose-400 font-bold"}>{item.cutVolumeCuYd.toFixed(1)}</td>
                            <td className={SURVEY_STYLES.tableTd + " text-emerald-400 font-bold"}>{item.fillVolumeCuYd.toFixed(1)}</td>
                            <td className={SURVEY_STYLES.tableTd + " font-bold text-foreground"}>{item.cumulativeNetCuYd.toFixed(1)}</td>
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
        <div className={SURVEY_STYLES.dialogFooter}>
          <span>Domain Solvers: ISO/IEC/IEEE 29148 Compliant</span>
          <button
            onClick={onClose}
            className={SURVEY_STYLES.btnPrimary}
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
