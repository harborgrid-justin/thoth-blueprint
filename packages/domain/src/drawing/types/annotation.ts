import type { Point, Polygon } from "../../spatial/geometry";

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

/** A revision cloud enclosing changed content, tagged with a delta number. */
export interface RevisionCloud {
  id: string;
  delta: number;
  /** The cloud boundary in model space (arcs bulge outward along it). */
  boundary: Polygon;
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
