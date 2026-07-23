/**
 * Centralized Shared Layout Tokens Registry for Antigravity AutoCAD Web Suite.
 * Maps standardized tokens to layout classes defined in `styles/layout.css`.
 */
export const LAYOUT_STYLES = {
  // Modal / Dialog Layout Shells
  dialogShell: 'layout-dialog-shell',
  dialogHeader: 'layout-dialog-header',
  dialogBody: 'layout-dialog-body',
  dialogFooter: 'layout-dialog-footer',

  // Sidebar & Floating Panels
  sidebarShell: 'layout-sidebar-shell',
  panelCard: 'layout-panel-card',
  glassDock: 'layout-glass-dock',

  // Grid Layout Tokens
  grid2Col: 'layout-grid-2col',
  grid3Col: 'layout-grid-3col',
  grid4Col: 'layout-grid-4col',
  gridSplit: 'layout-grid-split',

  // Bars & Navigation Layouts
  toolbarFloating: 'layout-toolbar-floating',
  statusbarFloating: 'layout-statusbar-floating',
  ribbonBar: 'layout-ribbon-bar',
} as const;
