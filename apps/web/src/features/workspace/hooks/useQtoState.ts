import * as React from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  DEFAULT_PAY_ITEMS,
  DEFAULT_ASSIGNMENTS,
  computeAssignedReports,
} from "../helpers/qtoHelpers";

export type QtoTab = "earthwork" | "payitems" | "renovation" | "stairs" | "curtainwalls" | "assemblies" | "roofs";

export function useQtoState() {
  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const hoveredElementId = useWorkspaceStore((s) => s.hoveredElementId);
  const hoverElement = useWorkspaceStore((s) => s.hoverElement);
  const select = useWorkspaceStore((s) => s.select);

  const [activeTab, setActiveTab] = React.useState<QtoTab>("earthwork");
  const payItems = DEFAULT_PAY_ITEMS;
  const assignments = DEFAULT_ASSIGNMENTS;

  const assignedReports = React.useMemo(() => {
    return computeAssignedReports(site, assignments, payItems);
  }, [site, assignments, payItems]);

  const totalCost = React.useMemo(() => {
    return assignedReports.reduce((s, r) => s + r.cost, 0);
  }, [assignedReports]);

  return {
    site,
    selection,
    hoveredElementId,
    hoverElement,
    select,
    activeTab,
    setActiveTab,
    payItems,
    assignedReports,
    totalCost,
  };
}
