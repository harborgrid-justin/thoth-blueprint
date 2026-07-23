import React, { useState } from 'react';
import {
  parseAsciiPointFile,
  generateImportPreview,
  type PointFileFormat,
  type TextDelimiter,
  type CogoPoint,
  type ImportPreviewResult,
} from '@thoth/domain';
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
    <div className={SURVEY_STYLES.toolbar}>
      {/* REQ-001: Point Creation Tools Toolbar accessible from Home tab */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Point Creation Tools</div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className={SURVEY_STYLES.btnPrimary}
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import ASCII Points (PNEZD / PENZD)
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          Imported Points: <span className="font-semibold text-foreground">{importedPoints.length}</span>
        </div>
      </div>

      {/* REQ-004: Preview Window & File Import Modal */}
      {isImportModalOpen && (
        <div className={SURVEY_STYLES.dialogOverlay}>
          <div className={`${SURVEY_STYLES.dialogContainer} max-w-2xl`}>
            <div className={SURVEY_STYLES.dialogHeader}>
              <h3 className={SURVEY_STYLES.dialogTitle}>
                Import ASCII Point File (REQ-002, REQ-003, REQ-005)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-muted-foreground hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

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
              <div className="max-h-40 overflow-auto border border-border rounded bg-background">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      {preview.headers.map((h: string, i: number) => (
                        <th key={i} className={SURVEY_STYLES.tableTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-muted-foreground font-mono">
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

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className={SURVEY_STYLES.btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                className={SURVEY_STYLES.btnPrimary}
              >
                Import Points
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

