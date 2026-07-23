import type { DoorElement, WindowElement, Point } from "../spatial/types.js";
import { distance } from "../spatial/geometry.js";
import federalData from "./geoid/data/federalReference.json";

const defaultStructural = federalData.standards.structural;

import type {
  DoorGeometryResults,
  WindowGeometryResults,
  UnitScheduleItem,
  UnitSchedule,
} from "./types/doorwindow";

export type {
  DoorGeometryResults,
  WindowGeometryResults,
  UnitScheduleItem,
  UnitSchedule,
};

export function calculateDoorGeometry(door: DoorElement): DoorGeometryResults {
  const warnings: string[] = [];

  let pLeft = { x: 0, y: 0 };
  let pRight = { x: 1, y: 0 };
  let wallThickness = door.depth || 0.15;

  if (door.boundary && door.boundary.length >= 4) {
    // Estimate centerline points
    pLeft = {
      x: (door.boundary[0].x + door.boundary[3].x) / 2,
      y: (door.boundary[0].y + door.boundary[3].y) / 2,
    };
    pRight = {
      x: (door.boundary[1].x + door.boundary[2].x) / 2,
      y: (door.boundary[1].y + door.boundary[2].y) / 2,
    };
    // compute depth thickness from actual polygon
    wallThickness =
      distance(door.boundary[3], door.boundary[0]) || wallThickness;
  } else if (door.boundary && door.boundary.length >= 2) {
    pLeft = door.boundary[0];
    pRight = door.boundary[1];
  }

  const dx = pRight.x - pLeft.x;
  const dy = pRight.y - pLeft.y;
  const width = door.width || distance(pRight, pLeft) || 0.9;
  const cos = dx / (width || 1);
  const sin = dy / (width || 1);
  const normalX = -sin;
  const normalY = cos;

  // 1. Swing Path Arcs (REQ-UNIMP-041, REQ-UNIMP-043)
  const swingPath: Point[] = [];
  const angleDeg = door.swingAngle || 90;
  const angleRad = (angleDeg * Math.PI) / 180;

  if (door.doorOperation === "swing") {
    // Generate arc from hinge (pLeft) swinging inwards (along normal direction)
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const phi = (i / steps) * angleRad;
      const x =
        pLeft.x + width * (Math.cos(phi) * cos - Math.sin(phi) * normalX);
      const y =
        pLeft.y + width * (Math.cos(phi) * sin - Math.sin(phi) * normalY);
      swingPath.push({ x, y });
    }
  } else if (door.doorOperation === "double-swing") {
    // Two half-width swinging panels from left and right
    const halfW = width / 2;
    const steps = 10;
    // Left arc
    for (let i = 0; i <= steps; i++) {
      const phi = (i / steps) * angleRad;
      const x =
        pLeft.x + halfW * (Math.cos(phi) * cos - Math.sin(phi) * normalX);
      const y =
        pLeft.y + halfW * (Math.cos(phi) * sin - Math.sin(phi) * normalY);
      swingPath.push({ x, y });
    }
    // Right arc
    for (let i = 0; i <= steps; i++) {
      const phi = (i / steps) * angleRad;
      const x =
        pRight.x - halfW * (Math.cos(phi) * cos + Math.sin(phi) * normalX);
      const y =
        pRight.y - halfW * (Math.cos(phi) * sin + Math.sin(phi) * normalY);
      swingPath.push({ x, y });
    }
  } else if (door.doorOperation === "folding") {
    // Folding bi-fold zig-zag panel in plan
    swingPath.push(
      pLeft,
      {
        x: pLeft.x + (width / 4) * cos + (width / 6) * normalX,
        y: pLeft.y + (width / 4) * sin + (width / 6) * normalY,
      },
      { x: pLeft.x + (width / 2) * cos, y: pLeft.y + (width / 2) * sin },
    );
  }

  // 2. Door Panel Box outline rotated by swing angle
  const pAngleRad = door.doorOperation === "swing" ? angleRad : 0;
  const panelXStart = pLeft.x;
  const panelYStart = pLeft.y;
  const panelXEnd =
    pLeft.x +
    width * (Math.cos(pAngleRad) * cos - Math.sin(pAngleRad) * normalX);
  const panelYEnd =
    pLeft.y +
    width * (Math.cos(pAngleRad) * sin - Math.sin(pAngleRad) * normalY);
  const thick = 0.04;

  const doorPanelPolygon = [
    {
      x: panelXStart - (thick / 2) * normalX,
      y: panelYStart - (thick / 2) * normalY,
    },
    {
      x: panelXStart + (thick / 2) * normalX,
      y: panelYStart + (thick / 2) * normalY,
    },
    {
      x: panelXEnd + (thick / 2) * normalX,
      y: panelYEnd + (thick / 2) * normalY,
    },
    {
      x: panelXEnd - (thick / 2) * normalX,
      y: panelYEnd - (thick / 2) * normalY,
    },
  ];

  // 3. Sill and threshold coordinates (REQ-UNIMP-044, REQ-UNIMP-045)
  const sillThick = door.sillThickness || 0.05;
  const sillOver = door.sillOverhang || 0.03;
  const threshH = door.thresholdHeight || 0.015;

  // Sill projects outward (along positive normal)
  const sillPolygon = [
    {
      x: pLeft.x - sillOver * cos + (wallThickness / 2) * normalX,
      y: pLeft.y - sillOver * sin + (wallThickness / 2) * normalY,
    },
    {
      x: pRight.x + sillOver * cos + (wallThickness / 2) * normalX,
      y: pRight.y + sillOver * sin + (wallThickness / 2) * normalY,
    },
    {
      x: pRight.x + sillOver * cos + (wallThickness / 2 + sillThick) * normalX,
      y: pRight.y + sillOver * sin + (wallThickness / 2 + sillThick) * normalY,
    },
    {
      x: pLeft.x - sillOver * cos + (wallThickness / 2 + sillThick) * normalX,
      y: pLeft.y - sillOver * sin + (wallThickness / 2 + sillThick) * normalY,
    },
  ];

  // Threshold covers wall slot depth
  const thresholdPolygon = [
    {
      x: pLeft.x - (wallThickness / 2) * normalX,
      y: pLeft.y - (wallThickness / 2) * normalY,
    },
    {
      x: pRight.x - (wallThickness / 2) * normalX,
      y: pRight.y - (wallThickness / 2) * normalY,
    },
    {
      x: pRight.x + (wallThickness / 2) * normalX,
      y: pRight.y + (wallThickness / 2) * normalY,
    },
    {
      x: pLeft.x + (wallThickness / 2) * normalX,
      y: pLeft.y + (wallThickness / 2) * normalY,
    },
  ];

  // 4. Hardware Knob / Handle anchor coordinate (REQ-UNIMP-046)
  // Placed at 90% along panel width from hinge
  const hardwareAnchor = {
    x:
      pLeft.x +
      width * 0.9 * (Math.cos(pAngleRad) * cos - Math.sin(pAngleRad) * normalX),
    y:
      pLeft.y +
      width * 0.9 * (Math.cos(pAngleRad) * sin - Math.sin(pAngleRad) * normalY),
  };

  // Egress codes warning checking (IBC 1010.1.1: minimum door clear width 32 inches / 0.81m)
  if (width < 0.81) {
    warnings.push(
      `Door width ${width.toFixed(2)}m is below minimum building egress code clear width limit (0.81m / 32 inches).`,
    );
  }

  // Threshold step warning (ADA compliance: max threshold height 0.5 inches / 12.7mm)
  if (threshH > 0.0127) {
    warnings.push(
      `Threshold height ${(threshH * 1000).toFixed(1)}mm exceeds ADA compliance limit (12.7mm / 0.5 inches).`,
    );
  }

  return {
    swingPath,
    doorPanelPolygon,
    sillPolygon,
    thresholdPolygon,
    hardwareAnchor,
    warnings,
  };
}

