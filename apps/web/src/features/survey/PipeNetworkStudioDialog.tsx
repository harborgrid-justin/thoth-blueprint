import React, { useState } from "react";
import {
  Droplets,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePipeStudioState } from "./hooks/usePipeStudioState";

interface PipeNetworkStudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PipeNetworkStudioDialog: React.FC<
  PipeNetworkStudioDialogProps
> = ({ isOpen, onClose }) => {
  const {
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
  } = usePipeStudioState();

  const [activeTab, setActiveTab] = useState<
    "layout" | "hydraulics" | "cover" | "rules"
  >("layout");

  if (!isOpen) return null;

  const handleCommit = () => {
    commitPipeNetwork();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-slate-950 border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Pipe Network & Stormwater Hydrology Studio
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Manning's HGL/EGL Solver • Rational Method Q=CIA • Cover Audits & Trench QTO
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

        {/* System Banner */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Pipe Utility Network:</span>
            <div className="flex gap-2">
              {(["storm", "sanitary", "water"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPipeType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize border transition ${
                    pipeType === t
                      ? "bg-blue-600 text-white border-blue-400"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-300 font-mono">
            <span>
              Req Diameter: <strong className="text-blue-400">{hydraulicResult.reqDiameterInches} inches</strong>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 space-x-2">
          {[
            { id: "layout", label: "1. Network Flow Parameters", icon: Sliders },
            { id: "hydraulics", label: "2. HGL & Manning's Hydraulics", icon: Activity },
            { id: "cover", label: "3. Cover Depth & Trenching", icon: TrendingUp },
            { id: "rules", label: "4. Hydraulic Rule Checks", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-blue-400 text-blue-400 bg-blue-500/10"
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
          {activeTab === "layout" && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-blue-300">Design Flow & Pipe Slope</h3>
                <div>
                  <Label className="text-xs text-slate-400">Design Peak Flow Q (cfs)</Label>
                  <Input
                    type="number"
                    value={designFlowCfs}
                    onChange={(e) => setDesignFlowCfs(Number(e.target.value))}
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-blue-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Pipe Slope ft/ft (e.g. 0.01 = 1%)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={pipeSlope}
                    onChange={(e) => setPipeSlope(Number(e.target.value))}
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-blue-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Manning's Roughness Coefficient n</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={manningN}
                    onChange={(e) => setManningN(Number(e.target.value))}
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-blue-300"
                  />
                </div>
              </div>

              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-blue-400 mb-3">Hydraulic Sizing Results</h3>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono space-y-2">
                    <div>
                      <span className="text-slate-400">Minimum Pipe Size: </span>
                      <strong className="text-blue-400 text-lg">{hydraulicResult.reqDiameterInches}"</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">HGL Peak Elevation: </span>
                      <strong className="text-cyan-400">{hydraulicResult.hglElev} ft</strong>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCommit}
                  className="mt-4 w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-2.5 rounded-xl shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Commit Pipe Network to Canvas
                </Button>
              </div>
            </div>
          )}

          {activeTab === "hydraulics" && (
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <h3 className="text-sm font-semibold text-blue-300">Manning's Hydraulic Equation Output</h3>
              <p className="text-slate-300">
                Formula: Q = (1.486 / n) * A * R^(2/3) * S^(1/2)
              </p>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span>Calculated Capacity: {designFlowCfs} cfs @ {pipeSlope * 100}% grade</span>
              </div>
            </div>
          )}

          {activeTab === "cover" && (
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
              <div>
                <Label className="text-xs text-slate-400">Minimum Cover Depth (ft)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={coverDepthFt}
                  onChange={(e) => setCoverDepthFt(Number(e.target.value))}
                  className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-blue-300"
                />
              </div>
            </div>
          )}

          {activeTab === "rules" && (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {hydraulicResult.experiences.map((exp, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-xs font-mono"
                >
                  <div>
                    <span className="text-blue-400 font-bold mr-2">[{exp.code}]</span>
                    <span className="text-slate-200">{exp.message}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                    {exp.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900 text-xs text-slate-400">
          <span>Pipe Network Studio: AASHTO Stormwater Compliant</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Create Pipe Network
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
