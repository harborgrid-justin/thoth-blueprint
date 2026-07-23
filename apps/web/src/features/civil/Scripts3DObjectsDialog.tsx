import React, { useState } from 'react';
import { CIVIL_STYLES } from './styles/civilDesignSystem';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-background border-border text-foreground p-6 animate-dialog-in">
        <DialogHeader className={CIVIL_STYLES.sectionHeaderContainer}>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <div className={`${CIVIL_STYLES.titlePulseDot} bg-emerald-400`} />
            Scripts, Rules & 3D Objects (REQ-170 to REQ-180)
          </DialogTitle>
        </DialogHeader>

        {/* Form controls */}
        <div className="flex flex-col gap-4 text-xs">
          {/* JS Import Script & Dynamic 3D Scaling (REQ-170, REQ-171) */}
          <div className="bg-background p-3 rounded-lg border border-border flex flex-col gap-2">
            <span className="font-semibold text-emerald-300">JavaScript Import Script & Dynamic 3D Scaling (REQ-170, REQ-171)</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-muted-foreground">External ID:</label>
                <Input
                  type="text"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Raw Description:</label>
                <Input
                  type="text"
                  value={rawDesc}
                  onChange={(e) => setRawDesc(e.target.value)}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Trunk Diameter (in):</label>
                <Input
                  type="number"
                  value={trunkDiameter}
                  onChange={(e) => setTrunkDiameter(Number(e.target.value))}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>
            <Button onClick={handleRunScript} size="sm" className="self-end bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow">
              Run Import Script
            </Button>

            {scriptResult && (
              <div className="bg-card p-2 rounded font-mono text-emerald-300">
                Mapped ID: {scriptResult.mappedId} | Mapped Desc: {scriptResult.mappedDescription} | Dynamic 3D Scale: {scriptResult.dynamic3DScaleFactor}x
              </div>
            )}
          </div>

          {/* Block Extraction CSV Wizard (REQ-178) */}
          <div className="bg-background p-3 rounded-lg border border-border flex flex-col gap-2">
            <span className="font-semibold text-emerald-300">Data Extraction Wizard to CSV (REQ-178)</span>
            <Button onClick={handleExtractCSV} variant="outline" size="sm" className="self-start bg-muted hover:bg-accent text-emerald-300 border-input font-medium">
              Export Block Placement & Attributes to CSV
            </Button>
            {csvResult && (
              <pre className="bg-card p-2 rounded font-mono text-[11px] text-cyan-300 overflow-x-auto">
                {csvResult}
              </pre>
            )}
          </div>

          {/* 3D Model Placement ("Center 2D" & Interactive Placing) (REQ-179, REQ-180) */}
          <div className="bg-background p-3 rounded-lg border border-border flex flex-col gap-2">
            <span className="font-semibold text-emerald-300">3D Model Interactive Terrain Placement (REQ-179, REQ-180)</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-muted-foreground">Model File Name:</label>
                <Input
                  type="text"
                  value={modelFileName}
                  onChange={(e) => setModelFileName(e.target.value)}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Click Terrain X:</label>
                <Input
                  type="number"
                  value={clickX}
                  onChange={(e) => setClickX(Number(e.target.value))}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground">Click Terrain Y:</label>
                <Input
                  type="number"
                  value={clickY}
                  onChange={(e) => setClickY(Number(e.target.value))}
                  className="bg-card border-input text-foreground h-8 text-xs"
                />
              </div>
            </div>
            <Button onClick={handleInteractivePlace} size="sm" className="self-end bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow">
              Interactive Double-Click Place Model
            </Button>

            {placedModel && (
              <div className="bg-card p-2 rounded font-mono text-emerald-300">
                Placed Model: {placedModel.modelFileName} | Insertion Mode: {placedModel.insertionMode} (REQ-179) | Interactive Placed: {String(placedModel.isInteractivePlaced)} (REQ-180)
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border pt-3">
          <Button onClick={onClose} variant="outline" size="sm" className="border-input text-foreground bg-muted hover:bg-accent">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
