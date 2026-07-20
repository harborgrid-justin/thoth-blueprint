import * as React from "react";
import {
  Copy,
  FileDown,
  Files,
  FolderPlus,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  addSheet,
  addSubset,
  applyPageSetup,
  assignSubset,
  customPropertiesOf,
  deleteNamedSelection,
  disciplineName,
  DISCIPLINE_ORDER,
  DRAWING_SCALES,
  duplicateSheet,
  formatSheetNumber,
  getRegionPlugin,
  groupByDiscipline,
  listSheetSizes,
  namedSelectionsOf,
  pageSetupsOf,
  removeCustomProperty,
  removePageSetup,
  removeSheet,
  renameRenumberSheet,
  reorderSheet,
  resolveCapabilities,
  saveNamedSelection,
  setSheetCustomValue,
  SHEET_TYPES,
  sortSheets,
  subsetsOf,
  upsertCustomProperty,
  upsertPageSetup,
  US_PLSS_DEFAULT,
  type CustomPropertyOwner,
  type DisciplineCode,
  type DrawingSet,
  type Orientation,
  type PlotOutput,
  type Sheet,
  type SheetSizeId,
  type SheetTypeDigit,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { exportDrawingSetPdf } from "./pdfExport";

const SHEET_TYPE_DIGITS: SheetTypeDigit[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SCALE_OPTIONS = [{ id: "as-shown", label: "As shown" }, ...DRAWING_SCALES.map((s) => ({ id: s.id, label: s.label }))];

function labelCls(): string {
  return "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
}
function fieldCls(): string {
  return "w-full rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground";
}

/**
 * The **Sheet Set Manager** — the cloud re-imagining of AutoCAD's Sheet Set
 * Manager. Three tabs drive the shared {@link DrawingSet}:
 *
 * - **Sheets** — a discipline-grouped sheet list with create / rename &
 *   renumber (callouts follow) / reorder / duplicate / delete / file-in-subset,
 *   beside a live vector preview of the selected sheet.
 * - **Properties** — set name/description, title-block defaults, and custom
 *   properties (set- or sheet-owned) used as title-block fields.
 * - **Publish** — named page setups, named sheet selections, and batch publish
 *   of any selection to a multi-sheet PDF applying a page setup on the fly.
 */
export function SheetSetDialog() {
  const open = useUiStore((s) => s.sheetSetOpen);
  const setOpen = useUiStore((s) => s.setSheetSetOpen);
  const site = useWorkspaceStore((s) => s.site);
  const updateSheetSet = useWorkspaceStore((s) => s.updateSheetSet);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const plugin = site ? getRegionPlugin(site.jurisdictionId) ?? US_PLSS_DEFAULT : US_PLSS_DEFAULT;
  const caps = resolveCapabilities(plugin);
  const unit = plugin.sheetStandards?.unit ?? "in";

  // The live set: the persisted one, or a standard one derived from the site.
  const set: DrawingSet | null = React.useMemo(
    () => (site ? site.drawingSets?.[0] ?? ensureDrawingSet(site, plugin) : null),
    [site, plugin],
  );
  const sheets = React.useMemo(() => (set ? sortSheets(set) : []), [set]);
  const selected: Sheet | null = React.useMemo(() => {
    if (!sheets.length) return null;
    return sheets.find((s) => s.id === selectedId) ?? sheets[0];
  }, [sheets, selectedId]);

  if (!site || !set || !selected) return null;

  const commit = (next: DrawingSet, remap?: { from: string; to: string } | null) =>
    updateSheetSet(next, remap ?? null);

  const layout = sheetLayout(selected, unit);
  const prims = buildSheetPrimitives(set, selected, site, plugin);

  function exportSvg() {
    const svg = svgRef.current;
    if (!svg || !selected) return;
    const src = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${src}`], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formatSheetNumber(selected.number)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function publish(scopeSheets: Sheet[], pageSetupId: string | null, filename: string) {
    if (!set || !site) return;
    const ps = pageSetupId ? pageSetupsOf(set).find((p) => p.id === pageSetupId) ?? null : null;
    const scoped = ps ? scopeSheets.map((s) => applyPageSetup(s, ps)) : scopeSheets;
    const scopedSet: DrawingSet = { ...set, sheets: scoped };
    setBusy(true);
    try {
      await exportDrawingSetPdf(scopedSet, site, filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Files className="h-5 w-5 text-primary" /> Sheet Set Manager
          </DialogTitle>
          <DialogDescription>
            {set.name} — {sheets.length} sheets · {plugin.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="sheets">
          <TabsList>
            <TabsTrigger value="sheets">Sheets</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="sheets">
            <SheetsTab
              set={set}
              site={site}
              plugin={plugin}
              selected={selected}
              onSelect={setSelectedId}
              onCommit={commit}
              svgRef={svgRef}
              layout={layout}
              prims={prims}
              onExportSvg={exportSvg}
            />
          </TabsContent>

          <TabsContent value="properties">
            <PropertiesTab set={set} selected={selected} onCommit={commit} />
          </TabsContent>

          <TabsContent value="publish">
            <PublishTab set={set} busy={busy} onCommit={commit} onPublish={publish} />
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-1.5">
          {Object.entries(caps)
            .filter(([, on]) => on)
            .slice(0, 12)
            .map(([k]) => (
              <span key={k} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {k}
              </span>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Sheets tab -------------------------------------------------------------

interface SheetsTabProps {
  set: DrawingSet;
  site: import("@thoth/domain").Site;
  plugin: import("@thoth/domain").RegionPlugin;
  selected: Sheet;
  onSelect: (id: string) => void;
  onCommit: (next: DrawingSet, remap?: { from: string; to: string } | null) => void;
  svgRef: React.RefObject<SVGSVGElement>;
  layout: ReturnType<typeof sheetLayout>;
  prims: ReturnType<typeof buildSheetPrimitives>;
  onExportSvg: () => void;
}

function SheetsTab({ set, selected, onSelect, onCommit, svgRef, layout, prims, onExportSvg, plugin }: SheetsTabProps) {
  const groups = groupByDiscipline(set);
  const subsets = subsetsOf(set);
  const std = plugin.sheetStandards;

  function addNew() {
    const { set: next, sheet } = addSheet(set, {
      discipline: selected.number.discipline,
      type: selected.number.type,
      title: "New Sheet",
      size: std?.defaultSize ?? selected.size,
      orientation: std?.orientation ?? selected.orientation,
    });
    onCommit(next);
    onSelect(sheet.id);
  }

  function newSubset() {
    const name = window.prompt("New subset name", "Subset");
    if (name) onCommit(addSubset(set, name.trim()));
  }

  return (
    <div className="flex gap-3">
      {/* Navigator */}
      <div className="flex w-56 shrink-0 flex-col gap-1.5">
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1" onClick={addNew}>
            <Plus className="h-3.5 w-3.5" /> Sheet
          </Button>
          <Button variant="outline" size="sm" onClick={newSubset} title="New subset">
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ScrollArea className="h-[54vh] rounded-md border border-border">
          <ul className="p-1.5">
            {groups.map((g) => (
              <li key={g.discipline} className="mb-1">
                <div className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.discipline} · {g.name}
                </div>
                {g.sheets.map((s) => {
                  const active = s.id === selected.id;
                  return (
                    <div
                      key={s.id}
                      className={`group flex items-center gap-1 rounded px-1.5 py-1 ${active ? "bg-primary/10" : "hover:bg-muted"}`}
                    >
                      <button onClick={() => onSelect(s.id)} className="min-w-0 flex-1 text-left">
                        <div className="font-mono text-xs font-semibold text-foreground">{formatSheetNumber(s.number)}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{s.title}</div>
                      </button>
                      <div className="flex shrink-0 opacity-0 group-hover:opacity-100">
                        <IconBtn title="Move up" onClick={() => onCommit(reorderSheet(set, s.id, "up"))}>
                          <ChevronUp className="h-3 w-3" />
                        </IconBtn>
                        <IconBtn title="Move down" onClick={() => onCommit(reorderSheet(set, s.id, "down"))}>
                          <ChevronDown className="h-3 w-3" />
                        </IconBtn>
                        <IconBtn
                          title="Duplicate"
                          onClick={() => {
                            const res = duplicateSheet(set, s.id);
                            if (res) {
                              onCommit(res.set);
                              onSelect(res.sheet.id);
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </IconBtn>
                        <IconBtn
                          title="Delete"
                          onClick={() => {
                            if (window.confirm(`Delete sheet ${formatSheetNumber(s.number)}?`)) onCommit(removeSheet(set, s.id));
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </IconBtn>
                      </div>
                    </div>
                  );
                })}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>

      {/* Editor + preview */}
      <div className="min-w-0 flex-1 space-y-2">
        <SheetEditor key={selected.id} set={set} sheet={selected} subsets={subsets} onCommit={onCommit} />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onExportSvg}>
            <FileDown className="h-4 w-4" /> Sheet (SVG)
          </Button>
        </div>
        <ScrollArea className="h-[34vh] rounded-md border border-border bg-muted/30 p-3">
          <div className="mx-auto shadow-md" style={{ maxWidth: layout.wPt }}>
            <SvgSheet ref={svgRef} prims={prims} wPt={layout.wPt} hPt={layout.hPt} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
    >
      {children}
    </button>
  );
}

// --- sheet editor -----------------------------------------------------------

function SheetEditor({
  set,
  sheet,
  subsets,
  onCommit,
}: {
  set: DrawingSet;
  sheet: Sheet;
  subsets: ReturnType<typeof subsetsOf>;
  onCommit: (next: DrawingSet, remap?: { from: string; to: string } | null) => void;
}) {
  const [discipline, setDiscipline] = React.useState<DisciplineCode>(sheet.number.discipline);
  const [type, setType] = React.useState<SheetTypeDigit>(sheet.number.type);
  const [sequence, setSequence] = React.useState(String(sheet.number.sequence));
  const [title, setTitle] = React.useState(sheet.title);
  const [description, setDescription] = React.useState(sheet.description ?? "");
  const [size, setSize] = React.useState<SheetSizeId>(sheet.size);
  const [orientation, setOrientation] = React.useState<Orientation>(sheet.orientation);
  const [scaleId, setScaleId] = React.useState(sheet.scaleId);
  const [subsetId, setSubsetId] = React.useState(sheet.subsetId ?? "");
  const [issue, setIssue] = React.useState(sheet.issue ?? "");

  function apply() {
    // 1) number / title / description — captures a remap so callouts follow.
    const seq = Math.max(1, Math.min(99, Number(sequence) || sheet.number.sequence));
    const { set: s1, remap } = renameRenumberSheet(set, sheet.id, {
      number: { discipline, type, sequence: seq },
      title: title.trim() || sheet.title,
      description: description.trim() || undefined,
    });
    // 2) the plain paper/organizing fields.
    let s2: DrawingSet = {
      ...s1,
      sheets: s1.sheets.map((sh) =>
        sh.id === sheet.id ? { ...sh, size, orientation, scaleId, issue: issue.trim() || undefined } : sh,
      ),
    };
    s2 = assignSubset(s2, sheet.id, subsetId || null);
    onCommit(s2, remap);
  }

  return (
    <div className="rounded-md border border-border p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Edit sheet</span>
        <Button size="sm" onClick={apply}>Apply</Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Field label="Discipline">
          <select className={fieldCls()} value={discipline} onChange={(e) => setDiscipline(e.target.value as DisciplineCode)}>
            {DISCIPLINE_ORDER.map((c) => (
              <option key={c} value={c}>{c} · {disciplineName(c)}</option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select className={fieldCls()} value={type} onChange={(e) => setType(Number(e.target.value) as SheetTypeDigit)}>
            {SHEET_TYPE_DIGITS.map((d) => (
              <option key={d} value={d}>{d} · {SHEET_TYPES[d]}</option>
            ))}
          </select>
        </Field>
        <Field label="Sequence">
          <Input value={sequence} onChange={(e) => setSequence(e.target.value)} className="h-7 text-xs" />
        </Field>
        <Field label="Number">
          <div className="px-1 py-1 font-mono text-xs font-semibold text-foreground">
            {formatSheetNumber({ discipline, type, sequence: Number(sequence) || 0 })}
          </div>
        </Field>
        <Field label="Title" span={2}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-xs" />
        </Field>
        <Field label="Scale">
          <select className={fieldCls()} value={scaleId} onChange={(e) => setScaleId(e.target.value)}>
            {SCALE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Issue">
          <Input value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. For Permit" className="h-7 text-xs" />
        </Field>
        <Field label="Size">
          <select className={fieldCls()} value={size} onChange={(e) => setSize(e.target.value as SheetSizeId)}>
            {listSheetSizes().map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Orientation">
          <select className={fieldCls()} value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </Field>
        <Field label="Subset">
          <select className={fieldCls()} value={subsetId} onChange={(e) => setSubsetId(e.target.value)}>
            <option value="">— Unfiled —</option>
            {subsets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Description" span={4}>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-7 text-xs" />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-2" : span === 4 ? "col-span-4" : ""}>
      <div className={labelCls()}>{label}</div>
      {children}
    </div>
  );
}

// --- Properties tab ---------------------------------------------------------

function PropertiesTab({
  set,
  selected,
  onCommit,
}: {
  set: DrawingSet;
  selected: Sheet;
  onCommit: (next: DrawingSet) => void;
}) {
  const d = set.titleBlockDefaults;
  const [name, setName] = React.useState(set.name);
  const [description, setDescription] = React.useState(set.description ?? "");
  const [projectName, setProjectName] = React.useState(d.projectName);
  const [client, setClient] = React.useState(d.client ?? "");
  const [location, setLocation] = React.useState(d.location ?? "");
  const [drawnBy, setDrawnBy] = React.useState(d.drawnBy ?? "");
  const [checkedBy, setCheckedBy] = React.useState(d.checkedBy ?? "");
  const [date, setDate] = React.useState(d.date);
  const [projectNumber, setProjectNumber] = React.useState(d.projectNumber ?? "");

  function applyProps() {
    onCommit({
      ...set,
      name: name.trim() || set.name,
      description: description.trim() || undefined,
      titleBlockDefaults: {
        ...d,
        projectName: projectName.trim() || d.projectName,
        client: client.trim() || undefined,
        location: location.trim() || undefined,
        drawnBy: drawnBy.trim() || undefined,
        checkedBy: checkedBy.trim() || undefined,
        date: date.trim() || d.date,
        projectNumber: projectNumber.trim() || undefined,
      },
    });
  }

  // custom property draft
  const [cpName, setCpName] = React.useState("");
  const [cpOwner, setCpOwner] = React.useState<CustomPropertyOwner>("sheet-set");
  const [cpValue, setCpValue] = React.useState("");
  const props = customPropertiesOf(set);

  function addProp() {
    if (!cpName.trim()) return;
    onCommit(upsertCustomProperty(set, { name: cpName.trim(), owner: cpOwner, value: cpValue }));
    setCpName("");
    setCpValue("");
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="text-xs font-semibold text-foreground">Sheet set & title block</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Set name" span={2}><Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Description" span={2}><Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Project name" span={2}><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Client"><Input value={client} onChange={(e) => setClient(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Drawn by"><Input value={drawnBy} onChange={(e) => setDrawnBy(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Checked by"><Input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Date"><Input value={date} onChange={(e) => setDate(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Project no."><Input value={projectNumber} onChange={(e) => setProjectNumber(e.target.value)} className="h-7 text-xs" /></Field>
        </div>
        <Button size="sm" onClick={applyProps}>Save properties</Button>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-foreground">Custom properties (title-block fields)</div>
        <p className="text-[11px] text-muted-foreground">
          Insert into any text as <code className="rounded bg-muted px-1">%&lt;CurrentSheetSetCustom "Name"&gt;%</code> (set-owned) or
          <code className="ml-1 rounded bg-muted px-1">%&lt;CurrentSheetCustom "Name"&gt;%</code> (sheet-owned).
        </p>
        <ScrollArea className="h-[26vh] rounded-md border border-border">
          <ul className="divide-y divide-border">
            {props.length === 0 && <li className="p-2 text-[11px] text-muted-foreground">No custom properties yet.</li>}
            {props.map((p) => (
              <li key={p.name} className="p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{p.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="rounded border border-border px-1 py-0.5 text-[9px] uppercase text-muted-foreground">{p.owner}</span>
                    <IconBtn title="Remove" onClick={() => onCommit(removeCustomProperty(set, p.name))}>
                      <Trash2 className="h-3 w-3" />
                    </IconBtn>
                  </div>
                </div>
                {p.owner === "sheet-set" ? (
                  <Input
                    value={p.value}
                    onChange={(e) => onCommit(upsertCustomProperty(set, { ...p, value: e.target.value }))}
                    className="mt-1 h-6 text-[11px]"
                  />
                ) : (
                  <div className="mt-1">
                    <div className={labelCls()}>Value on {formatSheetNumber(selected.number)}</div>
                    <Input
                      value={selected.customValues?.[p.name] ?? p.value}
                      onChange={(e) => onCommit(setSheetCustomValue(set, selected.id, p.name, e.target.value))}
                      className="h-6 text-[11px]"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-1.5">
          <Field label="Name"><Input value={cpName} onChange={(e) => setCpName(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Owner">
            <select className={fieldCls()} value={cpOwner} onChange={(e) => setCpOwner(e.target.value as CustomPropertyOwner)}>
              <option value="sheet-set">Set</option>
              <option value="sheet">Sheet</option>
            </select>
          </Field>
          <Field label="Default"><Input value={cpValue} onChange={(e) => setCpValue(e.target.value)} className="h-7 text-xs" /></Field>
          <Button size="sm" onClick={addProp}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

// --- Publish tab ------------------------------------------------------------

function PublishTab({
  set,
  busy,
  onCommit,
  onPublish,
}: {
  set: DrawingSet;
  busy: boolean;
  onCommit: (next: DrawingSet) => void;
  onPublish: (scope: Sheet[], pageSetupId: string | null, filename: string) => Promise<void>;
}) {
  const allSheets = sortSheets(set);
  const setups = pageSetupsOf(set);
  const selections = namedSelectionsOf(set);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [activeSetup, setActiveSetup] = React.useState<string>("");
  const [selName, setSelName] = React.useState("");

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const scopeSheets = checked.size ? allSheets.filter((s) => checked.has(s.id)) : allSheets;

  // page setup draft
  const [psName, setPsName] = React.useState("");
  const [psSize, setPsSize] = React.useState<SheetSizeId | "">("");
  const [psOrient, setPsOrient] = React.useState<Orientation | "">("");
  const [psMono, setPsMono] = React.useState(false);
  const [psOutput, setPsOutput] = React.useState<PlotOutput>("pdf");

  function addSetup() {
    if (!psName.trim()) return;
    onCommit(
      upsertPageSetup(set, {
        name: psName.trim(),
        size: psSize || undefined,
        orientation: psOrient || undefined,
        monochrome: psMono || undefined,
        output: psOutput,
      }),
    );
    setPsName("");
  }

  const baseName = set.titleBlockDefaults.projectName.replace(/\s+/g, "-").toLowerCase() || "drawing-set";

  return (
    <div className="grid grid-cols-[1.2fr_1fr] gap-4">
      {/* Selection + publish */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Sheets to publish</span>
          <span className="text-[11px] text-muted-foreground">{checked.size ? `${checked.size} selected` : "Whole set"}</span>
        </div>
        <ScrollArea className="h-[34vh] rounded-md border border-border">
          <ul className="p-1.5">
            {allSheets.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted">
                <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="font-mono text-xs font-semibold text-foreground">{formatSheetNumber(s.number)}</span>
                <span className="truncate text-[11px] text-muted-foreground">{s.title}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <div className={labelCls()}>Page setup</div>
            <select className={fieldCls()} value={activeSetup} onChange={(e) => setActiveSetup(e.target.value)}>
              <option value="">Sheet defaults</option>
              {setups.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onPublish(scopeSheets, activeSetup || null, `${baseName}-drawings.pdf`)}
          >
            <FileDown className="h-4 w-4" /> {busy ? "Building…" : `Publish ${checked.size || allSheets.length} → PDF`}
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <div className={labelCls()}>Save selection as</div>
            <Input value={selName} onChange={(e) => setSelName(e.target.value)} placeholder="e.g. Client set" className="h-7 text-xs" />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!selName.trim() || checked.size === 0}
            onClick={() => {
              onCommit(saveNamedSelection(set, selName.trim(), [...checked]));
              setSelName("");
            }}
          >
            Save
          </Button>
        </div>
        {selections.length > 0 && (
          <div className="space-y-1">
            <div className={labelCls()}>Named selections</div>
            {selections.map((sel) => (
              <div key={sel.id} className="flex items-center gap-2 text-xs">
                <button className="text-primary hover:underline" onClick={() => setChecked(new Set(sel.sheetIds))}>
                  {sel.name}
                </button>
                <span className="text-muted-foreground">({sel.sheetIds.length})</span>
                <IconBtn title="Delete" onClick={() => onCommit(deleteNamedSelection(set, sel.id))}>
                  <Trash2 className="h-3 w-3" />
                </IconBtn>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Page setups */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-foreground">Page setups</div>
        <ScrollArea className="h-[26vh] rounded-md border border-border">
          <ul className="divide-y divide-border">
            {setups.length === 0 && <li className="p-2 text-[11px] text-muted-foreground">No page setups yet.</li>}
            {setups.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-2 text-xs">
                <div>
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {p.output.toUpperCase()}
                    {p.size ? ` · ${p.size}` : ""}
                    {p.orientation ? ` · ${p.orientation}` : ""}
                    {p.monochrome ? " · mono" : ""}
                  </div>
                </div>
                <IconBtn title="Remove" onClick={() => onCommit(removePageSetup(set, p.id))}>
                  <Trash2 className="h-3 w-3" />
                </IconBtn>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-2">
          <Field label="Name" span={2}><Input value={psName} onChange={(e) => setPsName(e.target.value)} className="h-7 text-xs" /></Field>
          <Field label="Size">
            <select className={fieldCls()} value={psSize} onChange={(e) => setPsSize(e.target.value as SheetSizeId | "")}>
              <option value="">Keep</option>
              {listSheetSizes().map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Orientation">
            <select className={fieldCls()} value={psOrient} onChange={(e) => setPsOrient(e.target.value as Orientation | "")}>
              <option value="">Keep</option>
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </Field>
          <div className="flex items-center gap-2">
            <Switch checked={psMono} onCheckedChange={setPsMono} />
            <span className="text-xs text-muted-foreground">Monochrome</span>
          </div>
          <Field label="Output">
            <select className={fieldCls()} value={psOutput} onChange={(e) => setPsOutput(e.target.value as PlotOutput)}>
              <option value="pdf">PDF</option>
              <option value="svg">SVG</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Button size="sm" className="w-full" onClick={addSetup}><Plus className="h-3.5 w-3.5" /> Add page setup</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