export function calculateWindowGeometry(
  win: WindowElement,
): WindowGeometryResults {
  const warnings: string[] = [];

  let pLeft = { x: 0, y: 0 };
  let pRight = { x: 1, y: 0 };
  let wallThickness = win.depth || 0.15;

  if (win.boundary && win.boundary.length >= 4) {
    pLeft = {
      x: (win.boundary[0].x + win.boundary[3].x) / 2,
      y: (win.boundary[0].y + win.boundary[3].y) / 2,
    };
    pRight = {
      x: (win.boundary[1].x + win.boundary[2].x) / 2,
      y: (win.boundary[1].y + win.boundary[2].y) / 2,
    };
    wallThickness = distance(win.boundary[3], win.boundary[0]) || wallThickness;
  } else if (win.boundary && win.boundary.length >= 2) {
    pLeft = win.boundary[0];
    pRight = win.boundary[1];
  }

  const dx = pRight.x - pLeft.x;
  const dy = pRight.y - pLeft.y;
  const width = win.width || distance(pRight, pLeft) || 1.2;
  const cos = dx / (width || 1);
  const sin = dy / (width || 1);
  const normalX = -sin;
  const normalY = cos;

  // 1. Sill (REQ-UNIMP-044)
  const sillThick = win.sillThickness || 0.06;
  const sillOver = win.sillOverhang || 0.04;

  const sillPolygon = [
    {
      x: pLeft.x - sillOver * cos + (wallThickness / 2) * normalX,
      y: pLeft.y - sillOver * sin + (wallThickness / 2) * normalY,
    },
    {
      x: pRight.x + sillOver * cos + (wallThickness / 2) * normalX,
      y: pRight.y + sillOver * sin + (wallThickness / 2) * normalY,
    },
    {
      x: pRight.x + sillOver * cos + (wallThickness / 2 + sillThick) * normalX,
      y: pRight.y + sillOver * sin + (wallThickness / 2 + sillThick) * normalY,
    },
    {
      x: pLeft.x - sillOver * cos + (wallThickness / 2 + sillThick) * normalX,
      y: pLeft.y - sillOver * sin + (wallThickness / 2 + sillThick) * normalY,
    },
  ];

  // 2. Glazing panel outlines
  // Standard frame profile leaves 0.05m border
  const border = 0.05;
  const glassW = width - 2 * border;
  const thick = 0.016; // double glazing thickness representation

  const gStartX = pLeft.x + border * cos;
  const gStartY = pLeft.y + border * sin;
  const gEndX = pRight.x - border * cos;
  const gEndY = pRight.y - border * sin;

  const glazingPolygons: Point[][] = [
    [
      {
        x: gStartX - (thick / 2) * normalX,
        y: gStartY - (thick / 2) * normalY,
      },
      {
        x: gStartX + (thick / 2) * normalX,
        y: gStartY + (thick / 2) * normalY,
      },
      { x: gEndX + (thick / 2) * normalX, y: gEndY + (thick / 2) * normalY },
      { x: gEndX - (thick / 2) * normalX, y: gEndY - (thick / 2) * normalY },
    ],
  ];

  // 3. Sash divisions based on opening types (awning casement has sash frame, hung has overlapping planes)
  const sashPolygons: Point[][] = [];
  if (win.windowType === "awning" || win.windowType === "casement") {
    // Inner border frame outline
    const sBorder = 0.02;
    const sStartX = gStartX + sBorder * cos;
    const sStartY = gStartY + sBorder * sin;
    const sEndX = gEndX - sBorder * cos;
    const sEndY = gEndY - sBorder * sin;

    sashPolygons.push([
      { x: sStartX - thick * normalX, y: sStartY - thick * normalY },
      { x: sStartX + thick * normalX, y: sStartY + thick * normalY },
      { x: sEndX + thick * normalX, y: sEndY + thick * normalY },
      { x: sEndX - thick * normalX, y: sEndY - thick * normalY },
    ]);
  }

  // Safety rating checking (natural light area ratio natural lighting compliance check)
  const glazingArea = glassW * (win.height || 1.2) * 0.9;
  const defaultRoomArea = defaultStructural.defaultRoomAreaSqm || 12.0; // standard room size reference (sqm)
  const ratio = glazingArea / defaultRoomArea;
  const minRatio = defaultStructural.ibcMinNaturalLightRatio || 0.08;

  if (ratio < minRatio) {
    warnings.push(
      `Natural lighting area ratio (${(ratio * 100).toFixed(1)}%) is below standard building code compliance limit (${(minRatio * 100).toFixed(1)}% of served room area).`,
    );
  }

  return {
    glazingPolygons,
    sillPolygon,
    sashPolygons,
    warnings,
  };
}

