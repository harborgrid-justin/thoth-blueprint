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
    <div className="flex flex-col border-b border-border bg-background text-foreground shadow-xl">
      {/* Tab Header Bar */}
      <div className="flex items-center gap-1 border-b border-border bg-card/90 px-4 pt-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-1.5 rounded-t-lg px-4 py-1.5 transition ${
            activeTab === 'home'
              ? 'border-t-2 border-cyan-400 bg-muted font-semibold text-cyan-400'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 00-1 1m-6 0h6" />
          </svg>
          Home Tab (Points & Parcels)
        </button>

        <button
          onClick={() => setActiveTab('drafting')}
          className={`flex items-center gap-1.5 rounded-t-lg px-4 py-1.5 transition ${
            activeTab === 'drafting'
              ? 'border-t-2 border-amber-400 bg-muted font-semibold text-amber-400'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Drafting & Transparent Cmds
        </button>

        <button
          onClick={() => setActiveTab('modify')}
          className={`flex items-center gap-1.5 rounded-t-lg px-4 py-1.5 transition ${
            activeTab === 'modify'
              ? 'border-t-2 border-emerald-400 bg-muted font-semibold text-emerald-400'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          Modify & Grading Panorama
        </button>

        <button
          onClick={() => setActiveTab('output')}
          className={`flex items-center gap-1.5 rounded-t-lg px-4 py-1.5 transition ${
            activeTab === 'output'
              ? 'border-t-2 border-blue-400 bg-muted font-semibold text-blue-400'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Output & Plan Production
        </button>

        <button
          onClick={() => setActiveTab('gis')}
          className={`flex items-center gap-1.5 rounded-t-lg px-4 py-1.5 transition ${
            activeTab === 'gis'
              ? 'border-t-2 border-purple-400 bg-muted font-semibold text-purple-400'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V14M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
          Analyze & Model Builder GIS
        </button>
      </div>

      {/* Ribbon Content Panel */}
      <div className="border-b border-border bg-card p-3">
        {activeTab === 'home' && (
          <div className="flex flex-col gap-3">
            <PointCreationToolbar />

            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
              <span className="text-xs font-semibold text-cyan-300">Site & Parcel Sizing (REQ-023 to REQ-035, REQ-118 to REQ-129)</span>
              <button
                onClick={onOpenParcelTools}
                className="rounded bg-cyan-700 px-3 py-1 text-xs font-medium text-white transition hover:bg-cyan-600"
              >
                Parcel Layout & Slide-Line Sizing
              </button>
              <button
                onClick={() => setActiveSubPanel(activeSubPanel === 'row' ? null : 'row')}
                className="rounded border border-input bg-muted px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-accent"
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
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3 text-xs">
            <div className="flex items-center gap-1 text-xs font-bold tracking-wider text-emerald-400 uppercase">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Grading & Feature Line Editor (REQ-181 to REQ-200)
            </div>

            <button
              onClick={onOpenPanoramaEditor}
              className="rounded bg-emerald-600 px-3 py-1.5 font-medium text-white shadow transition hover:bg-emerald-500"
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
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3 text-xs">
            <div className="flex items-center gap-1 text-xs font-bold tracking-wider text-purple-400 uppercase">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 002.5-2.5V14M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
              Model Builder & GIS Import (REQ-161 to REQ-180)
            </div>

            <button
              onClick={onOpenModelBuilder}
              className="rounded bg-purple-600 px-3 py-1.5 font-medium text-white shadow transition hover:bg-purple-500"
            >
              Model Builder Cloud Generator (REQ-161)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
