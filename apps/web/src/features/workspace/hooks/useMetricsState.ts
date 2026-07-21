import * as React from "react";
import {
  checkCompliance,
  computeCommunityMetrics,
  computeSiteMetrics,
  networkStats,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { usePrefsStore } from "@/store/prefsStore";
import { sumNetworkMeters } from "../helpers/metricsHelpers";

export function useMetricsState() {
  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const select = useWorkspaceStore((s) => s.select);
  const requestFitSelection = useCanvasStore((s) => s.requestFitSelection);
  const areaUnit = usePrefsStore((s) => s.areaUnit);
  const setAreaUnit = usePrefsStore((s) => s.setAreaUnit);

  const metrics = React.useMemo(
    () => (site ? computeSiteMetrics(site, areaUnit) : null),
    [site, areaUnit],
  );

  const selectionMetrics = React.useMemo(() => {
    if (!site || selection.length === 0) {
      return null;
    }
    const ids = new Set(selection);
    const subset = site.elements.filter((e) => ids.has(e.id));
    if (subset.length === 0) {
      return null;
    }
    return computeSiteMetrics({ ...site, elements: subset }, areaUnit);
  }, [site, selection, areaUnit]);

  const community = React.useMemo(
    () => (site ? computeCommunityMetrics(site) : null),
    [site],
  );

  const networks = React.useMemo(() => {
    if (!site) {
      return [];
    }
    return (site.networks ?? []).map((n) => networkStats(n, site.spatial));
  }, [site]);

  const findings = React.useMemo(
    () => (site ? checkCompliance(site) : []),
    [site],
  );

  const roadMeters = React.useMemo(
    () => sumNetworkMeters(networks, (k) => k === "road"),
    [networks],
  );
  const utilityMeters = React.useMemo(
    () => sumNetworkMeters(networks, (k) => k !== "road"),
    [networks],
  );

  return {
    site,
    selection,
    select,
    requestFitSelection,
    areaUnit,
    setAreaUnit,
    metrics,
    selectionMetrics,
    community,
    networks,
    findings,
    roadMeters,
    utilityMeters,
  };
}
