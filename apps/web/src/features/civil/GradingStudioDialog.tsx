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
import { DialogShell } from "@/components/layout";
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

  const handleCommit = () => {
    commitGradingPad();
    onClose();
  };

  return (
    <DialogShell
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Grading Studio & Earthwork Optimization"
      description="Pad elevation balancing, daylight slope projection, and earthwork cut/fill balancing"
      icon={<Mountain className="h-6 w-6 text-emerald-400" />}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
          <span>Earthwork Solver: ISO/IEC Compliant</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className={CIVIL_STYLES.btnOutline}>
              Close Studio
            </Button>
            <Button
              onClick={handleCommit}
              className={CIVIL_STYLES.btnPrimary}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Commit Grading Pad
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border text-xs font-semibold">
          <button
            onClick={() => setActiveTab("pad")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "pad"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-4 w-4" /> Pad & Elevation
          </button>
          <button
            onClick={() => setActiveTab("daylight")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "daylight"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Daylight Slopes
          </button>
          <button
            onClick={() => setActiveTab("volumes")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "volumes"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" /> Mass Haul & Volumes
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 transition-colors ${
              activeTab === "rules"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Code Rules Audit
          </button>
        </div>

        {/* Content Panels */}
        {activeTab === "pad" && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className={CIVIL_STYLES.fieldLabel}>Grading Region</Label>
              <select
                value={selectedRegionId ?? undefined}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                className={CIVIL_STYLES.fieldInput}
              >
                {candidateRegions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className={CIVIL_STYLES.fieldLabel}>Pad Elevation (ft)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.5"
                  value={targetPadElev}
                  onChange={(e) => setTargetPadElev(Number(e.target.value))}
                  className={CIVIL_STYLES.fieldInput}
                />
                <Button
                  onClick={autoOptimizePadElev}
                  variant="outline"
                  size="sm"
                  className={CIVIL_STYLES.btnOutline}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Balance
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "daylight" && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className={CIVIL_STYLES.fieldLabel}>Cut Slope Daylight Ratio (H:1V)</Label>
              <Input
                type="number"
                step="0.5"
                value={cutRatio}
                onChange={(e) => setCutRatio(Number(e.target.value))}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
            <div>
              <Label className={CIVIL_STYLES.fieldLabel}>Fill Slope Daylight Ratio (H:1V)</Label>
              <Input
                type="number"
                step="0.5"
                value={fillRatio}
                onChange={(e) => setFillRatio(Number(e.target.value))}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
          </div>
        )}

        {activeTab === "volumes" && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className={CIVIL_STYLES.fieldLabel}>Shrinkage Factor (%)</Label>
              <Input
                type="number"
                value={shrinkFactor}
                onChange={(e) => setShrinkFactor(Number(e.target.value))}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
            <div>
              <Label className={CIVIL_STYLES.fieldLabel}>Swell Factor (%)</Label>
              <Input
                type="number"
                value={swellFactor}
                onChange={(e) => setSwellFactor(Number(e.target.value))}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="custom-scrollbar max-h-64 space-y-2 overflow-y-auto">
            {gradingAnalysis.experiences.map((exp, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3 font-mono text-xs"
              >
                <div>
                  <span className="mr-2 font-bold text-emerald-400">[{exp.code}]</span>
                  <span className="text-foreground">{exp.message}</span>
                </div>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">
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
