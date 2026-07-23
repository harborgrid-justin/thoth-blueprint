import {
  isPointElement,
  calculateStairGeometry,
  calculateCurtainWallGeometry,
  calculateDoorGeometry,
  calculateWindowGeometry,
  calculateRoofGeometry,
  type PlanElement,
  type Point,
  type Polygon,
  type SpatialContext,
  type Stair,
  type CurtainWall,
  type DoorElement,
  type WindowElement,
  type RoofElement,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { worldToScreen, type Viewport } from "./helpers/viewport";
import {
  computeElementShapeStyle,
  getPointElementStyle,
} from "./helpers/elementShapeHelpers";

export function ElementShape({
  element,
  viewport,
  selected,
  hovered,
  showLabels,
  spatialUnits,
  moveDelta,
  overrideBoundary,
}: {
  element: PlanElement;
  viewport: Viewport;
  selected: boolean;
  hovered?: boolean;
  showLabels: boolean;
  spatialUnits: SpatialContext;
  moveDelta?: Point;
  overrideBoundary?: Polygon;
}) {
  const renovationMode = useWorkspaceStore((s) => s.renovationMode);
  const renovationStatus = element.renovationStatus || "existing";

  if (isPointElement(element)) {
    const shift = moveDelta ?? { x: 0, y: 0 };
    const s = worldToScreen(
      { x: element.position.x + shift.x, y: element.position.y + shift.y },
      viewport,
    );
    const { canopyFill, canopyStroke, spotFill, noteFill } =
      getPointElementStyle(renovationMode, renovationStatus);

    if (element.kind === "tree") {
      const r = Math.max(4, element.canopyRadius * viewport.zoom);
      return (
        <g>
          <circle
            cx={s.x}
            cy={s.y}
            r={r}
            fill={canopyFill}
            fillOpacity={0.28}
            stroke={canopyStroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={s.x}
            cy={s.y}
            r={3}
            fill={
              renovationMode && renovationStatus === "demolished"
                ? "#b91c1c"
                : "#15803d"
            }
          />
          {selected && (
            <circle
              cx={s.x}
              cy={s.y}
              r={r + 3}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
          )}
        </g>
      );
    }

    if (element.kind === "spot") {
      return (
        <g>
          <path
            d={`M${s.x} ${s.y - 5} L${s.x + 5} ${s.y} L${s.x} ${s.y + 5} L${s.x - 5} ${s.y} Z`}
            fill={spotFill}
            stroke="#fff"
            strokeWidth={1}
          />
          {showLabels && (
            <text
              x={s.x + 8}
              y={s.y + 4}
              fontSize={11}
              fill="hsl(var(--foreground))"
              style={{
                paintOrder: "stroke",
                stroke: "hsl(var(--canvas))",
                strokeWidth: 3,
              }}
            >
              {element.z.toFixed(1)}
            </text>
          )}
          {selected && (
            <circle
              cx={s.x}
              cy={s.y}
              r={9}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
          )}
        </g>
      );
    }

    // Note.
    return (
      <g>
        <circle
          cx={s.x}
          cy={s.y}
          r={5}
          fill={noteFill}
          stroke="#fff"
          strokeWidth={1.5}
        />
        {showLabels && (
          <text
            x={s.x + 9}
            y={s.y + 4}
            fontSize={12}
            fill="hsl(var(--foreground))"
          >
            {element.text}
          </text>
        )}
        {selected && (
          <circle
            cx={s.x}
            cy={s.y}
            r={9}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
          />
        )}
      </g>
    );
  }

  const style = computeElementShapeStyle(
    element,
    viewport,
    selected,
    hovered,
    showLabels,
    spatialUnits,
    moveDelta,
    overrideBoundary,
    renovationMode,
  );

  const {
    path,
    label,
    center,
    areaLabel,
    envelopePath,
    patternId,
    strokeColor,
    strokeDash,
    strokeWidth,
    fillOpacityOverride,
    elementColorOverride,
    color,
  } = style;

  const shift = moveDelta ?? { x: 0, y: 0 };

  return (
    <g>
      <path
        d={path}
        fill={elementColorOverride}
        fillOpacity={fillOpacityOverride}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        className="transition-colors duration-200"
      />
      {patternId && (
        <path
          d={path}
          fill={`url(#${patternId})`}
          stroke="none"
          className="pointer-events-none"
        />
      )}
      {element.kind === "stair" &&
        (() => {
          const stairGeom = calculateStairGeometry(element as Stair);
          const sArrow = stairGeom.arrowPath.map((pt) =>
            worldToScreen({ x: pt.x + shift.x, y: pt.y + shift.y }, viewport),
          );
          const sBreak = stairGeom.breakLine.map((pt) =>
            worldToScreen({ x: pt.x + shift.x, y: pt.y + shift.y }, viewport),
          );

          return (
            <g className="pointer-events-none">
              {stairGeom.treadLines.map((line, idx) => {
                const sLine = line.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sLine.length < 2) {
                  return null;
                }
                return (
                  <line
                    key={`tread-${idx}`}
                    x1={sLine[0].x}
                    y1={sLine[0].y}
                    x2={sLine[1].x}
                    y2={sLine[1].y}
                    stroke={strokeColor}
                    strokeWidth={1}
                    strokeOpacity={0.8}
                  />
                );
              })}

              {stairGeom.stringerCenterlines.map((line, idx) => {
                const sLine = line.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sLine.length < 2) {
                  return null;
                }
                const stringerD = `M ${sLine.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
                return (
                  <path
                    key={`stringer-${idx}`}
                    d={stringerD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.25}
                    strokeOpacity={0.5}
                    strokeDasharray="2 2"
                  />
                );
              })}

              {sArrow.length >= 2 && (
                <g>
                  <path
                    d={`M ${sArrow.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={sArrow[0].x}
                    cy={sArrow[0].y}
                    r={3}
                    fill="hsl(var(--primary))"
                  />
                  <line
                    x1={sArrow[sArrow.length - 1].x}
                    y1={sArrow[sArrow.length - 1].y}
                    x2={
                      sArrow[sArrow.length - 1].x -
                      6 *
                        Math.cos(
                          Math.atan2(
                            sArrow[sArrow.length - 1].y -
                              sArrow[sArrow.length - 2].y,
                            sArrow[sArrow.length - 1].x -
                              sArrow[sArrow.length - 2].x,
                          ) -
                            Math.PI / 6,
                        )
                    }
                    y2={
                      sArrow[sArrow.length - 1].y -
                      6 *
                        Math.sin(
                          Math.atan2(
                            sArrow[sArrow.length - 1].y -
                              sArrow[sArrow.length - 2].y,
                            sArrow[sArrow.length - 1].x -
                              sArrow[sArrow.length - 2].x,
                          ) -
                            Math.PI / 6,
                        )
                    }
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={sArrow[sArrow.length - 1].x}
                    y1={sArrow[sArrow.length - 1].y}
                    x2={
                      sArrow[sArrow.length - 1].x -
                      6 *
                        Math.cos(
                          Math.atan2(
                            sArrow[sArrow.length - 1].y -
                              sArrow[sArrow.length - 2].y,
                            sArrow[sArrow.length - 1].x -
                              sArrow[sArrow.length - 2].x,
                          ) +
                            Math.PI / 6,
                        )
                    }
                    y2={
                      sArrow[sArrow.length - 1].y -
                      6 *
                        Math.sin(
                          Math.atan2(
                            sArrow[sArrow.length - 1].y -
                              sArrow[sArrow.length - 2].y,
                            sArrow[sArrow.length - 1].x -
                              sArrow[sArrow.length - 2].x,
                          ) +
                            Math.PI / 6,
                        )
                    }
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                  />
                </g>
              )}

              {sBreak.length >= 2 &&
                (() => {
                  const midX = (sBreak[0].x + sBreak[1].x) / 2;
                  const midY = (sBreak[0].y + sBreak[1].y) / 2;
                  const bdx = sBreak[1].x - sBreak[0].x;
                  const bdy = sBreak[1].y - sBreak[0].y;
                  const bAngle = Math.atan2(bdy, bdx);
                  const orthoX = -Math.sin(bAngle) * 6;
                  const orthoY = Math.cos(bAngle) * 6;
                  const breakD = `M ${sBreak[0].x} ${sBreak[0].y} L ${midX - bdx * 0.05} ${midY - bdy * 0.05} L ${midX - bdx * 0.02 + orthoX} ${midY - bdy * 0.02 + orthoY} L ${midX + bdx * 0.02 - orthoX} ${midY + bdy * 0.02 - orthoY} L ${midX + bdx * 0.05} ${midY + bdy * 0.05} L ${sBreak[1].x} ${sBreak[1].y}`;
                  return (
                    <path
                      d={breakD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={1.5}
                    />
                  );
                })()}

              {viewport.zoom > 2.0 &&
                stairGeom.balusterAnchors.map((pt, idx) => {
                  const sPt = worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  );
                  return (
                    <circle
                      key={`bal-${idx}`}
                      cx={sPt.x}
                      cy={sPt.y}
                      r={1.25}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={0.5}
                      strokeOpacity={0.6}
                    />
                  );
                })}
            </g>
          );
        })()}
      {element.kind === "curtainwall" &&
        (() => {
          const cwGeom = calculateCurtainWallGeometry(element as CurtainWall);
          return (
            <g className="pointer-events-none">
              {cwGeom.perimeterFrame.map((poly, idx) => {
                const sPoly = poly.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sPoly.length < 2) {
                  return null;
                }
                const d = `M ${sPoly.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
                return (
                  <path
                    key={`frame-${idx}`}
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                );
              })}

              {cwGeom.mullions.map((mull, idx) => {
                if (mull.direction !== "vertical") {
                  return null;
                }
                const sPoly = mull.mullionPolygon.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sPoly.length < 2) {
                  return null;
                }
                const d = `M ${sPoly.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
                return (
                  <path
                    key={`mull-${idx}`}
                    d={d}
                    fill={strokeColor}
                    fillOpacity={0.65}
                    stroke={strokeColor}
                    strokeWidth={0.75}
                  />
                );
              })}

              {cwGeom.panels.map((pan, idx) => {
                const fillCol =
                  pan.material === "brick"
                    ? "#991b1b"
                    : pan.material === "insulation"
                      ? "#ea580c"
                      : pan.material === "door"
                        ? "#a21caf"
                        : pan.material === "window"
                          ? "#0284c7"
                          : "none";
                const op = pan.material === "glazing" ? 0.15 : 0.6;
                return pan.panePolygons.map((poly, pidx) => {
                  const sPoly = poly.map((pt) =>
                    worldToScreen(
                      { x: pt.x + shift.x, y: pt.y + shift.y },
                      viewport,
                    ),
                  );
                  if (sPoly.length < 2) {
                    return null;
                  }
                  const d = `M ${sPoly.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
                  return (
                    <path
                      key={`pane-${idx}-${pidx}`}
                      d={d}
                      fill={
                        fillCol === "none" ? "hsl(var(--primary))" : fillCol
                      }
                      fillOpacity={op}
                      stroke={strokeColor}
                      strokeWidth={0.5}
                    />
                  );
                });
              })}

              {viewport.zoom > 3.0 &&
                cwGeom.panels.map((pan) => {
                  if (pan.material !== "glazing") {
                    return null;
                  }
                  return pan.clipAnchors.map((pt, cidx) => {
                    const sPt = worldToScreen(
                      { x: pt.x + shift.x, y: pt.y + shift.y },
                      viewport,
                    );
                    return (
                      <circle
                        key={`clip-${pan.key}-${cidx}`}
                        cx={sPt.x}
                        cy={sPt.y}
                        r={2}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1}
                      />
                    );
                  });
                })}

              {viewport.zoom > 2.0 &&
                cwGeom.structuralTies.map((pt, idx) => {
                  const sPt = worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  );
                  return (
                    <line
                      key={`tie-${idx}`}
                      x1={sPt.x - 3}
                      y1={sPt.y - 3}
                      x2={sPt.x + 3}
                      y2={sPt.y + 3}
                      stroke="hsl(var(--primary))"
                      strokeWidth={1}
                    />
                  );
                })}
            </g>
          );
        })()}
      {element.kind === "door" &&
        (() => {
          const doorGeom = calculateDoorGeometry(element as DoorElement);
          return (
            <g className="pointer-events-none">
              {(() => {
                const sThresh = doorGeom.thresholdPolygon.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sThresh.length < 2) {
                  return null;
                }
                return (
                  <path
                    d={`M ${sThresh.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={0.75}
                    strokeDasharray="2 2"
                  />
                );
              })()}

              {(() => {
                const sSill = doorGeom.sillPolygon.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sSill.length < 2) {
                  return null;
                }
                return (
                  <path
                    d={`M ${sSill.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                );
              })()}

              {(() => {
                const sPanel = doorGeom.doorPanelPolygon.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sPanel.length < 2) {
                  return null;
                }
                return (
                  <path
                    d={`M ${sPanel.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                );
              })()}

              {(() => {
                const sPath = doorGeom.swingPath.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sPath.length < 2) {
                  return null;
                }
                return (
                  <path
                    d={`M ${sPath.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                );
              })()}

              {(() => {
                const sKnob = worldToScreen(
                  {
                    x: doorGeom.hardwareAnchor.x + shift.x,
                    y: doorGeom.hardwareAnchor.y + shift.y,
                  },
                  viewport,
                );
                return (
                  <circle
                    cx={sKnob.x}
                    cy={sKnob.y}
                    r={2}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                );
              })()}
            </g>
          );
        })()}
      {element.kind === "window" &&
        (() => {
          const winGeom = calculateWindowGeometry(element as WindowElement);
          return (
            <g className="pointer-events-none">
              {(() => {
                const sSill = winGeom.sillPolygon.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sSill.length < 2) {
                  return null;
                }
                return (
                  <path
                    d={`M ${sSill.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                );
              })()}

              {winGeom.glazingPolygons.map((poly, idx) => {
                const sPoly = poly.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sPoly.length < 2) {
                  return null;
                }
                return (
                  <path
                    key={`win-glass-${idx}`}
                    d={`M ${sPoly.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`}
                    fill="#22d3ee"
                    fillOpacity={0.25}
                    stroke={strokeColor}
                    strokeWidth={0.75}
                  />
                );
              })}

              {winGeom.sashPolygons.map((poly, idx) => {
                const sPoly = poly.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sPoly.length < 2) {
                  return null;
                }
                return (
                  <path
                    key={`win-sash-${idx}`}
                    d={`M ${sPoly.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                );
              })}
            </g>
          );
        })()}
      {element.kind === "roof" &&
        (() => {
          const roofGeom = calculateRoofGeometry(element as RoofElement);
          return (
            <g className="pointer-events-none">
              {roofGeom.rafterLines.map((line, idx) => {
                const sLine = line.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sLine.length < 2) {
                  return null;
                }
                return (
                  <line
                    key={`rafter-${idx}`}
                    x1={sLine[0].x}
                    y1={sLine[0].y}
                    x2={sLine[1].x}
                    y2={sLine[1].y}
                    stroke={strokeColor}
                    strokeWidth={0.5}
                    strokeDasharray="2 2"
                    strokeOpacity={0.4}
                  />
                );
              })}

              {roofGeom.gutterPaths.map((line, idx) => {
                const sLine = line.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sLine.length < 2) {
                  return null;
                }
                return (
                  <line
                    key={`gutter-${idx}`}
                    x1={sLine[0].x}
                    y1={sLine[0].y}
                    x2={sLine[1].x}
                    y2={sLine[1].y}
                    stroke="#475569"
                    strokeWidth={2}
                    strokeOpacity={0.7}
                  />
                );
              })}

              {roofGeom.drainageFlows.map((line, idx) => {
                const sLine = line.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                if (sLine.length < 2) {
                  return null;
                }
                const angle = Math.atan2(
                  sLine[1].y - sLine[0].y,
                  sLine[1].x - sLine[0].x,
                );
                return (
                  <g key={`flow-${idx}`}>
                    <line
                      x1={sLine[0].x}
                      y1={sLine[0].y}
                      x2={sLine[1].x}
                      y2={sLine[1].y}
                      stroke="#0284c7"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      strokeOpacity={0.6}
                    />
                    <polygon
                      points={`${sLine[1].x},${sLine[1].y} ${sLine[1].x - 6 * Math.cos(angle - Math.PI / 6)},${sLine[1].y - 6 * Math.sin(angle - Math.PI / 6)} ${sLine[1].x - 6 * Math.cos(angle + Math.PI / 6)},${sLine[1].y - 6 * Math.sin(angle + Math.PI / 6)}`}
                      fill="#0284c7"
                      fillOpacity={0.6}
                    />
                  </g>
                );
              })}

              {roofGeom.hipLines
                .concat(roofGeom.valleyLines)
                .map((line, idx) => {
                  const sLine = line.map((pt) =>
                    worldToScreen(
                      { x: pt.x + shift.x, y: pt.y + shift.y },
                      viewport,
                    ),
                  );
                  if (sLine.length < 2) {
                    return null;
                  }
                  return (
                    <line
                      key={`hip-valley-${idx}`}
                      x1={sLine[0].x}
                      y1={sLine[0].y}
                      x2={sLine[1].x}
                      y2={sLine[1].y}
                      stroke={strokeColor}
                      strokeWidth={1.5}
                      strokeOpacity={0.7}
                    />
                  );
                })}

              {(() => {
                if (roofGeom.ridgeLine.length < 2) {
                  return null;
                }
                const sRidge = roofGeom.ridgeLine.map((pt) =>
                  worldToScreen(
                    { x: pt.x + shift.x, y: pt.y + shift.y },
                    viewport,
                  ),
                );
                return (
                  <line
                    x1={sRidge[0].x}
                    y1={sRidge[0].y}
                    x2={sRidge[1].x}
                    y2={sRidge[1].y}
                    stroke={strokeColor}
                    strokeWidth={2}
                  />
                );
              })()}

              {roofGeom.downspoutAnchors.map((pt, idx) => {
                const sPt = worldToScreen(
                  { x: pt.x + shift.x, y: pt.y + shift.y },
                  viewport,
                );
                return (
                  <circle
                    key={`downspout-${idx}`}
                    cx={sPt.x}
                    cy={sPt.y}
                    r={3}
                    fill="#0284c7"
                    stroke={strokeColor}
                    strokeWidth={0.75}
                  />
                );
              })}
            </g>
          );
        })()}
      {envelopePath && (
        <path
          d={envelopePath}
          fill="none"
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={1}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {label && center && (
        <text
          x={center.x}
          y={center.y}
          fontSize={12}
          textAnchor="middle"
          className="pointer-events-none"
          fill="hsl(var(--foreground))"
          style={{
            paintOrder: "stroke",
            stroke: "hsl(var(--canvas))",
            strokeWidth: 3,
          }}
        >
          {element.name}
          {areaLabel && (
            <tspan x={center.x} dy={14} fontSize={10} fillOpacity={0.7}>
              {areaLabel}
            </tspan>
          )}
          {renovationMode && renovationStatus !== "existing" && (
            <tspan
              x={center.x}
              dy={areaLabel ? 14 : 12}
              fontSize={9}
              fill={renovationStatus === "new" ? "#22c55e" : "#ef4444"}
              fontWeight="bold"
            >
              {renovationStatus === "new" ? "● NEW" : "✕ DEMO"}
            </tspan>
          )}
        </text>
      )}
    </g>
  );
}
