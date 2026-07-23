import React from 'react';
import { CIVIL_STYLES } from './styles/civilDesignSystem';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePanoramaEditor } from './hooks/usePanoramaEditor';

export const PanoramaElevationEditorDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const {
    featureLine,
    rows,
    autoRebuild,
    setAutoRebuild,
    targetGrade,
    setTargetGrade,
    handleApplySlope,
    handleDeletePI,
  } = usePanoramaEditor();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-background border-border text-foreground p-6 animate-dialog-in">
        <DialogHeader className={CIVIL_STYLES.sectionHeaderContainer}>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <div className={`${CIVIL_STYLES.titlePulseDot} bg-emerald-400`} />
            Panorama Elevation Editor (REQ-191, REQ-192, REQ-197)
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar Controls */}
        <div className={CIVIL_STYLES.toolbarRow}>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-muted-foreground">Target Grade %:</span>
            <Input
              type="number"
              step="0.1"
              value={targetGrade}
              onChange={(e) => setTargetGrade(Number(e.target.value))}
              className="w-20 bg-card border-input text-foreground h-8 text-xs"
            />
            <Button
              onClick={handleApplySlope}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8"
            >
              Set Grade/Slope (REQ-192)
            </Button>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              id="chk-rebuild"
              checked={autoRebuild}
              onChange={(e) => setAutoRebuild(e.target.checked)}
              className="rounded bg-card border-input text-emerald-500 focus:ring-0"
            />
            <label htmlFor="chk-rebuild" className="cursor-pointer text-xs text-muted-foreground">
              Rebuild Automatic Surface Updates (REQ-197)
            </label>
          </div>
        </div>

        {/* Panorama Table Grid */}
        <div className="max-h-72 overflow-auto border border-border rounded-lg bg-background">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted text-emerald-400 sticky top-0 font-mono">
              <tr>
                <th className="px-3 py-2 border-b border-input">Vertex Index</th>
                <th className="px-3 py-2 border-b border-input">Station (ft)</th>
                <th className="px-3 py-2 border-b border-input">Elevation (ft)</th>
                <th className="px-3 py-2 border-b border-input">Length (ft)</th>
                <th className="px-3 py-2 border-b border-input">Grade Back (%)</th>
                <th className="px-3 py-2 border-b border-input">Grade Ahead (%)</th>
                <th className="px-3 py-2 border-b border-input text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-foreground">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/40">
                  <td className="px-3 py-2 font-bold text-cyan-300">P{idx + 1}</td>
                  <td className="px-3 py-2">{row.station.toFixed(2)}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-300">{row.elevation.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.length.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.gradeBackPercent.toFixed(2)}%</td>
                  <td className="px-3 py-2">{row.gradeAheadPercent.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      onClick={() => handleDeletePI(idx)}
                      disabled={rows.length <= 2}
                      variant="destructive"
                      size="sm"
                      className="h-6 text-[11px] px-2 bg-rose-950/70 hover:bg-rose-800 text-rose-300 border border-rose-800"
                    >
                      Delete PI (REQ-189)
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-border pt-3 text-xs">
          <span className="text-muted-foreground">Total Vertices: {featureLine.points.length}</span>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-input text-foreground bg-muted hover:bg-accent"
          >
            Close Panorama
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
