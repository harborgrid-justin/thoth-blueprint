import React from 'react';
import { CIVIL_STYLES } from './styles/civilDesignSystem';
import { DialogShell } from '@/components/layout';
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
    <DialogShell
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Panorama Elevation Editor (REQ-191, REQ-192, REQ-197)"
      icon={<div className={`${CIVIL_STYLES.titlePulseDot} bg-emerald-400`} />}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Vertices: {featureLine.points.length}</span>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-input bg-muted text-foreground hover:bg-accent"
          >
            Close Panorama
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Toolbar Controls */}
        <div className={CIVIL_STYLES.toolbarRow}>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-muted-foreground">Target Grade %:</span>
            <Input
              type="number"
              step="0.1"
              value={targetGrade}
              onChange={(e) => setTargetGrade(Number(e.target.value))}
              className="h-8 w-20 border-input bg-card text-xs text-foreground"
            />
            <Button
              onClick={handleApplySlope}
              size="sm"
              className={CIVIL_STYLES.btnEmerald}
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
              className="rounded border-input bg-card text-emerald-500 focus:ring-0"
            />
            <label htmlFor="chk-rebuild" className="cursor-pointer text-xs text-muted-foreground">
              Rebuild Automatic Surface Updates (REQ-197)
            </label>
          </div>
        </div>

        {/* Panorama Table Grid */}
        <div className={CIVIL_STYLES.tableContainer}>
          <table className={CIVIL_STYLES.table}>
            <thead>
              <tr>
                <th className={CIVIL_STYLES.tableHeaderRow}>Vertex Index</th>
                <th className={CIVIL_STYLES.tableHeaderRow}>Station (ft)</th>
                <th className={CIVIL_STYLES.tableHeaderRow}>Elevation (ft)</th>
                <th className={CIVIL_STYLES.tableHeaderRow}>Length (ft)</th>
                <th className={CIVIL_STYLES.tableHeaderRow}>Grade Back (%)</th>
                <th className={CIVIL_STYLES.tableHeaderRow}>Grade Ahead (%)</th>
                <th className={`${CIVIL_STYLES.tableHeaderRow} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-foreground">
              {rows.map((row, idx) => (
                <tr key={idx} className={CIVIL_STYLES.tableRow}>
                  <td className={`${CIVIL_STYLES.tableCell} font-bold text-cyan-300`}>P{idx + 1}</td>
                  <td className={CIVIL_STYLES.tableCell}>{row.station.toFixed(2)}</td>
                  <td className={`${CIVIL_STYLES.tableCell} font-semibold text-emerald-300`}>{row.elevation.toFixed(2)}</td>
                  <td className={CIVIL_STYLES.tableCell}>{row.length.toFixed(2)}</td>
                  <td className={CIVIL_STYLES.tableCell}>{row.gradeBackPercent.toFixed(2)}%</td>
                  <td className={CIVIL_STYLES.tableCell}>{row.gradeAheadPercent.toFixed(2)}%</td>
                  <td className={`${CIVIL_STYLES.tableCell} text-right`}>
                    <Button
                      onClick={() => handleDeletePI(idx)}
                      disabled={rows.length <= 2}
                      variant="destructive"
                      size="sm"
                      className="h-6 border border-rose-800 bg-rose-950/70 px-2 text-[11px] text-rose-300 hover:bg-rose-800"
                    >
                      Delete PI (REQ-189)
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DialogShell>
  );
};
