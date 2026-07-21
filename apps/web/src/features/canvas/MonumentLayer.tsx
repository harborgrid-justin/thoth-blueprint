import {
  monumentLabel,
  type MonumentType,
  type SurveyMonument,
  type Site,
} from "@thoth/domain";
import { worldToScreen, type Viewport } from "./helpers/viewport";

const INK = "hsl(var(--foreground))";
const HALO = "hsl(var(--canvas))";

export function MonumentSymbol({
  type,
  filled,
}: {
  type: MonumentType;
  filled: boolean;
}) {
  const fill = filled ? INK : HALO;
  const common = { stroke: INK, strokeWidth: 1.3, fill } as const;
  switch (type) {
    case "prm":
    case "concrete":
      return <rect x={-4} y={-4} width={8} height={8} {...common} />;
    case "section-corner":
      return (
        <g>
          <rect x={-5.5} y={-5.5} width={11} height={11} fill="none" stroke={INK} strokeWidth={1.6} />
          <circle cx={0} cy={0} r={1.6} fill={INK} />
        </g>
      );
    case "quarter-corner":
      return <rect x={-4.5} y={-4.5} width={9} height={9} transform="rotate(45)" {...common} />;
    case "pcp":
    case "nail-disc":
      return (
        <g>
          <circle cx={0} cy={0} r={4} {...common} />
          <path d="M-4 0 H4 M0 -4 V4" stroke={INK} strokeWidth={1} />
        </g>
      );
    case "iron-rod":
    case "rebar-cap":
      return (
        <g>
          <circle cx={0} cy={0} r={4} fill={fill} stroke={INK} strokeWidth={1.3} />
          <path d="M-3 0 H3 M0 -3 V3" stroke={INK} strokeWidth={1} />
        </g>
      );
    case "iron-pipe":
      return <circle cx={0} cy={0} r={4} fill="none" stroke={INK} strokeWidth={1.6} />;
    case "benchmark":
      return <path d="M0 -5 L5 4 L-5 4 Z" {...common} />;
    default:
      return <circle cx={0} cy={0} r={3.5} {...common} />;
  }
}

export function MonumentLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const monuments = site.monuments;
  if (!monuments || monuments.length === 0) {return null;}

  return (
    <g className="pointer-events-none">
      {monuments.map((m: SurveyMonument) => {
        const s = worldToScreen(m.position, viewport);
        const showLabel = viewport.zoom > 0.8;
        return (
          <g key={m.id} transform={`translate(${s.x} ${s.y})`}>
            <MonumentSymbol type={m.type} filled={m.status === "set"} />
            {showLabel && (m.label || viewport.zoom > 2) && (
              <text
                x={8}
                y={3.5}
                fontSize={8.5}
                fill={INK}
                style={{ paintOrder: "stroke", stroke: HALO, strokeWidth: 2.5 }}
              >
                {m.label ?? monumentLabel(m)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
