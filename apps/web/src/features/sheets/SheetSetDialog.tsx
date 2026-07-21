import * as React from "react";
import { FileDown, Files, Layers, Loader2 } from "lucide-react";
import {
  disciplineName,
  formatSheetNumber,
  getRegionPlugin,
  listSheetSizes,
  resolveCapabilities,
  sheetTypeName,
  sortSheets,
  US_PLSS_DEFAULT,
  type Orientation,
  type Sheet,
  type SheetSizeId,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ensureDrawingSet } from "./defaultSet";
import { buildSheetPrimitives, sheetLayout } from "./builders";
import { SvgSheet } from "./SvgSheet";
import { container } from "@/lib/di";

/**
 * The multi-sheet CAD drawing-set composer: a sheet navigator, a live vector
 * preview of the selected sheet (built from the shared primitive scene), and
 * export to a multi-page vector PDF or a single-sheet SVG.
 */
export function SheetSetDialog() {
  const open = useUiStore((s) => s.sheetSetOpen);
  const setOpen = useUiStore((s) => s.setSheetSetOpen);
  const site = useWorkspaceStore((s) => s.site);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sizeOverride, setSizeOverride] = React.useState<SheetSizeId | "">("");
  const [orientOverride, setOrientOverride] = React.useState<Orientation | "">(
    "",
  );
  const [busy, setBusy] = React.useState(false);

  const plugin = site
    ? (getRegionPlugin(site.jurisdictionId) ?? US_PLSS_DEFAULT)
    : US_PLSS_DEFAULT;
  const caps = resolveCapabilities(plugin);

  const baseSet = React.useMemo(
    () => (site ? ensureDrawingSet(site, plugin) : null),
    [site, plugin],
  );
  const set = React.useMemo(() => {
    if (!baseSet) {
      return null;
    }
    if (!sizeOverride && !orientOverride) {
      return baseSet;
    }
    return {
      ...baseSet,
      sheets: baseSet.sheets.map((s) => ({
        ...s,
        size: (sizeOverride || s.size) as SheetSizeId,
        orientation: (orientOverride || s.orientation) as Orientation,
      })),
    };
  }, [baseSet, sizeOverride, orientOverride]);

  const sheets = React.useMemo(() => (set ? sortSheets(set) : []), [set]);
  const selected: Sheet | null = React.useMemo(() => {
    if (!sheets.length) {
      return null;
    }
    return sheets.find((s) => s.id === selectedId) ?? sheets[0];
  }, [sheets, selectedId]);

  if (!site || !set || !selected) {
    return null;
  }

  const unit = plugin.sheetStandards?.unit ?? "in";
  const layout = sheetLayout(selected, unit);
  const prims = buildSheetPrimitives(set, selected, site, plugin);

  function exportSvg() {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const src = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${src}`], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formatSheetNumber(selected!.number)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!set || !site) {
      return;
    }
    setBusy(true);
    try {
      const pdfService =
        await container.get<typeof import("./pdfExport")>("pdfExport");
      await pdfService.exportDrawingSetPdf(
        set,
        site,
        `${site.name.replace(/\s+/g, "-").toLowerCase()}-drawings.pdf`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Files className="h-5 w-5 text-primary" /> CAD Drawing Set Composer
          </DialogTitle>
          <DialogDescription>
            {set.name} — {sheets.length} sheets · {plugin.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Size
              <select
                className="rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                value={sizeOverride}
                onChange={(e) =>
                  setSizeOverride(e.target.value as SheetSizeId | "")
                }
              >
                <option value="">Per sheet</option>
                {listSheetSizes().map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-muted-foreground">
              Orientation
              <select
                className="rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                value={orientOverride}
                onChange={(e) =>
                  setOrientOverride(e.target.value as Orientation | "")
                }
              >
                <option value="">Per sheet</option>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportSvg}>
              <FileDown className="h-4 w-4" /> Sheet (SVG)
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" /> Set (PDF)
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Sheet navigator */}
          <ScrollArea className="h-[62vh] w-52 shrink-0 rounded-md border border-border">
            <ul className="p-1.5">
              {sheets.map((s) => {
                const active = s.id === selected.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                    >
                      <div className="font-mono font-semibold text-foreground">
                        {formatSheetNumber(s.number)}
                      </div>
                      <div className="truncate">{s.title}</div>
                      <div className="text-[10px] opacity-70">
                        {disciplineName(s.number.discipline)} ·{" "}
                        {sheetTypeName(s.number.type)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>

          {/* Preview */}
          <div className="min-w-0 flex-1">
            <ScrollArea className="h-[62vh] rounded-md border border-border bg-muted/30 p-3">
              <div
                className="mx-auto max-w-full overflow-x-auto shadow-md"
                style={{ maxWidth: layout.wPt }}
              >
                <SvgSheet
                  ref={svgRef}
                  prims={prims}
                  wPt={layout.wPt}
                  hPt={layout.hPt}
                />
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Object.entries(caps)
            .filter(([, on]) => on)
            .slice(0, 16)
            .map(([k]) => (
              <Badge key={k} variant="outline" className="text-[10px]">
                {k}
              </Badge>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
