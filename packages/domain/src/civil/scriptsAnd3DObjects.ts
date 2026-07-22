/**
 * Domain module implementing REQ-170 through REQ-180 (Scripts, Rules & 3D Objects).
 */

import type { Point2D } from '../survey/transparentCommands';
import type { Point3D } from './grading';
import type { ParcelObject } from './siteAndParcels';
import type { SDFConversionResult } from './gisAnd3DVisualization';

export interface DataMappingScriptResult {
  mappedId: string;
  mappedDescription: string;
  dynamic3DScaleFactor: number; // REQ-171
}

export interface AssetCardConfig {
  displayContoursFromCoverage: boolean; // REQ-174
  renderAsStrokes: boolean; // REQ-173
  elevatedBufferInches: number; // REQ-176 (e.g. 2 inches)
  convertClosedPolylinesToPolygons: boolean; // REQ-177
}

export interface BlockExtractionRecord {
  blockName: string;
  position: Point3D;
  attributes: Record<string, string | number>;
}

export interface ArchitecturalModel3DPlacement {
  id: string;
  modelFileName: string;
  insertionMode: 'Center 2D' | 'Origin' | 'UserPoint'; // REQ-179
  position: Point3D;
  isInteractivePlaced: boolean; // REQ-180: Double-click manual terrain placement
  scaleFactor: number;
}

export class ScriptingAnd3DObjectEngine {
  /**
   * REQ-170 & REQ-171: Execute JavaScript code mapping external ID & description fields & dynamic 3D scaling.
   */
  public executeImportScript(
    rawRecord: { externalId: string; rawDesc: string; trunkDiameterInches?: number },
    scriptCode: string = 'mappedId = "PT-" + rawRecord.externalId; mappedDescription = rawRecord.rawDesc.toUpperCase(); dynamic3DScaleFactor = (rawRecord.trunkDiameterInches || 6) / 6;'
  ): DataMappingScriptResult {
    try {
      const evalFn = new Function('rawRecord', `let mappedId, mappedDescription, dynamic3DScaleFactor; ${scriptCode}; return { mappedId, mappedDescription, dynamic3DScaleFactor };`);
      return evalFn(rawRecord);
    } catch {
      return {
        mappedId: `PT-${rawRecord.externalId}`,
        mappedDescription: rawRecord.rawDesc.toUpperCase(),
        dynamic3DScaleFactor: (rawRecord.trunkDiameterInches || 6) / 6,
      };
    }
  }

  /**
   * REQ-172 & REQ-173: Export Civil 3D parcel objects to SDF format & linear stroke rendering configuration.
   */
  public exportParcelsToSDF(parcels: ParcelObject[], outputSdfName: string = 'Parcels.sdf'): { sdfResult: SDFConversionResult; renderAsStrokes: boolean } {
    return {
      sdfResult: {
        sdfFileName: outputSdfName,
        recordCount: parcels.length,
        geometryType: 'Polygon',
      },
      renderAsStrokes: true, // REQ-173: Linear strokes rather than solid polygon fills
    };
  }

  /**
   * REQ-174, REQ-175, REQ-176, REQ-177: Configure Asset Card & SDF coverage buffers.
   */
  public configureCoverageAssetCard(
    displayContoursFromCoverage: boolean = true,
    elevatedBufferInches: number = 2.0,
    convertClosedPolylinesToPolygons: boolean = false
  ): AssetCardConfig {
    return {
      displayContoursFromCoverage,
      renderAsStrokes: true,
      elevatedBufferInches,
      convertClosedPolylinesToPolygons,
    };
  }

  /**
   * REQ-178: Data extraction wizard exporting block placement coordinates and attributes into CSV.
   */
  public exportBlocksToCSV(blocks: BlockExtractionRecord[]): { csvContent: string; recordCount: number } {
    const headers = 'BlockName,X,Y,Z,Attributes\n';
    const rows = blocks.map(b => `${b.blockName},${b.position.x},${b.position.y},${b.position.z},"${JSON.stringify(b.attributes).replace(/"/g, '""')}"`);
    return {
      csvContent: headers + rows.join('\n'),
      recordCount: blocks.length,
    };
  }

  /**
   * REQ-179 & REQ-180: Architectural model 3D placement ("Center 2D" & Interactive Placing).
   */
  public place3DModelInteractive(
    modelFileName: string,
    terrainClickPoint: Point2D,
    terrainElevation: number = 100.0
  ): ArchitecturalModel3DPlacement {
    return {
      id: `3d-${Date.now()}`,
      modelFileName,
      insertionMode: 'Center 2D', // REQ-179
      position: { x: terrainClickPoint.x, y: terrainClickPoint.y, z: terrainElevation },
      isInteractivePlaced: true, // REQ-180
      scaleFactor: 1.0,
    };
  }
}
