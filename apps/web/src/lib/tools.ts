import type { ElementKind } from "@thoth/domain";
import {
  Building2,
  Hand,
  Map as MapIcon,
  MapPin,
  MousePointer2,
  Route,
  Ruler,
  Shapes,
  Square,
  Trees,
  type LucideIcon,
} from "lucide-react";

/** The active canvas interaction. Drawing tools map to an {@link ElementKind}. */
export type ToolId =
  | "select"
  | "pan"
  | "measure"
  | "parcel"
  | "zone"
  | "landuse"
  | "lot"
  | "building"
  | "row"
  | "openspace"
  | "note";

export interface ToolDef {
  id: ToolId;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  /** The element kind this tool draws, if it is a drawing tool. */
  kind?: ElementKind;
  /** How the tool captures geometry. */
  mode: "select" | "pan" | "polygon" | "point" | "ruler";
}

export const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V", mode: "select" },
  { id: "pan", label: "Pan", icon: Hand, shortcut: "H", mode: "pan" },
  { id: "parcel", label: "Parcel", icon: Square, shortcut: "P", kind: "parcel", mode: "polygon" },
  { id: "zone", label: "Zone", icon: MapIcon, shortcut: "Z", kind: "zone", mode: "polygon" },
  { id: "landuse", label: "Land Use", icon: Shapes, shortcut: "U", kind: "landuse", mode: "polygon" },
  { id: "lot", label: "Lot", icon: Building2, shortcut: "L", kind: "lot", mode: "polygon" },
  {
    id: "building",
    label: "Building",
    icon: Building2,
    shortcut: "B",
    kind: "building",
    mode: "polygon",
  },
  { id: "row", label: "Right-of-Way", icon: Route, shortcut: "R", kind: "row", mode: "polygon" },
  {
    id: "openspace",
    label: "Open Space",
    icon: Trees,
    shortcut: "O",
    kind: "openspace",
    mode: "polygon",
  },
  { id: "note", label: "Note", icon: MapPin, shortcut: "N", kind: "note", mode: "point" },
  { id: "measure", label: "Measure", icon: Ruler, shortcut: "M", mode: "ruler" },
];

const BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

export function toolDef(id: ToolId): ToolDef {
  return BY_ID.get(id)!;
}
