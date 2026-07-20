/**
 * The **Sheet Set Manager** model — the cloud-first re-imagining of AutoCAD's
 * Sheet Set Manager (SSM), expressed over the shared planning-domain model
 * rather than over DWG files and xrefs (see docs/requirements CON-012).
 *
 * A {@link DrawingSet} is the sheet set (the SSM `DST`). This module adds the
 * organizing and automation layer the SSM is built around:
 *
 * - **Subsets** — nestable visual folders that group the sheet list (SSM Step 2).
 * - **Custom properties** — named values owned by the set or by each sheet,
 *   inserted into the title block as fields (SSM Steps 10, 12).
 * - **Fields** — `%<Token>%` placeholders resolved against the set + sheet +
 *   custom properties, so title blocks, view labels, and callouts stay current
 *   automatically (SSM Steps 12, 16, 17).
 * - **Named selections** — saved sets of sheets for batch plot/publish/transmit
 *   (SSM Step 8).
 * - **Page setups** — named plot configurations applied on the fly (SSM Steps
 *   5, 6, 13).
 * - **Operations** — create / rename & renumber / reorder / remove / duplicate
 *   sheets, with **cross-reference integrity**: renumbering a sheet returns a
 *   remap so every callout, section/detail mark, and match line that points at
 *   the old sheet number can be rewritten to the new one (FE-SHEETSET-004).
 *
 * Everything here is pure and immutable — inputs are never mutated, and every
 * operation returns a fresh {@link DrawingSet}. No React, no server framework.
 */

import { DISCIPLINE_ORDER, disciplineName, type DisciplineCode } from "./drafting";
import type { Orientation, SheetSizeId } from "./sheetsize";
import {
  compareSheets,
  formatSheetNumber,
  nextSheetNumber,
  sortSheets,
  type DrawingSet,
  type Sheet,
  type SheetNumber,
  type SheetTypeDigit,
} from "./sheet";

// --- organizing model -------------------------------------------------------

/** A subset: a nestable visual folder in the sheet list (SSM "subset"). */
export interface Subset {
  id: string;
  name: string;
  /** Parent subset id, or undefined for a top-level subset. */
  parentId?: string;
}

/** Who owns a custom property value: the whole set, or each sheet individually. */
export type CustomPropertyOwner = "sheet-set" | "sheet";

/**
 * A custom property. For a `sheet-set`-owned property, {@link value} is the
 * single set-wide value. For a `sheet`-owned property, {@link value} is the
 * default and each sheet may override it via {@link Sheet.customValues}.
 */
export interface CustomProperty {
  name: string;
  owner: CustomPropertyOwner;
  /** Set-wide value (sheet-set owner) or default value (sheet owner). */
  value: string;
}

/** A saved, named selection of sheets (SSM named sheet selection). */
export interface NamedSelection {
  id: string;
  name: string;
  sheetIds: string[];
}

/** Where a page setup sends its output. */
export type PlotOutput = "pdf" | "svg";

/**
 * A named page setup — a reusable plot configuration applied to any sheet on
 * the fly (SSM Step 13). Any omitted field leaves the sheet's own value intact.
 */
export interface PageSetup {
  id: string;
  name: string;
  /** Override the sheet size (else keep the sheet's own size). */
  size?: SheetSizeId;
  /** Override the orientation (else keep the sheet's own orientation). */
  orientation?: Orientation;
  /** Named drawing scale id, `"as-shown"` to fit, or undefined to keep. */
  scaleId?: string;
  /** Plot-style name (from ./drafting PLOT_STYLES), e.g. "Monochrome". */
  plotStyle?: string;
  /** Force monochrome ink at plot time. */
  monochrome?: boolean;
  output: PlotOutput;
}

// --- subsets ----------------------------------------------------------------

/** The set's subsets (never undefined). */
export function subsetsOf(set: DrawingSet): Subset[] {
  return set.subsets ?? [];
}

/** A node in the subset tree, with its child subsets and the sheets it holds. */
export interface SubsetNode {
  subset: Subset;
  children: SubsetNode[];
  /** Sheets directly assigned to this subset, in canonical order. */
  sheets: Sheet[];
}

/**
 * Build the subset forest for a set, each node carrying its directly-assigned
 * sheets (canonical NCS order). Sheets with no/unknown subset are not included
 * here — use {@link unfiledSheets} for those.
 */
