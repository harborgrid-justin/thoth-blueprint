export interface LabelStyleGeneral {
  layer: string;
  visible: boolean;
  planReadable: boolean;
}

export interface LabelStyleLayout {
  textTemplate: string; // e.g. "STA: {Station}\nELEV: {Elevation}"
  fontSize: number;
  fontColor: string;
  anchorPoint: string;
}

export interface LabelStyleDraggedState {
  leaderVisible: boolean;
  stackedText: boolean;
  gap: number;
}

export interface LabelStyle {
  id: string;
  name: string;
  parentId?: string; // for child styles inheriting properties
  general?: Partial<LabelStyleGeneral>;
  layout?: Partial<LabelStyleLayout>;
  draggedState?: Partial<LabelStyleDraggedState>;
}
