/**
 * Domain module implementing REQ-130 through REQ-141 and REQ-148 through REQ-153.
 */

import type { PlanProductionViewFrameGroup, PlanProductionViewFrame } from './viewFramesAndMatchLines';

export type ImperialTemplateType = 'plan_only' | 'profile_only' | 'plan_over_plan' | 'section';

export interface LayoutViewportConfig {
  id: string;
  name: string;
  displayLocked: boolean; // REQ-134
  annotationScale: string; // REQ-135 (e.g., '1"=40\'')
  scaleFactor: number;
}

export interface RibbonLayoutElement {
  type: 'legend' | 'north_arrow' | 'scale_bar'; // REQ-136
  position: { x: number; y: number };
  scale: number;
}

export interface ProfileBandStyleConfig {
  textboxWidthFt: number; // REQ-140
  textboxOffsetFt: number;
  showBandBorders: boolean; // REQ-141
  showBandTitleBox: boolean;
}

export interface ImperialLayoutTemplate {
  id: string;
  name: string;
  type: ImperialTemplateType;
  sheetDimensions: { widthInches: number; heightInches: number };
  viewports: LayoutViewportConfig[];
  ribbonElements: RibbonLayoutElement[];
  profileBandStyle: ProfileBandStyleConfig; // REQ-139
}

export function getStandardImperialTemplate(type: ImperialTemplateType): ImperialLayoutTemplate {
  const defaults: Record<ImperialTemplateType, { name: string; viewports: LayoutViewportConfig[] }> = {
    plan_only: {
      name: 'ANSI D 24x36 Imperial Plan Only (REQ-130)',
      viewports: [{ id: 'vp-plan', name: 'Plan Viewport', displayLocked: true, annotationScale: '1"=40\'', scaleFactor: 40 }],
    },
    profile_only: {
      name: 'ANSI D 24x36 Imperial Profile Only (REQ-131)',
      viewports: [{ id: 'vp-prof', name: 'Profile Viewport', displayLocked: true, annotationScale: '1"=40\'', scaleFactor: 40 }],
    },
    plan_over_plan: {
      name: 'ANSI D 24x36 Imperial Plan over Plan (REQ-132)',
      viewports: [
        { id: 'vp-plan-top', name: 'Top Plan Viewport', displayLocked: true, annotationScale: '1"=40\'', scaleFactor: 40 },
        { id: 'vp-plan-bot', name: 'Bottom Plan Viewport', displayLocked: true, annotationScale: '1"=40\'', scaleFactor: 40 },
      ],
    },
    section: {
      name: 'ANSI D 24x36 Imperial Section Viewport (REQ-133)',
      viewports: [{ id: 'vp-sec', name: 'Section Viewport', displayLocked: true, annotationScale: '1"=10\'', scaleFactor: 10 }],
    },
  };

  const sel = defaults[type];

  return {
    id: `tmpl-${type}`,
    name: sel.name,
    type,
    sheetDimensions: { widthInches: 36, heightInches: 24 },
    viewports: sel.viewports,
    ribbonElements: [
      { type: 'north_arrow', position: { x: 34, y: 22 }, scale: 1.0 },
      { type: 'scale_bar', position: { x: 30, y: 2 }, scale: 1.0 },
      { type: 'legend', position: { x: 32, y: 10 }, scale: 1.0 },
    ],
    profileBandStyle: {
      textboxWidthFt: 2.5,
      textboxOffsetFt: 0.5,
      showBandBorders: true,
      showBandTitleBox: true,
    },
  };
}

/**
 * REQ-139: Dynamically shift profile views within viewports to accommodate profile band titles.
 */
export function calculateProfileViewShift(bandTitleWidthFt: number, titleOffsetFt: number): number {
  return bandTitleWidthFt + titleOffsetFt;
}

/**
 * REQ-149: Manually override and select individual view frames when creating sheets instead of processing entire group.
 */
export function filterSelectedViewFrames(
  group: PlanProductionViewFrameGroup,
  selectedFrameIds: string[]
): PlanProductionViewFrame[] {
  return group.viewFrames.filter(vf => selectedFrameIds.includes(vf.id));
}
