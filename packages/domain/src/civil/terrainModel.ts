import _ from "lodash";
import { bounds, unionBounds } from "../spatial/geometry";
import { isSpatialElement } from "../spatial/primitives";
import type { Bounds, GradeRegion, Site, SpotElevationPoint } from "../spatial/types";
import { gradePad, interpolateGrid } from "./terrain";
import type { ElevationGrid, SpotElevation } from "./terrain";

/** Existing and proposed surfaces derived from a site's terrain elements. */
export interface TerrainModel {
  hasTerrain: boolean;
  spotCount: number;
  gradeCount: number;
  extent: Bounds | null;
  existing: ElevationGrid | null;
  /** Existing reshaped by every grading region (flat pads to target elevation). */
  proposed: ElevationGrid | null;
}

const TARGET_CELLS_ACROSS = 56;
const MIN_CELL = 0.5;

/** The planning extent of a site (union of spatial element bounds + spot points). */
export function siteExtent(site: Site): Bounds | null {
  const boxes: Bounds[] = [];
  _.forEach(site.elements, (el) => {
    if (isSpatialElement(el)) {
      boxes.push(bounds(el.boundary));
    } else if (el.kind === "spot" || el.kind === "tree" || el.kind === "note") {
      boxes.push(bounds([el.position]));
    }
  });
  return boxes.length ? unionBounds(boxes) : null;
}

/**
 * Build the existing ground surface (IDW-interpolated from spot elevations) and
 * the proposed surface (existing reshaped by grading regions). Returns
 * `hasTerrain: false` when there are too few spots to define a surface.
 */
export function buildTerrainModel(site: Site): TerrainModel {
  const spots: SpotElevation[] = _.map(
    _.filter(site.elements, (e): e is SpotElevationPoint => e.kind === "spot"),
    (s) => ({ point: s.position, z: s.z }),
  );
  const grades = _.filter(
    site.elements,
    (e): e is GradeRegion => e.kind === "grade",
  );
  const extent = siteExtent(site);

  if (spots.length < 2 || !extent) {
    return {
      hasTerrain: false,
      spotCount: spots.length,
      gradeCount: grades.length,
      extent,
      existing: null,
      proposed: null,
    };
  }

  const width = Math.max(1, extent.maxX - extent.minX);
  const height = Math.max(1, extent.maxY - extent.minY);
  const cellSize = Math.max(
    MIN_CELL,
    Math.max(width, height) / TARGET_CELLS_ACROSS,
  );

  const existing = interpolateGrid(spots, extent, {
    cellSize,
    padding: cellSize,
  });
  let proposed = existing;
  for (const g of grades) {
    proposed = gradePad(proposed, g.boundary, g.targetElevation);
  }

  return {
    hasTerrain: true,
    spotCount: spots.length,
    gradeCount: grades.length,
    extent,
    existing,
    proposed,
  };
}
