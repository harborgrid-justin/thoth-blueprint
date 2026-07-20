/**
 * SVG renderer for a {@link SheetPrimitive} scene. Maps the point-space IR to
 * SVG elements 1:1, so what renders here is exactly what {@link pdfExport}
 * emits to a PDF page. The `<svg>` viewBox is the sheet's point dimensions.
 */

import * as React from "react";
import { INK, type Pt, type SheetPrimitive } from "./scene";

function dashOf(dash?: number[]): string | undefined {
  return dash && dash.length ? dash.join(" ") : undefined;
}

function polyPoints(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function Prim({ p }: { p: SheetPrimitive }) {
  switch (p.t) {
    case "line":
      return (
        <line
          x1={p.a.x}
          y1={p.a.y}
          x2={p.b.x}
          y2={p.b.y}
          stroke={p.color ?? INK}
          strokeWidth={p.w ?? 0.5}
          strokeDasharray={dashOf(p.dash)}
        />
      );
    case "polyline":
      return (
        <polyline
          points={polyPoints(p.close ? [...p.pts, p.pts[0]] : p.pts)}
          fill="none"
          stroke={p.color ?? INK}
          strokeWidth={p.w ?? 0.5}
          strokeDasharray={dashOf(p.dash)}
        />
      );
    case "polygon":
      return (
        <polygon
          points={polyPoints(p.pts)}
          fill={p.fill ?? "none"}
          fillOpacity={p.fillOpacity ?? (p.fill ? 1 : 0)}
          stroke={p.stroke ?? "none"}
          strokeWidth={p.w ?? 0}
          strokeDasharray={dashOf(p.dash)}
        />
      );
    case "rect":
      return (
        <rect
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={p.fill ?? "none"}
          fillOpacity={p.fillOpacity ?? (p.fill ? 1 : 0)}
          stroke={p.stroke ?? "none"}
          strokeWidth={p.sw ?? 0}
          strokeDasharray={dashOf(p.dash)}
        />
      );
    case "circle":
      return (
        <circle
          cx={p.c.x}
          cy={p.c.y}
          r={p.r}
          fill={p.fill ?? "none"}
          fillOpacity={p.fillOpacity ?? (p.fill && p.fill !== "none" && p.fill !== "transparent" ? 1 : 0)}
          stroke={p.stroke ?? "none"}
          strokeWidth={p.sw ?? 0}
        />
      );
    case "text":
      return (
        <text
          x={p.at.x}
          y={p.at.y}
          fontSize={p.size}
          fill={p.color ?? INK}
          textAnchor={p.anchor ?? "start"}
          fontWeight={p.weight ?? 400}
          fontFamily={p.mono ? "ui-monospace, Menlo, Consolas, monospace" : "ui-sans-serif, system-ui, sans-serif"}
          transform={p.angle ? `rotate(${p.angle} ${p.at.x} ${p.at.y})` : undefined}
        >
          {p.text}
        </text>
      );
  }
}

/** Render a sheet scene as an inline SVG. */
export const SvgSheet = React.forwardRef<SVGSVGElement, { prims: SheetPrimitive[]; wPt: number; hPt: number; className?: string }>(
  function SvgSheet({ prims, wPt, hPt, className }, ref) {
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${wPt} ${hPt}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ display: "block", background: "#ffffff" }}
      >
        {prims.map((p, i) => (
          <Prim key={i} p={p} />
        ))}
      </svg>
    );
  },
);
