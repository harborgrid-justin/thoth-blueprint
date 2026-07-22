/**
 * Domain module implementing REQ-001 through REQ-012 and REQ-101 through REQ-108.
 * Point Management, Formats, Transformations, and Query Builder.
 */

export interface CogoPoint {
  id: string;
  pointNumber: number;
  northing: number;
  easting: number;
  elevation: number;
  rawDescription: string;
  fullDescription?: string;
  pointStyle?: string; // '<none>' or custom style ID
  labelStyle?: string; // '<none>' or custom style ID
  pointGroupId?: string;
  rgbColor?: { r: number; g: number; b: number }; // REQ-102 & REQ-105
  classificationTag?: string; // REQ-105
}

export type PointFileFormat = 'PNEZD' | 'PENZD' | 'XYZ_RGB' | 'PNE' | 'PNEZ';
export type TextDelimiter = ',' | ' ';

export interface CoordinateTransformationOptions {
  scaleFactorX?: number; // REQ-104
  scaleFactorY?: number;
  rotationAngleDeg?: number;
  translationX?: number;
  translationY?: number;
}

export interface AdvancedPointImportOptions {
  elevationAdjustmentFt?: number; // REQ-103
  coordinateTransformation?: CoordinateTransformationOptions; // REQ-104
  expandAttributes?: boolean; // REQ-105
  filterFormat?: PointFileFormat; // REQ-101
}

export interface ImportPreviewResult {
  format: PointFileFormat;
  delimiter: TextDelimiter;
  headers: string[];
  sampleRows: string[][];
  totalParsed: number;
}

export interface PointGroupQueryRule {
  fullDescriptionPattern?: string; // REQ-107
  elevationMin?: number; // REQ-108
  elevationMax?: number;
  specificElevations?: number[];
}

export interface CogoPointGroup {
  id: string;
  name: string;
  isDefault?: boolean;
  isDeletable: boolean;
  pointStyle: string; // '<none>' or style name
  labelStyle: string; // '<none>' or style name
  descriptionMatchingWildcards: string[]; // e.g. ["TREE*", "MON*"]
  manualPointNumbers: number[];
  pointRanges: string[]; // e.g. ["1-100", "200-250"]
  priority: number; // lower number = higher priority
  overrideDescriptionKeys: boolean;
  queryRules?: PointGroupQueryRule[]; // REQ-106
}

export function parseAsciiPointFile(
  content: string,
  format: PointFileFormat = 'PNEZD',
  delimiter: TextDelimiter = ',',
  targetPointGroupId?: string,
  options?: AdvancedPointImportOptions
): CogoPoint[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const points: CogoPoint[] = [];

  let pCount = 1;

  for (const line of lines) {
    const tokens = delimiter === ' ' ? line.split(/\s+/) : line.split(',');
    if (tokens.length < 3) continue;

    let pNum = parseInt(tokens[0], 10);
    if (isNaN(pNum)) {
      if (format === 'XYZ_RGB') {
        pNum = pCount;
      } else {
        continue; // header line
      }
    }

    let northing = 0;
    let easting = 0;
    let elevation = 0;
    let rawDesc = '';
    let rgbColor: { r: number; g: number; b: number } | undefined;

    // REQ-102: Support XYZ_RGB, PNE, PNEZ, PNEZD, PENZD
    if (format === 'PNEZD') {
      northing = parseFloat(tokens[1]) || 0;
      easting = parseFloat(tokens[2]) || 0;
      elevation = parseFloat(tokens[3]) || 0;
      rawDesc = tokens.slice(4).join(' ').trim();
    } else if (format === 'PENZD') {
      easting = parseFloat(tokens[1]) || 0;
      northing = parseFloat(tokens[2]) || 0;
      elevation = parseFloat(tokens[3]) || 0;
      rawDesc = tokens.slice(4).join(' ').trim();
    } else if (format === 'PNE') {
      northing = parseFloat(tokens[1]) || 0;
      easting = parseFloat(tokens[2]) || 0;
      elevation = 0;
    } else if (format === 'PNEZ') {
      northing = parseFloat(tokens[1]) || 0;
      easting = parseFloat(tokens[2]) || 0;
      elevation = parseFloat(tokens[3]) || 0;
    } else if (format === 'XYZ_RGB') {
      easting = parseFloat(tokens[0]) || 0;
      northing = parseFloat(tokens[1]) || 0;
      elevation = parseFloat(tokens[2]) || 0;
      const r = parseInt(tokens[3] || '255', 10);
      const g = parseInt(tokens[4] || '255', 10);
      const b = parseInt(tokens[5] || '255', 10);
      rgbColor = { r, g, b };
      rawDesc = `RGB(${r},${g},${b})`;
    }

    // REQ-103: Advanced elevation adjustment
    if (options?.elevationAdjustmentFt) {
      elevation += options.elevationAdjustmentFt;
    }

    // REQ-104: Coordinate transformation (scale, rotate, translate)
    if (options?.coordinateTransformation) {
      const transform = options.coordinateTransformation;
      let x = easting * (transform.scaleFactorX ?? 1.0);
      let y = northing * (transform.scaleFactorY ?? 1.0);

      if (transform.rotationAngleDeg) {
        const rad = (transform.rotationAngleDeg * Math.PI) / 180;
        const rx = x * Math.cos(rad) - y * Math.sin(rad);
        const ry = x * Math.sin(rad) + y * Math.cos(rad);
        x = rx;
        y = ry;
      }

      x += transform.translationX ?? 0;
      y += transform.translationY ?? 0;

      easting = x;
      northing = y;
    }

    points.push({
      id: `pt-${pNum}`,
      pointNumber: pNum,
      northing,
      easting,
      elevation,
      rawDescription: rawDesc,
      fullDescription: rawDesc,
      pointGroupId: targetPointGroupId,
      rgbColor,
      classificationTag: options?.expandAttributes ? `CLASS_${format}_${pNum}` : undefined,
    });

    pCount++;
  }

  return points;
}

