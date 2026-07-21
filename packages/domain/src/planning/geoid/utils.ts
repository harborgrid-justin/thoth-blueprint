/**
 * GEOID Helper Utilities — Parsing, Validation, Formatting, and Hierarchy Resolution.
 *
 * Implements US Census GEOID structure rules:
 * - State: 2 digits (e.g., "48" for Texas)
 * - County: 5 digits = State (2) + County (3) (e.g., "48201" for Harris County)
 * - County Subdivision: 10 digits = State (2) + County (3) + COUSUB (5) (e.g., "4820192975" for Pasadena CCD)
 */

import type { GeoidAreaType, ParsedGeoid } from "./types.js";

/** Clean and normalize a GEOID input string (removes hyphens, spaces, leading/trailing whitespace). */
export function normalizeGeoid(raw: string | number): string {
  if (typeof raw === "number") {
    const s = raw.toString();
    // Pad leading zero if 1, 4, or 9 digits (e.g., 6037 -> 06037 for CA)
    if (s.length === 1 || s.length === 4 || s.length === 9) {
      return "0" + s;
    }
    return s;
  }
  const clean = raw.trim().replace(/[^0-9]/g, "");
  // If user passed a 1, 4, or 9 digit string (e.g. "6037" for LA County), prepend '0'
  if (clean.length === 1 || clean.length === 4 || clean.length === 9) {
    return "0" + clean;
  }
  return clean;
}

/** Determine the area classification from normalized GEOID digit length. */
export function getAreaType(geoid: string): GeoidAreaType {
  const norm = normalizeGeoid(geoid);
  switch (norm.length) {
    case 2:
      return "state";
    case 5:
      return "county";
    case 7:
    case 10:
      return "cousub";
    default:
      return "unknown";
  }
}

/** Parse a GEOID into its component FIPS parts. */
export function parseGeoid(rawGeoid: string | number): ParsedGeoid {
  const raw = String(rawGeoid);
  const norm = normalizeGeoid(rawGeoid);
  const areaType = getAreaType(norm);

  if (areaType === "state") {
    return {
      raw,
      areaType: "state",
      stateCode: norm,
      isValid: true,
    };
  }

  if (areaType === "county") {
    const stateCode = norm.slice(0, 2);
    const countyCode = norm.slice(2, 5);
    return {
      raw,
      areaType: "county",
      stateCode,
      countyCode,
      fullCountyGeoid: norm,
      isValid: true,
    };
  }

  if (areaType === "cousub") {
    const stateCode = norm.slice(0, 2);
    const countyCode = norm.slice(2, 5);
    const cousubCode = norm.slice(5);
    return {
      raw,
      areaType: "cousub",
      stateCode,
      countyCode,
      cousubCode,
      fullCountyGeoid: `${stateCode}${countyCode}`,
      fullCousubGeoid: norm,
      isValid: true,
    };
  }

  return {
    raw,
    areaType: "unknown",
    stateCode: norm.slice(0, 2),
    isValid: false,
  };
}

/**
 * Returns the ordered lookup hierarchy array for a target GEOID, from target to parent state.
 * Example for 10-digit '4820192975': ['4820192975', '48201', '48']
 * Example for 5-digit '48201': ['48201', '48']
 * Example for 2-digit '48': ['48']
 */
export function getGeoidHierarchy(geoid: string | number): string[] {
  const parsed = parseGeoid(geoid);
  if (!parsed.isValid) {
    const norm = normalizeGeoid(geoid);
    return norm ? [norm] : [];
  }

  const hierarchy: string[] = [];
  if (parsed.fullCousubGeoid) {
    hierarchy.push(parsed.fullCousubGeoid);
  }
  if (parsed.fullCountyGeoid) {
    hierarchy.push(parsed.fullCountyGeoid);
  }
  if (parsed.stateCode) {
    hierarchy.push(parsed.stateCode);
  }

  return hierarchy;
}

/** Format a normalized GEOID string into hyphenated standard representation (e.g. "48-201-92975"). */
export function formatGeoid(geoid: string | number): string {
  const parsed = parseGeoid(geoid);
  if (!parsed.isValid) return String(geoid);

  if (parsed.areaType === "state") {
    return parsed.stateCode;
  }
  if (parsed.areaType === "county") {
    return `${parsed.stateCode}-${parsed.countyCode}`;
  }
  if (parsed.areaType === "cousub") {
    return `${parsed.stateCode}-${parsed.countyCode}-${parsed.cousubCode}`;
  }
  return parsed.raw;
}

/** Check whether a given GEOID string is a valid 2, 5, or 10 digit code. */
export function isValidGeoid(geoid: string | number): boolean {
  return parseGeoid(geoid).isValid;
}
