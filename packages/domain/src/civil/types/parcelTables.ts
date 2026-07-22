export interface TableTagMapping {
  tag: string;
  originalValue: string;
  type: 'line' | 'curve';
}

export interface ParcelTableConfig {
  id: string;
  tableName: string;
  mode: 'dynamic' | 'static';
  columns: string[];
  rows: Record<string, any>[];
  tags: TableTagMapping[];
}
