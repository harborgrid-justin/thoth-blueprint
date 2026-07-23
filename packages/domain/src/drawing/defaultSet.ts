/**
 * Build a standard multi-discipline {@link DrawingSet} from a site when the site
 * doesn't already carry one — so the composer always has a full set to show. The
 * sheets are chosen from what the site contains: a cover/index (G-001), the site
 * plan (C-101), civil details (C-501); and, when a building model is present,
 * the architectural floor plan (A-101), elevations (A-201), sections (A-301),
 * and schedules (A-601). Ids are deterministic so re-builds are stable.
 */

import type { Site } from "../spatial/types";
import type { RegionPlugin } from "../planning/regions";
import type { DisciplineCode } from "./drafting";
import type { DrawingSet, Sheet, SheetTypeDigit } from "./sheet";

function mkSheet(
  discipline: DisciplineCode,
  type: SheetTypeDigit,
  sequence: number,
  title: string,
  plugin: RegionPlugin,
): Sheet {
  const std = plugin.sheetStandards;
  return {
    id: `sheet-${discipline}-${type}${String(sequence).padStart(2, "0")}`,
    number: { discipline, type, sequence },
    title,
    size: std?.defaultSize ?? "arch-d",
    orientation: std?.orientation ?? "landscape",
    scaleId: "as-shown",
    discipline,
    viewportIds: [],
    revisions: [],
  };
}

/** The site's own drawing set, or a standard one derived from its contents. */
export function ensureDrawingSet(site: Site, plugin: RegionPlugin): DrawingSet {
  if (site.drawingSets && site.drawingSets.length) {
    return site.drawingSets[0];
  }

  const sheets: Sheet[] = [
    mkSheet("G", 0, 1, "Cover Sheet & Drawing Index", plugin),
  ];

  const hasSurvey =
    (site.monuments?.length ?? 0) > 0 || !!site.plss || !!site.landLot;
  if (hasSurvey) {
    sheets.push(mkSheet("V", 1, 1, "Boundary & Control Survey", plugin));
  }

  sheets.push(mkSheet("C", 1, 1, "Overall Site Plan", plugin));
  if (
    (site.controlLines?.length ?? 0) > 0 ||
    (site.civilSymbols?.length ?? 0) > 0
  ) {
    sheets.push(mkSheet("C", 1, 2, "Erosion Control Plan", plugin));
  }
  sheets.push(mkSheet("C", 5, 1, "Civil Details", plugin));

  if (site.buildingModels && site.buildingModels.length) {
    sheets.push(mkSheet("A", 1, 1, "Floor Plan", plugin));
    sheets.push(mkSheet("A", 2, 1, "Building Elevations", plugin));
    sheets.push(mkSheet("A", 3, 1, "Building Sections", plugin));
    sheets.push(mkSheet("A", 6, 1, "Schedules", plugin));
  }

  return {
    id: `set-${site.id}`,
    name: `${site.name} — Construction Documents`,
    sheets,
    titleBlockDefaults: {
      projectName: site.name,
      location: plugin.county ? `${plugin.county} County` : plugin.name,
      drawnBy: "TB",
      checkedBy: "—",
      date: new Date().getFullYear().toString(),
      projectNumber: site.id.slice(0, 8).toUpperCase(),
      firmLines: plugin.titleBlock.firmLines,
    },
  };
}
