import React, { useState } from 'react';
import {
  ViewFrameWizardEngine,
  SheetCreationEngine,
  SheetConfiguration,
  ViewFrameOrientation,
  LayoutCreationMode,
  PlanProductionViewFrameGroup,
  SheetSet,
} from '@thoth/domain';

import { SHEETS_STYLES } from './styles/sheetsDesignSystem';

export const ViewFrameWizardDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1 = View Frames, 2 = Create Sheets
  const [sheetConfig, setSheetConfig] = useState<SheetConfiguration>('plan_and_profile');
  const [orientation, setOrientation] = useState<ViewFrameOrientation>('along_alignment');
  const [layoutMode, setLayoutMode] = useState<LayoutCreationMode>('all_layouts_in_one_new_dwg');
  const [stationRounding, setStationRounding] = useState<number>(50);
  const [overlapDistance, setOverlapDistance] = useState<number>(50);

  const [generatedGroup, setGeneratedGroup] = useState<PlanProductionViewFrameGroup | null>(null);
  const [sheetSet, setSheetSet] = useState<SheetSet | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleGenerateViewFrames = () => {
    const engine = new ViewFrameWizardEngine();
    const group = engine.createViewFrameGroup(
      'Alignment 1 View Frames',
      'align-main',
      sheetConfig,
      { widthFt: 2.0, heightFt: 1.5, scaleFactor: 40, aspectRatio: 1.33 },
      0,
      1200,
      orientation,
      stationRounding,
      overlapDistance
    );
    setGeneratedGroup(group);
    setStep(2);
  };

  const handleCreateSheets = () => {
    if (!generatedGroup) {return;}
    const sheetEngine = new SheetCreationEngine();
    const { sheetSet: ss, warnings: warn } = sheetEngine.createSheetsFromViewFrameGroup(
      generatedGroup,
      layoutMode,
      'SiteSheetSet.dst',
      'start'
    );
    setSheetSet(ss);
    setWarnings(warn);
  };

  return (
    <div className={SHEETS_STYLES.card}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          <span className="text-xs font-bold tracking-wider text-blue-400 uppercase">
            Plan Production & Sheet Sets (REQ-056 to REQ-077)
          </span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className={SHEETS_STYLES.btnPrimary}
        >
          Create View Frames Wizard
        </button>
      </div>

      {/* Modal Wizard */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`${SHEETS_STYLES.dialogContainer} max-w-xl`}>
            <div className={SHEETS_STYLES.dialogHeader}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-blue-400">
                  {step === 1 ? 'Step 1: Create View Frames Wizard (REQ-056)' : 'Step 2: Create Sheets Wizard (REQ-071)'}
                </h3>
                <button onClick={() => setIsOpen(false)} className="font-bold text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>
            </div>

            {step === 1 ? (
              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-slate-400">Sheet Configuration (REQ-057)</label>
                  <select
                    value={sheetConfig}
                    onChange={(e) => setSheetConfig(e.target.value as SheetConfiguration)}
                    className={SHEETS_STYLES.input}
                  >
                    <option value="plan_and_profile">Plan and Profile</option>
                    <option value="plan_only">Plan Only</option>
                    <option value="profile_only">Profile Only</option>
                    <option value="plan_over_plan">Plan over Plan</option>
                    <option value="profile_over_profile">Profile over Profile</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-slate-400">Orientation (REQ-061)</label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as ViewFrameOrientation)}
                      className={SHEETS_STYLES.input}
                    >
                      <option value="along_alignment">Along Alignment</option>
                      <option value="true_north">True North</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-slate-400">Match Line Rounding (REQ-064)</label>
                    <input
                      type="number"
                      value={stationRounding}
                      onChange={(e) => setStationRounding(Number(e.target.value))}
                      className={SHEETS_STYLES.input}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-slate-400">Overlap Distance Ft (REQ-065)</label>
                  <input
                    type="number"
                    value={overlapDistance}
                    onChange={(e) => setOverlapDistance(Number(e.target.value))}
                    className={SHEETS_STYLES.input}
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                  <button onClick={() => setIsOpen(false)} className={SHEETS_STYLES.btnOutline}>
                    Cancel
                  </button>
                  <button onClick={handleGenerateViewFrames} className={SHEETS_STYLES.btnPrimary}>
                    Next: Generate View Frames
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-xs">
                <div className="rounded border border-slate-800 bg-slate-950 p-3">
                  <div className="mb-1 font-semibold text-cyan-400">Generated View Frame Group</div>
                  <div>Total View Frames: {generatedGroup?.viewFrames.length}</div>
                  <div>Match Lines Created: {generatedGroup?.matchLines.length}</div>
                </div>

                <div>
                  <label className="mb-1 block text-slate-400">Layout Creation Option (REQ-072)</label>
                  <select
                    value={layoutMode}
                    onChange={(e) => setLayoutMode(e.target.value as LayoutCreationMode)}
                    className={SHEETS_STYLES.input}
                  >
                    <option value="all_layouts_in_one_new_dwg">All layouts in one new drawing</option>
                    <option value="one_layout_per_new_dwg">One layout per new drawing</option>
                    <option value="all_layouts_in_current_dwg">All layouts in current drawing</option>
                  </select>
                </div>

                {warnings.length > 0 && (
                  <div className="rounded border border-amber-800 bg-amber-950/60 p-2.5 text-[11px] text-amber-300">
                    {warnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                )}

                {sheetSet && (
                  <div className="rounded border border-emerald-800 bg-emerald-950/60 p-2.5 text-[11px] text-emerald-300">
                    <div>✓ Integrated into Sheet Set (.dst): {sheetSet.name}</div>
                    <div>Sheet Set Palette Auto-Opened (REQ-076)</div>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                  <button onClick={() => setStep(1)} className={SHEETS_STYLES.btnOutline}>
                    Back
                  </button>
                  <button onClick={handleCreateSheets} className={SHEETS_STYLES.btnEmerald}>
                    Create Sheets & SSM Palette
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
