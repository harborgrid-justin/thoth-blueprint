/**
 * Label styles composer and expressions compiler.
 * Supports parent-child inheritance, property overrides, and text expression compilation.
 */

export interface LabelStyleGeneral {
  layer: string;
  visible: boolean;
  planReadable: boolean;
}

export interface LabelStyleLayout {
  textTemplate: string; // e.g. "STA: {Station}\nELEV: {Elevation}"
  fontSize: number;
  fontColor: string;
  anchorPoint: string;
}

export interface LabelStyleDraggedState {
  leaderVisible: boolean;
  stackedText: boolean;
  gap: number;
}

export interface LabelStyle {
  id: string;
  name: string;
  parentId?: string; // for child styles inheriting properties
  general?: Partial<LabelStyleGeneral>;
  layout?: Partial<LabelStyleLayout>;
  draggedState?: Partial<LabelStyleDraggedState>;
}

/** Merges a child style override with its resolved parent style. */
export function resolveLabelStyle(
  styleId: string,
  stylesList: Record<string, LabelStyle>,
): {
  id: string;
  name: string;
  general: LabelStyleGeneral;
  layout: LabelStyleLayout;
  draggedState: LabelStyleDraggedState;
} {
  const defaultStyle = {
    general: { layer: "C-ANNO-LABL", visible: true, planReadable: true },
    layout: { textTemplate: "{Name}", fontSize: 8, fontColor: "#000000", anchorPoint: "center" },
    draggedState: { leaderVisible: true, stackedText: true, gap: 2 },
  };

  const chain: LabelStyle[] = [];
  let curr: LabelStyle | undefined = stylesList[styleId];
  while (curr) {
    chain.unshift(curr); // parent first, then child
    curr = curr.parentId ? stylesList[curr.parentId] : undefined;
  }

  // Fold chain over default style
  const general = { ...defaultStyle.general };
  const layout = { ...defaultStyle.layout };
  const draggedState = { ...defaultStyle.draggedState };

  for (const s of chain) {
    if (s.general) Object.assign(general, s.general);
    if (s.layout) Object.assign(layout, s.layout);
    if (s.draggedState) Object.assign(draggedState, s.draggedState);
  }

  return {
    id: styleId,
    name: stylesList[styleId]?.name ?? "Resolved Style",
    general,
    layout,
    draggedState,
  };
}

import { formatStation } from "./alignment";

/** Format azimuth degrees as quadrant bearing string, e.g. N 45-30-00 E. */
export function formatQuadrantBearing(azimuth: number): string {
  const normalized = ((azimuth % 360) + 360) % 360;
  
  let quadrant = "N";
  let bearingVal = 0;
  let exitDir = "E";

  if (normalized >= 0 && normalized < 90) {
    quadrant = "N";
    bearingVal = normalized;
    exitDir = "E";
  } else if (normalized >= 90 && normalized < 180) {
    quadrant = "S";
    bearingVal = 180 - normalized;
    exitDir = "E";
  } else if (normalized >= 180 && normalized < 270) {
    quadrant = "S";
    bearingVal = normalized - 180;
    exitDir = "W";
  } else {
    quadrant = "N";
    bearingVal = 360 - normalized;
    exitDir = "W";
  }

  const deg = Math.floor(bearingVal);
  const minFloat = (bearingVal - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);

  const pad = (num: number) => String(num).padStart(2, "0");
  return `${quadrant} ${deg}°${pad(min)}'${pad(sec)}" ${exitDir}`;
}



/**
 * Compiles a text template with variables and evaluates basic math expressions.
 * Supports evaluating bracket tags {Expression} inside strings.
 */
export function compileLabelTemplate(
  template: string,
  variables: Record<string, string | number>,
  declination = 0,
): string {
  let result = template;

  // Replace standard labels variables
  for (const key of Object.keys(variables)) {
    const val = variables[key];
    const regex = new RegExp(`\\{${key}\\}`, "g");
    
    if (key === "Station" && typeof val === "number") {
      result = result.replace(regex, formatStation(val));
    } else if (key === "Bearing" && typeof val === "number") {
      // Apply declination correction to azimuth bearing
      const corrected = (val + declination) % 360;
      result = result.replace(regex, formatQuadrantBearing(corrected));
    } else {
      result = result.replace(regex, String(val));
    }
  }

  // Parse and evaluate simple math expressions, e.g. {Elevation + 5.2}
  const mathRegex = /\{([a-zA-Z0-9_\s+\-*/.]+)\}/g;
  let match;
  while ((match = mathRegex.exec(result)) !== null) {
    const orig = match[0];
    let expression = match[1];

    // Replace variables in expression
    for (const key of Object.keys(variables)) {
      const val = variables[key];
      if (typeof val === "number") {
        expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), String(val));
      }
    }

    try {
      // Evaluate basic math expression safely (only numbers, math symbols)
      if (/^[0-9+\-*/().\s]+$/.test(expression)) {
        const evaluated = Function(`"use strict"; return (${expression});`)();
        if (typeof evaluated === "number" && !isNaN(evaluated)) {
          result = result.replace(orig, evaluated.toFixed(2));
        }
      }
    } catch (e) {
      // Leave template tag unresolved if math evaluation fails
    }
  }

  return result;
}
