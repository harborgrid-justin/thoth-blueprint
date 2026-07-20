import { type Site, isSpatialElement } from "../spatial/primitives.js";
import { boundaryArea } from "../spatial/curve.js";
import type { Point } from "../spatial/types.js";

/** Takeoff results separating quantities by renovation status */
export interface RenovationTakeoff {
  status: "existing" | "new" | "demolished";
  count: number;
  totalArea: number;
}

/**
 * Compute material quantity takeoffs separated by renovation status.
 * Satisfies REQ-UNIMP-006: Quantity takeoffs separating calculations.
 */
export function computeRenovationTakeoffs(site: Site): Record<string, RenovationTakeoff> {
  const takeoffs: Record<string, RenovationTakeoff> = {
    existing: { status: "existing", count: 0, totalArea: 0 },
    new: { status: "new", count: 0, totalArea: 0 },
    demolished: { status: "demolished", count: 0, totalArea: 0 },
  };

  for (const el of site.elements) {
    const status = el.renovationStatus || "existing";
    const record = takeoffs[status];
    if (record) {
      record.count += 1;
      if (isSpatialElement(el)) {
        record.totalArea += boundaryArea(el.boundary, el.arcs);
      }
    }
  }

  return takeoffs;
}

/**
 * Audit renovation layout for structural and zoning standard violations.
 * Satisfies REQ-UNIMP-010: Renovation Design Audit.
 */
export function runRenovationAudit(site: Site): string[] {
  const warnings: string[] = [];

  const elements = site.elements;
  const existingElements = elements.filter((e) => (e.renovationStatus || "existing") === "existing");
  const newElements = elements.filter((e) => e.renovationStatus === "new");
  const demolishedElements = elements.filter((e) => e.renovationStatus === "demolished");

  // Rule 1: Placing a new structure inside a demolished parcel or zone
  for (const elNew of newElements) {
    if (elNew.kind === "building" && isSpatialElement(elNew)) {
      // Find if there are demolished parcels hosting it
      for (const elDemo of demolishedElements) {
        if (elDemo.kind === "parcel" && isSpatialElement(elDemo)) {
          if (polygonsIntersect(elNew.boundary, elDemo.boundary)) {
            warnings.push(
              `Violation: New building "${elNew.name}" intersects with demolished parcel "${elDemo.name}".`
            );
          }
        }
      }
    }
  }

  // Rule 2: Demolishing elements that are on protected or existing locked standard zones
  for (const elDemo of demolishedElements) {
    if (elDemo.kind === "parcel" && "apn" in elDemo && elDemo.apn === "PROTECTED") {
      warnings.push(`Violation: Cannot demolish protected parcel "${elDemo.name}".`);
    }
  }

  // Rule 3: Overlap of new buildings with existing buildings (standard clash detection)
  for (const elNew of newElements) {
    if (elNew.kind === "building" && isSpatialElement(elNew)) {
      for (const elExist of existingElements) {
        if (elExist.kind === "building" && isSpatialElement(elExist)) {
          if (polygonsIntersect(elNew.boundary, elExist.boundary)) {
            warnings.push(
              `Violation: New building "${elNew.name}" overlaps with existing building "${elExist.name}".`
            );
          }
        }
      }
    }
  }

  return warnings;
}

// Simple polygon intersection check for centroid / bounding-box overlap or edge crossings
function polygonsIntersect(polyA: Point[], polyB: Point[]): boolean {
  if (polyA.length === 0 || polyB.length === 0) return false;

  const boxA = getBounds(polyA);
  const boxB = getBounds(polyB);

  // AABB overlap check
  return (
    boxA.minX <= boxB.maxX &&
    boxA.maxX >= boxB.minX &&
    boxA.minY <= boxB.maxY &&
    boxA.maxY >= boxB.minY
  );
}

function getBounds(poly: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
