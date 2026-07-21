import _ from "lodash";
import {
  type Assembly,
  buildCorridorSections,
  extractCorridorFeatureLines,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function extrudeCorridor({
  alignment,
  profile,
  assembly,
  frequency,
}: {
  alignment: any;
  profile: any;
  assembly: Assembly;
  frequency: number;
}) {
  if (!alignment || !profile) {
    return;
  }

  const corridor = {
    id: "cor-1",
    name: `Corridor - ${alignment.name}`,
    alignmentId: alignment.id,
    profileId: profile.id,
    assemblyId: assembly.id,
    frequency,
  };

  const sections = buildCorridorSections(
    corridor,
    alignment,
    profile,
    assembly,
  );
  const featureLines = extractCorridorFeatureLines(sections);

  const newElements = _.map(featureLines, (fl) => ({
    id: `fl-${fl.code}`,
    kind: "corridor" as any,
    layerId: "c-road",
    name: `${fl.code} Feature Line`,
    boundary: _.map(fl.points, (p) => ({ x: p.x, y: p.y })),
    properties: { code: fl.code, points3D: fl.points },
  }));

  if (useWorkspaceStore.getState().addElements) {
    useWorkspaceStore.getState().addElements(newElements as any);
  }
}
