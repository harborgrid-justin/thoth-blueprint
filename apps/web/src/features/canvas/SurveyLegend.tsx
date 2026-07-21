import type { ReactNode } from "react";
import {
  civilSymbolDefinition,
  controlLineDefinition,
  formatLandLot,
  formatPLSS,
  getRegionPlugin,
  monumentDefinition,
  type CivilSymbolType,
  type ControlLineType,
  type MonumentType,
  type Site,
} from "@thoth/domain";
import { MonumentSymbol } from "./MonumentLayer";
import { ControlLineShape } from "./CivilLayer";
import { CivilSymbolGlyph } from "./CivilSymbolLayer";
import { uniq } from "./helpers/canvasHelpers";

/**
 * A plat-style survey/civil legend: the active jurisdiction's framework
 * reference, the monument symbology (set = filled, open = found), and the
 * erosion-control line-types and point symbols present in the plan.
 */
export function SurveyLegend({ site }: { site: Site }) {
  const monuments = site.monuments ?? [];
  const plugin = getRegionPlugin(site.jurisdictionId);
  const usingLandLot =
    plugin?.surveyFramework === "georgia-land-lot" && !!site.landLot;
  const frameworkRef = usingLandLot
    ? formatLandLot(site.landLot!.ref)
    : site.plss
      ? formatPLSS(site.plss.townshipRange, site.plss.section)
      : null;

  const monTypes = uniq(monuments.map((m) => m.type));
  const lineTypes = uniq((site.controlLines ?? []).map((l) => l.type));
  const symTypes = uniq((site.civilSymbols ?? []).map((s) => s.type));
  if (
    !monuments.length &&
    !lineTypes.length &&
    !symTypes.length &&
    !frameworkRef &&
    !plugin
  ) {
    return null;
  }

  return (
    <div className="absolute left-4 top-4 z-10 flex max-h-[80vh] w-64 select-none flex-col overflow-y-auto rounded-xl border border-border/60 bg-card/85 p-3 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-card/95">
      {(frameworkRef || plugin) && (
        <div className="mb-2.5 border-b border-border/60 pb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {plugin ? plugin.name : "Survey Framework"}
          </div>
          {frameworkRef && (
            <div className="mt-0.5 text-xs font-semibold text-foreground">
              {frameworkRef}
            </div>
          )}
        </div>
      )}

      {monTypes.length > 0 && (
        <Section title="Monuments" note="Filled = set · open = found">
          {monTypes.map((t: MonumentType) => (
            <Row
              key={t}
              label={monumentDefinition(t).abbrev}
              desc={monumentDefinition(t).label}
            >
              <svg
                width={16}
                height={16}
                viewBox="-8 -8 16 16"
                className="shrink-0"
              >
                <MonumentSymbol type={t} filled />
              </svg>
            </Row>
          ))}
        </Section>
      )}

      {(lineTypes.length > 0 || symTypes.length > 0) && (
        <Section title="Erosion Control">
          {lineTypes.map((t: ControlLineType) => (
            <Row key={t} label="" desc={controlLineDefinition(t).label}>
              <svg
                width={22}
                height={12}
                viewBox="0 0 22 12"
                className="shrink-0"
              >
                <ControlLineShape
                  line={{
                    id: t,
                    type: t,
                    path: [
                      { x: 0, y: 0 },
                      { x: 1, y: 0 },
                    ],
                  }}
                  project={(p) => ({ x: 2 + p.x * 18, y: 6 })}
                />
              </svg>
            </Row>
          ))}
          {symTypes.map((t: CivilSymbolType) => (
            <Row key={t} label="" desc={civilSymbolDefinition(t).label}>
              <svg
                width={20}
                height={16}
                viewBox="-10 -8 20 16"
                className="shrink-0"
              >
                <CivilSymbolGlyph type={t} />
              </svg>
            </Row>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-2.5 first:mt-0 border-t border-border/40 pt-2.5 first:border-0 first:pt-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="mt-1.5 flex flex-col gap-1">{children}</ul>
      {note && (
        <p className="mt-1.5 text-[10px] italic text-muted-foreground/80">
          {note}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-xs transition-colors hover:bg-accent/50">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/60">
        {children}
      </div>
      <span className="truncate text-foreground">
        {label && (
          <span className="font-semibold text-primary">{label} · </span>
        )}
        <span className="text-muted-foreground">{desc}</span>
      </span>
    </li>
  );
}
