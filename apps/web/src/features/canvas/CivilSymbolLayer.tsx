import type { CivilSymbol, CivilSymbolType, Point, Site } from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";

const INK = "hsl(var(--foreground))";
const HALO = "hsl(var(--canvas))";

/**
 * A civil / erosion-control point symbol drawn at the origin (callers translate
 * to the screen point). Follows common plan-sheet conventions: box-X inlet
 * protection, triangle ditch checks, circle culverts, bale barriers, etc.
 */
export function CivilSymbolGlyph({ type, subtype }: { type: CivilSymbolType; subtype?: string }) {
  switch (type) {
    case "inlet-protection":
      return (
        <g>
          <rect x={-6} y={-6} width={12} height={12} fill={HALO} stroke={INK} strokeWidth={1.3} />
          <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke={INK} strokeWidth={1.1} />
          {subtype && (
            <text x={10} y={4} fontSize={9} fontWeight={700} fill={INK} style={{ paintOrder: "stroke", stroke: HALO, strokeWidth: 2.5 }}>
              {subtype}
            </text>
          )}
        </g>
      );
    case "ditch-check":
      return (
        <g fill="none" stroke={INK} strokeWidth={1.1}>
          <path d="M-8 3 L-5 -3 L-2 3" />
          <path d="M-2 3 L1 -3 L4 3" />
          <path d="M4 3 L7 -3 L10 3" />
        </g>
      );
    case "culvert":
      return (
        <g fill="none" stroke={INK} strokeWidth={1.1}>
          <circle cx={-6} cy={0} r={2.4} />
          <circle cx={0} cy={0} r={2.4} />
          <circle cx={6} cy={0} r={2.4} />
        </g>
      );
    case "erosion-bale":
      return (
        <g fill={HALO} stroke={INK} strokeWidth={1.1}>
          <rect x={-8} y={-2.5} width={7} height={5} />
          <rect x={1} y={-2.5} width={7} height={5} />
        </g>
      );
    case "riprap":
      return (
        <g fill={INK} opacity={0.7}>
          {[[-6, -3], [0, -4], [5, -2], [-3, 3], [4, 3], [-7, 1]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.5} />
          ))}
        </g>
      );
    case "sign":
      return (
        <g stroke={INK} strokeWidth={1.1}>
          <line x1={0} y1={6} x2={0} y2={-2} />
          <rect x={-4} y={-8} width={8} height={6} fill={HALO} />
        </g>
      );
    case "flow-arrow":
      return <path d="M-8 0 L5 0 M5 0 L1 -3 M5 0 L1 3" fill="none" stroke="#0ea5e9" strokeWidth={1.3} />;
    default:
      return <circle r={3} fill={HALO} stroke={INK} strokeWidth={1.2} />;
  }
}

/** Renders the site's placed civil/erosion-control symbols. */
export function CivilSymbolLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const symbols = site.civilSymbols;
  if (!symbols || symbols.length === 0) {return null;}
  const project = (p: Point) => worldToScreen(p, viewport);
  return (
    <g className="pointer-events-none">
      {symbols.map((sym: CivilSymbol) => {
        const s = project(sym.position);
        return (
          <g key={sym.id} transform={`translate(${s.x} ${s.y}) rotate(${sym.rotation ?? 0})`}>
            <CivilSymbolGlyph type={sym.type} subtype={sym.subtype} />
          </g>
        );
      })}
    </g>
  );
}
