import _ from "lodash";
import { calculateSuperelevationRunoff } from "../../civil/superElevation";

export function computeSuperelevation({
  alignment,
  designSpeed,
  eMax,
  normalCrown,
}: {
  alignment: any;
  designSpeed: number;
  eMax: number;
  normalCrown: number;
}) {
  if (!alignment) {
    return null;
  }
  return calculateSuperelevationRunoff(
    alignment,
    designSpeed,
    eMax,
    normalCrown,
  );
}

export function saveAlignmentSuperelevation({
  alignment,
  site,
  designSpeed,
  superCurve: _superCurve,
}: {
  alignment: any;
  site: any;
  designSpeed: number;
  superCurve: any;
}) {
  if (!alignment) {
    return null;
  }

  const patch = {
    ...alignment,
    designSpeed,
    designSpeeds: [{ station: alignment.startStation, speed: designSpeed }],
  };

  const updatedAlignments = _.map(site?.alignments ?? [], (a: any) =>
    a.id === alignment.id ? patch : a,
  );

  return {
    alignmentId: alignment.id,
    patch: { alignments: updatedAlignments },
  };
}
