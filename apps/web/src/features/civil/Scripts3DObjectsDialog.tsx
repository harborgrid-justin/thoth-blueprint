import React, { useState } from 'react';
import { CIVIL_STYLES } from './styles/civilDesignSystem';
import { DialogShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScriptingAnd3DObjectEngine } from '@thoth/domain';

export const Scripts3DObjectsDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const scriptEngine = new ScriptingAnd3DObjectEngine();

  // State for Import Script (REQ-170, REQ-171)
  const [externalId, setExternalId] = useState('101');
  const [rawDesc, setRawDesc] = useState('TREE Oak');
  const [trunkDiameter, setTrunkDiameter] = useState<number>(12);
  const [scriptResult, setScriptResult] = useState<any>(null);

  // State for CSV Extraction (REQ-178)
  const [csvResult, setCsvResult] = useState<string | null>(null);

  // State for 3D Placement (REQ-179, REQ-180)
  const [modelFileName, setModelFileName] = useState('Clubhouse.rvt');
  const [clickX, setClickX] = useState<number>(150);
  const [clickY, setClickY] = useState<number>(150);
  const [placedModel, setPlacedModel] = useState<any>(null);

  const handleRunScript = () => {
    const res = scriptEngine.executeImportScript({
      externalId,
      rawDesc,
      trunkDiameterInches: trunkDiameter,
    });
    setScriptResult(res);
  };

  const handleExtractCSV = () => {
    const res = scriptEngine.exportBlocksToCSV([
      { blockName: 'TREE_3D', position: { x: 100, y: 200, z: 50 }, attributes: { Species: 'Oak', Trunk: 12 } },
      { blockName: 'HYDRANT_3D', position: { x: 150, y: 220, z: 51 }, attributes: { Type: 'Mueller', PSI: 65 } },
    ]);
    setCsvResult(res.csvContent);
  };

  const handleInteractivePlace = () => {
    const res = scriptEngine.place3DModelInteractive(modelFileName, { x: clickX, y: clickY }, 55.0);
    setPlacedModel(res);
  };

  return (
    <DialogShell
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Scripts, Rules & 3D Objects (REQ-170 to REQ-180)"
      icon={<div className={`${CIVIL_STYLES.titlePulseDot} bg-emerald-400`} />}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex w-full justify-end">
          <Button onClick={onClose} variant="outline" size="sm" className={CIVIL_STYLES.btnOutline}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-xs">
        {/* JS Import Script & Dynamic 3D Scaling (REQ-170, REQ-171) */}
        <div className={CIVIL_STYLES.panelDarkContainer}>
          <span className="font-semibold text-emerald-300">JS Import Script Execution & Dynamic Scaling (REQ-170, REQ-171)</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={CIVIL_STYLES.fieldLabel}>External Point ID:</label>
              <Input
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
            <div>
              <label className={CIVIL_STYLES.fieldLabel}>Raw Description:</label>
              <Input
                type="text"
                value={rawDesc}
                onChange={(e) => setRawDesc(e.target.value)}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
            <div>
              <label className={CIVIL_STYLES.fieldLabel}>Trunk Diameter (in):</label>
              <Input
                type="number"
                value={trunkDiameter}
                onChange={(e) => setTrunkDiameter(Number(e.target.value))}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
          </div>
          <Button onClick={handleRunScript} size="sm" className={`${CIVIL_STYLES.btnEmerald} self-end`}>
            Execute Script Logic & Calculate Scale
          </Button>

          {scriptResult && (
            <div className="rounded bg-card p-2 font-mono text-emerald-300">
              Matched Block: {scriptResult.blockName} | Scale Factor: {scriptResult.calculatedScaleFactor.toFixed(2)}x (REQ-171)
            </div>
          )}
        </div>

        {/* CSV Data Extraction (REQ-178) */}
        <div className={CIVIL_STYLES.panelDarkContainer}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-300">CSV Data Extraction (REQ-178)</span>
            <Button onClick={handleExtractCSV} size="sm" className={CIVIL_STYLES.btnOutline}>
              Export Block Attributes to CSV
            </Button>
          </div>
          {csvResult && (
            <textarea
              readOnly
              value={csvResult}
              rows={3}
              className="w-full rounded border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground"
            />
          )}
        </div>

        {/* 3D Model Placement (REQ-179, REQ-180) */}
        <div className={CIVIL_STYLES.panelDarkContainer}>
          <span className="font-semibold text-emerald-300">3D Revit / IFC Model Placement (REQ-179, REQ-180)</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={CIVIL_STYLES.fieldLabel}>Model File Name:</label>
              <Input
                type="text"
                value={modelFileName}
                onChange={(e) => setModelFileName(e.target.value)}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
            <div>
              <label className={CIVIL_STYLES.fieldLabel}>Click Terrain X:</label>
              <Input
                type="number"
                value={clickX}
                onChange={(e) => setClickX(Number(e.target.value))}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
            <div>
              <label className={CIVIL_STYLES.fieldLabel}>Click Terrain Y:</label>
              <Input
                type="number"
                value={clickY}
                onChange={(e) => setClickY(Number(e.target.value))}
                className={CIVIL_STYLES.fieldInput}
              />
            </div>
          </div>
          <Button onClick={handleInteractivePlace} size="sm" className={`${CIVIL_STYLES.btnEmerald} self-end`}>
            Interactive Double-Click Place Model
          </Button>

          {placedModel && (
            <div className="rounded bg-card p-2 font-mono text-emerald-300">
              Placed Model: {placedModel.modelFileName} | Insertion Mode: {placedModel.insertionMode} (REQ-179) | Interactive Placed: {String(placedModel.isInteractivePlaced)} (REQ-180)
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  );
};
