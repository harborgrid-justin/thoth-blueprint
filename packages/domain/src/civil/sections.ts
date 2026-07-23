/**
 * Cross Sections, Sample Lines, and Quantity Takeoff (QTO) Earthwork Solvers —
 * implementations of Chapters 15 & 16 civil requirements.
 * (REQ-20-001 through REQ-20-018, REQ-21-001 through REQ-21-011)
 */

import type { HorizontalAlignment, ResolvedAlignment } from "./alignment";

import { resolveAlignment, pointAtStation } from "./alignment";
import type { ElevationGrid } from "./terrain";
import { sampleCrossSection } from "./profile";
import type {
  SampleLine,
  SampleLineGroup,
  SectionView,
  EarthworkVolumeItem,
  QTOVolumeSummary,
} from "./types/sections";

export type {
  SampleLine,
  SampleLineGroup,
  SectionView,
  EarthworkVolumeItem,
  QTOVolumeSummary,
};

import { globalPartsDb } from "../parts/registry";

const catalogStd = globalPartsDb.getCivilDesignStandards()[0];
const DEFAULT_SWATH_WIDTH = (catalogStd?.properties?.sectionSwathWidthFt as number) || 50.0;

/**
 * Creates Sample Lines across an alignment baseline by station interval range (REQ-20-001, REQ-20-003).
 */
export function generateSampleLines(
  alignment: HorizontalAlignment,
  resolved: ResolvedAlignment | null,
  interval = 50,
  swathWidth = DEFAULT_SWATH_WIDTH,
): SampleLineGroup {
  const res = resolved ?? resolveAlignment(alignment);
  if (!res) {
    return { id: `slg-${alignment.id}`, name: `${alignment.name} Sample Lines`, alignmentId: alignment.id, sampleLines: [] };
  }

  const sampleLines: SampleLine[] = [];
  const start = res.startStation;
  const end = res.endStation;

  for (let s = start; s <= end + 1e-6; s += interval) {
    const at = pointAtStation(res, s);
    if (!at) {
      continue;
    }
    sampleLines.push({
      id: `sl-${alignment.id}-${s}`,
      station: s,
      swathLeft: swathWidth,
      swathRight: swathWidth,
      centerPoint: at.point,
    });
  }

  return {
    id: `slg-${alignment.id}`,
    name: `${alignment.name} Sample Lines`,
    alignmentId: alignment.id,
    sampleLines,
  };
}

/**
 * Generates Cross Section View data plotting existing vs proposed profiles at a sample line. (REQ-20-004, REQ-20-018)
 */
export function generateSectionView(
  sampleLine: SampleLine,
  existingGrid: ElevationGrid,
  proposedGrid: ElevationGrid | null,
  resolved: ResolvedAlignment,
): SectionView | null {
  const cs = sampleCrossSection(
    existingGrid,
    proposedGrid,
    resolved,
    sampleLine.station,
    sampleLine.swathLeft,
    2.5
  );

  if (!cs) {
    return null;
  }

  const allElevs = [
    ...cs.existingPoints.map((p) => p.elevation),
    ...cs.proposedPoints.map((p) => p.elevation),
  ];

  const minElevation = allElevs.length > 0 ? Math.min(...allElevs) : 0;
  const maxElevation = allElevs.length > 0 ? Math.max(...allElevs) : 100;

  return {
    station: sampleLine.station,
    sampleLineId: sampleLine.id,
    crossSection: cs,
    minElevation,
    maxElevation,
  };
}

/**
 * Calculates Cut and Fill Earthwork Volumes using Average End Area Method (REQ-21-001, REQ-21-003, REQ-21-011).
 * Formula: Volume (cu.yd) = ((Area1 + Area2) / 2) * Distance / 27
 */
export function calculateEarthworkVolumes(
  sampleLineGroup: SampleLineGroup,
  existingGrid: ElevationGrid,
  proposedGrid: ElevationGrid,
  resolved: ResolvedAlignment,
): QTOVolumeSummary {
  const items: EarthworkVolumeItem[] = [];
  let cumCut = 0;
  let cumFill = 0;

  const lines = sampleLineGroup.sampleLines;

  // Helper to compute cross-sectional Cut/Fill area in sq ft
  const calcSectionAreas = (line: SampleLine) => {
    const cs = sampleCrossSection(existingGrid, proposedGrid, resolved, line.station, line.swathLeft, 2.0);
    if (!cs || cs.existingPoints.length === 0) {
      return { cutSqFt: 0, fillSqFt: 0 };
    }

    let cutSqFt = 0;
    let fillSqFt = 0;

    for (let i = 0; i < cs.existingPoints.length - 1; i++) {
      const x1 = cs.existingPoints[i].offset;
      const x2 = cs.existingPoints[i + 1].offset;
      const dx = Math.abs(x2 - x1);

      const zEg1 = cs.existingPoints[i].elevation;
      const zEg2 = cs.existingPoints[i + 1].elevation;
      const zPr1 = cs.proposedPoints[i]?.elevation ?? zEg1;
      const zPr2 = cs.proposedPoints[i + 1]?.elevation ?? zEg2;

      const diff1 = zPr1 - zEg1; // positive = fill, negative = cut
      const diff2 = zPr2 - zEg2;
      const avgDiff = (diff1 + diff2) / 2;

      if (avgDiff > 0) {
        fillSqFt += avgDiff * dx;
      } else {
        cutSqFt += Math.abs(avgDiff) * dx;
      }
    }

    return { cutSqFt, fillSqFt };
  };

  const sectionAreas = lines.map((line) => ({
    station: line.station,
    ...calcSectionAreas(line),
  }));

  for (let i = 0; i < sectionAreas.length; i++) {
    const current = sectionAreas[i];

    if (i === 0) {
      items.push({
        station: current.station,
        cutAreaSqFt: current.cutSqFt,
        fillAreaSqFt: current.fillSqFt,
        cutVolumeCuYd: 0,
        fillVolumeCuYd: 0,
        netVolumeCuYd: 0,
        cumulativeCutCuYd: 0,
        cumulativeFillCuYd: 0,
        cumulativeNetCuYd: 0,
      });
      continue;
    }

    const prev = sectionAreas[i - 1];
    const dist = current.station - prev.station;

    const cutVolYd3 = (((prev.cutSqFt + current.cutSqFt) / 2) * dist) / 27;
    const fillVolYd3 = (((prev.fillSqFt + current.fillSqFt) / 2) * dist) / 27;
    const netVolYd3 = fillVolYd3 - cutVolYd3;

    cumCut += cutVolYd3;
    cumFill += fillVolYd3;

    items.push({
      station: current.station,
      cutAreaSqFt: current.cutSqFt,
      fillAreaSqFt: current.fillSqFt,
      cutVolumeCuYd: cutVolYd3,
      fillVolumeCuYd: fillVolYd3,
      netVolumeCuYd: netVolYd3,
      cumulativeCutCuYd: cumCut,
      cumulativeFillCuYd: cumFill,
      cumulativeNetCuYd: cumFill - cumCut,
    });
  }

  return {
    alignmentId: sampleLineGroup.alignmentId,
    items,
    totalCutCuYd: cumCut,
    totalFillCuYd: cumFill,
    totalNetCuYd: cumFill - cumCut,
  };
}
