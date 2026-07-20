/**
 * Annotation and drafting symbology — the text, leaders, tags, and reference
 * marks that turn geometry into a readable sheet: text styles, keynotes and
 * keynote tags, structural **column grids** with bubbled gridlines, **revision
 * clouds** with delta tags, and room/door/window tags. Pure data plus small
 * geometry helpers; the renderer draws the bubbles, clouds, and leaders.
 */

import type { Point, Polygon } from "../spatial/geometry";
import { add, distance, normalize, scale, subtract } from "../spatial/geometry";

/** Text justification. */
export type TextJustify = "left" | "center" | "right";

/** A named text style. */
export interface TextStyle {
  id: string;
  label: string;
  /** Text height in paper millimetres. */
  height: number;
  font: string;
  justify: TextJustify;
  bold?: boolean;
}

/** Standard text styles (title, heading, note, tag). */
export const TEXT_STYLES: TextStyle[] = [
  { id: "title", label: "Sheet title", height: 5, font: "sans-serif", justify: "left", bold: true },
  { id: "heading", label: "Heading", height: 3.5, font: "sans-serif", justify: "left", bold: true },
  { id: "note", label: "Note", height: 2.5, font: "sans-serif", justify: "left" },
  { id: "tag", label: "Tag", height: 2.5, font: "sans-serif", justify: "center", bold: true },
];

/** A leader: a line from an arrow to a text landing. */
export interface Leader {
  id: string;
  /** Points from the arrow tip to the text landing (model space). */
  points: Point[];
  text: string;
  arrow: "arrow" | "dot" | "none";
}

/** A project keynote (a numbered note referenced by tags). */
export interface Keynote {
  id: string;
  /** Keynote number/code, e.g. "A1" or "07". */
  number: string;
  text: string;
}

/** A keynote tag placed on the drawing, optionally with a leader. */
export interface KeynoteTag {
  id: string;
  keynoteId: string;
  position: Point;
  leaderTo?: Point;
}

/** A structural/column grid line with a bubble label at one or both ends. */
export interface GridLine {
  id: string;
  /** Bubble label — digits for one axis, letters for the other. */
  label: string;
  kind: "digit" | "letter";
  /** The gridline in model space. */
  from: Point;
  to: Point;
  /** Which ends carry a bubble. */
  bubbles?: "start" | "end" | "both";
}

/** The computed placement of a grid bubble. */
export interface GridBubble {
  center: Point;
  /** Direction from the line end outward to the bubble, unit vector. */
  dir: Point;
  label: string;
}

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

/** A revision cloud enclosing changed content, tagged with a delta number. */
export interface RevisionCloud {
  id: string;
  delta: number;
  /** The cloud boundary in model space (arcs bulge outward along it). */
  boundary: Polygon;
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

/** A room tag (name + number + optional area) placed at a point. */
export interface RoomTag {
  id: string;
  roomId: string;
  position: Point;
}

/** A door/window tag (mark bubble) placed at a point. */
export interface OpeningTag {
  id: string;
  openingId: string;
  kind: "door" | "window";
  position: Point;
}
