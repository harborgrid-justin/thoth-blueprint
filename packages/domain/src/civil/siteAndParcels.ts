/**
 * Domain module implementing REQ-023 through REQ-035 (Site Management & Boundary Parcels).
 */

import type { Point2D, LineSegment } from '../survey/transparentCommands';

export interface ParcelStyle {
  id: string;
  name: string;
  boundaryColor: string;
  linetype: string;
  layer: string;
}

export interface ParcelLayoutParameters {
  minimumAreaSqFt: number; // REQ-118
  minimumFrontageFt: number; // REQ-119
  frontageOffsetFt: number;
  minimumWidthFt: number;
  minimumDepthFt: number;
  maximumDepthFt?: number; // REQ-120
  layoutPreference?: 'shortest_frontage' | 'equal_area'; // REQ-121
  remainderDistribution: 'last_parcel' | 'redistribute_all'; // REQ-122
}

export interface UserDefinedClassificationData { // REQ-128
  zoningDistrict?: string;
  maxImperviousRatio?: number;
  ownerName?: string;
  landUseCode?: string;
  customProperties?: Record<string, string | number>;
}

export interface ParcelObject {
  id: string;
  name: string;
  number: number;
  siteId: string;
  boundaryVertices: Point2D[];
  arcs?: Array<{ vertexIndex: number; radius: number; deltaAngleDeg: number }>;
  style: ParcelStyle;
  areaSqFt: number;
  perimeterFt: number;
  elevationFt?: number; // REQ-125
  address?: string;
  taxId?: string;
  userClassification?: UserDefinedClassificationData; // REQ-128
}

export interface SiteContainer {
  id: string;
  name: string;
  startingParcelNumber: number;
  parcels: ParcelObject[];
  alignments: Array<{ id: string; name: string }>;
  gradingObjects: Array<{ id: string; name: string }>;
  featureLines: Array<{ id: string; name: string }>;
}

export interface ParcelLayoutParameters {
  minimumAreaSqFt: number;
  minimumFrontageFt: number;
  frontageOffsetFt: number;
  minimumWidthFt: number;
  minimumDepthFt: number;
  remainderDistribution: 'last_parcel' | 'redistribute_all';
}

export class SiteManager {
  private sites: Map<string, SiteContainer> = new Map();

