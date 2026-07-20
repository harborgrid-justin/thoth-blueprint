# CAD Sheet Sets — AutoCAD Sheet Set Manager feature parity

Thoth Blueprint produces architecture & engineering CAD sheet sets (Roadmap
[Phase 6](ROADMAP.md#phase-6--architecture--engineering-cad-sheets)). Because
Thoth is **cloud-first** and its sheets are compositions of the shared
planning-domain model (not DWG files with xrefs — see requirements `CON-012`),
the AutoCAD **Sheet Set Manager (SSM)** workflow is re-imagined rather than
copied: there is no `DST` file, no per-sheet DWG, and no eTransmit of loose
files. The organizing and automation *concepts* map directly, and are
implemented in `packages/domain/sheetset.ts` (framework-agnostic, unit-tested)
and driven from the **Sheet Set Manager** dialog in `apps/web`.

## Feature map

The columns below follow the SSM guide's own 17-step structure.

| SSM step / feature | Thoth support | Where |
| --- | --- | --- |
| **1. Create a sheet set** | ✅ A project's `DrawingSet` is created (auto-derived from the site, then editable/persisted). | `defaultSet.ts`, `updateSheetSet` |
| **2. Organize sheets** — rename & **renumber**, remove, **subsets** (nestable), reorder | ✅ `renameRenumberSheet`, `removeSheet`, `addSubset`/`removeSubset`/`assignSubset`, `reorderSheet`. Renumber returns a **remap** so callouts follow. | `sheetset.ts` |
| **3. Sheet list table** (drawing index on the cover) | ✅ Auto-generated sheet index on the `G-0xx` cover; updates as sheets change. | `builders.ts` `buildIndexSheet`, `sheetIndex` |
| **4. Import existing layouts** | ⚠️ N/A in the cloud model (no DWG layouts). Equivalent = add a sheet + place a viewport. | — |
| **5. Plot using default page setups** | 🟡 Publish whole set or a selection to PDF. | `PublishTab`, `exportDrawingSetPdf` |
| **6. Publish to PDF/DWF** | 🟡 Multi-sheet vector **PDF** (true-scale). DWF not planned; PDF/A·PDF/E archival is Phase-6 planned. | `pdfExport.ts` |
| **7. Archive / transmittal (eTransmit)** | ⬜ Cloud projects are server-persisted, so file-bundling doesn't apply; a per-issue release package + manifest is planned. | — |
| **8. Named sheet selections** | ✅ Save / restore / delete named selections; publish drives off them. | `saveNamedSelection`, `resolveNamedSelection` |
| **9. Sheet-set properties** | ✅ Set name/description + title-block defaults (project, client, location, drawn/checked, date, project no.). | `PropertiesTab` |
| **10. Custom properties** (set- or sheet-owned) | ✅ `CustomProperty` with `owner: "sheet-set" \| "sheet"`, per-sheet overrides. | `sheetset.ts` |
| **11. Create new sheets (from template)** | ✅ New sheet from region **sheet standards** (size/orientation), auto next NCS sequence; duplicate preserves content. | `addSheet`, `duplicateSheet` |
| **12. Automating title-block data (fields)** | ✅ `%<Field>%` engine: `CurrentSheetNumber`, `CurrentSheetTitle`, `SheetOf`, `CurrentSheetSetProjectName`, `CurrentSheetSetCustom "…"`, `CurrentSheetCustom "…"`, `CurrentDate`, … | `resolveFields`, `titleBlockFields` |
| **13. Plotting using any page setup** | ✅ Named **page setups** (size/orientation/scale/plot-style/mono/output) applied to the publish scope on the fly. | `PageSetup`, `applyPageSetup` |
| **14. Sheet views** (viewport at scale from a model view) | 🟡 `SheetViewport` with true model→paper scale transforms in the domain; interactive drag-to-place from a model-view tree is planned. | `sheetview.ts` |
| **15–16. View labels + automating view-label data** | 🟡 Viewport title bubbles (number/title/scale) render; `SheetSetPlaceholder`-style label fields resolve via the field engine. | `builders.ts`, `resolveFields` |
| **17. Automating callout data + hyperlinks** | 🟡 Section/detail/elevation marks and match lines carry a `targetSheet`; **cross-references stay valid on renumber** (the SSM's key promise). Click-through navigation is planned. | `rewriteCrossReferences`, `sheetview.ts` |
| Sheet-set browser (project navigator) | ✅ Discipline-grouped browser with filters (discipline / type / issue / subset). | `groupByDiscipline`, `filterSheets` |

Legend: ✅ implemented · 🟡 partial · ⬜ planned · ⚠️ intentionally not applicable in the cloud model.

## Not applicable / out of scope

- **DST/DWG/xref file mechanics, eTransmit of loose files** — Thoth is
  server-backed; there are no per-sheet drawing files to bundle.
- **DWF publishing** — superseded by PDF here.
- **Engineering calculations and 3D BIM authoring** remain Phase-6 non-goals
  (see the [roadmap non-goals](ROADMAP.md#non-goals-for-now)); Thoth produces the
  *drawings*, not the analyses that populate them.
