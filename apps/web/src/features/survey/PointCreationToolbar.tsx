import React, { useState } from 'react';
import {
  parseAsciiPointFile,
  generateImportPreview,
  type PointFileFormat,
  type TextDelimiter,
  type CogoPoint,
  type ImportPreviewResult,
} from '@thoth/domain';
import { ToolbarShell, DialogShell } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { SURVEY_STYLES } from './styles/surveyDesignSystem';

export const PointCreationToolbar: React.FC = () => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [format, setFormat] = useState<PointFileFormat>('PNEZD');
  const [delimiter, setDelimiter] = useState<TextDelimiter>(',');
  const [targetGroup, setTargetGroup] = useState<string>('_All Points');
  const [rawText, setRawText] = useState<string>(
    '1,1000.0,2000.0,150.0,TREE Oak\n2,1050.0,2050.0,152.5,MON concrete\n3,1100.0,2100.0,155.0,IP iron pipe'
  );
  const [preview, setPreview] = useState<ImportPreviewResult>(() =>
    generateImportPreview(
      '1,1000.0,2000.0,150.0,TREE Oak\n2,1050.0,2050.0,152.5,MON concrete\n3,1100.0,2100.0,155.0,IP iron pipe',
      'PNEZD',
      ','
    )
  );
  const [importedPoints, setImportedPoints] = useState<CogoPoint[]>([]);

  const handleTextChange = (text: string, fmt: PointFileFormat = format, delim: TextDelimiter = delimiter) => {
    setRawText(text);
    setPreview(generateImportPreview(text, fmt, delim));
  };

  const handleExecuteImport = () => {
    const pts = parseAsciiPointFile(rawText, format, delimiter, targetGroup);
    setImportedPoints(pts);
    setIsImportModalOpen(false);
  };

  return (
    <>
      <ToolbarShell variant="statusbar" className="flex w-full items-center justify-between">
        {/* REQ-001: Point Creation Tools Toolbar accessible from Home tab */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold tracking-wider text-amber-400 uppercase">Point Creation Tools</div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className={SURVEY_STYLES.btnPrimary}
          >
            <svg className="mr-1.5 inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import ASCII Points (PNEZD / PENZD)
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          Imported Points: <span className="font-semibold text-foreground">{importedPoints.length}</span>
        </div>
      </ToolbarShell>

      {/* REQ-004: Preview Window & File Import Modal */}
      <DialogShell
        open={isImportModalOpen}
        onOpenChange={(open) => !open && setIsImportModalOpen(false)}
        title="Import ASCII Point File (REQ-002, REQ-003, REQ-005)"
        maxWidthClass="max-w-2xl"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              onClick={() => setIsImportModalOpen(false)}
              variant="outline"
              size="sm"
              className={SURVEY_STYLES.btnSecondary}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteImport}
              size="sm"
              className={SURVEY_STYLES.btnPrimary}
            >
              Import Points
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Controls */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={SURVEY_STYLES.label}>Format (REQ-003)</label>
              <select
                value={format}
                onChange={(e) => {
                  const fmt = e.target.value as PointFileFormat;
                  setFormat(fmt);
                  handleTextChange(rawText, fmt, delimiter);
                }}
                className={SURVEY_STYLES.select}
              >
                <option value="PNEZD">PNEZD (Point, N, E, Z, Desc)</option>
                <option value="PENZD">PENZD (Point, E, N, Z, Desc)</option>
              </select>
            </div>

            <div>
              <label className={SURVEY_STYLES.label}>Delimiter (REQ-005)</label>
              <select
                value={delimiter}
                onChange={(e) => {
                  const delim = e.target.value as TextDelimiter;
                  setDelimiter(delim);
                  handleTextChange(rawText, format, delim);
                }}
                className={SURVEY_STYLES.select}
              >
                <option value=",">Comma Delimited</option>
                <option value=" ">Space Delimited</option>
              </select>
            </div>

            <div>
              <label className={SURVEY_STYLES.label}>Target Point Group (REQ-006)</label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                className={SURVEY_STYLES.select}
              >
                <option value="_All Points">_All Points (Default)</option>
                <option value="ALL OFF">ALL OFF</option>
                <option value="Survey Control">Survey Control</option>
                <option value="Property Corners">Property Corners</option>
              </select>
            </div>
          </div>

          {/* Input payload */}
          <div>
            <label className={SURVEY_STYLES.label}>ASCII Raw Data Input</label>
            <textarea
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={4}
              className={`${SURVEY_STYLES.input} font-mono text-amber-300`}
            />
          </div>

          {/* REQ-004: Preview Window */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">File Import Live Preview</span>
            <div className="max-h-40 overflow-auto rounded border border-border bg-background">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr>
                    {preview.headers.map((h: string, i: number) => (
                      <th key={i} className={SURVEY_STYLES.tableTh}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-mono text-muted-foreground">
                  {preview.sampleRows.map((row: string[], rIdx: number) => (
                    <tr key={rIdx} className={SURVEY_STYLES.tableRow}>
                      {row.map((cell: string, cIdx: number) => (
                        <td key={cIdx} className={SURVEY_STYLES.tableTd}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogShell>
    </>
  );
};