export function generateImportPreview(
  content: string,
  format: PointFileFormat = 'PNEZD',
  delimiter: TextDelimiter = ','
): ImportPreviewResult {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const sampleRows = lines.slice(0, 10).map(line =>
    delimiter === ' ' ? line.split(/\s+/) : line.split(',')
  );

  let headers: string[] = [];
  if (format === 'PNEZD') headers = ['Point Number', 'Northing', 'Easting', 'Elevation', 'Raw Description'];
  else if (format === 'PENZD') headers = ['Point Number', 'Easting', 'Northing', 'Elevation', 'Raw Description'];
  else if (format === 'PNE') headers = ['Point Number', 'Northing', 'Easting'];
  else if (format === 'PNEZ') headers = ['Point Number', 'Northing', 'Easting', 'Elevation'];
  else if (format === 'XYZ_RGB') headers = ['Easting (X)', 'Northing (Y)', 'Elevation (Z)', 'Red', 'Green', 'Blue'];

  return {
    format,
    delimiter,
    headers,
    sampleRows,
    totalParsed: lines.length,
  };
}

export class PointGroupManager {
  private groups: CogoPointGroup[] = [];

  constructor() {
    this.groups.push({
      id: 'grp-all-points',
      name: '_All Points',
      isDefault: true,
      isDeletable: false,
      pointStyle: 'Standard',
      labelStyle: 'Point-Elevation-Description',
      descriptionMatchingWildcards: ['*'],
      manualPointNumbers: [],
      pointRanges: [],
      priority: 999,
      overrideDescriptionKeys: false,
    });

    this.groups.push({
      id: 'grp-all-off',
      name: 'ALL OFF',
      isDefault: false,
      isDeletable: true,
      pointStyle: '<none>',
      labelStyle: '<none>',
      descriptionMatchingWildcards: [],
      manualPointNumbers: [],
      pointRanges: [],
      priority: 0,
      overrideDescriptionKeys: true,
    });
  }

  public getGroups(): CogoPointGroup[] {
    return [...this.groups].sort((a, b) => a.priority - b.priority);
  }

  public addGroup(group: Omit<CogoPointGroup, 'isDeletable'>): CogoPointGroup {
    const newGroup: CogoPointGroup = { ...group, isDeletable: true };
    this.groups.push(newGroup);
    return newGroup;
  }

  public isPointInGroup(point: CogoPoint, group: CogoPointGroup): boolean {
    if (group.manualPointNumbers.includes(point.pointNumber)) {
      return true;
    }

    for (const rangeStr of group.pointRanges) {
      if (this.matchesRange(point.pointNumber, rangeStr)) {
        return true;
      }
    }

    for (const wildcard of group.descriptionMatchingWildcards) {
      if (this.matchWildcard(point.rawDescription, wildcard)) {
        return true;
      }
    }

    // REQ-106, REQ-107, REQ-108: Query builder rules evaluation
    if (group.queryRules) {
      for (const rule of group.queryRules) {
        let ruleMatches = true;

        if (rule.fullDescriptionPattern && point.fullDescription) {
          if (!this.matchWildcard(point.fullDescription, rule.fullDescriptionPattern)) {
            ruleMatches = false;
          }
        }

        if (rule.elevationMin !== undefined && point.elevation < rule.elevationMin) {
          ruleMatches = false;
        }

        if (rule.elevationMax !== undefined && point.elevation > rule.elevationMax) {
          ruleMatches = false;
        }

        if (rule.specificElevations && rule.specificElevations.length > 0) {
          if (!rule.specificElevations.some(e => Math.abs(e - point.elevation) < 1e-3)) {
            ruleMatches = false;
          }
        }

        if (ruleMatches) return true;
      }
    }

    return false;
  }

  public getEffectiveStyles(point: CogoPoint, descriptionKeyDefaultStyles?: { pointStyle: string; labelStyle: string }): { pointStyle: string; labelStyle: string } {
    const sorted = this.getGroups();
    for (const grp of sorted) {
      if (this.isPointInGroup(point, grp)) {
        if (grp.overrideDescriptionKeys || !descriptionKeyDefaultStyles) {
          return { pointStyle: grp.pointStyle, labelStyle: grp.labelStyle };
        } else {
          return descriptionKeyDefaultStyles;
        }
      }
    }

    return descriptionKeyDefaultStyles || { pointStyle: 'Standard', labelStyle: 'Standard' };
  }

  private matchesRange(pNum: number, rangeStr: string): boolean {
    const parts = rangeStr.split(',').map(s => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n, 10));
        if (!isNaN(start) && !isNaN(end) && pNum >= start && pNum <= end) {
          return true;
        }
      } else {
        const val = parseInt(part, 10);
        if (val === pNum) return true;
      }
    }
    return false;
  }

  private matchWildcard(str: string, pattern: string): boolean {
    if (pattern === '*') return true;
    const regexPattern = '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
    return new RegExp(regexPattern, 'i').test(str);
  }
}
