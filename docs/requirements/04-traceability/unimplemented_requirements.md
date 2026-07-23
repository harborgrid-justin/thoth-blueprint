# Master Audit: 100 Unimplemented / Partially-Implemented Requirements

This document tracks 100 advanced architectural and civil engineering requirements sourced from the AutoCAD Architecture User Guide and Civil specifications that are currently **Not Implemented** or **Partially Implemented** in the Thoth Blueprint codebase.

> **Snapshot note (2026-07-23 audit pass).** Statuses below were re-verified
> against the actual TypeScript source (`packages/domain/src/**`), the
> frontend (`apps/web/src/**`), and each Rust crate's own `STATUS.md`/`GAPS.md`
> under `crates/*/`. Several crates (`thoth-civil`, `thoth-survey`,
> `thoth-drawing`, `thoth-planning`) had concurrent agents closing
> cross-crate integration gaps at the time of this pass — this document
> reflects what those files showed when read, not a guarantee of their
> final state; re-verify against the crates' own `STATUS.md`/`GAPS.md` for
> anything time-sensitive. Every status change below cites the specific
> file/function backing it — statuses without a new citation were left as
> found because no supporting (or contradicting) implementation could be
> located in the time available for this pass, not because they are
> confirmed correct.

---

## I. Renovation (Chapter 7) - 10 Requirements
*Traceability Link: [rtm_part_45.md](rtm_part_45.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-001 | Renovation Mode | The system shall support a Renovation Mode Toggle, automatically tracking all user modifications as "New" or "Demolished" status. | Implemented — `apps/web/src/store/workspaceStore.ts` (`renovationMode`/`toggleRenovationMode`/`activeRenovationCategory`, auto-tagging new elements at create-time) and the `TopBar.tsx` "Renovation" toggle + category select. |
| REQ-UNIMP-002 | Renovation Mode | Demolition objects must be automatically shifted to a designated Demolition layer standard key (e.g. prefixing layer name with `D-`). | Implemented — `apps/web/src/store/workspaceStore.ts` (`layerId = \`D-${layerId}\`` when `activeRenovationCategory === "demolished"`, on element creation). |
| REQ-UNIMP-003 | Renovation Mode | The system shall support locking elements marked as "Existing" to prevent horizontal translation or editing modifications. | Implemented — `apps/web/src/store/workspaceStore.ts` guards `updateElement`/`updateBoundary`/`moveSelection`/`deleteSelection` (and vertex edits) against elements whose `renovationStatus` is `"existing"` while `renovationMode` is on, each throwing "Renovation Mode Lock: …". |
| REQ-UNIMP-004 | Renovation Mode | The system shall support Renovation Display Configurations that filter existing, new, and demolished elements (e.g. hidden dashed lines for demolition). | Partially Implemented — `apps/web/src/features/canvas/helpers/elementShapeHelpers.ts` colors "new"/"demolished" elements and sets `strokeDash = "3 3"` for demolished geometry, but there is no display-configuration control to hide/filter elements by renovation status. |
| REQ-UNIMP-005 | Renovation Mode | The system shall provide automated rules classifying newly drawn objects into the active Renovation category. | Implemented — `apps/web/src/store/workspaceStore.ts` ("Auto classify renovation status (REQ-UNIMP-005)": `element.renovationStatus = activeRenovationCategory` on element creation). |
| REQ-UNIMP-006 | Renovation Mode | Quantity takeoff sheets must separate material calculations based on Existing, New, and Demolished statuses. | Implemented — `packages/domain/src/planning/renovation.ts::computeRenovationTakeoffs` (per-status count/area) and its 1:1 Rust port `crates/thoth-planning/src/renovation.rs` (ported+tested per `crates/thoth-planning/STATUS.md`). |
| REQ-UNIMP-007 | Renovation Mode | The system shall produce separate drawing plans (Demolition Plan, Construction Plan) from the same model using style overrides. | Not Implemented — no sheet/drawing-set production keyed on renovation status was found under `packages/domain/src/drawing/**` or `crates/thoth-drawing`. |
| REQ-UNIMP-008 | Renovation Mode | Wall intersections between New and Demolished walls must not clean up. | Not Implemented — no renovation-aware wall-cleanup logic found in `packages/domain/src/planning/building.ts` or elsewhere. |
| REQ-UNIMP-009 | Renovation Mode | The system shall provide visual badges indicating renovation status of selected items in the canvas interface. | Implemented — `apps/web/src/features/canvas/ElementShape.tsx` renders a "● NEW" / "✕ DEMO" badge when `renovationMode && renovationStatus !== "existing"`. |
| REQ-UNIMP-010 | Renovation Mode | The system shall run a Renovation Design Audit to warn users of structural violations (e.g., placing new windows in a demolished wall). | Implemented — `packages/domain/src/planning/renovation.ts::runRenovationAudit` and its 1:1 Rust port in `crates/thoth-planning/src/renovation.rs` (ported+tested per `crates/thoth-planning/STATUS.md`); note the ported rule set checks new-vs-demolished/existing building overlaps, not literally "new windows in a demolished wall" as the illustrative example states. |

---

## II. Stairs (Chapter 27) - 15 Requirements
*Traceability Link: [rtm_part_55.md](rtm_part_55.md) & [rtm_part_78.md](rtm_part_78.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-011 | Stairs Design | The system shall support spiral stair creation based on radius, height offsets, and total rotation angle parameters. | Implemented — `packages/domain/src/planning/stairs.ts::calculateStairGeometry` (`stairType === "spiral"` branch: `radius`, `width`, `totalRotation`). |
| REQ-UNIMP-012 | Stairs Design | The system shall support U-shaped stair creation with automated flight divisions. | Implemented — `stairs.ts` `stairType === "u-shape"` branch (two flights split by riser count, `intermediateLandingLength`). |
| REQ-UNIMP-013 | Stairs Design | The system shall calculate stair tread winder angles automatically based on turn geometry. | Implemented — `stairs.ts` spiral branch computes each tread's angular wedge from `totalRotation`/tread count (`angle = (i / totalTreadCount) * totalRotRad`). |
| REQ-UNIMP-014 | Stairs Design | The system shall enforce stair tread depth and riser height calculation limits to balance riser count and length. | Implemented — `stairs.ts` (`riserHeightLimit`/`treadDepthLimit`, `riserCount = Math.ceil(height / riserHeightLimit)`, with compliance warnings). |
| REQ-UNIMP-015 | Stairs Design | The system shall support setting custom landing slab thickness distinct from flight tread slab thicknesses. | Implemented — `stairs.ts` (`stair.landingSlabThickness` vs. `stair.treadSlabThickness`, both used independently in the concrete-volume calculation). |
| REQ-UNIMP-016 | Stairs Design | The system shall support assigning structural side channel profiles (open or closed stringers) along stair edges. | Partially Implemented — `stairs.ts` has a numeric `stringerWidth` used in the concrete-volume calculation, but no open-vs-closed stringer profile/style selection. |
| REQ-UNIMP-017 | Stairs Design | The system shall check for vertical overhead clearance heights against ceiling objects (warning on < 6'8" clearance). | Implemented — `stairs.ts` (`overheadClearanceLimit`/`DEFAULT_OVERHEAD_LIMIT_M` from IBC headroom data, warns when `ceilingElevation - height < overheadLimit`). |
| REQ-UNIMP-018 | Stairs Design | The system shall support splitting a continuous stair run into multiple flights by inserting intermediate landings. | Partially Implemented — `stairs.ts` splits into exactly two flights with one intermediate landing for `stairType === "u-shape"` only; there is no generic N-flight/N-landing split for arbitrary stair runs. |
| REQ-UNIMP-019 | Stairs Design | The system shall support custom profile outlines for stair tread nosing edges. | Not Implemented — no nosing-profile field or geometry found in `stairs.ts`. |
| REQ-UNIMP-020 | Stairs Design | The system shall support a texture-hatching parameter for slip-resistant grooves on tread surfaces. | Not Implemented — no such parameter exists on `Stair`/`StairGeometryResults`. |
| REQ-UNIMP-021 | Stairs Design | The system shall generate centerline coordinates for structural stringer layouts. | Implemented — `stairs.ts` `stringerCenterlines` (left/right, or per-flight, point arrays) computed for all three stair types. |
| REQ-UNIMP-022 | Stairs Design | The system shall automatically draw a 2D plan representation display cut break line at designated heights (e.g., 4 feet). | Implemented — `stairs.ts` `breakLine` computed at a ~1.2 m (~4 ft) cut height for all three stair types. |
| REQ-UNIMP-023 | Stairs Design | The system shall draw downward direction swing indicators and direction arrow paths indicating "Down" in 2D sheets. | Implemented — `stairs.ts` `arrowPath` computed for all three stair types. |
| REQ-UNIMP-024 | Stairs Design | The system shall provide automatic anchor point generation for balusters mounting on treads. | Implemented — `stairs.ts` `balusterAnchors` computed per-tread for all three stair types. |
| REQ-UNIMP-025 | Stairs Design | The system shall calculate concrete volumes and wood board-foot quantities for stair structures. | Implemented — `stairs.ts` `concreteVolumeCuM` (treads + landings + stringers) and `timberBoardFeet`. |

---

## III. Curtain Walls (Chapter 21) - 15 Requirements
*Traceability Link: [rtm_part_53.md](rtm_part_53.md), [rtm_part_80.md](rtm_part_80.md) & [rtm_part_99.md](rtm_part_99.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-026 | Curtain Walls | The system shall support horizontal grid division offsets configurations (fixed distance, manual grid coordinates, or uniform divisions). | Implemented — `packages/domain/src/planning/curtainwall.ts::calculateCurtainWallGeometry`'s `getSplits()` supports `"uniform"`/`"fixed"`/`"manual"` division modes on both axes. |
| REQ-UNIMP-027 | Curtain Walls | The system shall support assigning custom profiles (rectangular, offset) to curtain wall perimeter frame edges. | Not Implemented — `curtainwall.ts` only draws a single fixed-width (`frameProfileWidth`) rectangular perimeter frame; no profile catalog/offset variants. |
| REQ-UNIMP-028 | Curtain Walls | The system shall support curtain wall mullion indexing vertically/horizontally to assign different profile widths. | Partially Implemented — `curtainwall.ts` indexes vertical mullion widths via `grid.mullionWidths?.[i]`, but horizontal mullions always use a fixed `0.05` width (not indexed). |
| REQ-UNIMP-029 | Curtain Walls | The system shall support assigning different infill materials (glazing, brick, insulation panel) to specific grid cells. | Implemented — `curtainwall.ts` `grid.infillMaterials?.[\`${i},${j}\`]` per grid cell, consumed for panel material, wind-load warnings, and R-value. |
| REQ-UNIMP-030 | Curtain Walls | The system shall support nested layout rules where a curtain wall panel cell contains a secondary curtain wall grid. | Implemented — `curtainwall.ts` `wall.nestedGrids?.[cellKey]` recursed via `processGrid()`. |
| REQ-UNIMP-031 | Curtain Walls | The system shall support custom structural corner shapes (L-corner, V-corner) at grid intersections. | Partially Implemented — `CurtainWall.cornerStyle?: "rectangular" \| "L-corner" \| "V-corner"` exists on the type (`packages/domain/src/spatial/types/index.ts`), but `calculateCurtainWallGeometry` never reads `cornerStyle`, so no corner geometry actually differs by style. |
| REQ-UNIMP-032 | Curtain Walls | The system shall support aligning curtain walls along curved path footprints with dynamic facet segmentations. | Not Implemented — `curtainwall.ts` only resolves a straight line between `wall.boundary[0]`/`[1]`. |
| REQ-UNIMP-033 | Curtain Walls | The system shall support inserting custom doors or windows into designated curtain wall grid cells, overwriting infills. | Partially Implemented — `curtainwall.ts` marks a cell `isOverwritten: mat === "door" \|\| mat === "window"` when its infill material string is `"door"`/`"window"`, but does not insert an actual `DoorElement`/`WindowElement` with its own geometry into the cell. |
| REQ-UNIMP-034 | Curtain Walls | The system shall support setting expansions joint gaps spacing between curtain wall panel frames. | Implemented — `curtainwall.ts` `wall.expansionGap` (`gap`) applied to every panel's start/end offset. |
| REQ-UNIMP-035 | Curtain Walls | The system shall support vertical and horizontal offsets for structural glass panes within frames. | Partially Implemented — `curtainwall.ts` has a single `wall.paneOffset` applied uniformly; there is no separate vertical vs. horizontal offset. |
| REQ-UNIMP-036 | Curtain Walls | The system shall support anchoring parameters for glass clip accessories. | Implemented — `curtainwall.ts` `clipAnchors`/`wall.clipSpacing` computed per glazing panel. |
| REQ-UNIMP-037 | Curtain Walls | The system shall support structural ties anchors calculations between curtain frames and structural columns. | Partially Implemented — `curtainwall.ts` computes `structuralTies` anchor points at `wall.structuralTieSpacing` intervals along the wall, but does not reference or align to actual structural-column elements. |
| REQ-UNIMP-038 | Curtain Walls | The system shall store R-value and thermal break metadata properties directly on curtain wall frame styles. | Partially Implemented — `CurtainWall.frameRValue?: number` exists on the type, and `curtainwall.ts` independently computes `overallUFactor`/`overallRValue` from panel-material catalog data; there is no `frameRValue` field consumption in that calculation and no thermal-break metadata field at all. |
| REQ-UNIMP-039 | Curtain Walls | The system shall automate the generation of flat vertical elevations views from curtain wall boundaries. | Partially Implemented — `curtainwall.ts` returns a simple bounding-box `elevationOutline`, not a full elevation drawing of panels/mullions. |
| REQ-UNIMP-040 | Curtain Walls | The system shall compile automated schedule sheets counting panels of specific sizes and materials. | Implemented — `curtainwall.ts` builds an `inventory` array counting panels by material + width×height, sorted by count. |

---

## IV. Door and Window Assemblies (Chapter 22) - 10 Requirements
*Traceability Link: [rtm_part_54.md](rtm_part_54.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-041 | Assemblies | The system shall support defining frame divisions for door/window combinations. | Not Implemented — `packages/domain/src/planning/doorwindow.ts` computes standalone door/window geometry only; no combined "assembly" object with frame divisions. |
| REQ-UNIMP-042 | Assemblies | The system shall support mapping standard door or window styles directly to assembly cell locations. | Not Implemented — no assembly-cell concept exists (see REQ-UNIMP-041). |
| REQ-UNIMP-043 | Assemblies | The system shall calculate frame miter joints automatically at assembly corners. | Not Implemented — no miter-joint calculation found in `doorwindow.ts`. |
| REQ-UNIMP-044 | Assemblies | The system shall support configuring vertical side panels (sidelites) on door frames. | Not Implemented — no sidelite field on `DoorElement` or in `doorwindow.ts`. |
| REQ-UNIMP-045 | Assemblies | The system shall support configuring top overhead glass panels (transoms) on assemblies. | Not Implemented — no transom field or geometry found. |
| REQ-UNIMP-046 | Assemblies | The system shall support opening templates subtraction in hosting wall bodies. | Not Implemented — no wall-opening subtraction logic found in `doorwindow.ts` or `building.ts`. |
| REQ-UNIMP-047 | Assemblies | The system shall support placing structural support lintels directly above assembly openings. | Not Implemented — no lintel placement logic found. |
| REQ-UNIMP-048 | Assemblies | The system shall support custom threshold and sill profiles options for assemblies. | Implemented — `doorwindow.ts::calculateDoorGeometry`/`calculateWindowGeometry` compute `sillPolygon`/`thresholdPolygon` from `sillThickness`/`sillOverhang`/`thresholdHeight` (door) and `sillThickness`/`sillOverhang` (window). |
| REQ-UNIMP-049 | Assemblies | The system shall provide stretch grips to resize frames while keeping doors/windows relative sizes. | Not Implemented — no proportional frame-resize grip behavior found for door/window elements specifically. |
| REQ-UNIMP-050 | Assemblies | The system shall compile cost estimation sheets based on frame length and panel styles counts. | Partially Implemented — `doorwindow.ts::compileUnitSchedule` compiles a door/window schedule (type, width, height, hardware, fire/STC rating) but computes no cost figures. |

---

## V. Roofs (Chapter 29) - 10 Requirements
*Traceability Link: [rtm_part_60.md](rtm_part_60.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-051 | Roofs Design | The system shall support creating sloped roofs automatically by tracing wall outer footprint curves. | Partially Implemented — corrected from a prior "Fully Implemented" claim: `packages/domain/src/planning/roof.ts::calculateRoofGeometry` computes slope/area/ridge/hip math from a *supplied* `roof.boundary` (falling back to a dummy square if absent); it does not derive the boundary by tracing wall footprints automatically — no such trace function was found in `building.ts` or elsewhere. |
| REQ-UNIMP-052 | Roofs Design | The system shall support selectively overriding slope parameters on individual roof boundary segments. | Not Implemented — corrected from a prior "Fully Implemented" claim: `roof.ts` reads a single global `roof.pitch`; there is no per-segment slope override. |
| REQ-UNIMP-053 | Roofs Design | The system shall support turning hip roofs edges into vertical gable walls automatically. | Not Implemented — corrected from a prior "Fully Implemented" claim: `roof.ts` computes hip ridge/hip-line coordinates for `roofType === "hip"` but generates no gable-wall geometry. |
| REQ-UNIMP-054 | Roofs Design | The system shall support extruding custom fascia boards and soffit trim profiles along roof edges. | Not Implemented — corrected from a prior "Fully Implemented" claim: `roof.ts` computes `gutterPaths`/`downspoutAnchors` line segments only; no fascia-board or soffit-trim profile extrusion. |
| REQ-UNIMP-055 | Roofs Design | The system shall support cutting roof structures automatically when a secondary dormer roof intersects. | Not Implemented — corrected from a prior "Fully Implemented" claim: the `Dormer`/`RoofElement` *types* exist (`packages/domain/src/spatial/types/index.ts`, ported in `crates/thoth-planning/src/elements.rs`), but `calculateRoofGeometry` contains no dormer-intersection cutting algorithm. |
| REQ-UNIMP-056 | Roofs Design | The system shall validate roof drainage slope criteria against minimum thresholds (e.g. 1/4" per foot). | Partially Implemented — corrected from a prior "Fully Implemented" claim: `roof.ts` warns when `pitchVal < 3` (a 3:12 ice/water-membrane threshold, not the "1/4 inch per foot" low-slope drainage criterion the requirement names as its example), and separately checks provided vs. required attic-vent area — a real but differently-scoped slope/drainage check. |
| REQ-UNIMP-057 | Roofs Design | The system shall calculate automatic rafter and truss insertion coordinate points. | Implemented — `roof.ts` `rafterLines` computed at fixed spacing across the roof width from ridge to eave; note it models evenly-spaced rafters only, with no distinct truss-node placement. |
| REQ-UNIMP-058 | Roofs Design | The system shall calculate coordinate paths of valley/hip seams for flashing cost estimates. | Partially Implemented — corrected from a prior "Fully Implemented" claim: `roof.ts` populates `hipLines` for `roofType === "hip"`, but the `valleyLines` array is declared and returned and is **never populated** (always empty) — valley-seam coordinates are not actually computed. |
| REQ-UNIMP-059 | Roofs Design | The system shall support custom multi-layer composite definitions (plywood, insulation, shingles) for roofs. | Partially Implemented — corrected from a prior "Fully Implemented" claim: `roof.ts` computes `sheathingVolCuM`/`insulationVolCuM`/`shingleWeightKg`/`timberBoardFeet` from catalog-or-fallback per-area constants, but the insulation thickness (`0.18`) is hardcoded and there is no user-configurable arbitrary layer stack — only these four fixed layers. |
| REQ-UNIMP-060 | Roofs Design | The system shall subtract chimney/skylight voids from roof sheet material takeoffs. | Not Implemented — corrected from a prior "Fully Implemented" claim: no void-subtraction logic for chimneys/skylights was found in `calculateRoofGeometry`'s takeoff calculations. |

---

## VI. Structural Members (Chapter 31) - 15 Requirements
*Traceability Link: [rtm_part_61.md](rtm_part_61.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-061 | Structural | The system shall support placing columns automatically at intersections of standard grids. | Partially Implemented |
| REQ-UNIMP-062 | Structural | The system shall support placing structural beams along baseline alignments with automatic end coping cuts. | Not Implemented |
| REQ-UNIMP-063 | Structural | The system shall support importing AISC shapes profiles (W-shapes, channels, angles) from catalog database. | Partially Implemented |
| REQ-UNIMP-064 | Structural | The system shall support adding steel baseplates coordinates and anchor bolt holes dimensions. | Not Implemented |
| REQ-UNIMP-065 | Structural | The system shall support placing angled braces between column-beam nodes. | Not Implemented |
| REQ-UNIMP-066 | Structural | The system shall support custom trims at members intersections (cope, miter, butt joints). | Not Implemented |
| REQ-UNIMP-067 | Structural | The system shall calculate concrete reinforcement schedules (rebar diameter and spacing calculation formulas). | Not Implemented |
| REQ-UNIMP-068 | Structural | The system shall support timber framing layouts joists and studs spacings parameters configurations. | Not Implemented |
| REQ-UNIMP-069 | Structural | The system shall support storing design loads properties (dead load, live load) directly on member metadata. | Not Implemented |
| REQ-UNIMP-070 | Structural | The system shall support span-to-depth deflection check notifications (e.g. L/360). | Not Implemented |
| REQ-UNIMP-071 | Structural | The system shall support multi-component members (e.g., concrete columns wrapped in steel jackets). | Not Implemented |
| REQ-UNIMP-072 | Structural | The system shall support adding clip angles and shear tab components from standard catalogs. | Not Implemented |
| REQ-UNIMP-073 | Structural | The system shall support pad footings and strip footings aligned under columns and walls. | Not Implemented |
| REQ-UNIMP-074 | Structural | The system shall calculate total weights for structural steel takeoffs. | Not Implemented |
| REQ-UNIMP-075 | Structural | The system shall support exporting structural centerlines skeleton model in CIS/2 or IFC Structural formats. | Not Implemented |

---

## VII. Project Standards (Chapter 8) - 10 Requirements
*Traceability Link: [rtm_part_46.md](rtm_part_46.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-076 | Project Standards | The system shall lock specific local styles to prevent modifications if they differ from central standards drawing. | Not Implemented |
| REQ-UNIMP-077 | Project Standards | The system shall support a background audit highlighting out-of-sync style definitions. | Not Implemented |
| REQ-UNIMP-078 | Project Standards | The system shall flag layers that violate NCS naming formatting rules. | Not Implemented |
| REQ-UNIMP-079 | Project Standards | The system shall support automated alignment checks of sheet border sizes against standards template. | Not Implemented |
| REQ-UNIMP-080 | Project Standards | The system shall keep a continuous logging of style override events in standards report. | Not Implemented |
| REQ-UNIMP-081 | Project Standards | The system shall prompt alarm alerts/toasts when CAD managers update the central standard drawing file. | Not Implemented |
| REQ-UNIMP-082 | Project Standards | The system shall require reason text entry when users explicitly bypass standard checks. | Not Implemented |
| REQ-UNIMP-083 | Project Standards | The system shall support auditing multiple project drawings simultaneously (Batch Audit). | Not Implemented |
| REQ-UNIMP-084 | Project Standards | The system shall support exporting drawing validation audits detailing standards violations. | Not Implemented |
| REQ-UNIMP-085 | Project Standards | The system shall run standards check on drawing load. | Not Implemented |

---

## VIII. Drawing Compare (Chapter 9) - 10 Requirements
*Traceability Link: [rtm_part_47.md](rtm_part_47.md) & [rtm_part_94.md](rtm_part_94.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-086 | Drawing Compare | The system shall highlight exact boundary shifts when comparing two drawing versions (Geometric Delta). | Partially Implemented |
| REQ-UNIMP-087 | Drawing Compare | The system shall flag modified property sets in compare panels. | Not Implemented |
| REQ-UNIMP-088 | Drawing Compare | The system shall support overlay alignment options (scaling/translation) using benchmark coordinates. | Not Implemented |
| REQ-UNIMP-089 | Drawing Compare | The system shall support Next/Previous arrows navigation to walk through differences list step-by-step. | Not Implemented |
| REQ-UNIMP-090 | Drawing Compare | The system shall support filtering display to show only geometry edits, excluding text changes. | Not Implemented |
| REQ-UNIMP-091 | Drawing Compare | The system shall support drawing automated clouds around compared changes. | Not Implemented |
| REQ-UNIMP-092 | Drawing Compare | The system shall support exporting combined DWGs containing colored compared markups. | Not Implemented |
| REQ-UNIMP-093 | Drawing Compare | The system shall isolate comparing drawings into temporary unique layers (e.g. `COMPARE_RED`). | Not Implemented |
| REQ-UNIMP-094 | Drawing Compare | The system shall detect and flag modification details inside referenced drawings (xrefs). | Not Implemented |
| REQ-UNIMP-095 | Drawing Compare | The system shall generate a text file list summary of changed coordinate locations. | Not Implemented |

---

## IX. Napkin Sketch (Chapter 18) - 5 Requirements
*Traceability Link: [rtm_part_88.md](rtm_part_88.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-096 | Napkin Sketch | The system shall apply jitter algorithms to deform plan lines into sketchy hand-drawn profiles. | Implemented — `apps/web/src/features/survey/PlatDrawing.tsx` and `PlatSheetDialog.tsx` define an SVG `<filter>` (`feTurbulence type="fractalNoise"` + `feDisplacementMap`) applied via a toggleable "hand-drawn" view mode (`mode`/`sheetView === "handdrawn"`); a separate `handDrawnMode` toggle also exists in `apps/web/src/store/uiStore.ts`/`TopBar.tsx`. |
| REQ-UNIMP-097 | Napkin Sketch | The system shall provide standard presets for Pencil, Ink, Charcoal, or Loose Sketch styles. | Not Implemented |
| REQ-UNIMP-098 | Napkin Sketch | The system shall support deforming lines to overshoot slightly beyond intersections. | Not Implemented |
| REQ-UNIMP-099 | Napkin Sketch | The system shall automatically scale wiggle factors based on active viewport plot scale. | Not Implemented |
| REQ-UNIMP-100 | Napkin Sketch | The system shall support loose hatching overlays to simulate hand shading. | Not Implemented |

---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](../README.md)
- [Master Requirements Traceability Matrix (RTM)](traceability-matrix.md)
- [Requirements Coverage Report](coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](unimplemented_requirements.md)
- [Frontend Functional Requirements](../02-functional/frontend-requirements.md)
- [Backend Functional Requirements](../02-functional/backend-requirements.md)
- [Domain Functional Requirements](../02-functional/domain-requirements.md)
- [Interoperability Requirements](../02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](../03-nonfunctional/nonfunctional-requirements.md)


