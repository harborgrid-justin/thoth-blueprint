import { LAYOUT_STYLES } from '@/styles/layoutTokens';

/**
 * Standardized Design System Style Tokens & Centralized Classnames for Workspace Suite.
 * Maps to styles defined in `features/workspace/styles/workspace.css`.
 */
export const WORKSPACE_STYLES = {
  // Containers & Overlays
  container: 'workspace-container',
  body: 'workspace-body',
  dialogOverlay: 'workspace-dialog-overlay',
  dialogContainer: 'workspace-dialog-container',
  dialogContainerSm: 'workspace-dialog-container-sm',
  dialogHeader: 'workspace-dialog-header',
  dialogBody: 'workspace-dialog-body',
  dialogFooter: 'workspace-dialog-footer',

  // Bars & Navigation
  topbar: 'workspace-topbar',
  toolbar: 'workspace-toolbar',
  statusbar: 'workspace-statusbar',
  presenceBar: 'workspace-presence-bar',
  sidebarPanel: 'workspace-sidebar-panel',
  menuItem: 'workspace-menu-item',
  tabBar: 'workspace-tab-bar',
  pillBar: 'workspace-pill-bar',

  // Dropdowns & Tooltips
  dropdownContent: 'workspace-dropdown-content',
  dropdownItem: 'workspace-dropdown-item',
  dropdownLabel: 'workspace-dropdown-label',
  dropdownSeparator: 'workspace-dropdown-separator',
  tooltipContent: 'workspace-tooltip-content',

  // Centralized Grid Layouts (composed from central LAYOUT_STYLES)
  grid2Col: LAYOUT_STYLES.grid2Col,
  grid3Col: LAYOUT_STYLES.grid3Col,
  grid4Col: LAYOUT_STYLES.grid4Col,
  layoutSidebar: 'workspace-layout-sidebar',
  layoutSidebarLg: 'workspace-layout-sidebar-lg',

  // Panels, Cards & Lists
  panelDark: 'workspace-panel-dark',
  card: 'workspace-card',
  cardSubtle: 'workspace-card-subtle',
  cardHeader: 'workspace-card-header',
  listItem: 'workspace-list-item',
  listItemSub: 'workspace-list-item-sub',
  summaryRow: 'workspace-summary-row',

  // Typography
  title: 'workspace-title',
  textSubtitle: 'workspace-text-subtitle',
  textSectionTitle: 'workspace-text-section-title',
  textBody: 'workspace-text-body',
  textMuted: 'workspace-text-muted',
  label: 'workspace-label',
  statValue: 'workspace-stat-value',
  statLabel: 'workspace-stat-label',

  // Form Controls
  input: 'workspace-input',
  select: 'workspace-select',

  // Badges
  badge: 'workspace-badge',
  badgeAmber: 'workspace-badge-amber',
  badgeEmerald: 'workspace-badge-emerald',

  // Buttons & Tabs
  btn: 'workspace-btn',
  btnPrimary: 'workspace-btn',
  btnSecondary: 'workspace-btn-secondary',
  btnOutline: 'workspace-btn-outline',
  btnClose: 'workspace-btn-close',
  btnTab: 'workspace-btn-tab',
  btnTabActive: 'workspace-btn-tab-active',
  btnPill: 'workspace-btn-pill',
  btnPillActive: 'workspace-btn-pill-active',
  btnIcon: 'workspace-btn-icon',
  btnGhost: 'workspace-btn-ghost',

  // Tables & Subtables
  tableTh: 'workspace-table-th',
  tableTd: 'workspace-table-td',
  tableRow: 'workspace-table-row',
  subtable: 'workspace-subtable',
  subtableRow: 'workspace-subtable-row',
  subtableTdLabel: 'workspace-subtable-td-label',
  subtableTdVal: 'workspace-subtable-td-val',
} as const;
