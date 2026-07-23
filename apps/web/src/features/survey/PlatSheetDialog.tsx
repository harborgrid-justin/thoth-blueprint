import * as React from "react";
import _ from "lodash";
import { Download, LayoutTemplate, Edit3 } from "lucide-react";
import {
  densifyBoundary,
  isSpatialElement,
  landLotSide,
  measuredArea,
  METERS_PER_UNIT,
  resolveCapabilities,
  sectionFrame,
  createPrinceWilliamHousePlat,
  createKnightsbridgeLot11Plat,
  unitLabel,
  type Point,
  type RegionPlugin,
  type Site,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { elementColor } from "@/lib/elementMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CanvasPatterns, patternFor } from "@/features/canvas/patterns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlatSheetState } from "./hooks/usePlatSheetState";
import {
  INK,
  MUTED,
  SHEET,
  W,
  H,
  MAIN,
  STRIP,
  planExtent,
  computeGraphicScaleBar,
} from "./helpers/platSheetHelpers";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

function formatSegmentBearing(p1: Point, p2: Point): string {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let angle = Math.atan2(dx, dy) * (180 / Math.PI);
  if (angle < 0) {angle += 360;}

  let ns: string;
  let ew: string;
  let deg: number;

  if (angle >= 0 && angle <= 90) {
    ns = "N"; ew = "E"; deg = angle;
  } else if (angle > 90 && angle <= 180) {
    ns = "S"; ew = "E"; deg = 180 - angle;
  } else if (angle > 180 && angle <= 270) {
    ns = "S"; ew = "W"; deg = angle - 180;
  } else {
    ns = "N"; ew = "W"; deg = 360 - angle;
  }

  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  const s = Math.round(((deg - d) * 60 - m) * 60);
  return `${ns} ${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}" ${ew}`;
}


/** The plat-sheet composer: a jurisdiction-driven plan sheet with title block,
 * certificates, the site plan, a consolidated curve table, and a legend. */