export function subsetTree(set: DrawingSet): SubsetNode[] {
  const subsets = subsetsOf(set);
  const byParent = new Map<string | undefined, Subset[]>();
  for (const s of subsets) {
    const key = s.parentId && subsets.some((p) => p.id === s.parentId) ? s.parentId : undefined;
    const list = byParent.get(key) ?? [];
    list.push(s);
    byParent.set(key, list);
  }
  const ordered = sortSheets(set);
  const build = (parentId: string | undefined): SubsetNode[] =>
    (byParent.get(parentId) ?? []).map((subset) => ({
      subset,
      children: build(subset.id),
      sheets: ordered.filter((sh) => sh.subsetId === subset.id),
    }));
  return build(undefined);
}

/** Sheets not assigned to any (existing) subset, in canonical order. */
export function unfiledSheets(set: DrawingSet): Sheet[] {
  const ids = new Set(subsetsOf(set).map((s) => s.id));
  return sortSheets(set).filter((sh) => !sh.subsetId || !ids.has(sh.subsetId));
}

/** The path of subset names from the root down to `subsetId`, for breadcrumbs. */
export function subsetPath(set: DrawingSet, subsetId: string): string[] {
  const subsets = subsetsOf(set);
  const byId = new Map(subsets.map((s) => [s.id, s]));
  const path: string[] = [];
  let cur = byId.get(subsetId);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    path.unshift(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/** Add a subset (optionally nested under `parentId`); returns the new set. */
export function addSubset(set: DrawingSet, name: string, parentId?: string): DrawingSet {
  const subset: Subset = { id: freshId("subset", subsetsOf(set)), name, parentId };
  return { ...set, subsets: [...subsetsOf(set), subset] };
}

/** Rename a subset. */
export function renameSubset(set: DrawingSet, subsetId: string, name: string): DrawingSet {
  return { ...set, subsets: subsetsOf(set).map((s) => (s.id === subsetId ? { ...s, name } : s)) };
}

/**
 * Remove a subset. Any sheets or child subsets it held are re-parented to the
 * removed subset's own parent (so nothing is orphaned or silently deleted).
 */
export function removeSubset(set: DrawingSet, subsetId: string): DrawingSet {
  const target = subsetsOf(set).find((s) => s.id === subsetId);
  if (!target) return set;
  const parentId = target.parentId;
  return {
    ...set,
    subsets: subsetsOf(set)
      .filter((s) => s.id !== subsetId)
      .map((s) => (s.parentId === subsetId ? { ...s, parentId } : s)),
    sheets: set.sheets.map((sh) => (sh.subsetId === subsetId ? { ...sh, subsetId: parentId } : sh)),
  };
}

/** Assign a sheet to a subset (or `null` to unfile it). */
export function assignSubset(set: DrawingSet, sheetId: string, subsetId: string | null): DrawingSet {
  return {
    ...set,
    sheets: set.sheets.map((sh) =>
      sh.id === sheetId ? { ...sh, subsetId: subsetId ?? undefined } : sh,
    ),
  };
}

// --- custom properties ------------------------------------------------------

/** The set's custom properties (never undefined). */
export function customPropertiesOf(set: DrawingSet): CustomProperty[] {
  return set.customProperties ?? [];
}

/** Add or replace a custom property (matched by name). */
export function upsertCustomProperty(set: DrawingSet, prop: CustomProperty): DrawingSet {
  const existing = customPropertiesOf(set);
  const idx = existing.findIndex((p) => p.name === prop.name);
  const next = idx === -1 ? [...existing, prop] : existing.map((p, i) => (i === idx ? prop : p));
  return { ...set, customProperties: next };
}

/** Remove a custom property by name (and any per-sheet overrides of it). */
export function removeCustomProperty(set: DrawingSet, name: string): DrawingSet {
  return {
    ...set,
    customProperties: customPropertiesOf(set).filter((p) => p.name !== name),
    sheets: set.sheets.map((sh) => {
      if (!sh.customValues || !(name in sh.customValues)) return sh;
      const { [name]: _drop, ...rest } = sh.customValues;
      return { ...sh, customValues: rest };
    }),
  };
}

/** Set a sheet-owned custom property's value for one sheet. */
export function setSheetCustomValue(
  set: DrawingSet,
  sheetId: string,
  name: string,
  value: string,
): DrawingSet {
  return {
    ...set,
    sheets: set.sheets.map((sh) =>
      sh.id === sheetId ? { ...sh, customValues: { ...(sh.customValues ?? {}), [name]: value } } : sh,
    ),
  };
}

/**
 * Resolve a custom property's effective value for a sheet: a set-owned property
 * returns its set-wide value; a sheet-owned property returns the sheet's
 * override if present, else the property default. Unknown names return null.
 */
export function resolveCustomValue(set: DrawingSet, sheet: Sheet | null, name: string): string | null {
  const prop = customPropertiesOf(set).find((p) => p.name === name);
  if (!prop) return null;
  if (prop.owner === "sheet-set") return prop.value;
  const override = sheet?.customValues?.[name];
  return override ?? prop.value;
}

// --- fields -----------------------------------------------------------------

/** Everything a field resolves against for one sheet. */
export interface FieldContext {
  set: DrawingSet;
  sheet: Sheet;
  /** 1-based ordinal of the sheet within the whole set (canonical order). */
  ordinal: number;
  /** Total sheet count in the set. */
  total: number;
  /** Resolved scale label for the sheet, e.g. `1/8" = 1'-0"`. */
  scaleLabel: string;
  /** Issue/publication date string (callers pass it; the domain has no clock). */
  date: string;
}

const FIELD_TOKEN = /%<\s*([A-Za-z]+)(?:\s+"([^"]*)")?\s*>%/g;

/**
 * Resolve the built-in and custom **fields** in a template string. Placeholders
 * take the form `%<FieldName>%` or `%<FieldName "Argument">%`, mirroring the
 * AutoCAD sheet-set field syntax. Recognized field names:
 *
 * - `CurrentSheetNumber`, `CurrentSheetTitle`, `CurrentSheetDescription`
 * - `CurrentSheetNumberAndTitle`, `CurrentSheetScale`, `CurrentSheetIssue`
 * - `CurrentSheetSetName`, `CurrentSheetSetDescription`, `CurrentSheetSetProjectName`
 * - `SheetTotal`, `SheetOf` (→ "n of N"), `CurrentDate`
 * - `CurrentSheetSetCustom "Name"` — a set-owned custom property
 * - `CurrentSheetCustom "Name"` — a sheet-owned custom property
 *
 * Unknown tokens resolve to the empty string (an unpopulated field), matching
 * how AutoCAD shows `####` for a field with no value.
 */
export function resolveFields(template: string, ctx: FieldContext): string {
  return template.replace(FIELD_TOKEN, (_m, name: string, arg: string | undefined) => {
    const v = resolveField(name, arg, ctx);
    return v ?? "";
  });
}

function resolveField(name: string, arg: string | undefined, ctx: FieldContext): string | null {
  const { set, sheet } = ctx;
  switch (name) {
    case "CurrentSheetNumber":
      return formatSheetNumber(sheet.number);
    case "CurrentSheetTitle":
      return sheet.title;
    case "CurrentSheetDescription":
      return sheet.description ?? "";
    case "CurrentSheetNumberAndTitle":
      return `${formatSheetNumber(sheet.number)} — ${sheet.title}`;
    case "CurrentSheetScale":
      return ctx.scaleLabel;
    case "CurrentSheetIssue":
      return sheet.issue ?? "";
    case "CurrentSheetSetName":
      return set.name;
    case "CurrentSheetSetDescription":
      return set.description ?? "";
    case "CurrentSheetSetProjectName":
      return set.titleBlockDefaults.projectName;
    case "SheetTotal":
      return String(ctx.total);
    case "SheetOf":
      return `${ctx.ordinal} of ${ctx.total}`;
    case "CurrentDate":
      return ctx.date;
    case "CurrentSheetSetCustom":
    case "CurrentSheetCustom":
      return arg ? resolveCustomValue(set, sheet, arg) : null;
    default:
      return null;
  }
}

/** Build a {@link FieldContext} for a sheet within its set. */
export function fieldContext(
  set: DrawingSet,
  sheet: Sheet,
  scaleLabel: string,
  date: string,
): FieldContext {
  const ordered = sortSheets(set);
  const ordinal = ordered.findIndex((s) => s.id === sheet.id) + 1;
  return { set, sheet, ordinal: Math.max(1, ordinal), total: ordered.length, scaleLabel, date };
}

/**
 * A flat map of every resolvable field value for a sheet — handy for a title
 * block renderer or a field-picker UI. Keys use the bare token name; custom
 * properties are keyed by their own name.
 */
export function titleBlockFields(
  set: DrawingSet,
  sheet: Sheet,
  scaleLabel: string,
  date: string,
): Record<string, string> {
  const ctx = fieldContext(set, sheet, scaleLabel, date);
  const out: Record<string, string> = {
    CurrentSheetNumber: formatSheetNumber(sheet.number),
    CurrentSheetTitle: sheet.title,
    CurrentSheetDescription: sheet.description ?? "",
    CurrentSheetScale: scaleLabel,
    CurrentSheetIssue: sheet.issue ?? "",
    CurrentSheetSetName: set.name,
    CurrentSheetSetProjectName: set.titleBlockDefaults.projectName,
    SheetTotal: String(ctx.total),
    SheetOf: `${ctx.ordinal} of ${ctx.total}`,
    CurrentDate: date,
  };
  for (const p of customPropertiesOf(set)) {
    out[p.name] = resolveCustomValue(set, sheet, p.name) ?? "";
  }
  return out;
}

// --- named selections -------------------------------------------------------

/** The set's named selections (never undefined). */
export function namedSelectionsOf(set: DrawingSet): NamedSelection[] {
  return set.namedSelections ?? [];
}

/** Save (or replace, by name) a named selection of sheets. */
export function saveNamedSelection(set: DrawingSet, name: string, sheetIds: string[]): DrawingSet {
  const existing = namedSelectionsOf(set);
  const idx = existing.findIndex((s) => s.name === name);
  const entry: NamedSelection = {
    id: idx === -1 ? freshId("sel", existing) : existing[idx].id,
    name,
    sheetIds: [...sheetIds],
  };
  const next = idx === -1 ? [...existing, entry] : existing.map((s, i) => (i === idx ? entry : s));
  return { ...set, namedSelections: next };
}

/** Delete a named selection by id. */
export function deleteNamedSelection(set: DrawingSet, id: string): DrawingSet {
  return { ...set, namedSelections: namedSelectionsOf(set).filter((s) => s.id !== id) };
}

/** Resolve a named selection to its sheets (canonical order; missing ids dropped). */
export function resolveNamedSelection(set: DrawingSet, id: string): Sheet[] {
  const sel = namedSelectionsOf(set).find((s) => s.id === id);
  if (!sel) return [];
  const wanted = new Set(sel.sheetIds);
  return sortSheets(set).filter((sh) => wanted.has(sh.id));
}

// --- page setups ------------------------------------------------------------

/** The set's page setups (never undefined). */
export function pageSetupsOf(set: DrawingSet): PageSetup[] {
  return set.pageSetups ?? [];
}

/** Add or replace a page setup (matched by name). */
export function upsertPageSetup(set: DrawingSet, setup: Omit<PageSetup, "id"> & { id?: string }): DrawingSet {
  const existing = pageSetupsOf(set);
  const idx = existing.findIndex((p) => p.name === setup.name);
  const entry: PageSetup = { ...setup, id: setup.id ?? (idx === -1 ? freshId("ps", existing) : existing[idx].id) };
  const next = idx === -1 ? [...existing, entry] : existing.map((p, i) => (i === idx ? entry : p));
  return { ...set, pageSetups: next };
}

/** Remove a page setup by id. */
export function removePageSetup(set: DrawingSet, id: string): DrawingSet {
  return { ...set, pageSetups: pageSetupsOf(set).filter((p) => p.id !== id) };
}

/** Apply a page setup's overrides to a sheet, returning the effective sheet. */
export function applyPageSetup(sheet: Sheet, setup: PageSetup): Sheet {
  return {
    ...sheet,
    size: setup.size ?? sheet.size,
    orientation: setup.orientation ?? sheet.orientation,
    scaleId: setup.scaleId ?? sheet.scaleId,
  };
}

// --- sheet operations -------------------------------------------------------

/** Fields a caller supplies to create a new sheet; number is auto-assigned. */
export interface NewSheetSpec {
  discipline: DisciplineCode;
  type: SheetTypeDigit;
  title: string;
  size: SheetSizeId;
  orientation: Orientation;
  scaleId?: string;
  subsetId?: string;
  description?: string;
}

/**
 * Add a new sheet, auto-assigning the next free sequence for its
 * (discipline, type). Returns the new set and the created sheet.
 */
export function addSheet(set: DrawingSet, spec: NewSheetSpec): { set: DrawingSet; sheet: Sheet } {
  const number = nextSheetNumber(set, spec.discipline, spec.type);
  const sheet: Sheet = {
    id: freshId("sheet", set.sheets),
    number,
    title: spec.title,
    size: spec.size,
    orientation: spec.orientation,
    scaleId: spec.scaleId ?? "as-shown",
    discipline: spec.discipline,
    viewportIds: [],
    revisions: [],
    subsetId: spec.subsetId,
    description: spec.description,
  };
  return { set: { ...set, sheets: [...set.sheets, sheet] }, sheet };
}

/** Remove a sheet from the set. */
export function removeSheet(set: DrawingSet, sheetId: string): DrawingSet {
  return {
    ...set,
    sheets: set.sheets.filter((sh) => sh.id !== sheetId),
    namedSelections: namedSelectionsOf(set).map((s) => ({
      ...s,
      sheetIds: s.sheetIds.filter((id) => id !== sheetId),
    })),
  };
}

/**
 * Duplicate a sheet, giving the copy the next free sequence in the same
 * (discipline, type) and copying its viewports, revisions, and custom values
 * (FE-SHEET-005). Returns the new set and the created copy.
 */
export function duplicateSheet(set: DrawingSet, sheetId: string): { set: DrawingSet; sheet: Sheet } | null {
  const src = set.sheets.find((sh) => sh.id === sheetId);
  if (!src) return null;
  const number = nextSheetNumber(set, src.number.discipline, src.number.type);
  const copy: Sheet = {
    ...src,
    id: freshId("sheet", set.sheets),
    number,
    title: `${src.title} (copy)`,
    viewportIds: [...src.viewportIds],
    revisions: src.revisions.map((r) => ({ ...r })),
    customValues: src.customValues ? { ...src.customValues } : undefined,
  };
  return { set: { ...set, sheets: [...set.sheets, copy] }, sheet: copy };
}

/** A sheet-number remap produced by a renumber, for rewriting cross-references. */
export interface SheetRemap {
  from: string;
  to: string;
}

/**
 * Rename and/or renumber a sheet. When the number changes, the returned
 * {@link SheetRemap} lets callers rewrite every callout, section/detail mark,
 * and match line that referenced the old sheet number so the references stay
 * valid (FE-SHEETSET-004). `remap` is null when the number did not change.
 */
export function renameRenumberSheet(
  set: DrawingSet,
  sheetId: string,
  patch: { number?: SheetNumber; title?: string; description?: string },
): { set: DrawingSet; remap: SheetRemap | null } {
  const src = set.sheets.find((sh) => sh.id === sheetId);
  if (!src) return { set, remap: null };
  const nextNumber = patch.number ?? src.number;
  const from = formatSheetNumber(src.number);
  const to = formatSheetNumber(nextNumber);
  const numberChanged = from !== to;
  const updated: Sheet = {
    ...src,
    number: nextNumber,
    discipline: nextNumber.discipline,
    title: patch.title ?? src.title,
    description: patch.description ?? src.description,
  };
  return {
    set: { ...set, sheets: set.sheets.map((sh) => (sh.id === sheetId ? updated : sh)) },
    remap: numberChanged ? { from, to } : null,
  };
}

/**
 * Reorder a sheet up or down within its (discipline, type) group by swapping
 * its sequence with the adjacent sheet in canonical order. Sheets in different
 * (discipline, type) groups keep a fixed relative order, so reordering only
 * ever shuffles siblings — matching how the SSM sheet list drag-reorders.
 */
export function reorderSheet(set: DrawingSet, sheetId: string, dir: "up" | "down"): DrawingSet {
  const src = set.sheets.find((sh) => sh.id === sheetId);
  if (!src) return set;
  const siblings = set.sheets
    .filter((sh) => sh.number.discipline === src.number.discipline && sh.number.type === src.number.type)
    .sort((a, b) => a.number.sequence - b.number.sequence);
  const i = siblings.findIndex((sh) => sh.id === sheetId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return set;
  const a = siblings[i];
  const b = siblings[j];
  const aSeq = a.number.sequence;
  const bSeq = b.number.sequence;
  return {
    ...set,
    sheets: set.sheets.map((sh) => {
      if (sh.id === a.id) return { ...sh, number: { ...sh.number, sequence: bSeq } };
      if (sh.id === b.id) return { ...sh, number: { ...sh.number, sequence: aSeq } };
      return sh;
    }),
  };
}

// --- cross-reference integrity ---------------------------------------------

/** Rewrite a single sheet-number reference through a remap (identity if no match). */
export function remapSheetReference(value: string | undefined, remap: SheetRemap): string | undefined {
  if (value === undefined) return value;
  return value === remap.from ? remap.to : value;
}

/**
 * Apply a remap across a list of reference-bearing objects — anything with an
 * optional `targetSheet` and/or `adjoiningSheet` string (section, elevation,
 * and detail marks, and match lines). Objects that don't reference the remapped
 * sheet are returned unchanged.
 */
export function rewriteCrossReferences<T extends { targetSheet?: string; adjoiningSheet?: string }>(
  refs: readonly T[],
  remap: SheetRemap,
): T[] {
  return refs.map((r) => {
    const targetSheet = remapSheetReference(r.targetSheet, remap);
    const adjoiningSheet = remapSheetReference(r.adjoiningSheet, remap);
    if (targetSheet === r.targetSheet && adjoiningSheet === r.adjoiningSheet) return r;
    return { ...r, ...(r.targetSheet !== undefined ? { targetSheet } : {}), ...(r.adjoiningSheet !== undefined ? { adjoiningSheet } : {}) };
  });
}

// --- browsing & filtering ---------------------------------------------------

/** Filter criteria for the sheet-set browser (FE-SHEETSET-002). */
export interface SheetFilter {
  discipline?: DisciplineCode;
  type?: SheetTypeDigit;
  issue?: string;
  subsetId?: string;
}

/** Sheets matching every provided filter criterion, in canonical order. */
export function filterSheets(set: DrawingSet, filter: SheetFilter): Sheet[] {
  return sortSheets(set).filter((sh) => {
    if (filter.discipline && sh.number.discipline !== filter.discipline) return false;
    if (filter.type !== undefined && sh.number.type !== filter.type) return false;
    if (filter.issue && sh.issue !== filter.issue) return false;
    if (filter.subsetId && sh.subsetId !== filter.subsetId) return false;
    return true;
  });
}

/** A discipline group for the sheet-set browser (FE-SHEETSET-001). */
export interface DisciplineGroup {
  discipline: DisciplineCode;
  name: string;
  sheets: Sheet[];
}

/** Group a set's sheets by discipline in canonical discipline order. */
export function groupByDiscipline(set: DrawingSet): DisciplineGroup[] {
  const ordered = sortSheets(set);
  const groups: DisciplineGroup[] = [];
  for (const code of DISCIPLINE_ORDER) {
    const sheets = ordered.filter((sh) => sh.number.discipline === code);
    if (sheets.length) groups.push({ discipline: code, name: disciplineName(code), sheets });
  }
  // Any non-standard discipline codes, appended after the standard order.
  const seen = new Set(DISCIPLINE_ORDER);
  for (const sh of ordered) {
    if (seen.has(sh.number.discipline)) continue;
    seen.add(sh.number.discipline);
    groups.push({
      discipline: sh.number.discipline,
      name: disciplineName(sh.number.discipline),
      sheets: ordered.filter((x) => x.number.discipline === sh.number.discipline),
    });
  }
  return groups;
}

// --- ids --------------------------------------------------------------------

/** A short id unique within `existing` (deterministic; no clock/RNG). */
function freshId(prefix: string, existing: readonly { id: string }[]): string {
  const used = new Set(existing.map((e) => e.id));
  let n = existing.length + 1;
  let id = `${prefix}-${n}`;
  while (used.has(id)) id = `${prefix}-${++n}`;
  return id;
}

// Re-export the sheet-ordering helper so callers can order any sheet list.
export { compareSheets };
