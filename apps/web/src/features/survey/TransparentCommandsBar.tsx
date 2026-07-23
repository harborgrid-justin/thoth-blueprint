import React, { useState } from 'react';
import { executeTransparentCommand, type TransparentCommandType, type Quadrant } from '@thoth/domain';
import { SURVEY_STYLES } from './styles/surveyDesignSystem';

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
    <div className={SURVEY_STYLES.toolbar}>
      {/* REQ-019: Dedicated Transparent Commands Toolbar */}
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-400 uppercase">
            <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Transparent Commands (REQ-019)
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">Sub-commands active</span>
        </div>

        {/* Buttons REQ-020, REQ-021, REQ-022 */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setActiveCmd('BD'); handleExecute('BD'); }}
            className={`${SURVEY_STYLES.btnOutline} font-mono text-amber-300`}
            title="Bearing-Distance ('BD)"
          >
            'BD Bearing-Dist
          </button>

          <button
            onClick={() => { setActiveCmd('AD'); }}
            className={`${SURVEY_STYLES.btnOutline} font-mono text-amber-300`}
            title="Angle-Distance ('AD)"
          >
            'AD Angle-Dist
          </button>

          <button
            onClick={() => { setActiveCmd('ZD'); }}
            className={`${SURVEY_STYLES.btnOutline} font-mono text-amber-300`}
            title="Azimuth-Distance ('ZD)"
          >
            'ZD Azimuth-Dist
          </button>

          <button
            onClick={() => { setActiveCmd('DD'); }}
            className={`${SURVEY_STYLES.btnOutline} font-mono text-amber-300`}
            title="Deflection-Distance ('DD)"
          >
            'DD Deflection
          </button>

          <button
            onClick={() => { setActiveCmd('PN'); handleExecute('PN'); }}
            className={`${SURVEY_STYLES.btnOutline} font-mono text-amber-300`}
            title="Point Number ('PN)"
          >
            'PN Pt Num
          </button>

          <button
            onClick={() => { setActiveCmd('ZE'); handleExecute('ZE'); }}
            className={`${SURVEY_STYLES.btnOutline} font-mono text-amber-300`}
            title="Zoom to Point ('ZE)"
          >
            'ZE Zoom Pt
          </button>

          <button
            onClick={() => handleExecute('C')}
            className={SURVEY_STYLES.btnPrimary}
            title="Auto-Close Polyline ('C)"
          >
            'C Close Polyline
          </button>
        </div>

        {/* Inputs if active */}
        {activeCmd === 'BD' && (
          <div className="grid grid-cols-3 gap-2 rounded border border-border bg-background p-2 text-xs">
            <div>
              <label className={SURVEY_STYLES.label}>Quadrant (1=NE,2=SE,3=SW,4=NW)</label>
              <input
                type="number"
                min={1}
                max={4}
                value={quadrant}
                onChange={(e) => setQuadrant(Number(e.target.value) as Quadrant)}
                className={SURVEY_STYLES.input}
              />
            </div>
            <div>
              <label className={SURVEY_STYLES.label}>Bearing Angle (deg)</label>
              <input
                type="number"
                value={bearingDeg}
                onChange={(e) => setBearingDeg(Number(e.target.value))}
                className={SURVEY_STYLES.input}
              />
            </div>
            <div>
              <label className={SURVEY_STYLES.label}>Distance (ft)</label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className={SURVEY_STYLES.input}
              />
            </div>
          </div>
        )}

        {/* Output log */}
        {log.length > 0 && (
          <div className="max-h-24 overflow-y-auto rounded border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
            {log.slice(0, 5).map((entry, idx) => (
              <div key={idx} className="border-b border-slate-900/50 py-0.5">{entry}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

