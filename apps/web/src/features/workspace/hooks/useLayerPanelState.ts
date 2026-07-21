import * as React from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { countLayerElements, evaluatePointGroups } from "../helpers/layerPanelHelpers";

export function useLayerPanelState() {
  const site = useWorkspaceStore((s) => s.site);
  const activeLayerId = useWorkspaceStore((s) => s.activeLayerId);
  const setActiveLayer = useWorkspaceStore((s) => s.setActiveLayer);
  const updateLayer = useWorkspaceStore((s) => s.updateLayer);
  const removeLayer = useWorkspaceStore((s) => s.removeLayer);
  const reorderLayer = useWorkspaceStore((s) => s.reorderLayer);
  const addLayer = useWorkspaceStore((s) => s.addLayer);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const layers = React.useMemo(
    () => (site ? [...site.layers].sort((a, b) => b.order - a.order) : []),
    [site]
  );

  const counts = React.useMemo(
    () => (site ? countLayerElements(site.elements) : new Map<string, number>()),
    [site]
  );

  const evaluatedGroups = React.useMemo(
    () => (site ? evaluatePointGroups(site.elements) : []),
    [site]
  );

  function handleAddLayer() {
    if (site) {
      addLayer(`Layer ${site.layers.length + 1}`);
    }
  }

  return {
    site,
    layers,
    counts,
    evaluatedGroups,
    activeLayerId,
    setActiveLayer,
    updateLayer,
    removeLayer,
    reorderLayer,
    handleAddLayer,
    editingId,
    setEditingId,
  };
}
