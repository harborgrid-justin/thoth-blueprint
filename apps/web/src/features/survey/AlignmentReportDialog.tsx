import * as React from "react";
import _ from "lodash";
import { Spline } from "lucide-react";
import {
  bearingText,
  formatStation,
  resolveAlignment,
  unitLabel,
  type HorizontalAlignment,
  type ResolvedAlignment,
  type SpatialContext,
} from "@thoth/domain";
import { cn } from "@/lib/utils";
import { DialogShell } from "@/components/layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlignmentReportState } from "./hooks/useAlignmentReportState";
import { curveLabel } from "./helpers/alignmentReportHelpers";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

/**
 * The alignment / stationing report: for each horizontal baseline, the tangent
 * runs and the curve table (PC/PT stations, R, L, T, Δ, degree of curve, E, M,
 * chord) — the survey record behind a civil plan sheet.
 */
export function AlignmentReportDialog() {
  const {
    open,
    setOpen,
    site,
    alignments,
    selected,
    selectAlignment,
    hoverAlignment,
  } = useAlignmentReportState();

  if (!site) {
    return null;
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={setOpen}
      title="Alignment & Stationing"
      description={`Horizontal baselines with continuous stationing and curve data for ${site.name}.`}
      icon={<Spline className="h-5 w-5 text-amber-400" />}
      maxWidthClass="max-w-4xl"
    >
      {alignments.length === 0 ? (
        <div className={SURVEY_STYLES.cardSubtle + " py-16 text-center text-sm text-muted-foreground"}>
          No alignments yet. Draw one with the Alignment tool (I) — click each
          PI, then Enter — to generate stationing and curve data.
        </div>
      ) : (
        <div className={SURVEY_STYLES.layoutSidebarSm}>
          <div className="flex flex-col gap-0.5">
            {_.map(alignments, (a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => selectAlignment(a.id)}
                onMouseEnter={() => hoverAlignment(a.id)}
                onMouseLeave={() => hoverAlignment(null)}
                className={cn(
                  "truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  a.id === (selected?.id ?? "")
                    ? "border border-amber-500/30 bg-amber-500/20 font-medium text-amber-300"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {a.name}
              </button>
            ))}
          </div>
          <ScrollArea className="max-h-[60vh] min-w-0 pr-3">
            {selected && (
              <AlignmentReport alignment={selected} spatial={site.spatial} />
            )}
          </ScrollArea>
        </div>
      )}
    </DialogShell>
  );
}

function AlignmentReport({
  alignment,
  spatial,
}: {
  alignment: HorizontalAlignment;
  spatial: SpatialContext;
}) {
  const r = React.useMemo<ResolvedAlignment | null>(
    () => resolveAlignment(alignment),
    [alignment],
  );
  const u = unitLabel(spatial.units);
  if (!r) {
    return (
      <p className={SURVEY_STYLES.textMuted}>
        This baseline needs at least two PIs.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={SURVEY_STYLES.grid4Col}>
        <Stat label="Begin station" value={formatStation(r.startStation)} />
        <Stat label="End station" value={formatStation(r.endStation)} />
        <Stat label={`Length (${u})`} value={r.length.toFixed(2)} />
        <Stat label="Curves" value={String(r.curves.length)} />
      </div>

      <Section title="Alignment (station to station)">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <Th>Element</Th>
              <Th>Begin</Th>
              <Th>End</Th>
              <Th className="text-right">Length ({u})</Th>
              <Th>Bearing / Curve</Th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {_.map(r.elements, (el, i) =>
              el.kind === "tangent" ? (
                <tr key={i} className={SURVEY_STYLES.tableRow}>
                  <Td>Tangent</Td>
                  <Td>{formatStation(el.beginStation)}</Td>
                  <Td>{formatStation(el.endStation)}</Td>
                  <Td className="text-right tabular-nums">
                    {el.length.toFixed(2)}
                  </Td>
                  <Td>{bearingText(el.from, el.to)}</Td>
                </tr>
              ) : el.kind === "curve" ? (
                <tr key={i} className={SURVEY_STYLES.tableRow}>
                  <Td>Curve {curveLabel(r, el.curve.piIndex)}</Td>
                  <Td>{formatStation(el.beginStation)}</Td>
                  <Td>{formatStation(el.endStation)}</Td>
                  <Td className="text-right tabular-nums">
                    {el.curve.length.toFixed(2)}
                  </Td>
                  <Td className="capitalize">
                    {el.curve.direction} · R={el.curve.radius.toFixed(1)} {u}
                  </Td>
                </tr>
              ) : null,

            )}
          </tbody>
        </table>
      </Section>

      {r.curves.length > 0 && (
        <Section title="Curve Data">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr>
                  <Th>Curve</Th>
                  <Th>PC sta</Th>
                  <Th>PI sta</Th>
                  <Th>PT sta</Th>
                  <Th className="text-right">R ({u})</Th>
                  <Th className="text-right">L ({u})</Th>
                  <Th className="text-right">T ({u})</Th>
                  <Th className="text-right">Δ</Th>
                  <Th className="text-right">Dc</Th>
                  <Th className="text-right">E ({u})</Th>
                  <Th className="text-right">M ({u})</Th>
                  <Th>Dir</Th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {_.map(r.curves, (c, i) => (
                  <tr key={i} className={SURVEY_STYLES.tableRow}>
                    <Td>{curveLabel(r, c.piIndex)}</Td>
                    <Td>{formatStation(c.pcStation)}</Td>
                    <Td>{formatStation(c.piStation)}</Td>
                    <Td>{formatStation(c.ptStation)}</Td>
                    <Td className="text-right tabular-nums">
                      {c.radius.toFixed(2)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {c.length.toFixed(2)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {c.tangent.toFixed(2)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {c.deltaDeg.toFixed(3)}°
                    </Td>
                    <Td className="text-right tabular-nums">
                      {c.degreeOfCurve.toFixed(3)}°
                    </Td>
                    <Td className="text-right tabular-nums">
                      {c.external.toFixed(2)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {c.middleOrdinate.toFixed(2)}
                    </Td>
                    <Td className="uppercase">{c.direction[0]}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={SURVEY_STYLES.textMuted + " mt-1.5 text-[11px] leading-relaxed"}>
            R = radius, L = arc length, T = tangent, Δ = central angle, Dc =
            degree of curve (arc definition), E = external, M = middle ordinate.
            Stations are continuous through each curve (PT − PC = L).
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className={SURVEY_STYLES.label + " mb-1.5"}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={SURVEY_STYLES.cardSubtle + " px-2.5 py-1.5"}>
      <div className={SURVEY_STYLES.statLabel}>
        {label}
      </div>
      <div className={SURVEY_STYLES.statValue + " text-base font-mono"}>
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn(SURVEY_STYLES.tableTh, className)}>{children}</th>
  );
}

function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={cn(SURVEY_STYLES.tableTd, className)}>{children}</td>;
}
