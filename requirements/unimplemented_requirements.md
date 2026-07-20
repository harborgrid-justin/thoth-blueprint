# Master Audit: 100 Unimplemented / Partially-Implemented Requirements

This document tracks 100 advanced architectural and civil engineering requirements sourced from the AutoCAD Architecture User Guide and Civil specifications that are currently **Not Implemented** or **Partially Implemented** in the Thoth Blueprint codebase.

---

## I. Renovation (Chapter 7) - 10 Requirements
*Traceability Link: [rtm_part_45.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_45.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-001 | Renovation Mode | The system shall support a Renovation Mode Toggle, automatically tracking all user modifications as "New" or "Demolished" status. | Not Implemented |
| REQ-UNIMP-002 | Renovation Mode | Demolition objects must be automatically shifted to a designated Demolition layer standard key (e.g. prefixing layer name with `D-`). | Not Implemented |
| REQ-UNIMP-003 | Renovation Mode | The system shall support locking elements marked as "Existing" to prevent horizontal translation or editing modifications. | Partially Implemented |
| REQ-UNIMP-004 | Renovation Mode | The system shall support Renovation Display Configurations that filter existing, new, and demolished elements (e.g. hidden dashed lines for demolition). | Partially Implemented |
| REQ-UNIMP-005 | Renovation Mode | The system shall provide automated rules classifying newly drawn objects into the active Renovation category. | Not Implemented |
| REQ-UNIMP-006 | Renovation Mode | Quantity takeoff sheets must separate material calculations based on Existing, New, and Demolished statuses. | Not Implemented |
| REQ-UNIMP-007 | Renovation Mode | The system shall produce separate drawing plans (Demolition Plan, Construction Plan) from the same model using style overrides. | Not Implemented |
| REQ-UNIMP-008 | Renovation Mode | Wall intersections between New and Demolished walls must not clean up. | Not Implemented |
| REQ-UNIMP-009 | Renovation Mode | The system shall provide visual badges indicating renovation status of selected items in the canvas interface. | Not Implemented |
| REQ-UNIMP-010 | Renovation Mode | The system shall run a Renovation Design Audit to warn users of structural violations (e.g., placing new windows in a demolished wall). | Not Implemented |

---

## II. Stairs (Chapter 27) - 15 Requirements
*Traceability Link: [rtm_part_55.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_55.md) & [rtm_part_78.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_78.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-011 | Stairs Design | The system shall support spiral stair creation based on radius, height offsets, and total rotation angle parameters. | Not Implemented |
| REQ-UNIMP-012 | Stairs Design | The system shall support U-shaped stair creation with automated flight divisions. | Not Implemented |
| REQ-UNIMP-013 | Stairs Design | The system shall calculate stair tread winder angles automatically based on turn geometry. | Not Implemented |
| REQ-UNIMP-014 | Stairs Design | The system shall enforce stair tread depth and riser height calculation limits to balance riser count and length. | Not Implemented |
| REQ-UNIMP-015 | Stairs Design | The system shall support setting custom landing slab thickness distinct from flight tread slab thicknesses. | Not Implemented |
| REQ-UNIMP-016 | Stairs Design | The system shall support assigning structural side channel profiles (open or closed stringers) along stair edges. | Not Implemented |
| REQ-UNIMP-017 | Stairs Design | The system shall check for vertical overhead clearance heights against ceiling objects (warning on < 6'8" clearance). | Not Implemented |
| REQ-UNIMP-018 | Stairs Design | The system shall support splitting a continuous stair run into multiple flights by inserting intermediate landings. | Not Implemented |
| REQ-UNIMP-019 | Stairs Design | The system shall support custom profile outlines for stair tread nosing edges. | Not Implemented |
| REQ-UNIMP-020 | Stairs Design | The system shall support a texture-hatching parameter for slip-resistant grooves on tread surfaces. | Not Implemented |
| REQ-UNIMP-021 | Stairs Design | The system shall generate centerline coordinates for structural stringer layouts. | Not Implemented |
| REQ-UNIMP-022 | Stairs Design | The system shall automatically draw a 2D plan representation display cut break line at designated heights (e.g., 4 feet). | Not Implemented |
| REQ-UNIMP-023 | Stairs Design | The system shall draw downward direction swing indicators and direction arrow paths indicating "Down" in 2D sheets. | Not Implemented |
| REQ-UNIMP-024 | Stairs Design | The system shall provide automatic anchor point generation for balusters mounting on treads. | Not Implemented |
| REQ-UNIMP-025 | Stairs Design | The system shall calculate concrete volumes and wood board-foot quantities for stair structures. | Not Implemented |

---

## III. Curtain Walls (Chapter 21) - 15 Requirements
*Traceability Link: [rtm_part_53.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_53.md), [rtm_part_80.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_80.md) & [rtm_part_99.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_99.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-026 | Curtain Walls | The system shall support horizontal grid division offsets configurations (fixed distance, manual grid coordinates, or uniform divisions). | Not Implemented |
| REQ-UNIMP-027 | Curtain Walls | The system shall support assigning custom profiles (rectangular, offset) to curtain wall perimeter frame edges. | Not Implemented |
| REQ-UNIMP-028 | Curtain Walls | The system shall support curtain wall mullion indexing vertically/horizontally to assign different profile widths. | Not Implemented |
| REQ-UNIMP-029 | Curtain Walls | The system shall support assigning different infill materials (glazing, brick, insulation panel) to specific grid cells. | Not Implemented |
| REQ-UNIMP-030 | Curtain Walls | The system shall support nested layout rules where a curtain wall panel cell contains a secondary curtain wall grid. | Not Implemented |
| REQ-UNIMP-031 | Curtain Walls | The system shall support custom structural corner shapes (L-corner, V-corner) at grid intersections. | Not Implemented |
| REQ-UNIMP-032 | Curtain Walls | The system shall support aligning curtain walls along curved path footprints with dynamic facet segmentations. | Not Implemented |
| REQ-UNIMP-033 | Curtain Walls | The system shall support inserting custom doors or windows into designated curtain wall grid cells, overwriting infills. | Not Implemented |
| REQ-UNIMP-034 | Curtain Walls | The system shall support setting expansions joint gaps spacing between curtain wall panel frames. | Not Implemented |
| REQ-UNIMP-035 | Curtain Walls | The system shall support vertical and horizontal offsets for structural glass panes within frames. | Not Implemented |
| REQ-UNIMP-036 | Curtain Walls | The system shall support anchoring parameters for glass clip accessories. | Not Implemented |
| REQ-UNIMP-037 | Curtain Walls | The system shall support structural ties anchors calculations between curtain frames and structural columns. | Not Implemented |
| REQ-UNIMP-038 | Curtain Walls | The system shall store R-value and thermal break metadata properties directly on curtain wall frame styles. | Not Implemented |
| REQ-UNIMP-039 | Curtain Walls | The system shall automate the generation of flat vertical elevations views from curtain wall boundaries. | Partially Implemented |
| REQ-UNIMP-040 | Curtain Walls | The system shall compile automated schedule sheets counting panels of specific sizes and materials. | Not Implemented |

---

## IV. Door and Window Assemblies (Chapter 22) - 10 Requirements
*Traceability Link: [rtm_part_54.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_54.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-041 | Assemblies | The system shall support defining frame divisions for door/window combinations. | Not Implemented |
| REQ-UNIMP-042 | Assemblies | The system shall support mapping standard door or window styles directly to assembly cell locations. | Not Implemented |
| REQ-UNIMP-043 | Assemblies | The system shall calculate frame miter joints automatically at assembly corners. | Not Implemented |
| REQ-UNIMP-044 | Assemblies | The system shall support configuring vertical side panels (sidelites) on door frames. | Not Implemented |
| REQ-UNIMP-045 | Assemblies | The system shall support configuring top overhead glass panels (transoms) on assemblies. | Not Implemented |
| REQ-UNIMP-046 | Assemblies | The system shall support opening templates subtraction in hosting wall bodies. | Not Implemented |
| REQ-UNIMP-047 | Assemblies | The system shall support placing structural support lintels directly above assembly openings. | Not Implemented |
| REQ-UNIMP-048 | Assemblies | The system shall support custom threshold and sill profiles options for assemblies. | Not Implemented |
| REQ-UNIMP-049 | Assemblies | The system shall provide stretch grips to resize frames while keeping doors/windows relative sizes. | Not Implemented |
| REQ-UNIMP-050 | Assemblies | The system shall compile cost estimation sheets based on frame length and panel styles counts. | Not Implemented |

---

## V. Roofs (Chapter 29) - 10 Requirements
*Traceability Link: [rtm_part_60.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_60.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-051 | Roofs Design | The system shall support creating sloped roofs automatically by tracing wall outer footprint curves. | Partially Implemented |
| REQ-UNIMP-052 | Roofs Design | The system shall support selectively overriding slope parameters on individual roof boundary segments. | Not Implemented |
| REQ-UNIMP-053 | Roofs Design | The system shall support turning hip roofs edges into vertical gable walls automatically. | Not Implemented |
| REQ-UNIMP-054 | Roofs Design | The system shall support extruding custom fascia boards and soffit trim profiles along roof edges. | Not Implemented |
| REQ-UNIMP-055 | Roofs Design | The system shall support cutting roof structures automatically when a secondary dormer roof intersects. | Not Implemented |
| REQ-UNIMP-056 | Roofs Design | The system shall validate roof drainage slope criteria against minimum thresholds (e.g. 1/4" per foot). | Not Implemented |
| REQ-UNIMP-057 | Roofs Design | The system shall calculate automatic rafter and truss insertion coordinate points. | Not Implemented |
| REQ-UNIMP-058 | Roofs Design | The system shall calculate coordinate paths of valley/hip seams for flashing cost estimates. | Not Implemented |
| REQ-UNIMP-059 | Roofs Design | The system shall support custom multi-layer composite definitions (plywood, insulation, shingles) for roofs. | Partially Implemented |
| REQ-UNIMP-060 | Roofs Design | The system shall subtract chimney/skylight voids from roof sheet material takeoffs. | Not Implemented |

---

## VI. Structural Members (Chapter 31) - 15 Requirements
*Traceability Link: [rtm_part_61.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_61.md)*

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
*Traceability Link: [rtm_part_46.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_46.md)*

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
*Traceability Link: [rtm_part_47.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_47.md) & [rtm_part_94.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_94.md)*

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
*Traceability Link: [rtm_part_88.md](file:///f:/AutoCAD%20Competitor/requirements/rtm_part_88.md)*

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-UNIMP-096 | Napkin Sketch | The system shall apply jitter algorithms to deform plan lines into sketchy hand-drawn profiles. | Partially Implemented |
| REQ-UNIMP-097 | Napkin Sketch | The system shall provide standard presets for Pencil, Ink, Charcoal, or Loose Sketch styles. | Not Implemented |
| REQ-UNIMP-098 | Napkin Sketch | The system shall support deforming lines to overshoot slightly beyond intersections. | Not Implemented |
| REQ-UNIMP-099 | Napkin Sketch | The system shall automatically scale wiggle factors based on active viewport plot scale. | Not Implemented |
| REQ-UNIMP-100 | Napkin Sketch | The system shall support loose hatching overlays to simulate hand shading. | Not Implemented |
