import type { ElementKind } from "@thoth/domain";
import type { NetworkKind, RoadClass } from "@thoth/domain";
import {
  Building2,
  Globe,
  Hand,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Mountain,
  MousePointer2,
  Route,
  Ruler,
  Shapes,
  Spline,
  Sprout,
  Square,
  SquareDashed,
  TreePine,
  Trees,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** The active canvas interaction. Drawing tools map to an {@link ElementKind}. */
export type ToolId =
  | "select"
  | "pan"
  | "measure"
  | "region"
  | "parcel"
  | "zone"
  | "landuse"
  | "lot"
  | "building"
  | "row"
  | "openspace"
  | "easement"
  | "water"
  | "planting"
  | "grade"
  | "tree"
  | "spot"
  | "road"
  | "utility"
  | "alignment"
  | "note"
  | "waterdrop";

export interface ToolDef {
  id: ToolId;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  /** The element kind this tool draws, if it is an element drawing tool. */
  kind?: ElementKind;
  /** Config for network tools (roads/utilities). */
  network?: { kind: NetworkKind; roadClass?: RoadClass };
  /** How the tool captures geometry. */
  mode: "select" | "pan" | "polygon" | "point" | "ruler" | "polyline";
  /** Grouping for the toolbar. */
  group: "select" | "plan" | "landscape" | "terrain" | "infra";
}

export const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V", mode: "select", group: "select" },
  { id: "pan", label: "Pan", icon: Hand, shortcut: "H", mode: "pan", group: "select" },

  { id: "region", label: "Region", icon: Globe, shortcut: "G", kind: "region", mode: "polygon", group: "plan" },
  { id: "parcel", label: "Parcel", icon: Square, shortcut: "P", kind: "parcel", mode: "polygon", group: "plan" },
  { id: "zone", label: "Zone", icon: MapIcon, shortcut: "Z", kind: "zone", mode: "polygon", group: "plan" },
  { id: "landuse", label: "Land Use", icon: Shapes, shortcut: "U", kind: "landuse", mode: "polygon", group: "plan" },
  { id: "lot", label: "Lot", icon: Building2, shortcut: "L", kind: "lot", mode: "polygon", group: "plan" },
  { id: "building", label: "Building", icon: Building2, shortcut: "B", kind: "building", mode: "polygon", group: "plan" },
  { id: "openspace", label: "Open Space", icon: Trees, shortcut: "O", kind: "openspace", mode: "polygon", group: "plan" },
  { id: "easement", label: "Easement", icon: SquareDashed, shortcut: "X", kind: "easement", mode: "polygon", group: "plan" },

  { id: "road", label: "Road", icon: Route, shortcut: "R", network: { kind: "road", roadClass: "local" }, mode: "polyline", group: "infra" },
  { id: "utility", label: "Utility main", icon: Zap, shortcut: "Y", network: { kind: "water" }, mode: "polyline", group: "infra" },
  { id: "alignment", label: "Alignment (stationed)", icon: Spline, shortcut: "I", mode: "polyline", group: "infra" },

  { id: "water", label: "Water", icon: Waves, shortcut: "W", kind: "water", mode: "polygon", group: "landscape" },
  { id: "planting", label: "Planting", icon: Sprout, shortcut: "A", kind: "planting", mode: "polygon", group: "landscape" },
  { id: "tree", label: "Tree", icon: TreePine, shortcut: "T", kind: "tree", mode: "point", group: "landscape" },

  { id: "grade", label: "Grading", icon: Mountain, shortcut: "D", kind: "grade", mode: "polygon", group: "terrain" },
  { id: "spot", label: "Spot elevation", icon: LocateFixed, shortcut: "E", kind: "spot", mode: "point", group: "terrain" },
  { id: "waterdrop", label: "Water drop", icon: Waves, shortcut: "J", mode: "point", group: "terrain" },

  { id: "measure", label: "Measure", icon: Ruler, shortcut: "M", mode: "ruler", group: "select" },
  { id: "note", label: "Note", icon: MapPin, shortcut: "N", kind: "note", mode: "point", group: "select" },
];

const BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

export function toolDef(id: ToolId): ToolDef {
  return BY_ID.get(id)!;
}
