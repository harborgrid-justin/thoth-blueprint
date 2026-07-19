import {
  formatPLSS,
  monumentDefinition,
  type MonumentType,
  type Site,
} from "@thoth/domain";
import { MonumentSymbol } from "./MonumentLayer";

/**
 * A plat-style survey legend: the Township/Range reference and the monument
 * symbology actually present in the plan (set = filled, found = open).
 */
export function SurveyLegend({ site }: { site: Site }) {
  const monuments = site.monuments ?? [];
  const plss = site.plss;
  if (monuments.length === 0 && !plss) return null;

  const types: MonumentType[] = [];
  for (const m of monuments) if (!types.includes(m.type)) types.push(m.type);

  return (
    <div className="absolute left-3 top-3 max-w-[15rem] rounded-md border border-border bg-card/90 px-2.5 py-2 shadow-md backdrop-blur">
      {plss && (
        <div className="mb-1.5 border-b border-border pb-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Survey framework
          </div>
          <div className="text-xs text-foreground">{formatPLSS(plss.townshipRange, plss.section)}</div>
        </div>
      )}
      {types.length > 0 && (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Monuments
          </div>
          <ul className="mt-1 flex flex-col gap-1">
            {types.map((t) => {
              const def = monumentDefinition(t);
              return (
                <li key={t} className="flex items-center gap-2 text-xs">
                  <svg width={16} height={16} viewBox="-8 -8 16 16" className="shrink-0">
                    <MonumentSymbol type={t} filled />
                  </svg>
                  <span className="text-foreground">
                    <span className="font-medium">{def.abbrev}</span>
                    <span className="text-muted-foreground"> · {def.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
            Filled = set · open = found
          </p>
        </>
      )}
    </div>
  );
}
