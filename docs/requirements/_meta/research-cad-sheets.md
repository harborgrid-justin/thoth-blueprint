<!-- Raw research capture â€” background for the CAD-sheet requirements added in
`FE-SHEET*`, `BE-SHEET*`, `DOM-SHEET*`, `IOP-DXFSHEET`/`IOP-PDFSHEET`, and the
Phase-6 roadmap addition. Not a normative requirements doc. -->
# Research capture â€” architecture & engineering CAD sheets

Source: background research for the "generate complete architecture and
engineering CAD sheets" scope expansion. Feeds the sheet-composition areas
across the four functional layers and the plot-fidelity / standards NFRs.

## A. Sheet-set anatomy

A **construction / permit sheet set** is a numbered, ordered collection of
fixed-size drawings, each with a **title block**, **body area**, and one or more
**viewports** onto model content, plus annotations composed for the sheet's plot
scale. Typical arch/eng deliverable structure:

- **Cover / title sheet** â€” project identification, location map, signatures.
- **Sheet index** â€” the list of every sheet with title, number, discipline.
- **General notes / abbreviations / symbols legend**.
- **Discipline sets** in a fixed order (G â†’ C â†’ L â†’ S â†’ A â†’ I â†’ Q â†’ F â†’ P â†’ D â†’
  M â†’ E â†’ T â€” see US NCS discipline designators below), each with:
  - _plans_ (site, floor, roof, framing, foundation, lighting, power, HVAC,
    plumbing, etc.),
  - _elevations_ and _sections_,
  - _enlarged plans_,
  - _details_,
  - _schedules_ (door, window, room, finish, panel, equipment).
- **Revision history** per sheet with revision clouds, delta tags, dates.

Every sheet is meant to be **printed at a specific size and scale**, so
annotations, text, dimensions, and symbols have to size themselves against the
sheet (paper), not the model (world).

## B. Sheet-size and title-block standards

- **ANSI/ASME Y14.1** â€” US flat sizes A (8.5Ã—11) Â· B (11Ã—17) Â· C (17Ã—22) Â·
  D (22Ã—34) Â· E (34Ã—44). Y14.1M defines metric equivalents.
- **US ARCH sizes** â€” Arch A (9Ã—12) Â· B (12Ã—18) Â· C (18Ã—24) Â· D (24Ã—36) Â·
  E (36Ã—48) Â· E1 (30Ã—42). Most US arch sheets are Arch D or E.
- **ISO 5457** â€” technical drawing sheet sizes and title-block placement based
  on ISO 216 (A0 841Ã—1189 mm â†’ A4 210Ã—297 mm).
- **ISO 7200** â€” data fields for title blocks (drawing identifier, sheet number,
  title, date, revision, scale, sizes, drawn/checked/approved by, owner).

## C. Layer-naming standards

- **US National CAD Standard (NCS) v6** â€” governs discipline designators, layer
  names, and sheet numbering across the US AEC industry. Layer name format:
  `<Discipline><Major group>-<Minor group>-<Status>` e.g. `A-WALL-FULL-N` (New
  Architectural full-height wall).
- **AIA CAD Layer Guidelines** â€” the source of the NCS layer scheme.
- **ISO 13567** (Technical product documentation â€” layers): agent + element +
  presentation + status fields, widely used outside the US.
- **BS 1192 / PAS 1192 / ISO 19650** â€” UK/international BIM information
  management (naming, revisions, common data environment); layer names for CAD
  drawings sit inside these container conventions.

## D. Discipline designators & sheet numbering (US NCS)

Sheet number format: `<Discipline><Sheet-type><Sheet-sequence>` e.g. `A-101`
= Architectural, plan (100-series), sheet 01. Common designators:

| Code | Discipline |
| --- | --- |
| `G` | General |
| `H` | Hazardous materials |
| `V` | Survey / mapping |
| `B` | Geotechnical |
| `C` | Civil |
| `L` | Landscape |
| `S` | Structural |
| `A` | Architectural |
| `I` | Interiors |
| `Q` | Equipment |
| `F` | Fire protection |
| `P` | Plumbing |
| `D` | Process |
| `M` | Mechanical |
| `E` | Electrical |
| `T` | Telecommunications |
| `R` | Resource |
| `X` | Other disciplines |
| `Z` | Contractor / shop drawings |
| `O` | Operations |

Sheet-type numbering (the hundreds digit):

| Digit | Meaning |
| --- | --- |
| 0 | General (cover, index, notes, legends, symbols) |
| 1 | Plans (horizontal orthographic views) |
| 2 | Elevations |
| 3 | Sections |
| 4 | Large-scale views (enlarged plans) |
| 5 | Details |
| 6 | Schedules & diagrams |
| 7 | User-defined |
| 8 | User-defined |
| 9 | 3D representations (perspectives, isometrics) |

## E. Plot styles, line weights, line types

- **Plot styles** â€” CTB (colour-dependent) and STB (named-style) tables in
  AutoCAD map on-screen colour or a named style to printed line weight,
  colour, and line type at output time. A published sheet's on-paper appearance
  is a function of layer â†’ style â†’ plot table.
- **Line weights** â€” commonly 0.13 Â· 0.18 Â· 0.25 Â· 0.35 Â· 0.50 Â· 0.70 Â· 1.00 mm
  (ISO); the NCS/AIA scheme maps discipline layers to weights so that walls,
  centrelines, hidden lines, dimensions, and notation each carry a
  distinguishable weight.
- **Line types** â€” continuous, dashed, hidden, centre, phantom, etc.; scaled
  against the sheet plot scale (`LTSCALE` in AutoCAD).

