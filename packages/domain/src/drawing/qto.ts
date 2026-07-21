import _ from "lodash";
import { type CrossSection } from "../civil/profile";

import type { SectionArea, StationVolume, MassHaulPoint } from "./types/qto";

export type { SectionArea, StationVolume, MassHaulPoint };

/**
 * Calculates cut and fill areas for a cross section using the trapezoidal rule
 * integrated over the offset range.
 */
export function calculateSectionArea(section: CrossSection): SectionArea {
  let cutArea = 0;
  let fillArea = 0;

  const n = Math.min(
    section.existingPoints.length,
    section.proposedPoints.length,
  );
  if (n < 2) {
    return { station: section.station, cutArea, fillArea };
  }

  // Ensure points are sorted by offset using lodash
  const existing = _.sortBy(section.existingPoints, "offset");
  const proposed = _.sortBy(section.proposedPoints, "offset");

  for (let i = 0; i < n - 1; i++) {
    const x0 = existing[i].offset;
    const x1 = existing[i + 1].offset;
    const w = x1 - x0;
    if (w <= 0.0001) {
      continue;
    }

    // Difference proposed - existing (positive is fill, negative is cut)
    const d0 = proposed[i].elevation - existing[i].elevation;
    const d1 = proposed[i + 1].elevation - existing[i + 1].elevation;

    if (d0 >= 0 && d1 >= 0) {
      // Entirely fill
      fillArea += (w * (d0 + d1)) / 2;
    } else if (d0 <= 0 && d1 <= 0) {
      // Entirely cut
      cutArea += (w * (Math.abs(d0) + Math.abs(d1))) / 2;
    } else {
      // Crossing case: d0 and d1 have opposite signs. Find the zero crossing offset.
      // x_zero is between x0 and x1
      const t = -d0 / (d1 - d0);
      const w_fill = d0 > 0 ? w * t : w * (1 - t);
      const w_cut = d0 < 0 ? w * t : w * (1 - t);

      const h_fill = d0 > 0 ? d0 : d1;
      const h_cut = d0 < 0 ? Math.abs(d0) : Math.abs(d1);

      fillArea += (w_fill * h_fill) / 2;
      cutArea += (w_cut * h_cut) / 2;
    }
  }

  return {
    station: section.station,
    cutArea,
    fillArea,
  };
}

/**
 * Calculates cut and fill volumes between two cross-sections using the Average End Area method.
 */
export function averageEndAreaVolume(
  secA: CrossSection,
  secB: CrossSection,
): StationVolume {
  const areaA = calculateSectionArea(secA);
  const areaB = calculateSectionArea(secB);

  const length = Math.abs(secB.station - secA.station);

  const cutVolume = ((areaA.cutArea + areaB.cutArea) / 2) * length;
  const fillVolume = ((areaA.fillArea + areaB.fillArea) / 2) * length;

  return {
    startStation: Math.min(secA.station, secB.station),
    endStation: Math.max(secA.station, secB.station),
    cutVolume,
    fillVolume,
    netVolume: cutVolume - fillVolume,
  };
}

/**
 * Generates cumulative mass haul volume lines along consecutive section intervals.
 */
export function calculateMassHaul(sections: CrossSection[]): MassHaulPoint[] {
  if (sections.length === 0) {
    return [];
  }
  const sorted = _.sortBy(sections, "station");

  const points: MassHaulPoint[] = [
    { station: sorted[0].station, cumulativeVolume: 0 },
  ];
  let runningSum = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const vol = averageEndAreaVolume(sorted[i], sorted[i + 1]);
    runningSum += vol.netVolume;
    points.push({
      station: sorted[i + 1].station,
      cumulativeVolume: runningSum,
    });
  }

  return points;
}

/** A construction or engineering pay item. */
export interface PayItem {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  category?: string;
}

/** Binds a pay item to an AutoCAD object or site planning primitive. */
export interface PayItemAssignment {
  elementId: string;
  payItemId: string;
  formula?: string; // e.g. "length * unitCost" or "area * unitCost"
}

/** Evaluates the quantity cost for an object using simple formula expressions. */
export function evaluatePayItemCost(
  item: PayItem,
  variables: { length?: number; area?: number; count?: number },
  formula = "quantity * unitCost",
): { quantity: number; cost: number } {
  const len = variables.length ?? 0;
  const area = variables.area ?? 0;
  const cnt = variables.count ?? 1;

  // Decide the base quantity variable
  let qty = cnt;
  if (
    item.unit.toLowerCase() === "lf" ||
    item.unit.toLowerCase() === "m" ||
    item.unit.toLowerCase() === "feet"
  ) {
    qty = len;
  } else if (
    item.unit.toLowerCase() === "sf" ||
    item.unit.toLowerCase() === "sy" ||
    item.unit.toLowerCase() === "sqm"
  ) {
    qty = area;
  }

  // Basic formulas execution environment
  try {
    // Replace tokens in formulas safely
    const cleanFormula = formula
      .replace(/quantity/g, String(qty))
      .replace(/unitCost/g, String(item.unitCost))
      .replace(/length/g, String(len))
      .replace(/area/g, String(area))
      .replace(/count/g, String(cnt));

    const res = safeEvalMath(cleanFormula);
    if (res !== null && !isNaN(res)) {
      if (formula.includes("unitCost")) {
        return { quantity: qty, cost: res };
      }
      return { quantity: res, cost: res * item.unitCost };
    }
  } catch {
    // Fallback on standard calculations
  }

  return {
    quantity: qty,
    cost: qty * item.unitCost,
  };
}

function safeEvalMath(expr: string): number | null {
  const tokens = expr.match(/\d+(?:\.\d+)?|[+\-*/()]/g);
  if (!tokens || tokens.join("") !== expr.replace(/\s+/g, "")) {
    return null;
  }
  const tok = tokens;

  let pos = 0;
  function parseExpr(): number {
    let left = parseTerm();
    while (pos < tok.length && (tok[pos] === "+" || tok[pos] === "-")) {
      const op = tok[pos++];
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < tok.length && (tok[pos] === "*" || tok[pos] === "/")) {
      const op = tok[pos++];
      const right = parseFactor();
      left = op === "*" ? left * right : right !== 0 ? left / right : 0;
    }
    return left;
  }

  function parseFactor(): number {
    if (pos >= tok.length) {
      return 0;
    }
    const token = tok[pos++];
    if (token === "(") {
      const val = parseExpr();
      if (pos < tok.length && tok[pos] === ")") {
        pos++;
      }
      return val;
    }
    return parseFloat(token) || 0;
  }

  const result = parseExpr();
  return Number.isFinite(result) ? result : null;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim().replace(/^"|"$/g, ""));
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ""));
  return result;
}

/** Parse Pay Item lines from raw CSV string. */
export function parsePayItemListCsv(csvContent: string): PayItem[] {
  const items: PayItem[] = [];
  const lines = csvContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("ID,Name")) {
      continue;
    }

    const parts = parseCsvLine(trimmed);
    if (parts.length >= 4) {
      items.push({
        id: parts[0],
        name: parts[1],
        unit: parts[2],
        unitCost: parseFloat(parts[3]) || 0,
        category: parts[4] ? parts[4] : undefined,
      });
    }
  }
  return items;
}
