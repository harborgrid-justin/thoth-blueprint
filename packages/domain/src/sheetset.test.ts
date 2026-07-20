import { describe, expect, it } from "vitest";
import type { DrawingSet, Sheet } from "./sheet";
import { formatSheetNumber } from "./sheet";
import {
  addSheet,
  addSubset,
  applyPageSetup,
  assignSubset,
  deleteNamedSelection,
  duplicateSheet,
  fieldContext,
  filterSheets,
  groupByDiscipline,
  removeCustomProperty,
  removeSheet,
  removeSubset,
  renameRenumberSheet,
  reorderSheet,
  resolveCustomValue,
  resolveFields,
  resolveNamedSelection,
  rewriteCrossReferences,
  saveNamedSelection,
  setSheetCustomValue,
  subsetTree,
  titleBlockFields,
  unfiledSheets,
  upsertCustomProperty,
  upsertPageSetup,
  type PageSetup,
} from "./sheetset";

function mkSheet(discipline: Sheet["discipline"], type: Sheet["number"]["type"], seq: number, title: string, id?: string): Sheet {
  return {
    id: id ?? `sheet-${discipline}-${type}${seq}`,
    number: { discipline, type, sequence: seq },
    title,
    size: "arch-d",
    orientation: "landscape",
    scaleId: "as-shown",
    discipline,
    viewportIds: [],
    revisions: [],
  };
}

function mkSet(sheets: Sheet[]): DrawingSet {
  return {
    id: "set-1",
    name: "Riverside — Construction Documents",
    sheets,
    titleBlockDefaults: {
      projectName: "Riverside Commons",
      date: "2026",
      projectNumber: "RC-01",
    },
  };
}

describe("sheet operations", () => {
  it("adds a sheet with the next free sequence in its discipline/type", () => {
    const set = mkSet([mkSheet("A", 1, 1, "Floor Plan")]);
    const { set: next, sheet } = addSheet(set, {
      discipline: "A",
      type: 1,
      title: "Roof Plan",
      size: "arch-d",
      orientation: "landscape",
    });
    expect(sheet.number.sequence).toBe(2);
    expect(formatSheetNumber(sheet.number)).toBe("A-102");
    expect(next.sheets).toHaveLength(2);
    // Original set is not mutated.
    expect(set.sheets).toHaveLength(1);
  });

  it("removes a sheet and prunes it from named selections", () => {
    let set = mkSet([mkSheet("A", 1, 1, "Floor Plan", "a1"), mkSheet("A", 2, 1, "Elevations", "a2")]);
    set = saveNamedSelection(set, "Client set", ["a1", "a2"]);
    set = removeSheet(set, "a1");
    expect(set.sheets.map((s) => s.id)).toEqual(["a2"]);
    expect(set.namedSelections?.[0].sheetIds).toEqual(["a2"]);
  });

  it("duplicates a sheet with a fresh number and copied content", () => {
    const src = mkSheet("A", 1, 1, "Floor Plan", "a1");
    src.viewportIds = ["vp1"];
    src.revisions = [{ id: "r1", delta: 1, date: "2026-01", description: "Issued" }];
    const set = mkSet([src]);
    const res = duplicateSheet(set, "a1");
    expect(res).not.toBeNull();
    expect(res!.sheet.number.sequence).toBe(2);
    expect(res!.sheet.title).toBe("Floor Plan (copy)");
    expect(res!.sheet.viewportIds).toEqual(["vp1"]);
    // Deep copy: mutating the copy's revisions must not touch the source.
    res!.sheet.revisions[0].description = "changed";
    expect(src.revisions[0].description).toBe("Issued");
  });

  it("reorders sheets within a discipline/type by swapping sequence", () => {
    const set = mkSet([
      mkSheet("A", 1, 1, "First", "a1"),
      mkSheet("A", 1, 2, "Second", "a2"),
    ]);
    const next = reorderSheet(set, "a2", "up");
    const a1 = next.sheets.find((s) => s.id === "a1")!;
    const a2 = next.sheets.find((s) => s.id === "a2")!;
    expect(a2.number.sequence).toBe(1);
    expect(a1.number.sequence).toBe(2);
  });

  it("does not reorder past the ends of a group", () => {
    const set = mkSet([mkSheet("A", 1, 1, "Only", "a1")]);
    expect(reorderSheet(set, "a1", "up")).toBe(set);
    expect(reorderSheet(set, "a1", "down")).toBe(set);
  });
});

