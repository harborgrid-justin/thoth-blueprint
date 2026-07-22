/**
 * Domain module implementing REQ-071 through REQ-080 (Sheet Creation, Sheet Sets & Data References).
 */

import type { PlanProductionViewFrameGroup } from './viewFramesAndMatchLines';

export type LayoutCreationMode =
  | 'one_layout_per_new_dwg'
  | 'all_layouts_in_one_new_dwg'
  | 'all_layouts_in_current_dwg';

export type ViewAlignmentSetting = 'start' | 'center' | 'end';

export interface LayoutSheet {
  id: string;
  name: string; // e.g. "C-101 Plan & Profile"
  dwgFileName: string;
  viewFrameId: string;
  northArrowRotationDeg: number;
  viewAlignment: ViewAlignmentSetting;
}

export interface SheetSet {
  id: string;
  filePath: string; // .dst file
  name: string;
  sheets: LayoutSheet[];
  isOpenInPalette: boolean;
}

export type DataReferenceObjectType =
  | 'Surface'
  | 'Alignment'
  | 'Profile'
  | 'PipeNetwork'
  | 'PressureNetwork';

export interface DataShortcutReference {
  id: string;
  sourceObjectId: string;
  objectType: DataReferenceObjectType;
  destinationSheetId: string;
  isLocked: boolean; // REQ-080: Locked source geometry
  copyAnnotationLabels: boolean; // REQ-079
  styleOverride?: string;
  labelOverride?: string;
}

export class SheetCreationEngine {
  /**
   * REQ-071, REQ-072, REQ-073, REQ-074, REQ-075, REQ-076, REQ-077:
   * Create Sheets wizard to generate layout sheets from view frame group.
   */
  public createSheetsFromViewFrameGroup(
    viewFrameGroup: PlanProductionViewFrameGroup,
    mode: LayoutCreationMode,
    dstFileName: string = 'SitePlanSheetSet.dst',
    viewAlignment: ViewAlignmentSetting = 'start'
  ): { sheetSet: SheetSet; warnings: string[] } {
    const warnings: string[] = [];
    const totalFrames = viewFrameGroup.viewFrames.length;

    // REQ-073: Notify user if creating > 10 layout sheets per DWG
    if (mode === 'all_layouts_in_current_dwg' && totalFrames > 10) {
      warnings.push(`Warning: Recommended threshold of 10 layout sheets per DWG file exceeded (${totalFrames} requested). Consider splitting into multiple files for optimal performance.`);
    }

    const sheets: LayoutSheet[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const vf = viewFrameGroup.viewFrames[i];
      let dwgName = 'CurrentDrawing.dwg';
      if (mode === 'one_layout_per_new_dwg') {
        dwgName = `Sheet_${i + 1}.dwg`;
      } else if (mode === 'all_layouts_in_one_new_dwg') {
        dwgName = 'AllPlanSheets.dwg';
      }

      // REQ-074: Automatically orient paper space North Arrow blocks linked to layout viewports based on True North rotation
      const northArrowRotation = (360 - vf.rotationDeg) % 360;

      sheets.push({
        id: `sheet-${i + 1}`,
        name: `C-10${i + 1} - ${vf.name}`,
        dwgFileName: dwgName,
        viewFrameId: vf.id,
        northArrowRotationDeg: northArrowRotation,
        viewAlignment,
      });
    }

    // REQ-075, REQ-076: Integrate into Sheet Set (.dst) & auto-open palette
    const sheetSet: SheetSet = {
      id: `ss-${Date.now()}`,
      filePath: dstFileName,
      name: viewFrameGroup.name + ' Sheet Set',
      sheets,
      isOpenInPalette: true,
    };

    return { sheetSet, warnings };
  }

  /**
   * REQ-078, REQ-079, REQ-080: Data References (Data Shortcuts) engine.
   */
  public createDataShortcutReference(
    sourceObjectId: string,
    objectType: DataReferenceObjectType,
    destinationSheetId: string,
    copyAnnotationLabels: boolean = true
  ): DataShortcutReference {
    return {
      id: `ds-${objectType}-${Date.now()}`,
      sourceObjectId,
      objectType,
      destinationSheetId,
      isLocked: true, // Source geometry locked against modification
      copyAnnotationLabels,
    };
  }
}
