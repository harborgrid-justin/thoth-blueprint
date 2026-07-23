import React, { useState } from 'react';
import { CIVIL_STYLES } from "./styles/civilDesignSystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-card border-input text-foreground p-6 animate-dialog-in">
        <DialogHeader className={CIVIL_STYLES.sectionHeaderContainer}>
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <div className={`${CIVIL_STYLES.titlePulseDot} bg-purple-400`} />
            Model Builder Cloud Generator & GIS (REQ-161 to REQ-169)
          </DialogTitle>
        </DialogHeader>

        {/* Form Inputs */}
        <div className="flex flex-col gap-3 text-xs">
          <div>
            <label className="block text-muted-foreground mb-1">Model Area Name</label>
            <Input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full bg-muted border-input text-foreground h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted-foreground mb-1">Raster Imagery Tile Level (REQ-163)</label>
              <select
                value={tileLevel}
                onChange={(e) => setTileLevel(Number(e.target.value))}
                className="w-full bg-muted border border-input rounded px-2.5 py-1.5 text-foreground text-xs"
              >
                <option value={19}>Level 19 (High-Res Aerial - REQ-099)</option>
                <option value={18}>Level 18</option>
                <option value={15}>Level 15</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertToGrid}
                  onChange={(e) => setConvertToGrid(e.target.checked)}
                  className="rounded bg-muted border-input text-purple-500"
                />
                Convert to Grid (REQ-167)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground mb-1">Multi-Point Polygon Boundary Coordinates (X, Y per line - REQ-162)</label>
            <textarea
              value={polygonCoords}
              onChange={(e) => setPolygonCoords(e.target.value)}
              rows={4}
              className="w-full bg-background border border-border rounded p-2.5 font-mono text-purple-300 text-xs focus:outline-none"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/70 border border-rose-800 text-rose-300 p-2.5 rounded text-xs">
            {errorMsg}
          </div>
        )}

        {generatedArea && (
          <div className="bg-purple-950/60 border border-purple-800 text-purple-200 p-3 rounded text-xs flex flex-col gap-1">
            <div className="font-semibold text-purple-300">Model Builder Area Generated Successfully</div>
            <div>Total Contiguous Area: {generatedArea.areaSqKm.toFixed(3)} sq km (Max 200 sq km - REQ-161)</div>
            <div>Coverage Surface Smoothing Active: {coverageArea?.forceSurfaceSmoothing ? 'Yes' : 'No'} (REQ-168)</div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-input text-muted-foreground bg-muted hover:bg-accent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateModel}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow"
          >
            Generate Cloud Model
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
