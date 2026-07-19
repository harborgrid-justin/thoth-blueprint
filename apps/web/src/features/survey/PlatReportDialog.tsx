import * as React from "react";
import { Check, Copy, Download, Ruler } from "lucide-react";
import {
  isSpatialElement,
  legalDescription,
  surveyReport,
  unitLabel,
  type SpatialContext,
  type SpatialElement,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { elementMeta } from "@/lib/elementMeta";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PlatDrawing } from "./PlatDrawing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * The plat / survey report: the full metes-and-bounds record a surveyor needs
 * for each tract — line table (bearing + distance), corner coordinates,
 * traverse closure/precision, area, and a generated legal description.
 */
export function PlatReportDialog() {
  const platOpen = useUiStore((s) => s.platOpen);
  const platTargetId = useUiStore((s) => s.platTargetId);
  const closePlat = useUiStore((s) => s.closePlat);
  const site = useWorkspaceStore((s) => s.site);

  const surveyable = React.useMemo<SpatialElement[]>(
    () => (site ? (site.elements.filter(isSpatialElement) as SpatialElement[]) : []),
    [site],
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!platOpen) return;
    const preferred =
      (platTargetId && surveyable.find((e) => e.id === platTargetId)?.id) ??
      surveyable.find((e) => e.kind === "lot")?.id ??
      surveyable[0]?.id ??
      null;
    setSelectedId(preferred);
  }, [platOpen, platTargetId, surveyable]);

  if (!site) return null;
  const selected = surveyable.find((e) => e.id === selectedId) ?? null;

  return (
    <Dialog open={platOpen} onOpenChange={(o) => !o && closePlat()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" /> Plat &amp; Survey Report
          </DialogTitle>
          <DialogDescription>
            Metes-and-bounds courses, corner coordinates, closure, and the legal description for each
            tract in {site.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[180px_1fr] gap-4">
          <TractList
            elements={surveyable}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <ScrollArea className="max-h-[60vh] min-w-0 pr-3">
            {selected ? (
              <TractReport element={selected} spatial={site.spatial} siteName={site.name} />
            ) : (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No surveyable tracts yet. Draw a parcel or lot to generate a plat.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TractList({
  elements,
  selectedId,
  onSelect,
}: {
  elements: SpatialElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  // Group by kind so parcels/lots read like a plat index.
  const groups = new Map<string, SpatialElement[]>();
  for (const el of elements) {
    const list = groups.get(el.kind) ?? [];
    list.push(el);
    groups.set(el.kind, list);
  }

  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="flex flex-col gap-3 pr-2">
        {[...groups.entries()].map(([kind, list]) => (
          <div key={kind}>
            <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {elementMeta(kind as SpatialElement["kind"]).label}
            </div>
            <div className="flex flex-col gap-0.5">
              {list.map((el) => (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => onSelect(el.id)}
                  className={cn(
                    "truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    el.id === selectedId
                      ? "bg-primary/15 text-primary"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  {el.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function TractReport({
  element,
  spatial,
  siteName,
}: {
  element: SpatialElement;
  spatial: SpatialContext;
  siteName: string;
}) {
  const report = React.useMemo(() => surveyReport(element.boundary, spatial), [element, spatial]);
  const legal = React.useMemo(
    () => legalDescription(element.boundary, spatial, { tractName: element.name, context: siteName }),
    [element, spatial, siteName],
  );
  const u = unitLabel(spatial.units);

  function exportCsv() {
    const rows = [
      ["Course", "From", "To", "Bearing", `Distance (${u})`, `Latitude (${u})`, `Departure (${u})`],
      ...report.courses.map((c) => [
        String(c.index),
        c.fromLabel,
        c.toLabel,
        c.bearingText,
        c.distance.toFixed(2),
        c.latitude.toFixed(2),
        c.departure.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    downloadText(`${slug(element.name)}-courses.csv`, csv);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{element.name}</h3>
          <Badge variant="outline" className="mt-1 capitalize">
            {elementMeta(element.kind).label}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Courses CSV
        </Button>
      </div>

      <PlatDrawing element={element} spatial={spatial} report={report} siteName={siteName} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={`Area (${u}²)`} value={formatNumber(report.area.squareUnits, 0)} />
        <Stat label="Area (acres)" value={report.area.acres.toFixed(3)} />
        <Stat label={`Perimeter (${u})`} value={formatNumber(report.perimeter, 2)} />
        <Stat label="Record closure" value={report.record.precisionText} />
      </div>

      <Section title="Line Table (metes & bounds)">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <Th>Course</Th>
              <Th>Bearing</Th>
              <Th className="text-right">Distance ({u})</Th>
              <Th className="text-right">Latitude</Th>
              <Th className="text-right">Departure</Th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {report.courses.map((c) => (
              <tr key={c.index} className="border-b border-border/50">
                <Td>
                  L{c.index} · {c.fromLabel}–{c.toLabel}
                </Td>
                <Td>{c.bearingText}</Td>
                <Td className="text-right tabular-nums">{c.distance.toFixed(2)}</Td>
                <Td className="text-right tabular-nums">{signed(c.latitude)}</Td>
                <Td className="text-right tabular-nums">{signed(c.departure)}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border text-muted-foreground">
              <Td className="font-medium">Σ misclosure</Td>
              <Td />
              <Td className="text-right tabular-nums">{report.record.perimeter.toFixed(2)}</Td>
              <Td className="text-right tabular-nums">{signed(report.record.latitudeError, 4)}</Td>
              <Td className="text-right tabular-nums">{signed(report.record.departureError, 4)}</Td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Straight courses only (no curves). Latitudes/departures are from the
          recorded bearings &amp; distances; linear misclosure{" "}
          {report.record.linearMisclosure < 1e-6
            ? "is zero"
            : `= ${report.record.linearMisclosure.toFixed(4)} ${u}`}
          , precision {report.record.precisionText}. Coordinate geometry closes{" "}
          {report.closure.precisionText.toLowerCase()}.
        </p>
      </Section>

      <Section title="Interior Angles">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <Th>Corner</Th>
              <Th className="text-right">Interior angle</Th>
              <Th className="text-right">Decimal</Th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {report.angles.map((a) => (
              <tr key={a.label} className="border-b border-border/50">
                <Td>{a.label}</Td>
                <Td className="text-right tabular-nums">{dmsText(a.dms)}</Td>
                <Td className="text-right tabular-nums">{a.interior.toFixed(4)}°</Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border text-muted-foreground">
              <Td className="font-medium">Σ</Td>
              <Td className="text-right tabular-nums">{report.anglesSum.toFixed(2)}°</Td>
              <Td className="text-right tabular-nums">= {report.anglesExpected}°</Td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Interior angles sum to (n − 2) × 180° = {report.anglesExpected}° for {report.angles.length}{" "}
          corners — a geometric check on the traverse.
        </p>
      </Section>

      <Section title="Corner Coordinates (assumed local datum)">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <Th>Corner</Th>
              <Th className="text-right">Northing</Th>
              <Th className="text-right">Easting</Th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {report.coordinates.map((c) => (
              <tr key={c.label} className="border-b border-border/50">
                <Td>{c.label}</Td>
                <Td className="text-right tabular-nums">{c.northing.toFixed(2)}</Td>
                <Td className="text-right tabular-nums">{c.easting.toFixed(2)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section
        title="Legal Description"
        action={<CopyButton text={legal} />}
      >
        <pre className="whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-foreground">
          {legal}
        </pre>
      </Section>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable
        }
      }}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
        {action}
      </div>
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

/** Format a signed latitude/departure with an explicit +/− and no negative zero. */
function signed(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits));
  const s = Math.abs(rounded).toFixed(digits);
  return rounded < 0 ? `−${s}` : `+${s}`;
}

/** Format an interior angle DMS record as e.g. 90°00′00″. */
function dmsText(a: { degrees: number; minutes: number; seconds: number }): string {
  const d = String(Math.abs(a.degrees));
  const m = String(a.minutes).padStart(2, "0");
  const sec = String(a.seconds).padStart(2, "0");
  return `${d}°${m}′${sec}″`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tract";
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
