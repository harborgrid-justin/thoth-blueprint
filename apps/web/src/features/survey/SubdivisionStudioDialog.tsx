import React, { useState } from "react";
import {
  Grid2x2,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Building,
  Compass,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSubdivisionStudioState,
  ZONING_PRESETS,
  type ZoningPreset,
} from "./hooks/useSubdivisionStudioState";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

interface SubdivisionStudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubdivisionStudioDialog: React.FC<
  SubdivisionStudioDialogProps
> = ({ isOpen, onClose }) => {
  const {
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
  } = useSubdivisionStudioState();

  const [activeTab, setActiveTab] = useState<
    "partition" | "zoning" | "turnaround" | "yield"
  >("partition");

  if (!isOpen) return null;

  const handleCommit = () => {
    commitToCanvas();
    onClose();
  };

  return (
    <div className={SURVEY_STYLES.dialogOverlay + " animate-overlay-in"}>
      <div className={SURVEY_STYLES.dialogContainer}>
        {/* Header */}
        <div className={SURVEY_STYLES.dialogHeader}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Grid2x2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className={SURVEY_STYLES.dialogTitle}>
                Subdivision Studio & Layout Solvers
              </h2>
              <p className={SURVEY_STYLES.textSubtitle}>
                Automated Slide/Swing Partitioning • GEOID Zoning Rules • Cul-de-Sac Bulbs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={SURVEY_STYLES.btnClose}
          >
            ✕
          </button>
        </div>

        {/* Parcel Selector Banner */}
        <div className={SURVEY_STYLES.banner}>
          <div className="flex items-center gap-3">
            <span className={SURVEY_STYLES.label}>Target Boundary:</span>
            <select
              value={selectedParcelId || (targetParcel?.id ?? "")}
              onChange={(e) => setSelectedParcelId(e.target.value)}
              className={SURVEY_STYLES.select}
            >
              {candidateParcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.id} ({p.boundary.length} vertices)
                </option>
              ))}
            </select>
          </div>
          {targetParcel && (
            <div className="flex items-center gap-4 text-muted-foreground font-mono">
              <span>
                Layer: <strong className="text-amber-400">{targetParcel.layerId}</strong>
              </span>
              <span>
                Generated Lots: <strong className="text-emerald-400">{subdivisionResult.lots.length}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className={SURVEY_STYLES.tabBar}>
          {[
            { id: "partition", label: "1. Partition Solvers", icon: Sliders },
            { id: "zoning", label: "2. Zoning & Setbacks", icon: Building },
            { id: "turnaround", label: "3. Cul-de-Sac & Access", icon: Compass },
            { id: "yield", label: "4. Yield & Rule Checks", icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={activeTab === tab.id ? SURVEY_STYLES.btnTabActive : SURVEY_STYLES.btnTab}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className={SURVEY_STYLES.dialogBody}>
          {activeTab === "partition" && (
            <div className={SURVEY_STYLES.grid2Col}>
              {/* Controls */}
              <div className={SURVEY_STYLES.card + " space-y-4"}>
                <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> Partitioning Mode & Parameters
                </h3>

                <div className="flex gap-3">
                  <button
                    onClick={() => setMethod("slide")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                      method === "slide"
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/20"
                        : "bg-background text-muted-foreground border-border hover:bg-card"
                    }`}
                  >
                    Slide Line (Parallel)
                  </button>
                  <button
                    onClick={() => setMethod("swing")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                      method === "swing"
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/20"
                        : "bg-background text-muted-foreground border-border hover:bg-card"
                    }`}
                  >
                    Swing Line (Radial Pivot)
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Target Lot Area (sq ft)</Label>
                    <Input
                      type="number"
                      value={zoning.minLotAreaSqFt}
                      onChange={(e) =>
                        setZoning({ ...zoning, minLotAreaSqFt: Number(e.target.value) })
                      }
                      className="mt-1 bg-background border-border text-xs font-mono text-cyan-300"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Cut Angle (deg relative to frontage)</Label>
                    <Input
                      type="number"
                      value={cutAngle}
                      onChange={(e) => setCutAngle(Number(e.target.value))}
                      className="mt-1 bg-background border-border text-xs font-mono text-cyan-300"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Minimum Frontage Width (ft)</Label>
                    <Input
                      type="number"
                      value={zoning.minFrontageFt}
                      onChange={(e) =>
                        setZoning({ ...zoning, minFrontageFt: Number(e.target.value) })
                      }
                      className="mt-1 bg-background border-border text-xs font-mono text-cyan-300"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Preview Grid */}
              <div className="bg-card/60 p-5 rounded-xl border border-border flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4" /> Live Auto-Subdivision Preview
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-background p-3 rounded-lg border border-border">
                      <span className="text-[11px] text-muted-foreground">Lots Generated</span>
                      <div className="text-2xl font-bold text-cyan-400 font-mono">
                        {subdivisionResult.lots.length}
                      </div>
                    </div>
                    <div className="bg-background p-3 rounded-lg border border-border">
                      <span className="text-[11px] text-muted-foreground">Target Lot Size</span>
                      <div className="text-lg font-semibold text-emerald-400 font-mono">
                        {zoning.minLotAreaSqFt.toLocaleString()} sq ft
                      </div>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {subdivisionResult.lots.map((lot) => (
                      <div
                        key={lot.id}
                        className="flex justify-between items-center p-2 rounded bg-background/80 border border-border/80 text-xs font-mono"
                      >
                        <span className="text-muted-foreground font-semibold">{lot.name}</span>
                        <span className="text-cyan-400">{lot.boundary.length} vertices</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCommit}
                  className="mt-4 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2.5 rounded-xl shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Commit {subdivisionResult.lots.length} Lots to Canvas
                </Button>
              </div>
            </div>
          )}

          {activeTab === "zoning" && (
            <div className="space-y-6">
              {/* Preset Buttons */}
              <div className="grid grid-cols-5 gap-3">
                {(Object.keys(ZONING_PRESETS) as ZoningPreset[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => changePreset(key)}
                    className={`p-3 rounded-xl border text-left transition ${
                      preset === key
                        ? "bg-cyan-950/60 border-cyan-400 text-cyan-300"
                        : "bg-card border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="text-xs font-bold">{key}</div>
                    <div className="text-[10px] opacity-75 truncate">{ZONING_PRESETS[key].name}</div>
                  </button>
                ))}
              </div>

              {/* Detailed Zoning Specs */}
              <div className="grid grid-cols-3 gap-4 bg-card/60 p-5 rounded-xl border border-border">
                <div>
                  <Label className="text-xs text-muted-foreground">Front Setback (ft)</Label>
                  <Input
                    type="number"
                    value={zoning.frontSetbackFt}
                    onChange={(e) =>
                      setZoning({ ...zoning, frontSetbackFt: Number(e.target.value) })
                    }
                    className="mt-1 bg-background border-border text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rear Setback (ft)</Label>
                  <Input
                    type="number"
                    value={zoning.rearSetbackFt}
                    onChange={(e) =>
                      setZoning({ ...zoning, rearSetbackFt: Number(e.target.value) })
                    }
                    className="mt-1 bg-background border-border text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Side Setbacks (ft)</Label>
                  <Input
                    type="number"
                    value={zoning.sideSetbackFt}
                    onChange={(e) =>
                      setZoning({ ...zoning, sideSetbackFt: Number(e.target.value) })
                    }
                    className="mt-1 bg-background border-border text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max Depth-to-Width Ratio</Label>
                  <Input
                    type="number"
                    value={zoning.maxAspectDepthToWidth}
                    onChange={(e) =>
                      setZoning({ ...zoning, maxAspectDepthToWidth: Number(e.target.value) })
                    }
                    className="mt-1 bg-background border-border text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Public Utility Easement (ft)</Label>
                  <Input
                    type="number"
                    value={zoning.pueWidthFt}
                    onChange={(e) =>
                      setZoning({ ...zoning, pueWidthFt: Number(e.target.value) })
                    }
                    className="mt-1 bg-background border-border text-xs font-mono text-cyan-300"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "turnaround" && (
            <div className="space-y-4">
              <div className="bg-card/60 p-5 rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-cyan-300 mb-4">
                  Cul-de-Sac Bulb & Emergency Turnaround Solvers
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      type: "cul-de-sac",
                      title: "Cul-de-Sac R/W Bulb",
                      desc: "50 ft Fire Engine radius turnaround bulb (AASHTO / IFC)",
                    },
                    {
                      type: "hammerhead",
                      title: "T-Hammerhead Turnaround",
                      desc: "60 ft x 20 ft emergency turnaround per IFC Appendix D",
                    },
                    {
                      type: "panhandle",
                      title: "Ingress-Egress Panhandle",
                      desc: "20 ft wide access easement for landlocked lots",
                    },
                  ].map((t) => (
                    <button
                      key={t.type}
                      onClick={() => setTurnaroundType(t.type as any)}
                      className={`p-4 rounded-xl border text-left transition ${
                        turnaroundType === t.type
                          ? "bg-cyan-950/60 border-cyan-400 text-cyan-300"
                          : "bg-background border-border text-muted-foreground hover:bg-card"
                      }`}
                    >
                      <div className="font-bold text-xs mb-1">{t.title}</div>
                      <div className="text-[11px] opacity-75">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "yield" && (
            <div className="space-y-4">
              <div className="bg-card/60 p-5 rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Subdivision Rule Checks & Experience Results
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {subdivisionResult.experiences.map((exp, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-background border border-border flex justify-between items-center text-xs font-mono"
                    >
                      <div>
                        <span className="text-cyan-400 font-bold mr-2">[{exp.code}]</span>
                        <span className="text-foreground">{exp.message}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        {exp.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card text-xs text-muted-foreground">
          <span>Subdivision Studio Engine: ISO/IEC 29148 Compliant</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-input text-muted-foreground">
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Subdivide & Create Lots
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
