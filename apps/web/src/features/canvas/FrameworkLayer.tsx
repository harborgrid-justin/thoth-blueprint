import {
  formatLandLotShort,
  formatPLSSShort,
  getRegionPlugin,
  landLotSide,
  METERS_PER_UNIT,
  sectionFrame,
  type SectionFrame,
  type Site,
} from "@thoth/domain";
import { worldToScreen, type Viewport } from "./helpers/viewport";

const INK = "hsl(var(--muted-foreground))";

export function FrameworkLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const framework = getRegionPlugin(site.jurisdictionId)?.surveyFramework;

  if (framework === "georgia-land-lot" && site.landLot?.nwCorner) {
    const acres = site.landLot.ref.acres ?? 202.5;
    const side = (landLotSide(acres) * 0.3048) / METERS_PER_UNIT[site.spatial.units];
    return (
      <FrameworkSquare
        frame={sectionFrame(site.landLot.nwCorner, side)}
        label={formatLandLotShort(site.landLot.ref)}
        viewport={viewport}
      />
    );
  }

  if (framework !== "georgia-land-lot" && site.plss?.sectionNwCorner && site.plss.sectionSide) {
    return (
      <FrameworkSquare
        frame={sectionFrame(site.plss.sectionNwCorner, site.plss.sectionSide)}
        label={formatPLSSShort(site.plss.townshipRange, site.plss.section)}
        viewport={viewport}
      />
    );
  }

  return null;
}

function FrameworkSquare({
  frame: f,
  label,
  viewport,
}: {
  frame: SectionFrame;
  label: string;
  viewport: Viewport;
}) {
  const p = (pt: { x: number; y: number }) => worldToScreen(pt, viewport);
  const [nw, ne, sw, se] = [p(f.nw), p(f.ne), p(f.sw), p(f.se)];

  return (
    <g className="pointer-events-none">
      <polygon
        points={[nw, ne, se, sw].map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke={INK}
        strokeWidth={1.6}
        strokeDasharray="18 4 4 4"
        vectorEffect="non-scaling-stroke"
      />
      <line x1={p(f.north).x} y1={p(f.north).y} x2={p(f.south).x} y2={p(f.south).y} stroke={INK} strokeWidth={0.8} strokeDasharray="10 6" />
      <line x1={p(f.west).x} y1={p(f.west).y} x2={p(f.east).x} y2={p(f.east).y} stroke={INK} strokeWidth={0.8} strokeDasharray="10 6" />
      {[f.nw, f.ne, f.sw, f.se].map((c, i) => {
        const s = p(c);
        return <rect key={i} x={s.x - 3} y={s.y - 3} width={6} height={6} fill={INK} />;
      })}
      {viewport.zoom > 0.35 && (
        <text
          x={p(f.center).x}
          y={p(f.center).y - 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={INK}
          style={{ paintOrder: "stroke", stroke: "hsl(var(--canvas))", strokeWidth: 3 }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