import { globalPartsDb } from "../parts/registry";

export function compileUnitSchedule(siteElements: any[]): UnitSchedule {
  const doors: UnitScheduleItem[] = [];
  const windows: UnitScheduleItem[] = [];
  const schedule: UnitScheduleItem[] = [];

  siteElements.forEach((el) => {
    if (el.kind === "door") {
      const door = el as DoorElement;
      const partMatch = globalPartsDb.searchParts(door.name || door.id, { subcategory: "doors" })[0];
      const item: UnitScheduleItem = {
        id: door.id,
        kind: "door",
        name: door.name,
        type: door.doorOperation,
        width: door.width,
        height: door.height,
        hardware: door.hardwareTrim || (partMatch?.properties?.coreType as string) || "lever",
        fireRating: door.fireRating || (partMatch?.properties?.fireRatingHours ? `${partMatch.properties.fireRatingHours} hr` : "none"),
        stcRating: door.stcRating || 32,
        stc: door.stcRating || 32,
        safety: door.safetyGlazing || "none",
      };
      doors.push(item);
      schedule.push(item);
    } else if (el.kind === "window") {
      const win = el as WindowElement;
      const partMatch = globalPartsDb.searchParts(win.name || win.id, { subcategory: "windows" })[0];
      const item: UnitScheduleItem = {
        id: win.id,
        kind: "window",
        name: win.name,
        type: win.windowType,
        width: win.width,
        height: win.height,
        hardware: (partMatch?.properties?.glazing as string) || "operator hinges",
        fireRating: win.fireRating || "none",
        stcRating: win.stcRating || 35,
        stc: win.stcRating || 35,
        safety: win.safetyGlazing || "none",
      };
      windows.push(item);
      schedule.push(item);
    }
  });

  return Object.assign(schedule, { doors, windows });
}
