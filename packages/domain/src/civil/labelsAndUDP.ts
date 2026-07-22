/**
 * Domain module implementing REQ-036 through REQ-046 (Dynamic Annotations & Parcel Labels).
 */

import type { Point2D, LineSegment } from '../survey/transparentCommands';
import type { ParcelObject } from './siteAndParcels';
import { calculatePolygonCentroid } from './siteAndParcels';

export interface AnnotationLabelStyle {
  id: string;
  name: string;
  parentId?: string;
  fontSize: number;
  textColor: string;
  planReadability: boolean; // REQ-042: prevents upside-down text presentation
  textOrientationAngleDeg?: number;
}

export interface AreaLabel {
  id: string;
  parcelId: string;
  position: Point2D;
  text: string;
  style: AnnotationLabelStyle;
}

export interface SegmentLabel {
  id: string;
  segment: LineSegment;
  isCurve: boolean;
  radius?: number;
  deltaAngleDeg?: number;
  arcLength?: number;
  bearingText: string;
  distanceText: string;
  displayFormat: 'bearing_over_distance' | 'delta_over_length' | 'radius_value';
  style: AnnotationLabelStyle;
  isReversed: boolean; // REQ-043
  isFlipped: boolean;  // REQ-044
  positionOffset: { dx: number; dy: number };
}

export interface UserDefinedProperties {
  parcelAddress?: string; // REQ-038
  parcelTaxId?: string;
  customAttributes?: Record<string, string | number>;
}

export class LabelEngine {
  private labelStyles: Map<string, AnnotationLabelStyle> = new Map();

  constructor() {
    // Default parent style
    this.labelStyles.set('style-parent-default', {
      id: 'style-parent-default',
      name: 'Standard Label',
      fontSize: 10,
      textColor: '#FFFFFF',
      planReadability: true,
    });
  }

  /**
   * REQ-041: Child label styles inheriting properties from parent label styles.
   */
  public createChildStyle(parentId: string, name: string, overrides: Partial<AnnotationLabelStyle>): AnnotationLabelStyle {
    const parent = this.labelStyles.get(parentId);
    if (!parent) throw new Error(`Parent style ${parentId} not found`);

    const childStyle: AnnotationLabelStyle = {
      ...parent,
      ...overrides,
      id: `style-child-${Date.now()}`,
      name,
      parentId: parent.id,
    };
    this.labelStyles.set(childStyle.id, childStyle);
    return childStyle;
  }

  /**
   * REQ-036, REQ-037: Automatically insert area label at centroid of parcel; dynamic update.
   */
  public generateAreaLabel(parcel: ParcelObject, style?: AnnotationLabelStyle): AreaLabel {
    const centroid = calculatePolygonCentroid(parcel.boundaryVertices);
    const activeStyle = style || this.labelStyles.get('style-parent-default')!;

    const text = `${parcel.name}\nArea: ${parcel.areaSqFt.toFixed(2)} Sq. Ft.\n(${(parcel.areaSqFt / 43560).toFixed(3)} Acres)`;

    return {
      id: `lbl-area-${parcel.id}`,
      parcelId: parcel.id,
      position: centroid,
      text,
      style: activeStyle,
    };
  }

