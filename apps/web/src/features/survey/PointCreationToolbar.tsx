import React, { useState } from 'react';
import {
  parseAsciiPointFile,
  generateImportPreview,
  type PointFileFormat,
  type TextDelimiter,
  type CogoPoint,
  type ImportPreviewResult,
} from '@thoth/domain';

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
    <div className="flex flex-col gap-2 p-3 bg-slate-900 text-slate-100 border-b border-slate-800 rounded-lg shadow-lg">
      {/* REQ-001: Point Creation Tools Toolbar accessible from Home tab */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">Point Creation Tools</div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded transition flex items-center gap-1.5 shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import ASCII Points (PNEZD / PENZD)
          </button>
        </div>
        <div className="text-xs text-slate-400">
          Imported Points: <span className="font-semibold text-slate-200">{importedPoints.length}</span>
        </div>
      </div>

      {/* REQ-004: Preview Window & File Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                Import ASCII Point File (REQ-002, REQ-003, REQ-005)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Format (REQ-003)</label>
                <select
                  value={format}
                  onChange={(e) => {
                    const fmt = e.target.value as PointFileFormat;
                    setFormat(fmt);
                    handleTextChange(rawText, fmt, delimiter);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="PNEZD">PNEZD (Point, N, E, Z, Desc)</option>
                  <option value="PENZD">PENZD (Point, E, N, Z, Desc)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Delimiter (REQ-005)</label>
                <select
                  value={delimiter}
                  onChange={(e) => {
                    const delim = e.target.value as TextDelimiter;
                    setDelimiter(delim);
                    handleTextChange(rawText, format, delim);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value=",">Comma Delimited</option>
                  <option value=" ">Space Delimited</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Point Group (REQ-006)</label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
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
              <label className="block text-xs text-slate-400 mb-1">ASCII Raw Data Input</label>
              <textarea
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* REQ-004: Preview Window */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-300">File Import Live Preview</span>
              <div className="max-h-40 overflow-auto border border-slate-800 rounded bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-800 text-cyan-400 sticky top-0">
                    <tr>
                      {preview.headers.map((h: string, i: number) => (
                        <th key={i} className="px-3 py-1.5 border-b border-slate-700">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300 font-mono">
                    {preview.sampleRows.map((row: string[], rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40">
                        {row.map((cell: string, cIdx: number) => (
                          <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded shadow"
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
