import * as React from "react";
import _ from "lodash";
import { isSpatialElement, type SpatialElement } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";

export function usePlatReportState() {
  const platOpen = useUiStore((s) => s.platOpen);
  const platTargetId = useUiStore((s) => s.platTargetId);
  const closePlat = useUiStore((s) => s.closePlat);
  const site = useWorkspaceStore((s) => s.site);

  const surveyable = React.useMemo<SpatialElement[]>(
    () => (site ? (_.filter(site.elements, isSpatialElement) as SpatialElement[]) : []),
    [site],
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!platOpen) {return;}
    const preferred =
      (platTargetId && _.find(surveyable, (e) => e.id === platTargetId)?.id) ??
      _.find(surveyable, (e) => e.kind === "lot")?.id ??
      surveyable[0]?.id ??
      null;
    setSelectedId(preferred);
  }, [platOpen, platTargetId, surveyable]);

  const selected = React.useMemo(
    () => _.find(surveyable, (e) => e.id === selectedId) ?? null,
    [surveyable, selectedId]
  );

  return {
    platOpen,
    closePlat,
    site,
    surveyable,
    selectedId,
    setSelectedId,
    selected,
  };
}
