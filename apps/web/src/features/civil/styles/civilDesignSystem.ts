import React from 'react';

/**
 * Standardized Design System Style Tokens & Centralized Classnames for Civil Suite.
 * Maps to styles defined in `features/civil/styles/civil.css`.
 */
export const CIVIL_STYLES = {
  // Dialog & Modal Containers
  dialogOverlay: 'civil-dialog-overlay',
  dialogCard: 'civil-dialog-container',
  dialogContainerEmerald: 'civil-dialog-container-emerald',
  dialogContainerCyan: 'civil-dialog-container-cyan',
  dialogContainerPurple: 'civil-dialog-container-purple',
  dialogContainerAmber: 'civil-dialog-container-amber',
  dialogContainerOrange: 'civil-dialog-container-orange',
  dialogHeader: 'civil-dialog-header',
  dialogTitleGroup: 'civil-dialog-title-group',
  dialogIconWrapper: 'civil-dialog-icon-wrapper',
  dialogBody: 'civil-dialog-body',
  dialogFooter: 'civil-dialog-footer',
  
  // Section Headers & Titles
  sectionHeaderContainer: 'flex justify-between items-center border-b border-slate-800 pb-3',
  titlePulseDot: 'civil-pulse-dot bg-current',

  // Controls & Toolbar Panels
  panelDarkContainer: 'civil-panel-dark flex flex-col gap-2 text-xs',
  panelInner: 'civil-panel-inner',
  toolbarRow: 'flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs',
  statCard: 'civil-stat-card',

  // Ribbon & Prospector
  ribbonBar: 'civil-ribbon-bar',
  ribbonGroup: 'civil-ribbon-group',
  ribbonBtn: 'civil-ribbon-btn',
  ribbonBtnActive: 'civil-ribbon-btn-active',
  prospectorContainer: 'civil-prospector-container',
  prospectorHeader: 'civil-prospector-header',
  prospectorNode: 'civil-prospector-tree-node',
  prospectorNodeActive: 'civil-prospector-tree-node-active',

  // Data Table Grids
  tableContainer: 'civil-table-container',
  table: 'civil-table',
  tableHeaderRow: 'civil-table-th',
  tableCell: 'civil-table-td',
  tableRow: 'civil-table-row',
  tableRowSelected: 'civil-table-row-selected',

  // Badges & Tag Labels
  badgeDefault: 'civil-badge civil-badge-default',
  badgeCyan: 'civil-badge civil-badge-cyan',
  badgeEmerald: 'civil-badge civil-badge-emerald',
  badgePurple: 'civil-badge civil-badge-purple',
  badgeAmber: 'civil-badge civil-badge-amber',
  badgeRed: 'civil-badge civil-badge-red',

  // Form Label & Inputs
  fieldLabel: 'civil-field-label',
  fieldInput: 'civil-input',
  fieldSelect: 'civil-select',

  // Buttons
  btnPrimary: 'civil-btn civil-btn-primary',
  btnEmerald: 'civil-btn civil-btn-emerald',
  btnPurple: 'civil-btn civil-btn-purple',
  btnAmber: 'civil-btn civil-btn-amber',
  btnOutline: 'civil-btn civil-btn-outline',
} as const;

/**
 * Calculates standardized tree indentation styling safely without string interpolation bugs.
 */
export function getTreeIndentStyle(depth: number): React.CSSProperties {
  return { paddingLeft: `${depth * 14 + 8}px` };
}

