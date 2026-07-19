# Stakeholder Requirements (`STK`)

Stakeholder requirements express **what specific users need** to achieve their
goals with the product. Each traces **up** to one or more
[business requirements](business-requirements.md) and **down** to functional
requirements that satisfy it (rules
[`R1`/`R2`](../00-overview/standards-and-conventions.md#traceability-model)). The
actors are defined in [scope & context](../00-overview/scope-and-context.md#actors).

Each stakeholder requirement is written from the user's perspective ("As a … I
need …") and then decomposed into the functional areas that satisfy it.

## STK-001 — Site planner / civil designer

> As a **site planner**, I need to lay out parcels and lots precisely, subdivide
> land by planning rules, and read accurate areas, frontages, and metrics, so I
> can produce a credible site plan and exchange it with my CAD/GIS tools.

- **Satisfies:** `BR-002`, `BR-004`, `BR-006`, `BR-008`, `BR-005`
- **Needs:** precise drawing & snapping; parcels/lots as objects; subdivision;
  measurement; live metrics; DXF/GeoJSON/Shapefile interop.
- **Traces to:** `FE-CANVAS`, `FE-PRECISION`, `FE-MEASURE`, `DOM-PARCEL`,
  `DOM-LOT`, `DOM-SUBDIV`, `DOM-METRIC`, `IOP-DXF`, `IOP-GEOJSON`, `IOP-SHP`

## STK-002 — Urban / community planner

> As an **urban planner**, I need to define zones, allocate land uses across a
> site, and see density, coverage, and land-use breakdowns update live, so I can
> compose and defend a community plan.

- **Satisfies:** `BR-002`, `BR-004`, `BR-008`, `BR-001`
- **Needs:** zones & zoning rules; land-use allocation & styling; live planning
  metrics; scenario-friendly editing.
- **Traces to:** `DOM-ZONE`, `DOM-LANDUSE`, `DOM-METRIC`, `DOM-COMPLY`,
  `FE-STYLE`, `FE-METRIC`, `FE-LAYER`

## STK-003 — Municipality / review board

> As a **reviewer on a review board**, I need to review a plan's history, comment
> on specific elements, and trust that what I approve is versioned and auditable,
> so the plan is suitable for a formal process.

- **Satisfies:** `BR-003`, `BR-007`, `BR-009`
- **Needs:** review threads anchored to elements; versioning & checkpoints; audit
  trail; controlled sharing.
- **Traces to:** `FE-REVIEW`, `BE-COMMENT`, `BE-VERSION`, `BE-AUDIT`,
  `BE-ACCESS`, `FE-PROJECT`

## STK-004 — Developer / architect

> As a **developer**, I need to test a site's feasibility quickly — draw a
> boundary, apply setbacks, and read yield, FAR, and coverage — and export an
> exhibit, so I can make an early go/no-go decision.

- **Satisfies:** `BR-006`, `BR-008`, `BR-005`
- **Needs:** fast boundary drawing; setbacks & buildable envelope; yield/FAR/
  coverage metrics; PDF/DXF export.
- **Traces to:** `FE-CANVAS`, `DOM-SETBACK`, `DOM-ENVELOPE`, `DOM-METRIC`,
  `FE-METRIC`, `IOP-PDF`, `IOP-DXF`

## STK-005 — Community stakeholder (public)

> As a **community member without CAD skills**, I need to view a plan in my
> browser and leave comments, so I can participate in public engagement without
> special software.

- **Satisfies:** `BR-001`, `BR-003`, `BR-009`
- **Needs:** no-install browser viewing; simplified, comment-first view;
  accessible UI; public read-only/comment access.
- **Traces to:** `FE-REVIEW`, `FE-NAV`, `BE-ACCESS`, `NFR-A11Y`, `NFR-USE`

## STK-006 — Organization admin

> As an **organization admin**, I need to manage members, roles, and project
> access, so my team's plans are shared with the right people and protected from
> the wrong ones.

- **Satisfies:** `BR-007`, `BR-009`
- **Needs:** org/team management; roles; project-level access control; audit
  visibility.
- **Traces to:** `BE-AUTH`, `BE-ACCESS`, `BE-AUDIT`, `FE-ACCOUNT`

## STK-007 — Integrator / self-hoster

> As an **integrator**, I need a documented API and the ability to self-host, so I
> can automate imports/exports and run the platform in my own environment.

- **Satisfies:** `BR-005`, `BR-010`
- **Needs:** public API; import/export automation; self-hosting; open license.
- **Traces to:** `BE-API`, `BE-IMPORT`, `BE-EXPORT`, `IOP-*`, `NFR-PORT`,
  `NFR-LEGAL`

## Coverage note

Every `BR` is claimed by at least one `STK` above; every `STK` decomposes into at
least one functional area. The mechanical check of this is in the
[coverage report](../04-traceability/coverage-report.md).
