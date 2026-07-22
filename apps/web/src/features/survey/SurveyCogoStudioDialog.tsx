import React, { useState } from "react";
import {
  Compass,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Plus,
  Trash2,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSurveyCogoStudioState } from "./hooks/useSurveyCogoStudioState";

interface SurveyCogoStudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SurveyCogoStudioDialog: React.FC<
  SurveyCogoStudioDialogProps
> = ({ isOpen, onClose }) => {
  const {
    legs,
    newBearing,
    setNewBearing,
    newDistance,
    setNewDistance,
    addLeg,
    removeLeg,
    traverseResult,
    commitTraversePlat,
  } = useSurveyCogoStudioState();

  const [activeTab, setActiveTab] = useState<
    "traverse" | "closure" | "report"
  >("traverse");

  if (!isOpen) return null;

  const handleCommit = () => {
    commitTraversePlat();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-slate-950 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Survey & COGO Plat Studio
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Metes & Bounds Traverse • Compass Rule Closure • Legal Description Output
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 space-x-2">
          {[
            { id: "traverse", label: "1. Metes & Bounds Traverse Entry", icon: Sliders },
            { id: "closure", label: "2. Closure Audit & Compass Adjustment", icon: ShieldCheck },
            { id: "report", label: "3. Legal Description Plat Output", icon: ScrollText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-amber-400 text-amber-400 bg-amber-500/10"
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
          {activeTab === "traverse" && (
            <div className="grid grid-cols-3 gap-6">
              {/* Add Leg Form */}
              <div className="space-y-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-amber-300">Add Traverse Leg</h3>
                <div>
                  <Label className="text-xs text-slate-400">Bearing (Quad/Deg/Min/Sec)</Label>
                  <Input
                    type="text"
                    value={newBearing}
                    onChange={(e) => setNewBearing(e.target.value)}
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-amber-300"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Distance (ft)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newDistance}
                    onChange={(e) => setNewDistance(Number(e.target.value))}
                    className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-amber-300"
                  />
                </div>
                <Button onClick={addLeg} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-2">
                  <Plus className="w-4 h-4 mr-1" /> Add Leg to Traverse
                </Button>
              </div>

              {/* Legs Table */}
              <div className="col-span-2 bg-slate-900/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Traverse Call Table ({legs.length} Legs)</h3>
                  <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar">
                    {legs.map((leg, idx) => (
                      <div
                        key={leg.id}
                        className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono"
                      >
                        <div>
                          <span className="text-amber-400 font-bold mr-3">Call {idx + 1}:</span>
                          <span className="text-slate-200 mr-4">{leg.bearing}</span>
                          <span className="text-emerald-400">{leg.distanceFt} ft</span>
                        </div>
                        <button
                          onClick={() => removeLeg(leg.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCommit}
                  className="mt-4 w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold py-2.5 rounded-xl shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Commit Traverse Boundary to Canvas
                </Button>
              </div>
            </div>
          )}

          {activeTab === "closure" && (
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-amber-300">Compass Rule Closure Analysis</h3>
              <div className="grid grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400">Total Perimeter:</span>
                  <div className="text-lg font-bold text-slate-100">{traverseResult.totalDist} ft</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400">Linear Error:</span>
                  <div className="text-lg font-bold text-amber-400">{traverseResult.closureErrorFt} ft</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400">Closure Precision Ratio:</span>
                  <div className="text-lg font-bold text-emerald-400">1 : {traverseResult.closureRatio.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "report" && (
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <h3 className="text-sm font-semibold text-amber-300">Generated Legal Description</h3>
              <div className="p-4 bg-slate-950 rounded border border-slate-800 text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                BEGINNING at a point; thence {legs.map((l) => `${l.bearing} a distance of ${l.distanceFt} feet`).join("; thence ")}; to the POINT OF BEGINNING.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900 text-xs text-slate-400">
          <span>Survey Studio: ALTA / NSPS Boundary Standard</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Create COGO Parcel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
