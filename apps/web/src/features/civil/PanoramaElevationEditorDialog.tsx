import React from 'react';
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
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-slate-100 p-6">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            Panorama Elevation Editor (REQ-191, REQ-192, REQ-197)
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">Target Grade %:</span>
            <Input
              type="number"
              step="0.1"
              value={targetGrade}
              onChange={(e) => setTargetGrade(Number(e.target.value))}
              className="w-20 bg-slate-900 border-slate-700 text-slate-200 h-8 text-xs"
            />
            <Button
              onClick={handleApplySlope}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8"
            >
              Set Grade/Slope (REQ-192)
            </Button>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <input
              type="checkbox"
              id="chk-rebuild"
              checked={autoRebuild}
              onChange={(e) => setAutoRebuild(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <label htmlFor="chk-rebuild" className="cursor-pointer text-xs text-slate-300">
              Rebuild Automatic Surface Updates (REQ-197)
            </label>
          </div>
        </div>

        {/* Panorama Table Grid */}
        <div className="max-h-72 overflow-auto border border-slate-800 rounded-lg bg-slate-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-800 text-emerald-400 sticky top-0 font-mono">
              <tr>
                <th className="px-3 py-2 border-b border-slate-700">Vertex Index</th>
                <th className="px-3 py-2 border-b border-slate-700">Station (ft)</th>
                <th className="px-3 py-2 border-b border-slate-700">Elevation (ft)</th>
                <th className="px-3 py-2 border-b border-slate-700">Length (ft)</th>
                <th className="px-3 py-2 border-b border-slate-700">Grade Back (%)</th>
                <th className="px-3 py-2 border-b border-slate-700">Grade Ahead (%)</th>
                <th className="px-3 py-2 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
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
        <div className="flex justify-between items-center border-t border-slate-800 pt-3 text-xs">
          <span className="text-slate-400">Total Vertices: {featureLine.points.length}</span>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-200 bg-slate-800 hover:bg-slate-700"
          >
            Close Panorama
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
