import React, { useState } from 'react';
import { PointCreationToolbar } from '../survey/PointCreationToolbar';
import { TransparentCommandsBar } from '../survey/TransparentCommandsBar';
import { ViewFrameWizardDialog } from '../sheets/ViewFrameWizardDialog';

import type { CivilRibbonTab, CivilRibbonBarProps } from './types';

export const CivilRibbonBar: React.FC<CivilRibbonBarProps> = ({
  onOpenParcelTools,
  onOpenPanoramaEditor,
  onOpenModelBuilder,
}) => {
  const [activeTab, setActiveTab] = useState<CivilRibbonTab>('home');
  const [activeSubPanel, setActiveSubPanel] = useState<string | null>(null);

  return (
    <div className="flex flex-col bg-slate-950 border-b border-slate-800 text-slate-100 shadow-xl">
      {/* Tab Header Bar */}
      <div className="flex items-center gap-1 px-4 pt-2 bg-slate-900/90 border-b border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-4 py-1.5 rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'home'
              ? 'bg-slate-800 text-cyan-400 font-semibold border-t-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 00-1 1m-6 0h6" />
          </svg>
          Home Tab (Points & Parcels)
        </button>

        <button
          onClick={() => setActiveTab('drafting')}
          className={`px-4 py-1.5 rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'drafting'
              ? 'bg-slate-800 text-amber-400 font-semibold border-t-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Drafting & Transparent Cmds
        </button>

        <button
          onClick={() => setActiveTab('modify')}
          className={`px-4 py-1.5 rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'modify'
              ? 'bg-slate-800 text-emerald-400 font-semibold border-t-2 border-emerald-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          Modify & Grading Panorama
        </button>

        <button
          onClick={() => setActiveTab('output')}
          className={`px-4 py-1.5 rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'output'
              ? 'bg-slate-800 text-blue-400 font-semibold border-t-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Output & Plan Production
        </button>

        <button
          onClick={() => setActiveTab('gis')}
          className={`px-4 py-1.5 rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'gis'
              ? 'bg-slate-800 text-purple-400 font-semibold border-t-2 border-purple-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V14M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
          Analyze & Model Builder GIS
        </button>
      </div>

      {/* Ribbon Content Panel */}
      <div className="p-3 bg-slate-900 border-b border-slate-800">
        {activeTab === 'home' && (
          <div className="flex flex-col gap-3">
            <PointCreationToolbar />

            <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-xs font-semibold text-cyan-300">Site & Parcel Sizing (REQ-023 to REQ-035, REQ-118 to REQ-129)</span>
              <button
                onClick={onOpenParcelTools}
                className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-medium rounded transition"
              >
                Parcel Layout & Slide-Line Sizing
              </button>
              <button
                onClick={() => setActiveSubPanel(activeSubPanel === 'row' ? null : 'row')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded border border-slate-700"
              >
                Create Right of Way (REQ-117)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'drafting' && (
          <div className="flex flex-col gap-3">
            <TransparentCommandsBar />
          </div>
        )}

        {activeTab === 'modify' && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Grading & Feature Line Editor (REQ-181 to REQ-200)
            </div>

            <button
              onClick={onOpenPanoramaEditor}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded shadow transition"
            >
              Launch Panorama Elevation Editor (REQ-191)
            </button>
          </div>
        )}

        {activeTab === 'output' && (
          <div className="flex flex-col gap-3">
            <ViewFrameWizardDialog />
          </div>
        )}

        {activeTab === 'gis' && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V14M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
              Model Builder & GIS Import (REQ-161 to REQ-180)
            </div>

            <button
              onClick={onOpenModelBuilder}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded shadow transition"
            >
              Model Builder Cloud Generator (REQ-161)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
