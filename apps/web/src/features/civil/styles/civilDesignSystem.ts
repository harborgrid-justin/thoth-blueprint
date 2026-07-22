import React from 'react';

/**
 * Standardized Design System Style Tokens & Utility Classnames for Civil 3D Suite.
 */
export const CIVIL_STYLES = {
  // Dialog & Modal Containers
  dialogOverlay: 'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4',
  dialogCard: 'bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-100 shadow-2xl flex flex-col gap-4',
  
  // Section Headers & Titles
  sectionHeaderContainer: 'flex justify-between items-center border-b border-slate-800 pb-3',
  titlePulseDot: 'w-3 h-3 rounded-full animate-pulse bg-current',

  // Controls & Toolbar Panels
  panelDarkContainer: 'bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex flex-col gap-2',
  toolbarRow: 'flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs',

  // Data Table Grids
  tableContainer: 'max-h-72 overflow-auto border border-slate-800 rounded-lg bg-slate-950',
  tableHeaderRow: 'bg-slate-800 text-cyan-400 sticky top-0 font-mono text-xs',
  tableCell: 'px-3 py-2 border-b border-slate-700/60 font-mono text-xs text-slate-200',

  // Badges & Tag Labels
  badgeDefault: 'px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded border border-slate-700',
  badgeCyan: 'px-1.5 py-0.5 bg-slate-800 text-cyan-300 font-mono text-[10px] rounded border border-slate-700',
  badgePurple: 'px-1.5 py-0.5 bg-purple-950/70 text-purple-300 font-mono text-[10px] rounded border border-purple-800',

  // Form Label & Inputs
  fieldLabel: 'block text-slate-400 mb-1 text-xs font-medium',
  fieldInput: 'bg-slate-900 border-slate-700 text-slate-200 h-8 text-xs w-full rounded',
} as const;

/**
 * Calculates standardized tree indentation styling safely without string interpolation bugs.
 */
export function getTreeIndentStyle(depth: number): React.CSSProperties {
  return { paddingLeft: `${depth * 14 + 8}px` };
}
