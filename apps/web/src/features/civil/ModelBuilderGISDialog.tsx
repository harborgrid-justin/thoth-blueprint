import React, { useState } from 'react';
import { CIVIL_STYLES } from "./styles/civilDesignSystem";
import { DialogShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VisualizationAndGISEngine, type ModelBuilderConfig, type CoverageAreaConfig } from '@thoth/domain';

export const ModelBuilderGISDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const visEngine = new VisualizationAndGISEngine();
  const [modelName, setModelName] = useState('Downtown Expansion Area');
  const [tileLevel, setTileLevel] = useState<number>(19);
  const [convertToGrid, setConvertToGrid] = useState<boolean>(false);
  const [polygonCoords, setPolygonCoords] = useState<string>('0,0\n5000,0\n5000,5000\n0,5000');

  const [generatedArea, setGeneratedArea] = useState<ModelBuilderConfig | null>(null);
  const [coverageArea, setCoverageArea] = useState<CoverageAreaConfig | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateModel = () => {
    setErrorMsg(null);
    try {
      const vertices = polygonCoords.split(/\r?\n/).map(line => {
        const [x, y] = line.split(',').map(n => parseFloat(n.trim()));
        return { x: x || 0, y: y || 0 };
      });

      const area = visEngine.createModelBuilderArea(modelName, vertices, tileLevel, convertToGrid);
      const cov = visEngine.createCoverageAreaSmoothing('Zoning Coverage Surface', vertices);

      setGeneratedArea(area);
      setCoverageArea(cov);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <DialogShell
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Model Builder Cloud Generator & GIS (REQ-161 to REQ-169)"
      icon={<div className={`${CIVIL_STYLES.titlePulseDot} bg-purple-400`} />}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className={CIVIL_STYLES.btnOutline}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateModel}
            size="sm"
            className={CIVIL_STYLES.btnPurple}
          >
            Generate Cloud Model
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-xs">
        <div>
          <label className={CIVIL_STYLES.fieldLabel}>Model Area Name</label>
          <Input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className={CIVIL_STYLES.fieldInput}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={CIVIL_STYLES.fieldLabel}>Raster Imagery Tile Level (REQ-163)</label>
            <select
              value={tileLevel}
              onChange={(e) => setTileLevel(Number(e.target.value))}
              className={CIVIL_STYLES.fieldSelect}
            >
              <option value={19}>Level 19 (High-Res Aerial - REQ-099)</option>
              <option value={18}>Level 18</option>
              <option value={15}>Level 15</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={convertToGrid}
                onChange={(e) => setConvertToGrid(e.target.checked)}
                className="rounded border-input bg-muted text-purple-500"
              />
              Convert to Grid (REQ-167)
            </label>
          </div>
        </div>

        <div>
          <label className={CIVIL_STYLES.fieldLabel}>Multi-Point Polygon Boundary Coordinates (X, Y per line - REQ-162)</label>
          <textarea
            value={polygonCoords}
            onChange={(e) => setPolygonCoords(e.target.value)}
            rows={4}
            className="w-full rounded border border-border bg-background p-2.5 font-mono text-xs text-purple-300 focus:outline-none"
          />
        </div>

        {errorMsg && (
          <div className="rounded border border-rose-800 bg-rose-950/70 p-2.5 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {generatedArea && (
          <div className="flex flex-col gap-1 rounded border border-purple-800 bg-purple-950/60 p-3 text-xs text-purple-200">
            <div className="font-semibold text-purple-300">Model Builder Area Generated Successfully</div>
            <div>Total Contiguous Area: {generatedArea.areaSqKm.toFixed(3)} sq km (Max 200 sq km - REQ-161)</div>
            <div>Coverage Surface Smoothing Active: {coverageArea?.forceSurfaceSmoothing ? 'Yes' : 'No'} (REQ-168)</div>
          </div>
        )}
      </div>
    </DialogShell>
  );
};
