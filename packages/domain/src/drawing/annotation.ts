/**
 * Annotation and drafting symbology — the text, leaders, tags, and reference
 * marks that turn geometry into a readable sheet: text styles, keynotes and
 * keynote tags, structural **column grids** with bubbled gridlines, **revision
 * clouds** with delta tags, and room/door/window tags. Pure data plus small
 * geometry helpers; the renderer draws the bubbles, clouds, and leaders.
 */

import type { Point } from "../spatial/geometry";
import { add, distance, normalize, scale, subtract } from "../spatial/geometry";
import type {
  TextJustify,
  TextStyle,
  Leader,
  Keynote,
  KeynoteTag,
  GridLine,
  GridBubble,
  RevisionCloud,
  RoomTag,
  OpeningTag,
} from "./types/annotation";

export type {
  TextJustify,
  TextStyle,
  Leader,
  Keynote,
  KeynoteTag,
  GridLine,
  GridBubble,
  RevisionCloud,
  RoomTag,
  OpeningTag,
};

/** Standard text styles (title, heading, note, tag). */
export const TEXT_STYLES: TextStyle[] = [
  { id: "title", label: "Sheet title", height: 5, font: "sans-serif", justify: "left", bold: true },
  { id: "heading", label: "Heading", height: 3.5, font: "sans-serif", justify: "left", bold: true },
  { id: "note", label: "Note", height: 2.5, font: "sans-serif", justify: "left" },
  { id: "tag", label: "Tag", height: 2.5, font: "sans-serif", justify: "center", bold: true },
];

/**
 * Bubble placements for a gridline, offset `gap` model units beyond each tagged
 * end along the line direction.
 */
export function gridBubbleGeometry(line: GridLine, gap: number): GridBubble[] {
  const dir = normalize(subtract(line.to, line.from));
  const which = line.bubbles ?? "both";
  const out: GridBubble[] = [];
  if (which === "start" || which === "both") {
    out.push({ center: add(line.from, scale(dir, -gap)), dir: scale(dir, -1), label: line.label });
  }
  if (which === "end" || which === "both") {
    out.push({ center: add(line.to, scale(dir, gap)), dir, label: line.label });
  }
  return out;
}

/**
 * Sample a revision-cloud boundary into scalloped arc bumps — returns the bump
 * apex points between consecutive vertices so a renderer can draw the arcs.
 */
export function revisionCloudBumps(cloud: RevisionCloud, bumpSize: number): Point[] {
  const b = cloud.boundary;
  const apexes: Point[] = [];
  for (let i = 0; i < b.length; i++) {
    const a = b[i];
    const c = b[(i + 1) % b.length];
    const len = distance(a, c);
    const count = Math.max(1, Math.round(len / bumpSize));
    const dir = normalize(subtract(c, a));
    const nrm = { x: -dir.y, y: dir.x };
    for (let j = 0; j < count; j++) {
      const t = (j + 0.5) / count;
      const mid = add(a, scale(dir, len * t));
      apexes.push(add(mid, scale(nrm, bumpSize * 0.5)));
    }
  }
  return apexes;
}
