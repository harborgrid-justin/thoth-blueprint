import { LAYOUT_STYLES } from '@/styles/layoutTokens';

/**
 * Standardized Design System Style Tokens & Centralized Classnames for Survey Suite.
 * Maps to styles defined in `features/survey/styles/survey.css`.
 */
export const SURVEY_STYLES = {
  // Dialog & Modal Containers (div)
  dialogOverlay: 'survey-dialog-overlay',
  dialogContainer: 'survey-dialog-container',
  dialogContainerSm: 'survey-dialog-container-sm',
  dialogHeader: 'survey-dialog-header',
  dialogBody: 'survey-dialog-body',
  dialogFooter: 'survey-dialog-footer',
  banner: 'survey-banner',
  tabBar: 'survey-tab-bar',
  sidebar: 'survey-sidebar',

  // Centralized Grid Layouts (composed from central LAYOUT_STYLES)
  grid2Col: LAYOUT_STYLES.grid2Col,
  grid3Col: LAYOUT_STYLES.grid3Col,
  grid4Col: LAYOUT_STYLES.grid4Col,
  layoutSidebar: 'survey-layout-sidebar',
  layoutSidebarSm: 'survey-layout-sidebar-sm',
  layoutSidebarLg: 'survey-layout-sidebar-lg',

  // Panels & Cards (div)
  panelDark: 'survey-panel-dark',
  card: 'survey-card',
  cardSubtle: 'survey-card-subtle',

  // Typography & Paragraphs (p, h2, h3, span)
  dialogTitle: 'survey-dialog-title',
  textSubtitle: 'survey-text-subtitle',
  textSectionTitle: 'survey-text-section-title',
  textBody: 'survey-text-body',
  textMuted: 'survey-text-muted',
  label: 'survey-label',
  statValue: 'survey-stat-value',
  statLabel: 'survey-stat-label',

  // Form Controls (input, select)
  input: 'survey-input',
  select: 'survey-select',

  // Badges (span)
  badge: 'survey-badge',
  badgeCyan: 'survey-badge-cyan',
  badgeEmerald: 'survey-badge-emerald',

  // Buttons (button)
  btn: 'survey-btn',
  btnPrimary: 'survey-btn',
  btnSecondary: 'survey-btn-secondary',
  btnOutline: 'survey-btn-outline',
  btnClose: 'survey-btn-close',
  btnTab: 'survey-btn-tab',
  btnTabActive: 'survey-btn-tab-active',
  btnPill: 'survey-btn-pill',
  btnPillActive: 'survey-btn-pill-active',
  btnIcon: 'survey-btn-icon',
  btnGhost: 'survey-btn-ghost',
  btnDestructive: 'survey-btn-destructive',

  // Toolbar
  toolbar: 'survey-toolbar',

  // Data Table Grids (th, td, tr)
  tableTh: 'survey-table-th',
  tableTd: 'survey-table-td',
  tableRow: 'survey-table-row',
} as const;
