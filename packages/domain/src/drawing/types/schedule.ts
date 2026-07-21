/** A schedule column definition. */
export interface ScheduleColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

/** A row is a map from column key to a cell value. */
export type ScheduleRow = Record<string, string | number>;

/** A generic titled table. */
export interface ScheduleTable {
  id: string;
  title: string;
  columns: ScheduleColumn[];
  rows: ScheduleRow[];
}
