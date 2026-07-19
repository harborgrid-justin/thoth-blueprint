import * as React from "react";
import { Download, LayoutTemplate } from "lucide-react";
import {
  areaUnitLabel,
  bounds as boundsOf,
  collectSiteCurves,
  densifyBoundary,
  formatLandLotShort,
  formatPLSSShort,
  getRegionPlugin,
  isSpatialElement,
  landLotSide,
  measuredArea,
  METERS_PER_UNIT,
  resolveAlignment,
  resolveCapabilities,
  sectionFrame,
  unitLabel,
  unionBounds,
  US_PLSS_DEFAULT,
  type Bounds,
  type Point,
  type RegionPlugin,
  type Site,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { elementColor } from "@/lib/elementMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonumentSymbol } from "@/features/canvas/MonumentLayer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const INK = "#0f172a";
const MUTED = "#475569";
const SHEET = "#ffffff";

// Landscape sheet, drawing window on the left, title/legend/curve strip on the right.
const W = 1180;
const H = 820;
const MAIN = { x: 24, y: 44, w: 812, h: 720 };
const STRIP = { x: 848, y: 44, w: 308, h: 720 };

/** The plat-sheet composer: a jurisdiction-driven plan sheet with title block,
 * certificates, the site plan, a consolidated curve table, and a legend. */
export function PlatSheetDialog() {
  const open = useUiStore((s) => s.sheetOpen);
  const setOpen = useUiStore((s) => s.setSheetOpen);
  const site = useWorkspaceStore((s) => s.site);
  const svgRef = React.useRef<SVGSVGElement>(null);
  if (!site) return null;

  const plugin = getRegionPlugin(site.jurisdictionId) ?? US_PLSS_DEFAULT;
  const caps = resolveCapabilities(plugin);

  function exportSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const src = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${src}`], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plat-sheet.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" /> Plat Sheet Composer
          </DialogTitle>
          <DialogDescription>
            {site.name} — driven by the {plugin.name} region plug-in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Survey framework:{" "}
              <span className="font-medium text-foreground">{plugin.surveyFramework}</span>
            </span>
            <Badge variant="outline">{plugin.name}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={exportSvg}>
            <Download className="h-4 w-4" /> Export sheet (SVG)
          </Button>
        </div>

        <ScrollArea className="max-h-[68vh] pr-3">
          <div className="overflow-x-auto rounded-md border border-border">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block", background: SHEET }}
              fontFamily="ui-monospace, Menlo, Consolas, monospace"
            >
              <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke={INK} strokeWidth={1.6} />
              <rect x={13} y={13} width={W - 26} height={H - 26} fill="none" stroke={INK} strokeWidth={0.6} />
              <PlanWindow site={site} plugin={plugin} />
              <TitleStrip site={site} plugin={plugin} caps={caps} />
            </svg>
          </div>

          {caps.certificates && plugin.certificates.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Certificates ({plugin.name})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {plugin.certificates.map((c) => (
                  <div key={c.id} className="rounded-md border border-border bg-background/60 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      {c.title}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {c.body.replace("{jurisdiction}", plugin.name)}
                    </p>
                    {c.signatures && (
                      <div className="mt-2 flex flex-wrap gap-4">
                        {c.signatures.map((s) => (
                          <div key={s} className="min-w-[120px] flex-1">
                            <div className="h-4 border-b border-foreground/50" />
                            <div className="mt-0.5 text-[10px] text-muted-foreground">{s}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <CapabilitiesRow caps={caps} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// --- SVG plan window -------------------------------------------------------

function planExtent(site: Site): Bounds | null {
  const boxes = site.elements.filter(isSpatialElement).map((e) => boundsOf(e.boundary));
  for (const m of site.monuments ?? []) {
    boxes.push({ minX: m.position.x, minY: m.position.y, maxX: m.position.x, maxY: m.position.y });
  }
  return boxes.length ? unionBounds(boxes) : null;
}

function PlanWindow({ site, plugin }: { site: Site; plugin: RegionPlugin }) {
  const ext = planExtent(site);
  const clipId = "sheet-plan-clip";
  const inner = { x: MAIN.x + 8, y: MAIN.y + 8, w: MAIN.w - 16, h: MAIN.h - 40 };

  let project = (p: Point) => ({ x: p.x, y: p.y });
  let scalePx = 1;
  if (ext) {
    const bw = Math.max(ext.maxX - ext.minX, 1e-6);
    const bh = Math.max(ext.maxY - ext.minY, 1e-6);
    scalePx = Math.min(inner.w / bw, inner.h / bh);
    const ox = inner.x + (inner.w - bw * scalePx) / 2 - ext.minX * scalePx;
    const oy = inner.y + (inner.h - bh * scalePx) / 2 - ext.minY * scalePx;
    project = (p) => ({ x: p.x * scalePx + ox, y: p.y * scalePx + oy });
  }

  const areaUnit = plugin.defaults.areaUnit;

  return (
    <g>
      <rect x={MAIN.x} y={MAIN.y} width={MAIN.w} height={MAIN.h} fill="none" stroke={INK} strokeWidth={1} />
      <clipPath id={clipId}>
        <rect x={MAIN.x + 1} y={MAIN.y + 1} width={MAIN.w - 2} height={MAIN.h - 2} />
      </clipPath>

      <g clipPath={`url(#${clipId})`}>
        <FrameworkOnSheet site={site} plugin={plugin} project={project} />

        {site.elements.filter(isSpatialElement).map((el) => {
          const ring = densifyBoundary(el.boundary, el.arcs, 2).map(project);
          const pts = ring.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ");
          const cat = el.kind === "landuse" ? el.category : undefined;
          const color = elementColor(el.kind, cat);
          const isEsmt = el.kind === "easement";
          return (
            <polygon
              key={el.id}
              points={pts}
              fill={color}
              fillOpacity={isEsmt ? 0.05 : el.kind === "building" ? 0.6 : 0.14}
              stroke={isEsmt ? MUTED : INK}
              strokeWidth={el.kind === "parcel" ? 1.4 : 0.9}
              strokeDasharray={isEsmt ? "6 3 2 3" : el.kind === "zone" ? "5 3" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* Lot / parcel labels with area. */}
        {site.elements
          .filter((e) => e.kind === "lot" || e.kind === "parcel")
          .map((el) => {
            if (!isSpatialElement(el)) return null;
            const ring = densifyBoundary(el.boundary, el.arcs, 2);
            const c = ring.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
            const center = project({ x: c.x / ring.length, y: c.y / ring.length });
            const acres = measuredArea(el.boundary, site.spatial, areaUnit);
            return (
              <text key={`l${el.id}`} x={center.x} y={center.y} textAnchor="middle" fontSize={7} fill={INK}>
                <tspan x={center.x} fontWeight={700}>{el.name}</tspan>
                <tspan x={center.x} dy={8} fill={MUTED}>
                  {acres.toFixed(2)} {areaUnitLabel(areaUnit)}
                </tspan>
              </text>
            );
          })}

        {/* Alignment centerlines. */}
        {(site.alignments ?? []).map((a) => {
          const r = resolveAlignment(a);
          if (!r) return null;
          const pts: Point[] = [];
          for (const el of r.elements) {
            if (el.kind === "tangent") {
              if (pts.length === 0) pts.push(el.from);
              pts.push(el.to);
            } else {
              const c = el.curve;
              const steps = Math.max(2, Math.ceil(c.deltaDeg / 3));
              for (let i = 0; i <= steps; i++) {
                const ang = c.startAngle + (c.sweep * i) / steps;
                pts.push({ x: c.center.x + c.radius * Math.cos(ang), y: c.center.y + c.radius * Math.sin(ang) });
              }
            }
          }
          const poly = pts.map(project).map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ");
          return (
            <polyline key={a.id} points={poly} fill="none" stroke="#b91c1c" strokeWidth={1.1} strokeDasharray="12 3 3 3" />
          );
        })}

        {/* Monuments. */}
        {(site.monuments ?? []).map((m) => {
          const s = project(m.position);
          return (
            <g key={m.id} transform={`translate(${s.x} ${s.y}) scale(0.8)`}>
              <MonumentSymbol type={m.type} filled={m.status === "set"} />
            </g>
          );
        })}
      </g>

      <NorthArrow x={MAIN.x + MAIN.w - 34} y={MAIN.y + 14} />
      <GraphicScale x={MAIN.x + 16} y={MAIN.y + MAIN.h - 16} scalePx={scalePx} site={site} />
      <text x={MAIN.x + 8} y={MAIN.y + MAIN.h - 6} fontSize={9} fontWeight={700} fill={INK}>
        SHEET 1 OF 1
      </text>
    </g>
  );
}

function FrameworkOnSheet({
  site,
  plugin,
  project,
}: {
  site: Site;
  plugin: RegionPlugin;
  project: (p: Point) => Point;
}) {
  if (plugin.surveyFramework === "georgia-land-lot" && site.landLot?.nwCorner) {
    const acres = site.landLot.ref.acres ?? 202.5;
    const side = (landLotSide(acres) * 0.3048) / METERS_PER_UNIT[site.spatial.units];
    return <FrameworkSquareSheet frame={sectionFrame(site.landLot.nwCorner, side)} project={project} />;
  }
  if (plugin.surveyFramework !== "georgia-land-lot" && site.plss?.sectionNwCorner && site.plss.sectionSide) {
    return <FrameworkSquareSheet frame={sectionFrame(site.plss.sectionNwCorner, site.plss.sectionSide)} project={project} />;
  }
  return null;
}

function FrameworkSquareSheet({
  frame: f,
  project,
}: {
  frame: ReturnType<typeof sectionFrame>;
  project: (p: Point) => Point;
}) {
  const p = (pt: Point) => project(pt);
  const [nw, ne, sw, se] = [p(f.nw), p(f.ne), p(f.sw), p(f.se)];
  return (
    <g>
      <polygon points={[nw, ne, se, sw].map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ")} fill="none" stroke={MUTED} strokeWidth={1} strokeDasharray="14 4 3 4" />
      <line x1={p(f.north).x} y1={p(f.north).y} x2={p(f.south).x} y2={p(f.south).y} stroke={MUTED} strokeWidth={0.5} strokeDasharray="8 5" />
      <line x1={p(f.west).x} y1={p(f.west).y} x2={p(f.east).x} y2={p(f.east).y} stroke={MUTED} strokeWidth={0.5} strokeDasharray="8 5" />
    </g>
  );
}

// --- SVG right strip: title block, legend, curve table ---------------------

function TitleStrip({ site, plugin, caps }: { site: Site; plugin: RegionPlugin; caps: ReturnType<typeof resolveCapabilities> }) {
  const framework =
    plugin.surveyFramework === "georgia-land-lot" && site.landLot
      ? formatLandLotShort(site.landLot.ref)
      : site.plss
        ? formatPLSSShort(site.plss.townshipRange, site.plss.section)
        : "—";
  const fieldValue = (key: string): string => {
    switch (key) {
      case "projectName":
        return site.name;
      case "framework":
        return framework;
      case "county":
        return plugin.county ?? "—";
      case "scale":
        return "AS SHOWN";
      case "sheet":
        return "1 OF 1";
      case "date":
        return "—";
      default:
        return "—";
    }
  };

  const curves = caps.curveTable ? collectSiteCurves(site) : [];
  const u = unitLabel(site.spatial.units);

  const titleH = 30 + (plugin.titleBlock.firmLines?.length ?? 0) * 12 + plugin.titleBlock.fields.length * 15;

  return (
    <g>
      <rect x={STRIP.x} y={STRIP.y} width={STRIP.w} height={STRIP.h} fill="none" stroke={INK} strokeWidth={1} />

      {/* Title block */}
      <rect x={STRIP.x} y={STRIP.y} width={STRIP.w} height={titleH} fill="none" stroke={INK} strokeWidth={0.8} />
      <text x={STRIP.x + 8} y={STRIP.y + 16} fontSize={11} fontWeight={700} fill={INK}>
        PLAT OF {site.name.toUpperCase()}
      </text>
      {(plugin.titleBlock.firmLines ?? []).map((line, i) => (
        <text key={i} x={STRIP.x + 8} y={STRIP.y + 30 + i * 12} fontSize={8} fill={MUTED}>
          {line}
        </text>
      ))}
      {plugin.titleBlock.fields.map((field, i) => {
        const fy = STRIP.y + 34 + (plugin.titleBlock.firmLines?.length ?? 0) * 12 + i * 15;
        return (
          <text key={field.key} x={STRIP.x + 8} y={fy} fontSize={9} fill={INK}>
            <tspan fill={MUTED}>{field.label}: </tspan>
            <tspan fontWeight={600}>{fieldValue(field.key)}</tspan>
          </text>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${STRIP.x + 8}, ${STRIP.y + titleH + 16})`}>
        <text x={0} y={0} fontSize={9} fontWeight={700} fill={INK}>LEGEND</text>
        {[...new Set((site.monuments ?? []).map((m) => m.type))].slice(0, 6).map((t, i) => (
          <g key={t} transform={`translate(6, ${14 + i * 15})`}>
            <g transform="scale(0.7)">
              <MonumentSymbol type={t} filled />
            </g>
            <text x={12} y={3} fontSize={8} fill={INK}>{t.replace(/-/g, " ")}</text>
          </g>
        ))}
      </g>

      {/* Curve table */}
      {curves.length > 0 && (
        <g transform={`translate(${STRIP.x + 8}, ${STRIP.y + titleH + 130})`}>
          <text x={0} y={0} fontSize={9} fontWeight={700} fill={INK}>CURVE DATA</text>
          <text x={0} y={13} fontSize={7} fill={MUTED}>
            {`CV   R(${u})    L(${u})    Δ        CHORD`}
          </text>
          {curves.slice(0, 20).map((c, i) => (
            <text key={c.label} x={0} y={24 + i * 11} fontSize={7} fill={INK}>
              {`${c.label.padEnd(4)} ${c.radius.toFixed(1).padStart(7)} ${c.arcLength.toFixed(1).padStart(7)} ${c.deltaDeg.toFixed(2).padStart(6)}° ${c.chord.toFixed(1).padStart(7)}`}
            </text>
          ))}
        </g>
      )}
    </g>
  );
}

// --- sheet furniture -------------------------------------------------------

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={INK} stroke={INK}>
      <path d="M0 30 L0 4" strokeWidth={1.1} />
      <path d="M0 0 L5 12 L0 8 L-5 12 Z" strokeWidth={0.5} />
      <text x={0} y={42} textAnchor="middle" fontSize={10} fontWeight={700} stroke="none">N</text>
    </g>
  );
}

function GraphicScale({ x, y, scalePx, site }: { x: number; y: number; scalePx: number; site: Site }) {
  const u = unitLabel(site.spatial.units);
  const metersPerPx = (1 / Math.max(scalePx, 1e-6)) * METERS_PER_UNIT[site.spatial.units];
  const perPx = metersPerPx / METERS_PER_UNIT[site.spatial.units];
  const target = 120 * perPx;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(target, 1e-6))));
  const r = target / mag;
  const nice = (r >= 5 ? 5 : r >= 2 ? 2 : 1) * mag;
  const barPx = nice / perPx;
  const seg = barPx / 4;
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <rect key={i} x={i * seg} y={0} width={seg} height={6} fill={i % 2 === 0 ? INK : SHEET} stroke={INK} strokeWidth={0.7} />
      ))}
      <text x={0} y={16} fontSize={7} textAnchor="middle" fill={INK}>0</text>
      <text x={barPx} y={16} fontSize={7} textAnchor="middle" fill={INK}>{`${nice.toLocaleString()} ${u}`}</text>
    </g>
  );
}

function CapabilitiesRow({ caps }: { caps: ReturnType<typeof resolveCapabilities> }) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Enabled capabilities
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(caps).map(([k, on]) => (
          <Badge key={k} variant={on ? "default" : "outline"} className={on ? "" : "opacity-50"}>
            {k}
          </Badge>
        ))}
      </div>
    </div>
  );
}
