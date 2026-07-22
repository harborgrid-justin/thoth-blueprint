export interface SheetSetManagerConfig {
  sheetSetId: string;
  name: string;
  dstFilePath: string;
  sheets: { id: string; number: string; title: string; layoutName: string }[];
}

export interface DataReferenceShortcut {
  shortcutId: string;
  targetObjectType: 'alignment' | 'surface' | 'pipe_network';
  targetObjectName: string;
  sourceDrawingPath: string;
  isGeometryLocked: boolean;
}
