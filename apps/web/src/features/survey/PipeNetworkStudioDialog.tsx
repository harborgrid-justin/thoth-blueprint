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
import { DialogShell } from "@/components/layout";
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

  const handleCommit = () => {
    commitPipeNetwork();
    onClose();
  };

  return (
    <DialogShell
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Pipe Network & Stormwater Studio"
      description="Interactive Pipe Sizing, Manning Gravity Hydraulic Solver, and Structural Cover Rules"
      icon={<Droplets className="h-6 w-6 text-amber-400" />}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
          <span>Pipe Network Studio: AASHTO Stormwater Compliant</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className={SURVEY_STYLES.btnSecondary}>
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className={SURVEY_STYLES.btnPrimary}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Create Pipe Network
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border text-xs font-semibold">
          <button
            onClick={() => setActiveTab("layout")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "layout"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-4 w-4" /> Pipe Type & Geometry
          </button>
          <button
            onClick={() => setActiveTab("hydraulics")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "hydraulics"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4" /> Manning Hydraulics
          </button>
          <button
            onClick={() => setActiveTab("cover")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "cover"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Ground Cover & Inverts
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "rules"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Code Rules Audit
          </button>
        </div>

        {/* Content Body */}
        {activeTab === "layout" && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className={SURVEY_STYLES.label}>Pipe Material / Class</Label>
              <select
                value={pipeType}
                onChange={(e) => setPipeType(e.target.value as any)}
                className={SURVEY_STYLES.select}
              >
                <option value="RCP">Reinforced Concrete Pipe (RCP)</option>
                <option value="HDPE">High-Density Polyethylene (HDPE)</option>
                <option value="PVC">Polyvinyl Chloride (PVC)</option>
              </select>
            </div>
            <div>
              <Label className={SURVEY_STYLES.label}>Pipe Longitudinal Slope (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={pipeSlope}
                onChange={(e) => setPipeSlope(Number(e.target.value))}
                className={SURVEY_STYLES.input}
              />
            </div>
          </div>
        )}

        {activeTab === "hydraulics" && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className={SURVEY_STYLES.label}>Design Flow Q (cfs)</Label>
              <Input
                type="number"
                step="0.5"
                value={designFlowCfs}
                onChange={(e) => setDesignFlowCfs(Number(e.target.value))}
                className={SURVEY_STYLES.input}
              />
            </div>
            <div>
              <Label className={SURVEY_STYLES.label}>Manning's Roughness (n)</Label>
              <Input
                type="number"
                step="0.001"
                value={manningN}
                onChange={(e) => setManningN(Number(e.target.value))}
                className={SURVEY_STYLES.input}
              />
            </div>
          </div>
        )}

        {activeTab === "cover" && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className={SURVEY_STYLES.label}>Target Minimum Ground Cover (ft)</Label>
              <Input
                type="number"
                step="0.1"
                value={coverDepthFt}
                onChange={(e) => setCoverDepthFt(Number(e.target.value))}
                className={SURVEY_STYLES.input}
              />
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="custom-scrollbar max-h-64 space-y-2 overflow-y-auto">
            {hydraulicResult.experiences.map((exp, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3 font-mono text-xs"
              >
                <div>
                  <span className="mr-2 font-bold text-amber-400">[{exp.code}]</span>
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
    </DialogShell>
  );
};
