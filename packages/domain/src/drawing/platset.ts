/**
 * Plat-set helpers that aggregate across a whole {@link Site}: the consolidated
 * curve-data table a recorded plat carries (every circular curve — boundary
 * arcs and alignment curves — labeled C1…Cn), independent of which element or
 * baseline they came from.
 */

import { spatialElements, type Site } from "../spatial/primitives";
import { surveyReport } from "../survey/survey";
import { resolveAlignment } from "../civil/alignment";
import { azimuthToBearing, formatBearing } from "../survey/survey";

import type { SiteCurve } from "./types/platset";

export type { SiteCurve };

/**
 * Collect every circular curve in the site — from element boundary arcs and
 * from horizontal alignments — into one consecutively-labeled curve table.
 */
export function collectSiteCurves(site: Site): SiteCurve[] {
  const out: SiteCurve[] = [];
  let n = 0;

  for (const el of spatialElements(site)) {
    if (!el.arcs || Object.keys(el.arcs).length === 0) {continue;}
    const report = surveyReport(el.boundary, site.spatial, el.arcs);
    for (const c of report.curves) {
      n += 1;
      out.push({
        label: `C${n}`,
        source: el.name,
        radius: c.radius,
        arcLength: c.arcLength,
        deltaDeg: c.delta,
        chord: c.chordLength,
        chordBearing: c.chordBearingText,
        tangent: Number.isFinite(c.tangent) ? c.tangent : 0,
        direction: c.direction,
      });
    }
  }

  for (const a of site.alignments ?? []) {
    const resolved = resolveAlignment(a);
    if (!resolved) {continue;}
    for (const c of resolved.curves) {
      n += 1;
      out.push({
        label: `C${n}`,
        source: a.name,
        radius: c.radius,
        arcLength: c.length,
        deltaDeg: c.deltaDeg,
        chord: c.chord,
        chordBearing: formatBearing(azimuthToBearing(c.chordBearing)),
        tangent: Number.isFinite(c.tangent) ? c.tangent : 0,
        direction: c.direction,
      });
    }
  }

  return out;
}
