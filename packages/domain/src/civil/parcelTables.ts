/**
 * Domain module implementing REQ-047 through REQ-055 (Dynamic Parcel & Data Tables).
 */

import type { SegmentLabel } from './labelsAndUDP';
import type { ParcelObject } from './siteAndParcels';

export type ParcelTableType = 'line' | 'curve' | 'segment' | 'area';
export type ReactivityMode = 'dynamic' | 'static';
export type SortOrder = 'ascending' | 'descending';

export interface ParcelTableRow {
  tag: string; // e.g. "L1", "C1"
  lengthFt?: number;
  bearingText?: string;
  radiusFt?: number;
  deltaAngleDeg?: number;
  areaSqFt?: number;
  perimeterFt?: number;
  parcelName?: string;
  customColumns?: Record<string, string | number>;
}

export interface ParcelTable {
  id: string;
  type: ParcelTableType;
  title: string;
  headers: string[];
  rows: ParcelTableRow[];
  reactivityMode: ReactivityMode; // REQ-050, REQ-051
  isLocked: boolean; // Static tables lock against edits
  sortColumnIndex?: number;
  sortOrder?: SortOrder;
  maxRowsPerStack?: number; // REQ-055
  stackOffset?: { x: number; y: number };
}

export class TableEngine {
  /**
   * REQ-047, REQ-048, REQ-049: Four table types, combined segment tables, tag conversion (L1, C1).
   */
  public generateParcelTable(
    type: ParcelTableType,
    title: string,
    segmentLabels: SegmentLabel[],
    parcels: ParcelObject[] = []
  ): ParcelTable {
    const rows: ParcelTableRow[] = [];
    let lineCounter = 1;
    let curveCounter = 1;

    if (type === 'line' || type === 'segment') {
      for (const lbl of segmentLabels.filter(l => !l.isCurve || type === 'segment')) {
        if (!lbl.isCurve) {
          const tag = `L${lineCounter++}`;
          rows.push({
            tag,
            bearingText: lbl.bearingText,
            lengthFt: parseFloat(lbl.distanceText.replace("'", '')),
          });
        }
      }
    }

    if (type === 'curve' || type === 'segment') {
      for (const lbl of segmentLabels.filter(l => l.isCurve || type === 'segment')) {
        if (lbl.isCurve) {
          const tag = `C${curveCounter++}`;
          rows.push({
            tag,
            radiusFt: lbl.radius || 0,
            deltaAngleDeg: lbl.deltaAngleDeg || 0,
            lengthFt: lbl.arcLength || parseFloat(lbl.distanceText.replace("'", '')),
          });
        }
      }
    }

    if (type === 'area') {
      let lotNum = 1;
      for (const p of parcels) {
        rows.push({
          tag: `A${lotNum++}`,
          parcelName: p.name,
          areaSqFt: p.areaSqFt,
          perimeterFt: p.perimeterFt,
        });
      }
    }

    const headers = this.getDefaultHeaders(type);

    return {
      id: `tbl-${type}-${Date.now()}`,
      type,
      title,
      headers,
      rows,
      reactivityMode: 'dynamic',
      isLocked: false,
      maxRowsPerStack: 20,
      stackOffset: { x: 0, y: -200 },
    };
  }

  /**
   * REQ-051: Lock static data table to prevent drawing edits or conversion back to dynamic mode.
   */
  public lockStaticTable(table: ParcelTable): ParcelTable {
    return {
      ...table,
      reactivityMode: 'static',
      isLocked: true,
    };
  }

  /**
   * REQ-052: Automatic sorting of table rows based on column in ascending/descending order.
   */
  public sortTable(table: ParcelTable, columnIndex: number, order: SortOrder = 'ascending'): ParcelTable {
    if (table.isLocked) throw new Error('Cannot sort locked static table');

    const sortedRows = [...table.rows].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (table.type === 'area') {
        if (columnIndex === 1) { valA = a.parcelName || ''; valB = b.parcelName || ''; }
        else if (columnIndex === 2) { valA = a.areaSqFt || 0; valB = b.areaSqFt || 0; }
        else { valA = a.tag; valB = b.tag; }
      } else {
        if (columnIndex === 1) { valA = a.lengthFt || 0; valB = b.lengthFt || 0; }
        else { valA = a.tag; valB = b.tag; }
      }

      if (valA < valB) return order === 'ascending' ? -1 : 1;
      if (valA > valB) return order === 'ascending' ? 1 : -1;
      return 0;
    });

    return {
      ...table,
      rows: sortedRows,
      sortColumnIndex: columnIndex,
      sortOrder: order,
    };
  }

  /**
   * REQ-053: Text Component Editor for table titles, column headers, and data formatting.
   */
  public editTableHeaders(table: ParcelTable, newTitle: string, newHeaders: string[]): ParcelTable {
    if (table.isLocked) throw new Error('Cannot edit locked static table');
    return {
      ...table,
      title: newTitle,
      headers: newHeaders,
    };
  }

  /**
   * REQ-055: Split large data tables into multiple tiled stacks across layout sheets.
   */
  public splitTableIntoStacks(table: ParcelTable, maxRowsPerStack: number = 10): ParcelTable[] {
    const stacks: ParcelTable[] = [];
    const totalRows = table.rows.length;
    let stackIndex = 1;

    for (let i = 0; i < totalRows; i += maxRowsPerStack) {
      const sliceRows = table.rows.slice(i, i + maxRowsPerStack);
      stacks.push({
        ...table,
        id: `${table.id}-stack-${stackIndex}`,
        title: `${table.title} (Sheet ${stackIndex})`,
        rows: sliceRows,
        maxRowsPerStack,
        stackOffset: { x: (stackIndex - 1) * 300, y: 0 },
      });
      stackIndex++;
    }

    return stacks;
  }

  private getDefaultHeaders(type: ParcelTableType): string[] {
    switch (type) {
      case 'line':
        return ['Line #', 'Bearing', 'Distance (ft)'];
      case 'curve':
        return ['Curve #', 'Radius (ft)', 'Delta Angle', 'Length (ft)'];
      case 'segment':
        return ['Tag', 'Geometric Data', 'Length (ft)'];
      case 'area':
        return ['Parcel #', 'Parcel Name', 'Area (Sq Ft)', 'Perimeter (Ft)'];
    }
  }
}