export function PlatSheetDialog() {
  const [sheetView, setSheetView] = React.useState<"handdrawn" | "sheet">("handdrawn");
  const { open, setOpen, site, plugin, caps, svgRef, exportSvg, exportPdf } =
    usePlatSheetState();
  if (!site) {
    return null;
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-6xl animate-dialog-in border-border bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className={SURVEY_STYLES.dialogTitle + " justify-between"}>
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-amber-400" /> Plat Sheet Composer
            </div>
            <div className="mr-6 flex items-center rounded-md border border-border bg-card p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSheetView("handdrawn")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-semibold transition-colors ${
                  sheetView === "handdrawn"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" /> Hand-Drawn Surveyor Plat
              </button>
              <button
                type="button"
                onClick={() => setSheetView("sheet")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-semibold transition-colors ${
                  sheetView === "sheet"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Standard CAD Sheet
              </button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {site.name} — driven by the {plugin.name} region plug-in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Jurisdiction Region:</span>
            <Badge variant="secondary" className="font-semibold text-primary">
              {plugin.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const kSite = createKnightsbridgeLot11Plat();
                useWorkspaceStore
                  .getState()
                  .loadSitePreset(kSite, "Lot 11 Knightsbridge Plat");
              }}
            >
              Load Lot 11 Plat
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const pwcSite = createPrinceWilliamHousePlat();
                useWorkspaceStore
                  .getState()
                  .loadSitePreset(pwcSite, "Prince William County House Plat");
              }}
            >
              Load PWC 28k Plat
            </Button>
            <Button variant="default" size="sm" onClick={exportPdf}>
              <Download className="h-4 w-4" /> Export PDF (Civil Planning)
            </Button>
            <Button variant="outline" size="sm" onClick={exportSvg}>
              <Download className="h-4 w-4" /> Export sheet (SVG)
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[68vh] pr-3">
          <div className="overflow-x-auto rounded-md border border-border">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                display: "block",
                background: sheetView === "handdrawn" ? "#faf8f5" : SHEET,
              }}
              fontFamily={
                sheetView === "handdrawn"
                  ? "'Architects Daughter', 'Patrick Hand', 'Comic Sans MS', cursive"
                  : "Inter, system-ui, -apple-system, sans-serif"
              }
            >
              <defs>
                <filter id="sheet-hand-sketch" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
              <CanvasPatterns />
              <g filter={sheetView === "handdrawn" ? "url(#sheet-hand-sketch)" : undefined}>
                <rect
                  x={8}
                  y={8}
                  width={W - 16}
                  height={H - 16}
                  fill="none"
                  stroke={INK}
                  strokeWidth={1.6}
                />
                <rect
                  x={13}
                  y={13}
                  width={W - 26}
                  height={H - 26}
                  fill="none"
                  stroke={INK}
                  strokeWidth={0.6}
                />
                <PlanWindow site={site} plugin={plugin} />
                <TitleStrip site={site} plugin={plugin} caps={caps} />
              </g>
            </svg>
          </div>

          {caps.certificates && plugin.certificates.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Certificates ({plugin.name})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {plugin.certificates.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-border bg-background/60 p-3"
                  >
                    <div className="text-xs font-semibold tracking-wide text-foreground uppercase">
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
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              {s}
                            </div>
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

function PlanWindow({ site, plugin }: { site: Site; plugin: RegionPlugin }) {
  const selection = useWorkspaceStore((s) => s.selection);
  const hoveredElementId = useWorkspaceStore((s) => s.hoveredElementId);
  const ext = planExtent(site);
  const clipId = "sheet-plan-clip";
  const inner = {
    x: MAIN.x + 8,
    y: MAIN.y + 8,
    w: MAIN.w - 16,
    h: MAIN.h - 40,
  };

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
  const spatialElements = site.elements.filter(isSpatialElement);
  const parcelsAndLots = spatialElements.filter(
    (e) => e.kind === "parcel" || e.kind === "lot"
  );

  return (
    <g>
      <rect
        x={MAIN.x}
        y={MAIN.y}
        width={MAIN.w}
        height={MAIN.h}
        fill="none"
        stroke={INK}
        strokeWidth={1}
      />
      <clipPath id={clipId}>
        <rect
          x={MAIN.x + 1}
          y={MAIN.y + 1}
          width={MAIN.w - 2}
          height={MAIN.h - 2}
        />
      </clipPath>

      <g clipPath={`url(#${clipId})`}>
        <FrameworkOnSheet site={site} plugin={plugin} project={project} />

        {/* Spatial Polygons & Structures */}
        {spatialElements.map((el) => {
          const densified = densifyBoundary(el.boundary, el.arcs, 1);
          const ring = densified.map(project);
          const pts = ring.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ");
          const cat = el.kind === "landuse" ? el.category : undefined;
          const color = elementColor(el.kind, cat);
          const isEsmt = el.kind === "easement";
          const isRow = el.kind === "row";
          const isBldg = el.kind === "building";
          const pattern = isEsmt ? null : patternFor(el);
          const isHovered = hoveredElementId === el.id;
          const isSelected = selection.includes(el.id);

          const centerPt = ring.reduce(
            (a, p) => ({ x: a.x + p.x / ring.length, y: a.y + p.y / ring.length }),
            { x: 0, y: 0 }
          );

          return (
            <g
              key={el.id}
              className="cursor-pointer"
              onMouseEnter={() => useWorkspaceStore.getState().hoverElement(el.id)}
              onMouseLeave={() => {
                if (useWorkspaceStore.getState().hoveredElementId === el.id) {
                  useWorkspaceStore.getState().hoverElement(null);
                }
              }}
              onClick={() => useWorkspaceStore.getState().select(el.id)}
            >
              <polygon
                points={pts}
                fill={isHovered ? "#f59e0b" : isRow ? "#e2e8f0" : color}
                fillOpacity={
                  isHovered ? 0.35 : isSelected ? 0.3 : isEsmt ? 0.08 : isBldg ? 0.65 : 0.12
                }
                stroke={isSelected ? "#0284c7" : isHovered ? "#f59e0b" : isEsmt ? "#d97706" : isRow ? "#475569" : INK}
                strokeWidth={isSelected || isHovered ? 2.5 : el.kind === "parcel" ? 1.8 : 1.0}
                strokeDasharray={isEsmt ? "6 3 2 3" : undefined}
                vectorEffect="non-scaling-stroke"
              />
              {pattern && <polygon points={pts} fill={`url(#${pattern})`} stroke="none" />}

              {/* Specific element labels */}
              {isRow && (
                <text
                  x={centerPt.x}
                  y={centerPt.y}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={700}
                  fill="#1e293b"
                >
                  {el.name.toUpperCase()}
                </text>
              )}
              {isBldg && (
                <g>
                  <text
                    x={centerPt.x}
                    y={centerPt.y - 4}
                    textAnchor="middle"
                    fontSize={7.5}
                    fontWeight={700}
                    fill="#991b1b"
                  >
                    {el.name.toUpperCase()}
                  </text>
                  <text
                    x={centerPt.x}
                    y={centerPt.y + 6}
                    textAnchor="middle"
                    fontSize={6.5}
                    fill="#7f1d1d"
                  >
                    STOREYS: {el.storeys ?? 2} | HEIGHT: {el.height ?? 30}'
                  </text>
                </g>
              )}
              {isEsmt && (
                <text
                  x={centerPt.x}
                  y={centerPt.y}
                  textAnchor="middle"
                  fontSize={6.5}
                  fontWeight={600}
                  fill="#b45309"
                >
                  {el.name.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {/* Boundary Bearings & Distances */}
        {parcelsAndLots.map((el) => {
          const raw = el.boundary;
          return raw.map((p1, i) => {
            const p2 = raw[(i + 1) % raw.length];
            const sp1 = project(p1);
            const sp2 = project(p2);
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) {return null;}

            const mx = (sp1.x + sp2.x) / 2;
            const my = (sp1.y + sp2.y) / 2;

            const bearingStr = formatSegmentBearing(p1, p2);
            const distStr = `${len.toFixed(2)}'`;

            // Calculate perp offset for clean text placement
            const lengthPx = Math.sqrt((sp2.x - sp1.x) ** 2 + (sp2.y - sp1.y) ** 2);
            const nx = -(sp2.y - sp1.y) / lengthPx;
            const ny = (sp2.x - sp1.x) / lengthPx;
            const offX = mx + nx * 14;
            const offY = my + ny * 14;

            const angleRad = Math.atan2(sp2.y - sp1.y, sp2.x - sp1.x);
            let angleDeg = angleRad * (180 / Math.PI);
            if (angleDeg > 90 || angleDeg < -90) {
              angleDeg += 180;
            }

            return (
              <g key={`bd-${el.id}-${i}`} transform={`translate(${offX}, ${offY}) rotate(${angleDeg})`}>
                <text
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight={700}
                  fill="#1e3a8a"
                  paintOrder="stroke"
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <tspan x={0} dy="-2">{bearingStr}</tspan>
                  <tspan x={0} dy="8">{distStr}</tspan>
                </text>
              </g>
            );
          });
        })}

        {/* Parcel Corner Monuments */}
        {parcelsAndLots.flatMap((el) =>
          el.boundary.map((pt, idx) => {
            const s = project(pt);
            return (
              <g key={`mon-p-${el.id}-${idx}`} transform={`translate(${s.x}, ${s.y})`}>
                <circle r={4} fill="#ffffff" stroke="#0f172a" strokeWidth={1.2} />
                <circle r={1.5} fill="#0f172a" />
                <text x={6} y={3} fontSize={6} fontWeight={700} fill="#0f172a">
                  {`C.M. #${idx + 1} (SET)`}
                </text>
              </g>
            );
          })
        )}

        {/* Parcel Center Label */}
        {parcelsAndLots.slice(0, 1).map((el) => {
          const ring = densifyBoundary(el.boundary, el.arcs, 2);
          const c = ring.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
          const center = project({ x: c.x / ring.length, y: c.y / ring.length });
          const acres = measuredArea(el.boundary, site.spatial, areaUnit);
          const sqft = acres * 43560;

          return (
            <g key={`l${el.id}`} transform={`translate(${center.x}, ${center.y - 65})`}>
              <rect x="-130" y="-12" width="260" height="34" fill="#ffffff" fillOpacity="0.9" stroke="#94a3b8" strokeWidth="0.5" rx="3" />
              <text textAnchor="middle" fontSize={7.5} fill={INK}>
                <tspan x={0} y="-1" fontWeight={700}>{el.name.toUpperCase()}</tspan>
                <tspan x={0} y="9" fontWeight={600} fill="#1e40af">SITE: {site.name}</tspan>
                <tspan x={0} y="18" fill={MUTED}>AREA: {sqft.toLocaleString("en-US", { maximumFractionDigits: 0 })} SQ FT ({acres.toFixed(3)} AC)</tspan>
              </text>
            </g>
          );
        })}
      </g>

      <NorthArrow x={MAIN.x + MAIN.w - 34} y={MAIN.y + 14} />
      <GraphicScale
        x={MAIN.x + 16}
        y={MAIN.y + MAIN.h - 16}
        scalePx={scalePx}
        site={site}
      />
      <text
        x={MAIN.x + 8}
        y={MAIN.y + MAIN.h - 6}
        fontSize={9}
        fontWeight={700}
        fill={INK}
      >
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
  if (
    plugin.surveyFramework !== "georgia-land-lot" &&
    site.plss?.sectionNwCorner &&
    site.plss.sectionSide
  ) {
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
      <polygon
        points={[nw, ne, se, sw].map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke={MUTED}
        strokeWidth={1}
        strokeDasharray="14 4 3 4"
      />
    </g>
  );
}

// --- SVG right strip: title block, certificates, legend, curve table ----
function TitleStrip({
  site,
  plugin,
}: {
  site: Site;
  plugin: RegionPlugin;
  caps: ReturnType<typeof resolveCapabilities>;
}) {
  const parcelElement = site.elements.find((e) => e.kind === "parcel");
  const areaSqFt = parcelElement && "boundary" in parcelElement
    ? measuredArea(parcelElement.boundary, site.spatial, "sqft")
    : 28000;
  const areaAcres = areaSqFt / 43560;

  const fieldValue = (key: string): string => {
    switch (key) {
      case "projectName":
        return site.name;
      case "gpin":
        return site.name.includes("Knightsbridge") ? "7892-11-6000" : "7892-34-5678";
      case "district":
        return "Coles Magisterial District";
      case "zoning":
        return "R-4 Suburban Residential";
      case "scale":
        return '1" = 40\'';
      case "sheet":
        return "1 OF 1";
      default:
        return "—";
    }
  };

  return (
    <g>
      <rect
        x={STRIP.x}
        y={STRIP.y}
        width={STRIP.w}
        height={STRIP.h}
        fill="#f8fafc"
        stroke={INK}
        strokeWidth={1}
      />

      <g transform={`translate(${STRIP.x + 10}, ${STRIP.y + 18})`} fill={INK}>
        {/* Title Block Header from Plugin */}
        {plugin.titleBlock.firmLines?.map((line, i) => (
          <text
            key={i}
            x="0"
            y={i * 12}
            fontSize={i === 0 ? 10 : 8}
            fontWeight={i === 0 ? 700 : 500}
            fill={i === 0 ? INK : MUTED}
          >
            {line}
          </text>
        ))}

        <line x1="0" y1="28" x2={STRIP.w - 20} y2="28" stroke={INK} strokeWidth="0.8"/>

        <text x="0" y="42" fontSize="7.5" fontWeight="600">
          PARCEL AREA: <tspan fontWeight="400">{areaSqFt.toLocaleString("en-US", { maximumFractionDigits: 0 })} SQ FT ({areaAcres.toFixed(3)} AC)</tspan>
        </text>

        {plugin.titleBlock.fields.slice(1).map((field, i) => (
          <text key={field.key} x="0" y={54 + i * 12} fontSize="7.5" fontWeight="600">
            {field.label.toUpperCase()}: <tspan fontWeight="400">{fieldValue(field.key)}</tspan>
          </text>
        ))}

        <text x="0" y="102" fontSize="7.5" fontWeight="600">
          CRS: <tspan fontWeight="400">{site.spatial.crs}</tspan>
        </text>

        <line x1="0" y1="108" x2={STRIP.w - 20} y2="108" stroke={INK} strokeWidth="0.8"/>

        {/* Dynamic Legal Certificates from Plugin */}
        <g transform="translate(0, 116)">
          {plugin.certificates.slice(0, 4).map((cert, ci) => (
            <g key={cert.id} transform={`translate(0, ${ci * 72})`}>
              <text x="0" y="0" fontSize="7.5" fontWeight="700">
                {cert.title.toUpperCase()}
              </text>
              <text x="0" y="10" fontSize="6" fill="#334155">
                {cert.body.slice(0, 70)}
              </text>
              <text x="0" y="18" fontSize="6" fill="#334155">
                {cert.body.slice(70, 140)}
              </text>
              {cert.signatures?.[0] && (
                <g transform="translate(0, 36)">
                  <line x1="0" y1="0" x2="140" y2="0" stroke={INK} strokeWidth="0.5"/>
                  <text x="0" y="8" fontSize="6" fill={MUTED}>
                    {cert.signatures[0]}
                  </text>
                </g>
              )}
            </g>
          ))}
        </g>

        {/* Structured Legend */}
        <g transform="translate(0, 410)">
          <line x1="0" y1="0" x2={STRIP.w - 20} y2="0" stroke={INK} strokeWidth="0.8"/>
          <text x="0" y="12" fontSize="8" fontWeight="700">SHEET LEGEND</text>

          <g transform="translate(0, 22)">
            <line x1="0" y1="0" x2="20" y2="0" stroke="#2563eb" strokeWidth="2"/>
            <text x="26" y="3" fontSize="7" fontWeight="600" fill={INK}>Property Boundary Line</text>
          </g>
          <g transform="translate(0, 34)">
            <rect x="0" y="-4" width="20" height="8" fill="#fca5a5" stroke="#dc2626" strokeWidth="1"/>
            <text x="26" y="3" fontSize="7" fill={INK}>Proposed Residence (56'x50')</text>
          </g>
          <g transform="translate(0, 46)">
            <rect x="0" y="-4" width="20" height="8" fill="#cbd5e1" stroke="#475569" strokeWidth="1"/>
            <text x="26" y="3" fontSize="7" fill={INK}>50' VDOT Public Road R.O.W.</text>
          </g>
          <g transform="translate(0, 58)">
            <line x1="0" y1="0" x2="20" y2="0" stroke="#d97706" strokeWidth="1" strokeDasharray="4 2"/>
            <text x="26" y="3" fontSize="7" fill={INK}>10' PU&amp;DE / 15' Sewer Easement</text>
          </g>
          <g transform="translate(0, 70)">
            <circle cx="10" cy="0" r="2.5" fill="#ffffff" stroke="#0f172a" strokeWidth="0.8"/>
            <circle cx="10" cy="0" r="0.8" fill="#0f172a"/>
            <text x="26" y="3" fontSize="7" fill={INK}>Concrete Monument (Set)</text>
          </g>
        </g>
      </g>
    </g>
  );
}

// --- sheet furniture -------------------------------------------------------

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={INK} stroke={INK}>
      <path d="M0 30 L0 4" strokeWidth={1.1} />
      <path d="M0 0 L5 12 L0 8 L-5 12 Z" strokeWidth={0.5} />
      <text
        x={0}
        y={42}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        stroke="none"
      >
        N
      </text>
    </g>
  );
}

function GraphicScale({
  x,
  y,
  scalePx,
  site,
}: {
  x: number;
  y: number;
  scalePx: number;
  site: Site;
}) {
  const u = unitLabel(site.spatial.units);
  const { nice, barPx, seg } = computeGraphicScaleBar(scalePx, site);
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <rect
          key={i}
          x={i * seg}
          y={0}
          width={seg}
          height={6}
          fill={i % 2 === 0 ? INK : SHEET}
          stroke={INK}
          strokeWidth={0.7}
        />
      ))}
      <text x={0} y={16} fontSize={7} textAnchor="middle" fill={INK}>
        0
      </text>
      <text
        x={barPx}
        y={16}
        fontSize={7}
        textAnchor="middle"
        fill={INK}
      >{`${nice.toLocaleString()} ${u}`}</text>
    </g>
  );
}

function CapabilitiesRow({
  caps,
}: {
  caps: ReturnType<typeof resolveCapabilities>;
}) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Enabled capabilities
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(caps).map(([k, on]) => (
          <Badge
            key={k}
            variant={on ? "default" : "outline"}
            className={on ? "" : "opacity-50"}
          >
            {k}
          </Badge>
        ))}
      </div>
    </div>
  );
}
