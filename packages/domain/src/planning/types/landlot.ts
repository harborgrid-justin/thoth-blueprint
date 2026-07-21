/** A Land District / Land Lot reference. */
export interface LandLotRef {
  district: number;
  landLot: number;
  /** Nominal land-lot acreage for this district's lottery (default 202.5). */
  acres?: number;
  /** Section suffix used in a few original surveys (e.g. "3rd Section"). */
  section?: number;
}
