import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SampleLineEngine,
  type GroupPlotStyle,
  type SectionPlotArrayOrder,
  type SectionPlotStartingCorner,
  type CivilSectionView,
} from '@thoth/domain';

export const SectionPlottingGridDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const sampleEngine = new SampleLineEngine();
  const [slg] = useState(() =>
    sampleEngine.createSampleLineGroup('Main Alignment Cross-Sections', 'align-1', 0, 500, 50, 50, 100)
  );

  const [plotLayout, setPlotLayout] = useState<SectionPlotArrayOrder>('by_rows');
  const [startingCorner, setStartingCorner] = useState<SectionPlotStartingCorner>('upper_left');
  const [bufferSpaceFt, setBufferSpaceFt] = useState<number>(20);
  const [columnSpacingFt, setColumnSpacingFt] = useState<number>(100);
  const [rowSpacingFt, setRowSpacingFt] = useState<number>(80);
  const [maxColumns, setMaxColumns] = useState<number>(4);
  const [isDraftMode, setIsDraftMode] = useState<boolean>(true);

  const [generatedViews, setGeneratedViews] = useState<CivilSectionView[]>([]);

  const handleGenerateSections = () => {
    const style: GroupPlotStyle = {
      id: 'gps-custom',
      name: 'Custom Section Grid',
      plotLayout,
      startingCorner,
      bufferSpaceFt,
      columnSpacingFt,
      rowSpacingFt,
      maxColumns,
      alignCenterline: true,
      isDraftMode,
    };

    const views = sampleEngine.createMultipleSectionViews(slg, false, style);
    setGeneratedViews(views);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100 p-6">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <DialogTitle className="flex items-center gap-2 text-blue-400">
            <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
            Cross-Section Plotting & Draft Mode Grid (REQ-154 to REQ-160)
          </DialogTitle>
        </DialogHeader>

        {/* Form Controls */}
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={isDraftMode}
                onChange={(e) => setIsDraftMode(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-blue-500"
              />
              Draft Mode Output (Place sections in Model Space Grid - REQ-154)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Array Order (REQ-155, REQ-156)</label>
              <select
                value={plotLayout}
                onChange={(e) => setPlotLayout(e.target.value as SectionPlotArrayOrder)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
              >
                <option value="by_rows">Sequential by Rows (REQ-155)</option>
                <option value="by_columns">Sequential by Columns (REQ-156)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Starting Corner (REQ-158)</label>
              <select
                value={startingCorner}
                onChange={(e) => setStartingCorner(e.target.value as SectionPlotStartingCorner)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
              >
                <option value="upper_left">Upper Left</option>
                <option value="upper_right">Upper Right</option>
                <option value="lower_left">Lower Left</option>
                <option value="lower_right">Lower Right</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Max Columns</label>
              <Input
                type="number"
                value={maxColumns}
                onChange={(e) => setMaxColumns(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-slate-200 h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Column Spacing (ft - REQ-159)</label>
              <Input
                type="number"
                value={columnSpacingFt}
                onChange={(e) => setColumnSpacingFt(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-slate-200 h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Row Spacing (ft - REQ-159)</label>
              <Input
                type="number"
                value={rowSpacingFt}
                onChange={(e) => setRowSpacingFt(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-slate-200 h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Drafting Buffer (ft - REQ-160)</label>
              <Input
                type="number"
                value={bufferSpaceFt}
                onChange={(e) => setBufferSpaceFt(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-slate-200 h-8 text-xs"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerateSections}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow"
          >
            Generate Section Views Grid
          </Button>
        </div>

        {/* Results grid */}
        {generatedViews.length > 0 && (
          <div className="flex flex-col gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
            <span className="font-semibold text-cyan-300">Generated Section Views: {generatedViews.length}</span>
            <div className="max-h-40 overflow-y-auto border border-slate-800 rounded font-mono">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-800 text-cyan-400 sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5">Station</th>
                    <th className="px-3 py-1.5">Row, Col</th>
                    <th className="px-3 py-1.5">Model Space X, Y</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {generatedViews.map((v, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">Sta {v.station.toFixed(0)}</td>
                      <td className="px-3 py-1.5">R{v.gridRow}, C{v.gridColumn}</td>
                      <td className="px-3 py-1.5">({v.modelSpacePosition?.x.toFixed(1)}, {v.modelSpacePosition?.y.toFixed(1)})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-800 pt-3">
          <Button onClick={onClose} variant="outline" size="sm" className="border-slate-700 text-slate-200 bg-slate-800 hover:bg-slate-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
