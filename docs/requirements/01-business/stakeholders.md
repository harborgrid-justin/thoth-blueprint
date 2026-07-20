# Stakeholder Requirements (`STK`)

Stakeholder requirements express **what specific users need** to achieve their
goals with the product. Each traces **up** to one or more
[business requirements](business-requirements.md) and **down** to functional
requirements that satisfy it (rules
[`R1`/`R2`](../00-overview/standards-and-conventions.md#traceability-model)). The
actors are defined in [scope & context](../00-overview/scope-and-context.md#actors).

Each stakeholder requirement is written from the user's perspective ("As a â€¦ I
need â€¦") and then decomposed into the functional areas that satisfy it.

## STK-001 â€” Site planner / civil designer

> As a **site planner**, I need to lay out parcels and lots precisely, subdivide
> land by planning rules, and read accurate areas, frontages, and metrics, so I
> can produce a credible site plan and exchange it with my CAD/GIS tools.

- **Satisfies:** `BR-002`, `BR-004`, `BR-006`, `BR-008`, `BR-005`, `BR-009`
- **Needs:** precise drawing & snapping; parcels/lots as objects; subdivision;
  measurement; live metrics; DXF/GeoJSON/Shapefile interop.
- **Traces to:** `FE-CANVAS`, `FE-PRECISION`, `FE-MEASURE`, `DOM-PARCEL`,
  `DOM-LOT`, `DOM-SUBDIV`, `DOM-METRIC`, `IOP-DXF`, `IOP-GEOJSON`, `IOP-SHP`

## STK-002 â€” Urban / community planner

> As an **urban planner**, I need to define zones, allocate land uses across a
> site, and see density, coverage, and land-use breakdowns update live, so I can
> compose and defend a community plan.

- **Satisfies:** `BR-002`, `BR-004`, `BR-008`, `BR-001`, `BR-009`
- **Needs:** zones & zoning rules; land-use allocation & styling; live planning
  metrics; scenario-friendly editing.
- **Traces to:** `DOM-ZONE`, `DOM-LANDUSE`, `DOM-METRIC`, `DOM-COMPLY`,
  `DOM-SCENARIO`, `FE-STYLE`, `FE-METRIC`, `FE-LAYER`, `FE-SCENARIO`

## STK-003 â€” Municipality / review board

> As a **reviewer on a review board**, I need to review a plan's history, comment
> on specific elements, and trust that what I approve is versioned and auditable,
> so the plan is suitable for a formal process.

- **Satisfies:** `BR-003`, `BR-007`, `BR-009`
- **Needs:** review threads anchored to elements; versioning & checkpoints; audit
  trail; controlled sharing.
- **Traces to:** `FE-REVIEW`, `BE-COMMENT`, `BE-VERSION`, `BE-AUDIT`,
  `BE-ACCESS`, `FE-PROJECT`

## STK-004 â€” Developer / architect

> As a **developer**, I need to test a site's feasibility quickly â€” draw a
> boundary, apply setbacks, and read yield, FAR, and coverage â€” and export an
> exhibit, so I can make an early go/no-go decision.

- **Satisfies:** `BR-006`, `BR-008`, `BR-005`, `BR-009`, `BR-012`
- **Needs:** fast boundary drawing; setbacks & buildable envelope; buildings;
  yield/FAR/coverage metrics; PDF/DXF export; issue a plan set at the point
  feasibility becomes an application.
- **Traces to:** `FE-CANVAS`, `DOM-SETBACK`, `DOM-ENVELOPE`, `DOM-BUILDING`,
  `DOM-METRIC`, `FE-METRIC`, `IOP-PDF`, `IOP-DXF`, `FE-SHEET`, `FE-PLOT`,
  `IOP-PDFSHEET`, `IOP-DXFSHEET`

## STK-005 â€” Community stakeholder (public)

> As a **community member without CAD skills**, I need to view a plan in my
> browser and leave comments, so I can participate in public engagement without
> special software.

- **Satisfies:** `BR-001`, `BR-003`, `BR-009`
- **Needs:** no-install browser viewing; simplified, comment-first view;
  accessible UI; public read-only/comment access.
- **Traces to:** `FE-REVIEW`, `FE-NAV`, `BE-ACCESS`, `NFR-A11Y`, `NFR-USE`

## STK-006 â€” Organization admin

> As an **organization admin**, I need to manage members, roles, and project
> access, so my team's plans are shared with the right people and protected from
> the wrong ones.

- **Satisfies:** `BR-007`, `BR-009`
- **Needs:** org/team management; roles; project-level access control; audit
  visibility.
- **Traces to:** `BE-AUTH`, `BE-ACCESS`, `BE-AUDIT`, `FE-ACCOUNT`

## STK-007 â€” Integrator / self-hoster

> As an **integrator**, I need a documented API and the ability to self-host, so I
> can automate imports/exports and run the platform in my own environment.

- **Satisfies:** `BR-005`, `BR-010`, `BR-009`
- **Needs:** public API; import/export automation; self-hosting; open license.
- **Traces to:** `BE-API`, `BE-IMPORT`, `BE-EXPORT`, `BE-JOB`, `BE-WEBHOOK`,
  `IOP-*`, `NFR-PORT`, `NFR-LEGAL`

## STK-008 â€” Architect / engineer / CAD manager

> As an **architect, engineer, or CAD manager** producing the drawings that
> permit and build the project, I need to compose a complete, standards-
> conformant sheet set from the live plan â€” title blocks, viewports at plot
> scale, discipline-organised numbering, CAD-standard layers and plot styles,
> annotative dimensions and callouts, coordinated grids and match lines,
> data-driven schedules, revisions, and issue packaging â€” and deliver it as
> multi-sheet PDF and DXF/DWG that a permit reviewer, contractor, or downstream
> consultant will accept without rework.

- **Satisfies:** `BR-012`, `BR-005`, `BR-006`, `BR-007`, `BR-009`
- **Needs:** sheet layouts and viewports; title-block templates; NCS/AIA/ISO
  layer standards and plot-style tables; annotative dimensions and text;
  reusable symbol/block library; column grids and level datums; section /
  elevation / detail / match-line callouts wired sheet-to-sheet;
  data-driven schedules from the same domain objects rendered on the plans;
  revision clouds, delta tags, revision blocks, and named issue sets;
  multi-sheet PDF (incl. PDF/A and PDF/E-1) and DXF/DWG sheet-set export;
  a sheet-set browser and batch plot.
- **Traces to:** `FE-SHEET`, `FE-VIEWPORT`, `FE-TITLE`, `FE-PLOT`, `FE-ANNO`,
  `FE-SYMBOL`, `FE-GRIDLINE`, `FE-MATCHLINE`, `FE-SCHEDULE`, `FE-REV`,
  `FE-SHEETSET`, `BE-SHEET`, `BE-TEMPLATE`, `BE-PLOT`, `BE-SCHEDULE`,
  `BE-PACKAGE`, `DOM-SHEET`, `DOM-TITLEBLOCK`, `DOM-SHEETSET`, `DOM-PLOTSTYLE`,
  `DOM-SYMBOL`, `DOM-DIM`, `DOM-ANNO`, `DOM-LAYERSTD`, `DOM-GRID`,
  `DOM-SCHEDULE`, `DOM-REV`, `DOM-XREF`, `DOM-MATCHLINE`, `DOM-DISCIPLINE`,
  `DOM-NUMBERING`, `IOP-DXFSHEET`, `IOP-PDFSHEET`, `IOP-PLTSTYLE`,
  `IOP-LAYERMAP`, `IOP-TITLEBLOCK`, `IOP-BLOCK`

## Coverage note

Every `BR` is claimed by at least one `STK` above; every `STK` decomposes into at
least one functional area. The mechanical check of this is in the
[coverage report](../04-traceability/coverage-report.md).

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

