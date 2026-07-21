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
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * The alignment / stationing report: for each horizontal baseline, the tangent
 * runs and the curve table (PC/PT stations, R, L, T, Δ, degree of curve, E, M,
 * chord) — the survey record behind a civil plan sheet.
 */
export function AlignmentReportDialog() {
  const open = useUiStore((s) => s.alignmentOpen);
  const setOpen = useUiStore((s) => s.setAlignmentOpen);
  const site = useWorkspaceStore((s) => s.site);

  const alignments = site?.alignments ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {setSelectedId(alignments[0]?.id ?? null);}
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!site) {return null;}
  const selected = _.find(alignments, (a) => a.id === selectedId) ?? alignments[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Spline className="h-5 w-5 text-primary" /> Alignment &amp; Stationing
          </DialogTitle>
          <DialogDescription>
            Horizontal baselines with continuous stationing and curve data for {site.name}.
          </DialogDescription>
        </DialogHeader>

        {alignments.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No alignments yet. Draw one with the Alignment tool (I) — click each PI, then
            Enter — to generate stationing and curve data.
          </div>
        ) : (
          <div className="grid grid-cols-[180px_1fr] gap-4">
            <div className="flex flex-col gap-0.5">
              {_.map(alignments, (a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    a.id === (selected?.id ?? "")
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
            <ScrollArea className="max-h-[60vh] min-w-0 pr-3">
              {selected && <AlignmentReport alignment={selected} spatial={site.spatial} />}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AlignmentReport({
  alignment,
  spatial,
}: {
  alignment: HorizontalAlignment;
  spatial: SpatialContext;
}) {
  const r = React.useMemo<ResolvedAlignment | null>(() => resolveAlignment(alignment), [alignment]);
  const u = unitLabel(spatial.units);
  if (!r) {return <p className="text-sm text-muted-foreground">This baseline needs at least two PIs.</p>;}

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Begin station" value={formatStation(r.startStation)} />
        <Stat label="End station" value={formatStation(r.endStation)} />
        <Stat label={`Length (${u})`} value={r.length.toFixed(2)} />
        <Stat label="Curves" value={String(r.curves.length)} />
      </div>

      <Section title="Alignment (station to station)">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
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
                <tr key={i} className="border-b border-border/50">
                  <Td>Tangent</Td>
                  <Td>{formatStation(el.beginStation)}</Td>
                  <Td>{formatStation(el.endStation)}</Td>
                  <Td className="text-right tabular-nums">{el.length.toFixed(2)}</Td>
                  <Td>{bearingText(el.from, el.to)}</Td>
                </tr>
              ) : (
                <tr key={i} className="border-b border-border/50">
                  <Td>Curve {curveLabel(r, el.curve.piIndex)}</Td>
                  <Td>{formatStation(el.beginStation)}</Td>
                  <Td>{formatStation(el.endStation)}</Td>
                  <Td className="text-right tabular-nums">{el.curve.length.toFixed(2)}</Td>
                  <Td className="capitalize">
                    {el.curve.direction} · R={el.curve.radius.toFixed(1)} {u}
                  </Td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </Section>

      {r.curves.length > 0 && (
        <Section title="Curve Data">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
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
                  <tr key={i} className="border-b border-border/50">
                    <Td>{curveLabel(r, c.piIndex)}</Td>
                    <Td>{formatStation(c.pcStation)}</Td>
                    <Td>{formatStation(c.piStation)}</Td>
                    <Td>{formatStation(c.ptStation)}</Td>
                    <Td className="text-right tabular-nums">{c.radius.toFixed(2)}</Td>
                    <Td className="text-right tabular-nums">{c.length.toFixed(2)}</Td>
                    <Td className="text-right tabular-nums">{c.tangent.toFixed(2)}</Td>
                    <Td className="text-right tabular-nums">{c.deltaDeg.toFixed(3)}°</Td>
                    <Td className="text-right tabular-nums">{c.degreeOfCurve.toFixed(3)}°</Td>
                    <Td className="text-right tabular-nums">{c.external.toFixed(2)}</Td>
                    <Td className="text-right tabular-nums">{c.middleOrdinate.toFixed(2)}</Td>
                    <Td className="uppercase">{c.direction[0]}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            R = radius, L = arc length, T = tangent, Δ = central angle, Dc = degree of
            curve (arc definition), E = external, M = middle ordinate. Stations are
            continuous through each curve (PT − PC = L).
          </p>
        </Section>
      )}
    </div>
  );
}

/** Curve label C1, C2… in traversal order. */
function curveLabel(r: ResolvedAlignment, piIndex: number): string {
  const n = _.findIndex(r.curves, (c) => c.piIndex === piIndex);
  return `C${n + 1}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("py-1.5 pr-2 font-medium", className)}>{children}</th>;
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("py-1 pr-2", className)}>{children}</td>;
}
