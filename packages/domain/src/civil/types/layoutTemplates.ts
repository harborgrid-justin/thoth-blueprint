export type TemplateType = 'plan_only' | 'profile_only' | 'plan_over_plan' | 'section';

export interface LayoutTemplateConfig {
  id: string;
  name: string;
  templateType: TemplateType;
  paperSize: string; // e.g. "ANSI D"
  annotationScale: string; // e.g. "1\"=40'"
}

export interface ProfileViewBandConfig {
  bandName: string;
  titleOffsetFt: number;
  labelShiftFt: number;
}
