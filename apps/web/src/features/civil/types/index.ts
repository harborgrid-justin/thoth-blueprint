export type CivilRibbonTab = 'home' | 'drafting' | 'modify' | 'output' | 'gis';

export interface CivilRibbonBarProps {
  onOpenParcelTools?: () => void;
  onOpenPanoramaEditor?: () => void;
  onOpenModelBuilder?: () => void;
}

export interface ProspectorNode {
  id: string;
  label: string;
  type: 'folder' | 'site' | 'pointgroup' | 'vfg' | 'surface' | 'alignment';
  children?: ProspectorNode[];
  badge?: string;
}

export interface CivilStudioState {
  isPanoramaOpen: boolean;
  isModelBuilderOpen: boolean;
  isLineworkOpen: boolean;
  isParcelLayoutOpen: boolean;
  isSectionGridOpen: boolean;
  isScriptsOpen: boolean;
  activeRibbonTab: CivilRibbonTab;
  selectedProspectorNodeId: string | null;
}
