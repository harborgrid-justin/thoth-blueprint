import {
  type PayItem,
  evaluatePayItemCost,
  calculateStairGeometry,
  calculateCurtainWallGeometry,
  calculateDoorGeometry,
  calculateWindowGeometry,
  calculateRoofGeometry,
  type Stair,
  type CurtainWall,
  type DoorElement,
  type WindowElement,
  type RoofElement,
} from "@thoth/domain";
import {
  formatNumber,
  formatRatio,
  formatPercent,
  formatArea,
} from "@/lib/format";
import { formatLength, resolveLengthUnit } from "@/lib/units";


export const DEFAULT_PAY_ITEMS: PayItem[] = [
  {
    id: "201-100",
    name: "Clearing & Grubbing",
    unit: "acres",
    unitCost: 3500.0,
    category: "Earthworks",
  },
  {
    id: "203-010",
    name: "Road Excavation (Cut)",
    unit: "sqm",
    unitCost: 15.0,
    category: "Earthworks",
  },
  {
    id: "301-050",
    name: "Aggregate Base Course",
    unit: "sy",
    unitCost: 22.0,
    category: "Pavement",
  },
  {
    id: "401-200",
    name: "Concrete Curb & Gutter Type A",
    unit: "LF",
    unitCost: 35.0,
    category: "Pavement",
  },
  {
    id: "601-500",
    name: "18-inch RCP Storm Pipe",
    unit: "feet",
    unitCost: 65.0,
    category: "Drainage",
  },
  {
    id: "601-510",
    name: "Precast Cylindrical Manhole",
    unit: "count",
    unitCost: 2500.0,
    category: "Drainage",
  },
];

export const DEFAULT_ASSIGNMENTS = [
  {
    elementId: "road-edge",
    payItemId: "401-200",
    formula: "length * unitCost",
  },
  {
    elementId: "building-lot",
    payItemId: "201-100",
    formula: "area * unitCost",
  },
];

export function computeAssignedReports(
  site: any,
  assignments = DEFAULT_ASSIGNMENTS,
  payItems = DEFAULT_PAY_ITEMS,
) {
  if (!site) {
    return [];
  }
  return assignments.map((as) => {
    const item = payItems.find((p) => p.id === as.payItemId)!;
    const el = site.elements.find((e: any) => e.id === as.elementId);
    const lengthVal = el && el.kind === "parcel" ? 250 : 150;
    const areaVal = el && el.kind === "parcel" ? 1.2 : 0.8;

    const evalRes = evaluatePayItemCost(
      item,
      { length: lengthVal, area: areaVal, count: 1 },
      as.formula,
    );

    const elementName = el
      ? "name" in el
        ? (el as any).name
        : el.id
      : `Site Object (${as.elementId})`;
    const formattedQty = formatNumber(evalRes.quantity, 1);
    const formattedCost = formatNumber(evalRes.cost, 2);
    const formattedAreaText = formatArea(areaVal, "acres");
    const formattedLengthText = formatLength(
      lengthVal,
      site.spatial,
      "auto",
      1,
    );
    const resolvedUnit = resolveLengthUnit(site.spatial, "auto");
    const ratioText = formatRatio(evalRes.cost / Math.max(1, evalRes.quantity));

    return {
      elementName,
      itemName: item.name,
      unit: item.unit,
      qty: evalRes.quantity,
      cost: evalRes.cost,
      formattedQty,
      formattedCost,
      formattedAreaText,
      formattedLengthText,
      resolvedUnit,
      ratioText,
    };
  });
}

export function formatTotalTakeoffCost(total: number): string {
  return `$${formatNumber(total, 2)}`;
}

export function formatTaxPercent(rate: number): string {
  return formatPercent(rate, 1);
}

export function getStairsSafetyWarnings(site: any): string[] {
  if (!site) return [];
  const stairs = site.elements.filter((e: any) => e.kind === "stair") as Stair[];
  const warnings: string[] = [];
  stairs.forEach((stair) => {
    const geom = calculateStairGeometry(stair);
    geom.warnings.forEach((w) => warnings.push(`${stair.name}: ${w}`));
  });
  return warnings;
}

export function getCurtainWallWarnings(site: any): string[] {
  if (!site) return [];
  const walls = site.elements.filter((e: any) => e.kind === "curtainwall") as CurtainWall[];
  const warnings: string[] = [];
  walls.forEach((wall) => {
    const geom = calculateCurtainWallGeometry(wall);
    geom.warnings.forEach((w) => warnings.push(`${wall.name}: ${w}`));
  });
  return warnings;
}

export function getDoorWindowCodeWarnings(site: any): string[] {
  if (!site) return [];
  const warnings: string[] = [];
  const doors = site.elements.filter((e: any) => e.kind === "door") as DoorElement[];
  const windows = site.elements.filter((e: any) => e.kind === "window") as WindowElement[];

  doors.forEach((door) => {
    const geom = calculateDoorGeometry(door);
    geom.warnings.forEach((w) => warnings.push(`${door.name}: ${w}`));
  });

  windows.forEach((win) => {
    const geom = calculateWindowGeometry(win);
    geom.warnings.forEach((w) => warnings.push(`${win.name}: ${w}`));
  });

  return warnings;
}

export function getRoofWarnings(site: any): string[] {
  if (!site) return [];
  const warnings: string[] = [];
  const roofs = site.elements.filter((e: any) => e.kind === "roof") as RoofElement[];

  roofs.forEach((roof) => {
    const res = calculateRoofGeometry(roof);
    res.warnings.forEach((w) => warnings.push(`${roof.name}: ${w}`));
    res.ventilationWarnings.forEach((w) => warnings.push(`${roof.name}: ${w}`));
  });

  return warnings;
}