describe("rename & renumber with cross-reference integrity", () => {
  it("returns a remap only when the number changes", () => {
    const set = mkSet([mkSheet("A", 3, 1, "Sections", "a1")]);
    const titleOnly = renameRenumberSheet(set, "a1", { title: "Building Sections" });
    expect(titleOnly.remap).toBeNull();
    expect(titleOnly.set.sheets[0].title).toBe("Building Sections");

    const renumbered = renameRenumberSheet(set, "a1", { number: { discipline: "A", type: 3, sequence: 2 } });
    expect(renumbered.remap).toEqual({ from: "A-301", to: "A-302" });
  });

  it("rewrites callouts and match lines through the remap", () => {
    const set = mkSet([mkSheet("A", 3, 1, "Sections", "a1")]);
    const { remap } = renameRenumberSheet(set, "a1", { number: { discipline: "A", type: 3, sequence: 5 } });
    expect(remap).not.toBeNull();

    const sectionMarks = [
      { id: "s1", tag: "A", targetSheet: "A-301" },
      { id: "s2", tag: "B", targetSheet: "A-401" },
    ];
    const matchLines = [{ id: "m1", adjoiningSheet: "A-301" }];

    const rewrittenMarks = rewriteCrossReferences(sectionMarks, remap!);
    const rewrittenMatch = rewriteCrossReferences(matchLines, remap!);

    expect(rewrittenMarks[0].targetSheet).toBe("A-305");
    expect(rewrittenMarks[1].targetSheet).toBe("A-401"); // untouched
    expect(rewrittenMatch[0].adjoiningSheet).toBe("A-305");
    // Non-matching object returns the same reference (no needless copy).
    expect(rewrittenMarks[1]).toBe(sectionMarks[1]);
  });

  it("changing discipline updates the sheet's discipline field", () => {
    const set = mkSet([mkSheet("A", 1, 1, "Plan", "a1")]);
    const { set: next, remap } = renameRenumberSheet(set, "a1", {
      number: { discipline: "C", type: 1, sequence: 1 },
    });
    expect(next.sheets[0].discipline).toBe("C");
    expect(remap).toEqual({ from: "A-101", to: "C-101" });
  });
});

describe("subsets", () => {
  it("builds a nested tree and reports unfiled sheets", () => {
    let set = mkSet([
      mkSheet("A", 1, 1, "Filed", "a1"),
      mkSheet("A", 1, 2, "Unfiled", "a2"),
    ]);
    set = addSubset(set, "Architectural");
    const subId = set.subsets![0].id;
    set = addSubset(set, "Plans", subId);
    const childId = set.subsets![1].id;
    set = assignSubset(set, "a1", childId);

    const tree = subsetTree(set);
    expect(tree).toHaveLength(1);
    expect(tree[0].subset.name).toBe("Architectural");
    expect(tree[0].children[0].subset.name).toBe("Plans");
    expect(tree[0].children[0].sheets.map((s) => s.id)).toEqual(["a1"]);
    expect(unfiledSheets(set).map((s) => s.id)).toEqual(["a2"]);
  });

  it("removing a subset re-parents its sheets instead of orphaning them", () => {
    let set = mkSet([mkSheet("A", 1, 1, "Sheet", "a1")]);
    set = addSubset(set, "Parent");
    const parentId = set.subsets![0].id;
    set = addSubset(set, "Child", parentId);
    const childId = set.subsets![1].id;
    set = assignSubset(set, "a1", childId);

    set = removeSubset(set, childId);
    // Sheet is re-parented to the child's parent, not dropped.
    expect(set.sheets[0].subsetId).toBe(parentId);
    expect(set.subsets!.map((s) => s.id)).toEqual([parentId]);
  });
});

