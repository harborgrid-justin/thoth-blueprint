import * as React from "react";
import _ from "lodash";
import { type PipeDesignRules } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { buildTerrainModel } from "@/features/terrain/terrainModel";
import { initializeNodeInverts, runPipeValidation } from "../helpers/pipeHelpers";

export function usePipeDesignState() {
  const open = useUiStore((s) => s.pipeOpen);
  const setOpen = useUiStore((s) => s.setPipeOpen);
  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const hoveredElementId = useWorkspaceStore((s) => s.hoveredElementId);
  const hoverElement = useWorkspaceStore((s) => s.hoverElement);
  const select = useWorkspaceStore((s) => s.select);

  const networks = site?.networks ?? [];
  const [selectedNetId, setSelectedNetId] = React.useState<string | null>(null);

  const terrain = React.useMemo(() => (site ? buildTerrainModel(site) : null), [site]);
  const terrainSurface = terrain?.existing ?? null;

  const [rules, setRules] = React.useState<PipeDesignRules>({
    minCover: 4.0,
    minSlope: 0.005,
    maxSlope: 0.08,
    minPipeDiameter: 1.0,
    defaultSumpDepth: 1.5,
  });

  const [inverts, setInverts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (open && networks.length > 0) {
      setSelectedNetId(networks[0].id);
      const initInverts = initializeNodeInverts(networks, site, terrainSurface);
      setInverts(initInverts);
    }
  }, [open, networks, site, terrainSurface]);

  const activeNet = _.find(networks, (n) => n.id === selectedNetId) ?? networks[0] ?? null;

  const validation = React.useMemo(() => {
    return runPipeValidation({ activeNet, terrainSurface, rules, inverts });
  }, [activeNet, terrainSurface, rules, inverts]);

  function handleInvertChange(nodeId: string, val: number) {
    setInverts((prev) => ({ ...prev, [nodeId]: val }));
  }

  return {
    open,
    setOpen,
    site,
    selection,
    hoveredElementId,
    hoverElement,
    select,
    networks,
    selectedNetId,
    setSelectedNetId,
    activeNet,
    rules,
    setRules,
    inverts,
    validation,
    handleInvertChange,
  };
}
