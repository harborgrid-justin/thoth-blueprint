/** Options controlling a simple grid subdivision of a parcel-like boundary. */
export interface SubdivisionOptions {
  /** Number of columns of lots. */
  columns: number;
  /** Number of rows of lots. */
  rows: number;
  /** Gap between lots in plan units (interpreted as internal ROW/spacing). */
  gap?: number;
  /** Layer the produced lots are placed on. */
  layerId: string;
  /** Generator for new lot ids. */
  makeId: () => string;
  /** Optional setback stamped onto each produced lot. */
  setback?: number;
}