describe("custom properties & fields", () => {
  it("resolves set-owned and sheet-owned custom values", () => {
    let set = mkSet([mkSheet("A", 1, 1, "Plan", "a1")]);
    set = upsertCustomProperty(set, { name: "Client", owner: "sheet-set", value: "City of Riverside" });
    set = upsertCustomProperty(set, { name: "Reviewer", owner: "sheet", value: "TBD" });
    const sheet = set.sheets[0];

    expect(resolveCustomValue(set, sheet, "Client")).toBe("City of Riverside");
    // Sheet-owned falls back to the default until overridden.
    expect(resolveCustomValue(set, sheet, "Reviewer")).toBe("TBD");
    set = setSheetCustomValue(set, "a1", "Reviewer", "J. Doe");
    expect(resolveCustomValue(set, set.sheets[0], "Reviewer")).toBe("J. Doe");
    expect(resolveCustomValue(set, sheet, "Unknown")).toBeNull();
  });

  it("removing a custom property also clears its per-sheet overrides", () => {
    let set = mkSet([mkSheet("A", 1, 1, "Plan", "a1")]);
    set = upsertCustomProperty(set, { name: "Reviewer", owner: "sheet", value: "TBD" });
    set = setSheetCustomValue(set, "a1", "Reviewer", "J. Doe");
    set = removeCustomProperty(set, "Reviewer");
    expect(set.customProperties).toHaveLength(0);
    expect(set.sheets[0].customValues?.Reviewer).toBeUndefined();
  });

  it("resolves built-in and custom fields in a template string", () => {
    let set = mkSet([mkSheet("A", 1, 1, "Ground Floor Plan", "a1"), mkSheet("A", 1, 2, "Second", "a2")]);
    set = upsertCustomProperty(set, { name: "Client", owner: "sheet-set", value: "City of Riverside" });
    const ctx = fieldContext(set, set.sheets[0], '1/8" = 1\'-0"', "2026-07-20");

    expect(resolveFields("%<CurrentSheetNumber>%", ctx)).toBe("A-101");
    expect(resolveFields("%<CurrentSheetTitle>%", ctx)).toBe("Ground Floor Plan");
    expect(resolveFields("%<SheetOf>%", ctx)).toBe("1 of 2");
    expect(resolveFields("%<SheetTotal>%", ctx)).toBe("2");
    expect(resolveFields("%<CurrentSheetSetProjectName>%", ctx)).toBe("Riverside Commons");
    expect(resolveFields("%<CurrentDate>%", ctx)).toBe("2026-07-20");
    expect(resolveFields('Client: %<CurrentSheetSetCustom "Client">%', ctx)).toBe("Client: City of Riverside");
    expect(resolveFields('Scale %<CurrentSheetScale>%', ctx)).toBe('Scale 1/8" = 1\'-0"');
    // Unknown fields resolve to empty (unpopulated), like AutoCAD's #### field.
    expect(resolveFields("[%<Nope>%]", ctx)).toBe("[]");
  });

  it("exposes a flat field map including custom properties", () => {
    let set = mkSet([mkSheet("A", 1, 1, "Plan", "a1")]);
    set = upsertCustomProperty(set, { name: "Client", owner: "sheet-set", value: "City" });
    const fields = titleBlockFields(set, set.sheets[0], "AS SHOWN", "2026");
    expect(fields.CurrentSheetNumber).toBe("A-101");
    expect(fields.SheetOf).toBe("1 of 1");
    expect(fields.Client).toBe("City");
  });
});

describe("named selections & page setups", () => {
  it("saves, resolves, replaces, and deletes named selections", () => {
    let set = mkSet([mkSheet("A", 1, 1, "One", "a1"), mkSheet("A", 1, 2, "Two", "a2"), mkSheet("A", 1, 3, "Three", "a3")]);
    set = saveNamedSelection(set, "Client set", ["a3", "a1"]);
    const id = set.namedSelections![0].id;
    // Resolves in canonical order regardless of stored order.
    expect(resolveNamedSelection(set, id).map((s) => s.id)).toEqual(["a1", "a3"]);
    // Re-saving by the same name replaces, keeping the id.
    set = saveNamedSelection(set, "Client set", ["a2"]);
    expect(set.namedSelections).toHaveLength(1);
    expect(set.namedSelections![0].id).toBe(id);
    set = deleteNamedSelection(set, id);
    expect(set.namedSelections).toHaveLength(0);
  });

  it("applies a page setup's overrides to a sheet without touching others", () => {
    let set = mkSet([mkSheet("A", 1, 1, "Plan", "a1")]);
    set = upsertPageSetup(set, { name: "Half-size PDF", size: "arch-b", scaleId: "as-shown", output: "pdf", monochrome: true });
    const ps = set.pageSetups![0] as PageSetup;
    const applied = applyPageSetup(set.sheets[0], ps);
    expect(applied.size).toBe("arch-b");
    expect(applied.orientation).toBe("landscape"); // untouched (not overridden)
    // The source sheet is unchanged.
    expect(set.sheets[0].size).toBe("arch-d");
  });
});

describe("browsing", () => {
  it("groups by discipline in canonical order", () => {
    const set = mkSet([
      mkSheet("A", 1, 1, "Arch", "a1"),
      mkSheet("C", 1, 1, "Civil", "c1"),
      mkSheet("G", 0, 1, "Cover", "g1"),
    ]);
    const groups = groupByDiscipline(set);
    // G (General) before C (Civil) before A (Architectural) per NCS order.
    expect(groups.map((g) => g.discipline)).toEqual(["G", "C", "A"]);
  });

  it("filters by discipline, type, subset, and issue", () => {
    let set = mkSet([
      mkSheet("A", 1, 1, "Plan", "a1"),
      mkSheet("A", 2, 1, "Elev", "a2"),
      mkSheet("C", 1, 1, "Site", "c1"),
    ]);
    set = { ...set, sheets: set.sheets.map((s) => (s.id === "a1" ? { ...s, issue: "For Permit" } : s)) };
    expect(filterSheets(set, { discipline: "A" }).map((s) => s.id)).toEqual(["a1", "a2"]);
    // Canonical order sorts by discipline first: C (Civil) precedes A (Architectural).
    expect(filterSheets(set, { type: 1 }).map((s) => s.id)).toEqual(["c1", "a1"]);
    expect(filterSheets(set, { issue: "For Permit" }).map((s) => s.id)).toEqual(["a1"]);
  });
});
