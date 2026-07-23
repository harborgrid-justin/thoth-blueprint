import React, { useState } from "react";
import {
  Mountain,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGradingStudioState } from "./hooks/useGradingStudioState";

import { CIVIL_STYLES } from "./styles/civilDesignSystem";

interface GradingStudioDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GradingStudioDialog: React.FC<GradingStudioDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    candidateRegions,
    selectedRegionId,
    setSelectedRegionId,
    targetRegion,
    targetPadElev,
    setTargetPadElev,
    cutRatio,
    setCutRatio,
    fillRatio,
    setFillRatio,
    shrinkFactor,
    setShrinkFactor,
    swellFactor,
    setSwellFactor,
    gradingAnalysis,
    autoOptimizePadElev,
    commitGradingPad,
  } = useGradingStudioState();

  const [activeTab, setActiveTab] = useState<
    "pad" | "daylight" | "volumes" | "rules"
  >("pad");

  if (!isOpen) return null;

  const handleCommit = () => {
    commitGradingPad();
    onClose();
  };

  return (
    <div className={CIVIL_STYLES.dialogOverlay}>
      <div className={CIVIL_STYLES.dialogContainerEmerald}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Mountain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Grading & Earthwork Studio
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Zero-Volume Cut/Fill Pad Optimization • Daylighting Slopes • Mass Haul QTO
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCutRatio(2.0);
                setFillRatio(3.0);
                setShrinkFactor(1.0);
                setSwellFactor(1.0);
              }}
              className="text-xs text-muted-foreground hover:text-white px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
              title="Reset parameters to engineering defaults"
            >
              Reset Defaults
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-lg font-bold px-2.5 py-1 rounded-lg hover:bg-muted"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Region Selector Banner */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-card border-b border-border text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">Target Grading Pad:</span>
            <select
              value={selectedRegionId || (targetRegion?.id ?? "")}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className="bg-background border border-input rounded-lg px-3 py-1 text-xs text-emerald-300 outline-none focus:border-emerald-500"
            >
              {candidateRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.id} ({(r as any).kind || "region"})
                </option>
              ))}
            </select>
          </div>
          {targetRegion && (
            <div className="flex items-center gap-4 text-muted-foreground font-mono">
              <span>
                Area: <strong className="text-emerald-400">{gradingAnalysis.areaSqFt?.toLocaleString() ?? 0} sq ft</strong>
              </span>
              <span>
                Net Earthwork: <strong className={gradingAnalysis.netVol >= 0 ? "text-amber-400" : "text-cyan-400"}>{gradingAnalysis.netVol} cu yd</strong>
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-background px-6 space-x-2">
          {[
            { id: "pad", label: "1. Pad Elevation & Solvers", icon: Sliders },
            { id: "daylight", label: "2. Daylighting Slopes", icon: Layers },
            { id: "volumes", label: "3. Earthwork Volumes QTO", icon: TrendingUp },
            { id: "rules", label: "4. IBC & Slope Rules", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-emerald-400 text-emerald-400 bg-emerald-500/10"
                    : "border-transparent text-muted-foreground hover:text-foreground"
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
          {activeTab === "pad" && (
            <div className="grid grid-cols-2 gap-6">
              {/* Elevation Controls */}
              <div className="space-y-4 bg-card/60 p-5 rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> Pad Target Elevation & Zero-Volume Solver
                </h3>

                <div>
                  <Label className="text-xs text-muted-foreground">Pad Elevation (ft MSL)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={targetPadElev}
                    onChange={(e) => setTargetPadElev(Number(e.target.value))}
                    className="mt-1 bg-background border-border text-xs font-mono text-emerald-300"
                  />
                </div>

                <Button
                  onClick={autoOptimizePadElev}
                  className="w-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80 text-xs font-semibold py-2"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Auto-Optimize Zero-Volume Pad Elevation ({gradingAnalysis.balancedElev}')
                </Button>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Shrink Factor (% Factor)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={shrinkFactor}
                      onChange={(e) => setShrinkFactor(Number(e.target.value))}
                      className="mt-1 bg-background border-border text-xs font-mono text-emerald-300"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Swell Factor (% Factor)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={swellFactor}
                      onChange={(e) => setSwellFactor(Number(e.target.value))}
                      className="mt-1 bg-background border-border text-xs font-mono text-emerald-300"
                    />
                  </div>
                </div>
              </div>

              {/* Earthwork Live Totals */}
              <div className="bg-card/60 p-5 rounded-xl border border-border flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Live Earthwork Balance
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-background p-3 rounded-lg border border-border">
                      <span className="text-[11px] text-muted-foreground">Cut Volume</span>
                      <div className="text-xl font-bold text-amber-400 font-mono">
                        {gradingAnalysis.cutVol.toLocaleString()} CY
                      </div>
                    </div>
                    <div className="bg-background p-3 rounded-lg border border-border">
                      <span className="text-[11px] text-muted-foreground">Fill Volume</span>
                      <div className="text-xl font-bold text-cyan-400 font-mono">
                        {gradingAnalysis.fillVol.toLocaleString()} CY
                      </div>
                    </div>
                    <div className="bg-background p-3 rounded-lg border border-border">
                      <span className="text-[11px] text-muted-foreground">Net Balance</span>
                      <div className="text-xl font-bold text-emerald-400 font-mono">
                        {gradingAnalysis.netVol.toLocaleString()} CY
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCommit}
                  className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 rounded-xl shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Commit Grading Pad to Canvas
                </Button>
              </div>
            </div>
          )}

          {activeTab === "daylight" && (
            <div className="grid grid-cols-2 gap-4 bg-card/60 p-5 rounded-xl border border-border">
              <div>
                <Label className="text-xs text-muted-foreground">Cut Slope Daylight Ratio (H:1V)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={cutRatio}
                  onChange={(e) => setCutRatio(Number(e.target.value))}
                  className={`mt-1 bg-background border-border text-xs font-mono transition-colors ${
                    cutRatio < 1.5 ? "text-red-400 border-red-500/50 focus-visible:ring-red-500" : "text-emerald-300"
                  }`}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fill Slope Daylight Ratio (H:1V)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={fillRatio}
                  onChange={(e) => setFillRatio(Number(e.target.value))}
                  className={`mt-1 bg-background border-border text-xs font-mono transition-colors ${
                    fillRatio < 2.0 ? "text-amber-400 border-amber-500/50 focus-visible:ring-amber-500" : "text-emerald-300"
                  }`}
                />
              </div>
            </div>
          )}

          {activeTab === "volumes" && (
            <div className="bg-card/60 p-5 rounded-xl border border-border space-y-3">
              <h3 className="text-sm font-semibold text-emerald-300">Mass Haul & Volume Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-background rounded border border-border">
                  <span className="text-muted-foreground">Total Pad Footprint Area:</span>
                  <div className="text-lg font-bold text-foreground">{gradingAnalysis.areaSqFt?.toLocaleString()} sq ft</div>
                </div>
                <div className="p-3 bg-background rounded border border-border">
                  <span className="text-muted-foreground">Optimal Zero-Volume Elev:</span>
                  <div className="text-lg font-bold text-emerald-400">{gradingAnalysis.balancedElev} ft MSL</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "rules" && (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {gradingAnalysis.experiences.map((exp, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-background border border-border flex justify-between items-center text-xs font-mono"
                >
                  <div>
                    <span className="text-emerald-400 font-bold mr-2">[{exp.code}]</span>
                    <span className="text-foreground">{exp.message}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {exp.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card text-xs text-muted-foreground">
          <span>Grading & Earthwork Studio: IBC 1804.4 Compliant</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-input text-muted-foreground">
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Commit Grading Pad
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
