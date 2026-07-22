import { useState } from 'react';
import type { CivilStudioState, CivilRibbonTab } from '../types';

export function useCivilStudioState() {
  const [state, setState] = useState<CivilStudioState>({
    isPanoramaOpen: false,
    isModelBuilderOpen: false,
    isLineworkOpen: false,
    isParcelLayoutOpen: false,
    isSectionGridOpen: false,
    isScriptsOpen: false,
    activeRibbonTab: 'home',
    selectedProspectorNodeId: null,
  });

  const setIsPanoramaOpen = (isOpen: boolean) =>
    setState(prev => ({ ...prev, isPanoramaOpen: isOpen }));

  const setIsModelBuilderOpen = (isOpen: boolean) =>
    setState(prev => ({ ...prev, isModelBuilderOpen: isOpen }));

  const setIsLineworkOpen = (isOpen: boolean) =>
    setState(prev => ({ ...prev, isLineworkOpen: isOpen }));

  const setIsParcelLayoutOpen = (isOpen: boolean) =>
    setState(prev => ({ ...prev, isParcelLayoutOpen: isOpen }));

  const setIsSectionGridOpen = (isOpen: boolean) =>
    setState(prev => ({ ...prev, isSectionGridOpen: isOpen }));

  const setIsScriptsOpen = (isOpen: boolean) =>
    setState(prev => ({ ...prev, isScriptsOpen: isOpen }));

  const setActiveRibbonTab = (tab: CivilRibbonTab) =>
    setState(prev => ({ ...prev, activeRibbonTab: tab }));

  const setSelectedProspectorNodeId = (id: string | null) =>
    setState(prev => ({ ...prev, selectedProspectorNodeId: id }));

  return {
    state,
    setIsPanoramaOpen,
    setIsModelBuilderOpen,
    setIsLineworkOpen,
    setIsParcelLayoutOpen,
    setIsSectionGridOpen,
    setIsScriptsOpen,
    setActiveRibbonTab,
    setSelectedProspectorNodeId,
  };
}
