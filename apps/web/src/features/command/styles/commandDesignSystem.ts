/**
 * Standardized Design System Style Tokens & Centralized Classnames for Command Suite.
 * Maps to styles defined in `features/command/styles/command.css`.
 */
export const COMMAND_STYLES = {
  // Command Palette
  paletteDialog: 'command-palette-dialog',
  paletteInputWrapper: 'command-palette-input-wrapper',
  paletteInput: 'command-palette-input',
  paletteList: 'command-palette-list',
  paletteEmpty: 'command-palette-empty',
  paletteGroupTitle: 'command-palette-group-title',
  paletteItem: 'command-palette-item',
  paletteItemActive: 'command-palette-item-active',
  paletteItemInactive: 'command-palette-item-inactive',
  paletteShortcut: 'command-palette-shortcut',

  // Command Line (Bottom)
  cliContainer: 'command-line-container',
  cliHeader: 'command-line-header',
  cliTitle: 'command-line-title',
  cliInputWrapper: 'command-line-input-wrapper',
  cliPrompt: 'command-line-prompt',
  cliInput: 'command-line-input',

  // Shortcuts Dialog
  shortcutsDialog: 'command-shortcuts-dialog',
  shortcutsSectionTitle: 'command-shortcuts-section-title',
  shortcutsRow: 'command-shortcuts-row',
  shortcutsKey: 'command-shortcuts-key',
} as const;