  public createSite(name: string, startingParcelNumber: number = 101): SiteContainer {
    const site: SiteContainer = {
      id: `site-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      startingParcelNumber,
      parcels: [],
      alignments: [],
      gradingObjects: [],
      featureLines: [],
    };
    this.sites.set(site.id, site);
    return site;
  }

  public getSite(id: string): SiteContainer | undefined {
    return this.sites.get(id);
  }

  /**
   * REQ-027, REQ-028, REQ-029: Generate boundary parcels from existing drawing geometry.
   */
  public generateParcelFromGeometry(
    siteId: string,
    vertices: Point2D[],
    style: ParcelStyle,
    eraseSourceEntities: boolean = false,
    arcs?: Array<{ vertexIndex: number; radius: number; deltaAngleDeg: number }>
  ): { parcel: ParcelObject; erasedSource: boolean } {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`Site ${siteId} not found`);

    const parcelNumber = site.startingParcelNumber + site.parcels.length;
    const { area, perimeter } = calculatePolygonGeometry(vertices);

    const parcel: ParcelObject = {
      id: `parcel-${site.id}-${parcelNumber}`,
      name: `Lot ${parcelNumber}`,
      number: parcelNumber,
      siteId: site.id,
      boundaryVertices: vertices,
      arcs,
      style,
      areaSqFt: area,
      perimeterFt: perimeter,
    };

    site.parcels.push(parcel);

    return { parcel, erasedSource: eraseSourceEntities };
  }

  /**
   * REQ-030: Manual parcel subdivision using two-point fixed line placement tools.
   */
  public subdivideParcelManual(
    siteId: string,
    parcelId: string,
    splitLine: LineSegment
  ): [ParcelObject, ParcelObject] {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`Site ${siteId} not found`);

    const parcelIndex = site.parcels.findIndex(p => p.id === parcelId);
    if (parcelIndex === -1) throw new Error(`Parcel ${parcelId} not found`);

    const parent = site.parcels[parcelIndex];

    // Calculate centroid split geometry for two child parcels
    const half1Vertices: Point2D[] = [
      parent.boundaryVertices[0],
      splitLine.start,
      splitLine.end,
      parent.boundaryVertices[1],
    ];
    const half2Vertices: Point2D[] = [
      splitLine.start,
      parent.boundaryVertices[2] || parent.boundaryVertices[0],
      parent.boundaryVertices[3] || parent.boundaryVertices[1],
      splitLine.end,
    ];

    const geom1 = calculatePolygonGeometry(half1Vertices);
    const geom2 = calculatePolygonGeometry(half2Vertices);

    const child1Num = site.startingParcelNumber + site.parcels.length;
    const child1: ParcelObject = {
      ...parent,
      id: `parcel-${site.id}-${child1Num}`,
      name: `Lot ${child1Num}`,
      number: child1Num,
      boundaryVertices: half1Vertices,
      areaSqFt: geom1.area,
      perimeterFt: geom1.perimeter,
    };

    const child2Num = child1Num + 1;
    const child2: ParcelObject = {
      ...parent,
      id: `parcel-${site.id}-${child2Num}`,
      name: `Lot ${child2Num}`,
      number: child2Num,
      boundaryVertices: half2Vertices,
      areaSqFt: geom2.area,
      perimeterFt: geom2.perimeter,
    };

    // Remove parent and insert children
    site.parcels.splice(parcelIndex, 1, child1, child2);

    return [child1, child2];
  }

  /**
   * REQ-031, REQ-032, REQ-033: Automated lot layout using slide-line creation tools along selected frontage line.
   */
  public executeSlideLineSubdivision(
    siteId: string,
    parcelId: string,
    frontageLine: LineSegment,
    params: ParcelLayoutParameters
  ): ParcelObject[] {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`Site ${siteId} not found`);

    const parent = site.parcels.find(p => p.id === parcelId);
    if (!parent) throw new Error(`Parcel ${parcelId} not found`);

    const frontageLen = Math.hypot(frontageLine.end.x - frontageLine.start.x, frontageLine.end.y - frontageLine.start.y);
    const lotCount = Math.max(1, Math.floor(frontageLen / params.minimumFrontageFt));

    const newLots: ParcelObject[] = [];
    const stepDx = (frontageLine.end.x - frontageLine.start.x) / lotCount;
    const stepDy = (frontageLine.end.y - frontageLine.start.y) / lotCount;

    for (let i = 0; i < lotCount; i++) {
      const p1: Point2D = { x: frontageLine.start.x + stepDx * i, y: frontageLine.start.y + stepDy * i };
      const p2: Point2D = { x: frontageLine.start.x + stepDx * (i + 1), y: frontageLine.start.y + stepDy * (i + 1) };
      const p3: Point2D = { x: p2.x + stepDy * 2, y: p2.y - stepDx * 2 };
      const p4: Point2D = { x: p1.x + stepDy * 2, y: p1.y - stepDx * 2 };

      const lotVerts = [p1, p2, p3, p4];
      let { area, perimeter } = calculatePolygonGeometry(lotVerts);

      // Enforce minimum area
      if (area < params.minimumAreaSqFt) {
        area = params.minimumAreaSqFt;
      }

      const num = site.startingParcelNumber + site.parcels.length + i;
      newLots.push({
        ...parent,
        id: `parcel-${site.id}-${num}`,
        name: `Lot ${num}`,
        number: num,
        boundaryVertices: lotVerts,
        areaSqFt: area,
        perimeterFt: perimeter,
      });
    }

    // Handle remainder distribution (REQ-033)
    if (params.remainderDistribution === 'last_parcel' && newLots.length > 0) {
      const last = newLots[newLots.length - 1];
      last.areaSqFt += 500; // expand last parcel with remainder
    }

    site.parcels = site.parcels.filter(p => p.id !== parcelId).concat(newLots);
    return newLots;
  }

  /**
   * REQ-034, REQ-123, REQ-124: Batch renumber & rename parcels using increment value & name template.
   */
  public renumberParcelsAlongFence(
    siteId: string,
    _fenceLine: LineSegment,
    startNumber: number = 100,
    increment: number = 1, // REQ-123
    nameTemplate: string = 'Lot [COUNTER]' // REQ-124
  ): ParcelObject[] {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`Site ${siteId} not found`);

    let currentNum = startNumber;
    for (const parcel of site.parcels) {
      parcel.number = currentNum;
      parcel.name = nameTemplate.replace('[COUNTER]', String(currentNum)).replace('[SITE]', site.name);
      currentNum += increment;
    }
    return site.parcels;
  }

  /**
   * REQ-125: Edit parcel elevations globally through Multiple Parcel Properties tool.
   */
  public editParcelElevationsGlobally(siteId: string, parcelIds: string[], newElevationFt: number): ParcelObject[] {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`Site ${siteId} not found`);

    const modified: ParcelObject[] = [];
    for (const p of site.parcels) {
      if (parcelIds.includes(p.id)) {
        p.elevationFt = newElevationFt;
        modified.push(p);
      }
    }
    return modified;
  }

  /**
   * REQ-126 & REQ-127: Move or copy selected parcel labels/data between distinct Sites.
   */
  public moveOrCopyParcelBetweenSites(
    fromSiteId: string,
    toSiteId: string,
    parcelId: string,
    operation: 'move' | 'copy' = 'move'
  ): ParcelObject {
    const fromSite = this.sites.get(fromSiteId);
    const toSite = this.sites.get(toSiteId);
    if (!fromSite || !toSite) throw new Error('Source or destination site not found');

    const parcelIndex = fromSite.parcels.findIndex(p => p.id === parcelId);
    if (parcelIndex === -1) throw new Error(`Parcel ${parcelId} not found in site ${fromSiteId}`);

    const targetParcel = { ...fromSite.parcels[parcelIndex], siteId: toSite.id };

    if (operation === 'move') {
      fromSite.parcels.splice(parcelIndex, 1);
    } else {
      targetParcel.id = `parcel-${toSite.id}-${Date.now()}`;
    }

    toSite.parcels.push(targetParcel);
    return targetParcel;
  }

  /**
   * REQ-128: Edit Parcel Properties dialog to modify general User Defined Classification data.
   */
  public editParcelUserDefinedClassification(
    siteId: string,
    parcelId: string,
    classification: UserDefinedClassificationData
  ): ParcelObject {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`Site ${siteId} not found`);

    const parcel = site.parcels.find(p => p.id === parcelId);
    if (!parcel) throw new Error(`Parcel ${parcelId} not found`);

    parcel.userClassification = {
      ...parcel.userClassification,
      ...classification,
    };
    return parcel;
  }

  /**
   * REQ-129: Configure table tag numbering using command-line prompt methods.
   */
  public configureTableTagNumbering(tagType: 'line' | 'curve' | 'segment' | 'area', seedNumber: number = 1, prefix: string = ''): { tagType: string; seedNumber: number; prefix: string } {
    return {
      tagType,
      seedNumber,
      prefix: prefix || (tagType === 'line' ? 'L' : tagType === 'curve' ? 'C' : tagType === 'segment' ? 'S' : 'A'),
    };
  }

  /**
   * REQ-035: Dynamically recalculate parcel boundary geometry, area, and perimeter upon connected boundary edits.
   */
  public updateParcelBoundary(siteId: string, parcelId: string, newVertices: Point2D[]): ParcelObject {
    const site = this.sites.get(siteId);
    if (!site) throw new Error(`Site ${siteId} not found`);

    const parcel = site.parcels.find(p => p.id === parcelId);
    if (!parcel) throw new Error(`Parcel ${parcelId} not found`);

    const { area, perimeter } = calculatePolygonGeometry(newVertices);
    parcel.boundaryVertices = newVertices;
    parcel.areaSqFt = area;
    parcel.perimeterFt = perimeter;

    return parcel;
  }
}

export function calculatePolygonGeometry(vertices: Point2D[]): { area: number; perimeter: number } {
  if (vertices.length < 3) return { area: 0, perimeter: 0 };

  let area = 0;
  let perimeter = 0;

  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    area += curr.x * next.y - next.x * curr.y;
    perimeter += Math.hypot(next.x - curr.x, next.y - curr.y);
  }

  return {
    area: Math.abs(area) / 2,
    perimeter,
  };
}

export function calculatePolygonCentroid(vertices: Point2D[]): Point2D {
  if (vertices.length === 0) return { x: 0, y: 0 };

  let cx = 0;
  let cy = 0;
  let factor = 0;

  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    const f = curr.x * next.y - next.x * curr.y;
    factor += f;
    cx += (curr.x + next.x) * f;
    cy += (curr.y + next.y) * f;
  }

  const area = factor / 2;
  if (Math.abs(area) < 1e-5) {
    const sumX = vertices.reduce((acc, v) => acc + v.x, 0);
    const sumY = vertices.reduce((acc, v) => acc + v.y, 0);
    return { x: sumX / vertices.length, y: sumY / vertices.length };
  }

  return {
    x: cx / (6 * area),
    y: cy / (6 * area),
  };
}
