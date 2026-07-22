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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Grid2x2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Subdivision Studio & Layout Solvers
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Automated Slide/Swing Partitioning • GEOID Zoning Rules • Cul-de-Sac Bulbs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-lg font-bold px-2.5 py-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Parcel Selector Banner */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Target Boundary:</span>
            <select
              value={selectedParcelId || (targetParcel?.id ?? "")}
              onChange={(e) => setSelectedParcelId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-xs text-cyan-300 outline-none focus:border-cyan-500"
            >
              {candidateParcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.id} ({p.boundary.length} vertices)
                </option>
              ))}
            </select>
          </div>
          {targetParcel && (
            <div className="flex items-center gap-4 text-slate-300 font-mono">
              <span>
                Layer: <strong className="text-cyan-400">{targetParcel.layerId}</strong>
              </span>
              <span>
                Generated Lots: <strong className="text-emerald-400">{subdivisionResult.lots.length}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 space-x-2">
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
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-cyan-400 text-cyan-400 bg-cyan-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "partition" && (
            <div className="grid grid-cols-2 gap-6">
              {/* Controls */}
              <div className="space-y-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> Partitioning Mode & Parameters
                </h3>

                <div className="flex gap-3">
                  <button
                    onClick={() => setMethod("slide")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                      method === "slide"
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/20"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    Slide Line (Parallel)
                  </button>
                  <button
                    onClick={() => setMethod("swing")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                      method === "swing"
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/20"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    Swing Line (Radial Pivot)
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs text-slate-400">Target Lot Area (sq ft)</Label>
                    <Input
                      type="number"
                      value={zoning.minLotAreaSqFt}
                      onChange={(e) =>
                        setZoning({ ...zoning, minLotAreaSqFt: Number(e.target.value) })
                      }
                      className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-cyan-300"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-400">Cut Angle (deg relative to frontage)</Label>
                    <Input
                      type="number"
                      value={cutAngle}
                      onChange={(e) => setCutAngle(Number(e.target.value))}
                      className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-cyan-300"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-400">Minimum Frontage Width (ft)</Label>
                    <Input
                      type="number"
                      value={zoning.minFrontageFt}
                      onChange={(e) =>
                        setZoning({ ...zoning, minFrontageFt: Number(e.target.value) })
                      }
                      className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-cyan-300"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Preview Grid */}
              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4" /> Live Auto-Subdivision Preview
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400">Lots Generated</span>
                      <div className="text-2xl font-bold text-cyan-400 font-mono">
                        {subdivisionResult.lots.length}
                      </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-[11px] text-slate-400">Target Lot Size</span>
                      <div className="text-lg font-semibold text-emerald-400 font-mono">
                        {zoning.minLotAreaSqFt.toLocaleString()} sq ft
                      </div>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {subdivisionResult.lots.map((lot) => (
                      <div
                        key={lot.id}
                        className="flex justify-between items-center p-2 rounded bg-slate-950/80 border border-slate-800/80 text-xs font-mono"
                      >
                        <span className="text-slate-300 font-semibold">{lot.name}</span>
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
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-xs font-bold">{key}</div>
                    <div className="text-[10px] opacity-75 truncate">{ZONING_PRESETS[key].name}</div>
                  </button>
                ))}
              </div>

              {/* Detailed Zoning Specs */}
              <div className="grid grid-cols-3 gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                <div>
                  <Label className="text-xs text-slate-400">Front Setback (ft)</Label>
                  <Input
                    type="number"
                    value={zoning.frontSetbackFt}
                    onChange={(e) =>
                      setZoning({ ...zoning, frontSetbackFt: Number(e.target.value) })
                    }
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Rear Setback (ft)</Label>
                  <Input
                    type="number"
                    value={zoning.rearSetbackFt}
                    onChange={(e) =>
                      setZoning({ ...zoning, rearSetbackFt: Number(e.target.value) })
                    }
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Side Setbacks (ft)</Label>
                  <Input
                    type="number"
                    value={zoning.sideSetbackFt}
                    onChange={(e) =>
                      setZoning({ ...zoning, sideSetbackFt: Number(e.target.value) })
                    }
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Max Depth-to-Width Ratio</Label>
                  <Input
                    type="number"
                    value={zoning.maxAspectDepthToWidth}
                    onChange={(e) =>
                      setZoning({ ...zoning, maxAspectDepthToWidth: Number(e.target.value) })
                    }
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-cyan-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Public Utility Easement (ft)</Label>
                  <Input
                    type="number"
                    value={zoning.pueWidthFt}
                    onChange={(e) =>
                      setZoning({ ...zoning, pueWidthFt: Number(e.target.value) })
                    }
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-cyan-300"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "turnaround" && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
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
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
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
              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Subdivision Rule Checks & Experience Results
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {subdivisionResult.experiences.map((exp, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-xs font-mono"
                    >
                      <div>
                        <span className="text-cyan-400 font-bold mr-2">[{exp.code}]</span>
                        <span className="text-slate-200">{exp.message}</span>
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900 text-xs text-slate-400">
          <span>Subdivision Studio Engine: ISO/IEC 29148 Compliant</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
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
