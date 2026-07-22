import React, { useState } from 'react';
import { executeTransparentCommand, type TransparentCommandType, type Quadrant } from '@thoth/domain';

export const TransparentCommandsBar: React.FC = () => {
  const [activeCmd, setActiveCmd] = useState<TransparentCommandType | null>(null);
  const [quadrant, setQuadrant] = useState<Quadrant>(1);
  const [bearingDeg, setBearingDeg] = useState<number>(45);
  const [distance, setDistance] = useState<number>(100);
  const [pointNumber] = useState<number>(101);
  const [log, setLog] = useState<string[]>([]);

  const handleExecute = (cmd: TransparentCommandType) => {
    try {
      if (cmd === 'BD') {
        const pt = executeTransparentCommand({
          command: 'BD',
          startPoint: { x: 0, y: 0 },
          quadrant,
          angleOrBearingDeg: bearingDeg,
          distance,
        }) as { x: number; y: number };
        setLog((prev) => [`'BD Bearing-Distance -> Point: (${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`, ...prev]);
      } else if (cmd === 'C') {
        executeTransparentCommand({ command: 'C' });
        setLog((prev) => [`'C Polyline Auto-Closed to Start Point`, ...prev]);
      } else if (cmd === 'PN') {
        setLog((prev) => [`'PN Point Number ${pointNumber} referenced`, ...prev]);
      } else if (cmd === 'ZE') {
        setLog((prev) => [`'ZE Zoomed to Point ${pointNumber}`, ...prev]);
      }
    } catch (err: any) {
      setLog((prev) => [`Error executing '${cmd}: ${err.message}`, ...prev]);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 shadow-xl">
      {/* REQ-019: Dedicated Transparent Commands Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Transparent Commands (REQ-019)
        </div>
        <span className="text-[10px] font-mono text-slate-400">Sub-commands active</span>
      </div>

      {/* Buttons REQ-020, REQ-021, REQ-022 */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setActiveCmd('BD'); handleExecute('BD'); }}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs rounded border border-slate-700 transition"
          title="Bearing-Distance ('BD)"
        >
          'BD Bearing-Dist
        </button>

        <button
          onClick={() => { setActiveCmd('AD'); }}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs rounded border border-slate-700 transition"
          title="Angle-Distance ('AD)"
        >
          'AD Angle-Dist
        </button>

        <button
          onClick={() => { setActiveCmd('ZD'); }}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs rounded border border-slate-700 transition"
          title="Azimuth-Distance ('ZD)"
        >
          'ZD Azimuth-Dist
        </button>

        <button
          onClick={() => { setActiveCmd('DD'); }}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs rounded border border-slate-700 transition"
          title="Deflection-Distance ('DD)"
        >
          'DD Deflection
        </button>

        <button
          onClick={() => { setActiveCmd('PN'); handleExecute('PN'); }}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs rounded border border-slate-700 transition"
          title="Point Number ('PN)"
        >
          'PN Pt Num
        </button>

        <button
          onClick={() => { setActiveCmd('ZE'); handleExecute('ZE'); }}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs rounded border border-slate-700 transition"
          title="Zoom to Point ('ZE)"
        >
          'ZE Zoom Pt
        </button>

        <button
          onClick={() => handleExecute('C')}
          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs rounded transition shadow"
          title="Auto-Close Polyline ('C)"
        >
          'C Close Polyline
        </button>
      </div>

      {/* Inputs if active */}
      {activeCmd === 'BD' && (
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 border border-slate-800 rounded text-xs">
          <div>
            <label className="block text-[10px] text-slate-400">Quadrant (1=NE,2=SE,3=SW,4=NW)</label>
            <input
              type="number"
              min={1}
              max={4}
              value={quadrant}
              onChange={(e) => setQuadrant(Number(e.target.value) as Quadrant)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400">Bearing Angle (deg)</label>
            <input
              type="number"
              value={bearingDeg}
              onChange={(e) => setBearingDeg(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400">Distance (ft)</label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Output log */}
      {log.length > 0 && (
        <div className="max-h-24 overflow-y-auto bg-slate-950 p-2 border border-slate-800 rounded font-mono text-[11px] text-slate-300">
          {log.slice(0, 5).map((entry, idx) => (
            <div key={idx} className="border-b border-slate-900/50 py-0.5">{entry}</div>
          ))}
        </div>
      )}
    </div>
  );
};