  /**
   * REQ-039, REQ-040: Automatic & manual segment labels for parcel lines and curves.
   */
  public generateSegmentLabel(
    segment: LineSegment,
    isCurve: boolean = false,
    radius?: number,
    arcLength?: number,
    deltaAngleDeg?: number
  ): SegmentLabel {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const dist = Math.hypot(dx, dy);

    // Calculate bearing
    let azRad = Math.atan2(dx, dy);
    if (azRad < 0) azRad += 2 * Math.PI;
    const azDeg = (azRad * 180) / Math.PI;

    const bearingText = formatAzimuthToDMS(azDeg);
    const distanceText = `${dist.toFixed(2)}'`;

    return {
      id: `lbl-seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      segment,
      isCurve,
      radius,
      deltaAngleDeg,
      arcLength,
      bearingText,
      distanceText,
      displayFormat: isCurve ? 'delta_over_length' : 'bearing_over_distance',
      style: this.labelStyles.get('style-parent-default')!,
      isReversed: false,
      isFlipped: false,
      positionOffset: { dx: 0, dy: 5 },
    };
  }

  /**
   * REQ-042: Enforce Plan Readability (prevent upside-down text).
   */
  public applyPlanReadability(angleDeg: number): number {
    let normalized = angleDeg % 360;
    if (normalized < 0) normalized += 360;

    // Reading direction should remain between 90 and 270 degrees
    if (normalized > 90 && normalized < 270) {
      return (normalized + 180) % 360;
    }
    return normalized;
  }

  /**
   * REQ-043: Reverse Label command.
   */
  public reverseLabel(label: SegmentLabel): SegmentLabel {
    const reversedAz = (parseDMSToAzimuth(label.bearingText) + 180) % 360;
    return {
      ...label,
      bearingText: formatAzimuthToDMS(reversedAz),
      isReversed: !label.isReversed,
    };
  }

  /**
   * REQ-044: Flip Label command.
   */
  public flipLabel(label: SegmentLabel): SegmentLabel {
    return {
      ...label,
      isFlipped: !label.isFlipped,
      positionOffset: {
        dx: -label.positionOffset.dx,
        dy: -label.positionOffset.dy,
      },
    };
  }

  /**
   * REQ-045: Dynamically update label text content whenever source geometry changes.
   */
  public updateLabelOnGeometryChange(label: SegmentLabel, newSegment: LineSegment): SegmentLabel {
    const updated = this.generateSegmentLabel(newSegment, label.isCurve, label.radius, label.arcLength, label.deltaAngleDeg);
    return {
      ...updated,
      id: label.id,
      style: label.style,
      isReversed: label.isReversed,
      isFlipped: label.isFlipped,
    };
  }

  /**
   * REQ-046: Maintain view frame label data and sheet references even if parent alignment is deleted.
   */
  public preserveLabelOrphanData(label: AreaLabel | SegmentLabel): AreaLabel | SegmentLabel {
    return {
      ...label,
    };
  }
}

export function formatAzimuthToDMS(azimuthDeg: number): string {
  let quad = 'N';
  let quad2 = 'E';
  let bearingVal = azimuthDeg;

  if (azimuthDeg >= 0 && azimuthDeg <= 90) {
    quad = 'N'; quad2 = 'E'; bearingVal = azimuthDeg;
  } else if (azimuthDeg > 90 && azimuthDeg <= 180) {
    quad = 'S'; quad2 = 'E'; bearingVal = 180 - azimuthDeg;
  } else if (azimuthDeg > 180 && azimuthDeg <= 270) {
    quad = 'S'; quad2 = 'W'; bearingVal = azimuthDeg - 180;
  } else {
    quad = 'N'; quad2 = 'W'; bearingVal = 360 - azimuthDeg;
  }

  const deg = Math.floor(bearingVal);
  const minFloat = (bearingVal - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);

  return `${quad} ${deg}° ${min.toString().padStart(2, '0')}' ${sec.toString().padStart(2, '0')}" ${quad2}`;
}

export function parseDMSToAzimuth(dmsStr: string): number {
  const match = dmsStr.match(/([NS])\s*(\d+)°\s*(\d+)'\s*(\d+)"\s*([EW])/i);
  if (!match) return 0;

  const [, q1, d, m, s, q2] = match;
  const val = parseInt(d, 10) + parseInt(m, 10) / 60 + parseInt(s, 10) / 3600;

  if (q1.toUpperCase() === 'N' && q2.toUpperCase() === 'E') return val;
  if (q1.toUpperCase() === 'S' && q2.toUpperCase() === 'E') return 180 - val;
  if (q1.toUpperCase() === 'S' && q2.toUpperCase() === 'W') return 180 + val;
  if (q1.toUpperCase() === 'N' && q2.toUpperCase() === 'W') return 360 - val;

  return val;
}
