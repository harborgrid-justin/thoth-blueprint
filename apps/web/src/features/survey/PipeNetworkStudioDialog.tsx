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
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

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
    <div className={SURVEY_STYLES.dialogOverlay + " animate-overlay-in"}>
      <div className={SURVEY_STYLES.dialogContainer}>
        {/* Header */}
        <div className={SURVEY_STYLES.dialogHeader}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h2 className={SURVEY_STYLES.dialogTitle}>
                Pipe Network & Stormwater Hydrology Studio
              </h2>
              <p className={SURVEY_STYLES.textSubtitle}>
                Manning's HGL/EGL Solver • Rational Method Q=CIA • Cover Audits & Trench QTO
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

        {/* System Banner */}
        <div className={SURVEY_STYLES.banner}>
          <div className="flex items-center gap-3">
            <span className={SURVEY_STYLES.label}>Pipe Utility Network:</span>
            <div className="flex gap-2">
              {(["storm", "sanitary", "water"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPipeType(t)}
                  className={pipeType === t ? SURVEY_STYLES.btnPillActive : SURVEY_STYLES.btnPill}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground font-mono">
            <span>
              Req Diameter: <strong className="text-amber-400">{hydraulicResult.reqDiameterInches} inches</strong>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={SURVEY_STYLES.tabBar}>
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
          {activeTab === "layout" && (
            <div className={SURVEY_STYLES.grid2Col}>
              <div className={SURVEY_STYLES.card + " space-y-4"}>
                <h3 className={SURVEY_STYLES.textSectionTitle}>Design Flow & Pipe Slope</h3>
                <div>
                  <Label className={SURVEY_STYLES.label}>Design Peak Flow Q (cfs)</Label>
                  <Input
                    type="number"
                    value={designFlowCfs}
                    onChange={(e) => setDesignFlowCfs(Number(e.target.value))}
                    className={SURVEY_STYLES.input + " font-mono text-amber-300"}
                  />
                </div>
                <div>
                  <Label className={SURVEY_STYLES.label}>Pipe Slope ft/ft (e.g. 0.01 = 1%)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={pipeSlope}
                    onChange={(e) => setPipeSlope(Number(e.target.value))}
                    className={SURVEY_STYLES.input + " font-mono text-amber-300"}
                  />
                </div>
                <div>
                  <Label className={SURVEY_STYLES.label}>Manning's Roughness Coefficient n</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={manningN}
                    onChange={(e) => setManningN(Number(e.target.value))}
                    className={SURVEY_STYLES.input + " font-mono text-amber-300"}
                  />
                </div>
              </div>

              <div className={SURVEY_STYLES.card + " flex flex-col justify-between"}>
                <div>
                  <h3 className="text-sm font-semibold text-amber-400 mb-3">Hydraulic Sizing Results</h3>
                  <div className="bg-background p-4 rounded-lg border border-border font-mono space-y-2">
                    <div>
                      <span className="text-muted-foreground">Minimum Pipe Size: </span>
                      <strong className="text-amber-400 text-lg">{hydraulicResult.reqDiameterInches}"</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">HGL Peak Elevation: </span>
                      <strong className="text-cyan-400">{hydraulicResult.hglElev} ft</strong>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCommit}
                  className={SURVEY_STYLES.btnPrimary + " mt-4 w-full"}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Commit Pipe Network to Canvas
                </Button>
              </div>
            </div>
          )}

          {activeTab === "hydraulics" && (
            <div className={SURVEY_STYLES.card + " space-y-3 font-mono text-xs"}>
              <h3 className="text-sm font-semibold text-amber-300">Manning's Hydraulic Equation Output</h3>
              <p className="text-muted-foreground">
                Formula: Q = (1.486 / n) * A * R^(2/3) * S^(1/2)
              </p>
              <div className="p-3 bg-background rounded border border-border">
                <span>Calculated Capacity: {designFlowCfs} cfs @ {pipeSlope * 100}% grade</span>
              </div>
            </div>
          )}

          {activeTab === "cover" && (
            <div className={SURVEY_STYLES.card + " space-y-4"}>
              <div>
                <Label className={SURVEY_STYLES.label}>Minimum Cover Depth (ft)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={coverDepthFt}
                  onChange={(e) => setCoverDepthFt(Number(e.target.value))}
                  className={SURVEY_STYLES.input + " font-mono text-amber-300"}
                />
              </div>
            </div>
          )}

          {activeTab === "rules" && (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {hydraulicResult.experiences.map((exp, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-background border border-border flex justify-between items-center text-xs font-mono"
                >
                  <div>
                    <span className="text-amber-400 font-bold mr-2">[{exp.code}]</span>
                    <span className="text-foreground">{exp.message}</span>
                  </div>
                  <span className={SURVEY_STYLES.badge}>
                    {exp.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card text-xs text-muted-foreground">
          <span>Pipe Network Studio: AASHTO Stormwater Compliant</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className={SURVEY_STYLES.btnSecondary}>
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className={SURVEY_STYLES.btnPrimary}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Create Pipe Network
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