## F. Dimensioning & annotation standards

- **ISO 128** â€” general principles of technical drawings (line types, views,
  arrangement).
- **ISO 129-1** â€” dimensioning principles.
- **ISO 3098** â€” lettering for technical drawings.
- **ASME Y14.5** â€” dimensioning & tolerancing (mechanical-leaning but broadly
  cited; ASME Y14.2 covers line conventions).
- **Annotative scaling** â€” text/symbols/dimensions carry an annotation scale so
  that a note reads at, say, 3 mm on paper regardless of viewport scale; a
  single object appears at different world sizes in a 1:100 vs 1:20 viewport.

## G. Model space, layouts, viewports

- **Model space** â€” the world-coordinate model (drawn at 1:1 in real units).
- **Paper space / layout** â€” a virtual sheet at print size, one per plotted
  sheet.
- **Viewport** â€” a rectangular window on a layout that displays a region of
  model space at a chosen scale (1:100, 1/8â€³=1â€²-0â€³, etc.), optionally clipped,
  layer-controlled, or rotated.
- **Xrefs (external references)** â€” one drawing file referenced by another (a
  site plan referenced by every sheet), so the source updates propagate to all
  consumers.
- **Sheet Set Manager** â€” AutoCAD's tool that treats a sheet set as a single
  navigable, publishable, callout-cross-referenced whole.

## H. Sheet coordination graphics

- **Grid lines & bubbles** â€” building column/row grids (A, B, Câ€¦ / 1, 2, 3â€¦)
  shown as bubble-tagged lines across every applicable sheet.
- **Levels / storey markers** â€” datum elevations on sections/elevations.
- **Section markers / elevation markers / detail bubbles** â€” callouts on a plan
  that name the sheet + drawing number where the section/elevation/detail
  actually lives; the destination drawing shows the reciprocal marker.
- **Match lines** â€” dashed break lines where a plan overflows one sheet onto
  another, tagged with the neighbouring sheet number.
- **North arrow / true north vs plan north** â€” orientation indicator that must
  reflect the sheet's rotation relative to the plan CRS.

## I. Schedules & tables

Standard arch/eng schedules embedded in sheet sets:

- **Door schedule** â€” number, type, size, material, hardware set, fire rating.
- **Window schedule** â€” number, type, size, glazing, sill height.
- **Room / finish schedule** â€” room number, name, area, floor/base/wall/ceiling
  finishes.
- **Panel schedule** (electrical) â€” panel, circuits, loads.
- **Fixture / equipment schedules** (M/P).
- **Wall type / partition legend**.

Schedules are data-driven â€” the same data that drives plan geometry should
back the schedule; a room's number appears on the plan and in the schedule.

## J. Revisions & issue management

- **Revision cloud** â€” a scalloped freehand cloud around a changed area of the
  drawing with a triangular **delta tag** carrying the revision number.
- **Revision block** â€” a table in the title block listing revision number,
  date, description, drawn/approved by.
- **Issue set** â€” a snapshot released for a specific purpose ("For Permit",
  "For Bid", "Issued for Construction", "As-Built"), stamped on every sheet.

## K. Deliverables & packaging

- **Multi-sheet PDF** â€” the ubiquitous deliverable; usually one PDF per issue
  containing every sheet in sheet-number order with bookmarks per discipline.
- **DWG/DXF sheet set** â€” one file per sheet or one file with layouts;
  layers/plot styles preserved.
- **Plot files (PLT)** â€” legacy device-driven plot output.
- **Sheet index cover PDF** â€” a manifest of the release for archival.

## L. Related standards / references

- CSI **MasterFormat** (for specification) and **UniFormat** (for functional
  elements) provide the classification numbering that some schedule/notes
  systems reference on sheets.
- **Uniclass 2015** and **OmniClass** â€” comparable classification systems used
  in UK / North America.
- **PDF/A** and **PDF/E-1 (ISO 24517-1)** â€” long-term-archive and engineering
  PDF variants often required for permit/record submission.

## Sources (informational â€” not normative in this suite)

- US National CAD Standard v6 overview â€” https://www.nationalcadstandard.org/
- AIA CAD Layer Guidelines summary â€” https://www.aia.org/resources/6076
  (referenced by NCS)
- ISO 5457 (drawing sheets) â€” https://www.iso.org/standard/22743.html
- ISO 7200 (title-block data fields) â€” https://www.iso.org/standard/29184.html
- ISO 128 series (technical drawings) â€”
  https://www.iso.org/standard/44236.html
- ISO 13567 (CAD layer organisation) â€”
  https://www.iso.org/standard/22385.html
- ISO 19650 (BIM information management) â€”
  https://www.iso.org/standard/68078.html
- ANSI/ASME Y14.1 (drawing sheet size and format) â€”
  https://www.asme.org/codes-standards/find-codes-standards/y14-1-drawing-sheet-size-format
- ASME Y14.5 (dimensioning & tolerancing) â€”
  https://www.asme.org/codes-standards/find-codes-standards/y14-5
- PDF/A (ISO 19005) â€” https://www.iso.org/standard/38920.html
- PDF/E-1 (ISO 24517-1) â€” https://www.iso.org/standard/42274.html

---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](file:///f:/AutoCAD%20Competitor/docs/requirements/README.md)
- [Master Requirements Traceability Matrix (RTM)](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/traceability-matrix.md)
- [Requirements Coverage Report](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/unimplemented_requirements.md)
- [Frontend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/frontend-requirements.md)
- [Backend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/backend-requirements.md)
- [Domain Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/domain-requirements.md)
- [Interoperability Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/03-nonfunctional/nonfunctional-requirements.md)

