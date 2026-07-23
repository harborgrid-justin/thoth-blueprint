import {
  centerlinePoints,
  dirFor,
  type AlignmentOffset,
} from "@thoth/domain";

export const CENTERLINE_COLOR = "#b91c1c"; // survey-red centerline

export { centerlinePoints, dirFor };

/** Drafting style for an alignment offset line by kind. */
export function offsetStyle(off: AlignmentOffset): {
  stroke: string;
  width: number;
  dash?: string;
} {
  switch (off.kind) {
    case "pavement":
      return { stroke: "#334155", width: 1.2 };
    case "shoulder":
      return { stroke: "#64748b", width: 1, dash: "6 3" };
    case "row":
      return { stroke: "#7c3aed", width: 1.1, dash: "12 3 3 3" };
    case "ditch":
      return { stroke: "#92400e", width: 1, dash: "4 3" };
  }
}
