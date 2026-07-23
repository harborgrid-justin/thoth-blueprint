import React, { useState } from 'react';
import { CIVIL_STYLES } from './styles/civilDesignSystem';
import { DialogShell } from '@/components/layout';
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
    <DialogShell
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Cross-Section Plotting & Draft Mode Grid (REQ-154 to REQ-160)"
      icon={<div className={`${CIVIL_STYLES.titlePulseDot} bg-blue-400`} />}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex w-full justify-end">
          <Button onClick={onClose} variant="outline" size="sm" className={CIVIL_STYLES.btnOutline}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-xs">
        <div className="flex items-center justify-between rounded border border-border bg-background p-2.5">
          <span className="font-semibold text-muted-foreground">Draft Mode Performance Grid (REQ-159)</span>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isDraftMode}
              onChange={(e) => setIsDraftMode(e.target.checked)}
              className="rounded border-input bg-muted text-blue-500"
            />
            <span>Enable Fast Suppressed Heavy Rendering</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={CIVIL_STYLES.fieldLabel}>Plot Layout Direction (REQ-155)</label>
            <select
              value={plotLayout}
              onChange={(e) => setPlotLayout(e.target.value as SectionPlotArrayOrder)}
              className={CIVIL_STYLES.fieldSelect}
            >
              <option value="by_rows">By Rows</option>
              <option value="by_columns">By Columns</option>
            </select>
          </div>

          <div>
            <label className={CIVIL_STYLES.fieldLabel}>Starting Corner (REQ-156)</label>
            <select
              value={startingCorner}
              onChange={(e) => setStartingCorner(e.target.value as SectionPlotStartingCorner)}
              className={CIVIL_STYLES.fieldSelect}
            >
              <option value="upper_left">Upper Left</option>
              <option value="lower_left">Lower Left</option>
              <option value="upper_right">Upper Right</option>
              <option value="lower_right">Lower Right</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className={CIVIL_STYLES.fieldLabel}>Column Spacing (ft):</label>
            <Input
              type="number"
              value={columnSpacingFt}
              onChange={(e) => setColumnSpacingFt(Number(e.target.value))}
              className={CIVIL_STYLES.fieldInput}
            />
          </div>
          <div>
            <label className={CIVIL_STYLES.fieldLabel}>Row Spacing (ft):</label>
            <Input
              type="number"
              value={rowSpacingFt}
              onChange={(e) => setRowSpacingFt(Number(e.target.value))}
              className={CIVIL_STYLES.fieldInput}
            />
          </div>
          <div>
            <label className={CIVIL_STYLES.fieldLabel}>Buffer Space (ft):</label>
            <Input
              type="number"
              value={bufferSpaceFt}
              onChange={(e) => setBufferSpaceFt(Number(e.target.value))}
              className={CIVIL_STYLES.fieldInput}
            />
          </div>
          <div>
            <label className={CIVIL_STYLES.fieldLabel}>Max Columns:</label>
            <Input
              type="number"
              value={maxColumns}
              onChange={(e) => setMaxColumns(Number(e.target.value))}
              className={CIVIL_STYLES.fieldInput}
            />
          </div>
        </div>

        <Button
          onClick={handleGenerateSections}
          size="sm"
          className={CIVIL_STYLES.btnPrimary}
        >
          Generate Section Views Grid
        </Button>

        {/* Results grid */}
        {generatedViews.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 text-xs">
            <span className="font-semibold text-cyan-300">Generated Section Views: {generatedViews.length}</span>
            <div className={CIVIL_STYLES.tableContainer}>
              <table className={CIVIL_STYLES.table}>
                <thead>
                  <tr>
                    <th className={CIVIL_STYLES.tableHeaderRow}>Station</th>
                    <th className={CIVIL_STYLES.tableHeaderRow}>Row, Col</th>
                    <th className={CIVIL_STYLES.tableHeaderRow}>Model Space X, Y</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-muted-foreground">
                  {generatedViews.map((v, i) => (
                    <tr key={i} className={CIVIL_STYLES.tableRow}>
                      <td className={CIVIL_STYLES.tableCell}>Sta {v.station.toFixed(0)}</td>
                      <td className={CIVIL_STYLES.tableCell}>R{v.gridRow}, C{v.gridColumn}</td>
                      <td className={CIVIL_STYLES.tableCell}>({v.modelSpacePosition?.x.toFixed(1)}, {v.modelSpacePosition?.y.toFixed(1)})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
};
