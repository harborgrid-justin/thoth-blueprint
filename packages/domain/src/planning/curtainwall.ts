import type { CurtainWall, CurtainWallGrid, Point } from "../spatial/types.js";

export interface CurtainWallPanel {
  key: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  width: number;
  height: number;
  material: "glazing" | "brick" | "insulation" | "door" | "window";
  isOverwritten: boolean;
  panePolygons: Point[][];
  clipAnchors: Point[];
}

export interface CurtainWallMullion {
  direction: "vertical" | "horizontal";
  index: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  width: number;
  mullionPolygon: Point[];
}

export interface CurtainWallGeometryResults {
  panels: CurtainWallPanel[];
  mullions: CurtainWallMullion[];
  perimeterFrame: Point[][];
  elevationOutline: Point[];
  structuralTies: Point[];
  warnings: string[];
  overallUFactor: number;
  overallRValue: number;
  inventory: {
    material: string;
    width: number;
    height: number;
    count: number;
  }[];
}

export function calculateCurtainWallGeometry(wall: CurtainWall): CurtainWallGeometryResults {
  const warnings: string[] = [];
  const panels: CurtainWallPanel[] = [];
  const mullions: CurtainWallMullion[] = [];
  const structuralTies: Point[] = [];
  const inventoryMap = new Map<string, number>();

  let startPt = { x: 0, y: 0 };
  let endPt = { x: 5, y: 0 };
  if (wall.boundary && wall.boundary.length >= 2) {
    startPt = wall.boundary[0];
    endPt = wall.boundary[1];
  }

  const dx = endPt.x - startPt.x;
  const dy = endPt.y - startPt.y;
  const planLen = Math.hypot(dx, dy) || 1.0;
  const cos = dx / planLen;
  const sin = dy / planLen;

  const totalWidth = wall.width || planLen;
  const totalHeight = wall.height || 3.0;
  const frameWidth = wall.frameProfileWidth || 0.1;
  const gap = wall.expansionGap || 0.01;
  const paneOffset = wall.paneOffset || 0.02;
  const clipSpacing = wall.clipSpacing || 0.6;
  const tieSpacing = wall.structuralTieSpacing || 1.2;

  function getSplits(len: number, mode: "uniform" | "fixed" | "manual", offsets: number[]): number[] {
    const list: number[] = [0];
    if (mode === "manual" && offsets && offsets.length > 0) {
      const sorted = [...offsets].filter((v) => v > 0 && v < len).sort((a, b) => a - b);
      list.push(...sorted);
    } else if (mode === "fixed") {
      const spacing = offsets && offsets[0] ? offsets[0] : 1.2;
      let curr = spacing;
      while (curr < len - 0.01) {
        list.push(curr);
        curr += spacing;
      }
    } else {
      const count = offsets && offsets[0] ? Math.max(1, Math.round(offsets[0])) : 3;
      const spacing = len / count;
      for (let i = 1; i < count; i++) {
        list.push(i * spacing);
      }
    }
    list.push(len);
    return list;
  }

  function processGrid(
    grid: CurtainWallGrid,
    parentKey: string,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
  ) {
    const W = x1 - x0;
    const H = y1 - y0;

    const xSplits = getSplits(W, grid.verticalDivisions, grid.verticalOffsets);
    const ySplits = getSplits(H, grid.horizontalDivisions, grid.horizontalOffsets);

    for (let i = 1; i < xSplits.length - 1; i++) {
      const localX = x0 + xSplits[i];
      const mWidth = grid.mullionWidths?.[i] || 0.05;

      const wallX = startPt.x + localX * cos;
      const wallY = startPt.y + localX * sin;
      const orthoL = { x: wallX - (mWidth / 2) * -sin, y: wallY - (mWidth / 2) * cos };
      const orthoR = { x: wallX + (mWidth / 2) * -sin, y: wallY + (mWidth / 2) * cos };

      mullions.push({
        direction: "vertical",
        index: i,
        xStart: localX,
        yStart: y0,
        xEnd: localX,
        yEnd: y1,
        width: mWidth,
        mullionPolygon: [orthoL, orthoR],
      });
    }

    for (let j = 1; j < ySplits.length - 1; j++) {
      const localY = y0 + ySplits[j];
      const mWidth = 0.05;

      mullions.push({
        direction: "horizontal",
        index: j,
        xStart: x0,
        yStart: localY,
        xEnd: x1,
        yEnd: localY,
        width: mWidth,
        mullionPolygon: [],
      });
    }

    for (let i = 0; i < xSplits.length - 1; i++) {
      for (let j = 0; j < ySplits.length - 1; j++) {
        const cellKey = parentKey ? `${parentKey}/${i},${j}` : `${i},${j}`;
        const cx0 = x0 + xSplits[i];
        const cx1 = x0 + xSplits[i + 1];
        const cy0 = y0 + ySplits[j];
        const cy1 = y0 + ySplits[j + 1];

        const cellW = cx1 - cx0;
        const cellH = cy1 - cy0;

        const nest = wall.nestedGrids?.[cellKey];
        if (nest) {
          processGrid(nest, cellKey, cx0, cx1, cy0, cy1);
        } else {
          const mat = grid.infillMaterials?.[`${i},${j}`] || "glazing";

          if (mat === "glazing" && (cellW > 2.0 || cellH > 3.0)) {
            warnings.push(`Glazing panel ${cellKey} exceeds safe wind load area limits (max 2.0m x 3.0m).`);
          }

          const pStart = cx0 + gap;
          const pEnd = cx1 - gap;
          const pWidth = pEnd - pStart;
          const pHeight = cellH - 2 * gap;

          const wallStartX = startPt.x + pStart * cos;
          const wallStartY = startPt.y + pStart * sin;
          const wallEndX = startPt.x + pEnd * cos;
          const wallEndY = startPt.y + pEnd * sin;

          const offsetStartX = wallStartX - paneOffset * -sin;
          const offsetStartY = wallStartY - paneOffset * cos;
          const offsetEndX = wallEndX - paneOffset * -sin;
          const offsetEndY = wallEndY - paneOffset * cos;

          const thick = 0.02;
          const panePolygons = [
            [
              { x: offsetStartX - (thick / 2) * cos, y: offsetStartY - (thick / 2) * sin },
              { x: offsetStartX + (thick / 2) * cos, y: offsetStartY + (thick / 2) * sin },
              { x: offsetEndX + (thick / 2) * cos, y: offsetEndY + (thick / 2) * sin },
              { x: offsetEndX - (thick / 2) * cos, y: offsetEndY - (thick / 2) * sin },
            ],
          ];

          const clipAnchors: Point[] = [];
          if (mat === "glazing") {
            let curr = pStart + clipSpacing;
            while (curr < pEnd - 0.05) {
              clipAnchors.push({
                x: startPt.x + curr * cos - paneOffset * -sin,
                y: startPt.y + curr * sin - paneOffset * cos,
              });
              curr += clipSpacing;
            }
          }

          panels.push({
            key: cellKey,
            xStart: cx0,
            xEnd: cx1,
            yStart: cy0,
            yEnd: cy1,
            width: pWidth,
            height: pHeight,
            material: mat,
            isOverwritten: mat === "door" || mat === "window",
            panePolygons,
            clipAnchors,
          });

          const invKey = `${mat}|${pWidth.toFixed(2)}x${pHeight.toFixed(2)}`;
          inventoryMap.set(invKey, (inventoryMap.get(invKey) || 0) + 1);
        }
      }
    }
  }

  processGrid(wall.grid, "", 0, totalWidth, 0, totalHeight);

  const perimeterFrame: Point[][] = [];
  {
    const wallStartX = startPt.x;
    const wallStartY = startPt.y;
    const wallEndX = startPt.x + totalWidth * cos;
    const wallEndY = startPt.y + totalWidth * sin;

    perimeterFrame.push([
      { x: wallStartX - (frameWidth / 2) * -sin, y: wallStartY - (frameWidth / 2) * cos },
      { x: wallEndX - (frameWidth / 2) * -sin, y: wallEndY - (frameWidth / 2) * cos },
      { x: wallEndX + (frameWidth / 2) * -sin, y: wallEndY + (frameWidth / 2) * cos },
      { x: wallStartX + (frameWidth / 2) * -sin, y: wallStartY + (frameWidth / 2) * cos },
    ]);
  }

  let tieCurr = 0;
  while (tieCurr <= totalWidth + 0.01) {
    structuralTies.push({
      x: startPt.x + tieCurr * cos,
      y: startPt.y + tieCurr * sin,
    });
    tieCurr += tieSpacing;
  }

  const elevationOutline: Point[] = [
    { x: 0, y: 0 },
    { x: totalWidth, y: 0 },
    { x: totalWidth, y: totalHeight },
    { x: 0, y: totalHeight },
  ];

  let totalArea = 0;
  let weightedU = 0;
  panels.forEach((p) => {
    const area = p.width * p.height;
    totalArea += area;

    let r = 2.5;
    if (p.material === "brick") {
      r = 12.0;
    } else if (p.material === "insulation") {
      r = 20.0;
    } else if (p.material === "door") {
      r = 3.0;
    } else if (p.material === "window") {
      r = 3.0;
    }

    weightedU += (1.0 / r) * area;
  });

  const overallUFactor = totalArea > 0 ? weightedU / totalArea : 0.4;
  const overallRValue = overallUFactor > 0 ? 1.0 / overallUFactor : 2.5;

  const inventory = Array.from(inventoryMap.entries())
    .map(([k, count]) => {
      const [material, size] = k.split("|");
      const [widthStr, heightStr] = size.split("x");
      return {
        material,
        width: parseFloat(widthStr),
        height: parseFloat(heightStr),
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    panels,
    mullions,
    perimeterFrame,
    elevationOutline,
    structuralTies,
    warnings,
    overallUFactor,
    overallRValue,
    inventory,
  };
}
