# Vision

## The problem

Planning the built environment â€” subdivisions, districts, campuses, parks,
neighborhoods â€” is stuck between two categories of tools:

1. **Heavyweight CAD / GIS suites** (AutoCAD Civil 3D, ArcGIS, and friends). Powerful
   and precise, but expensive, desktop-bound, single-player by default, and steep
   to learn. Sharing a plan with a non-CAD stakeholder means exporting a flat PDF.
2. **Lightweight drawing tools** (generic diagramming and whiteboard apps). Easy and
   collaborative, but they have no idea what a parcel, a zone, or a land use is.
   Everything is an anonymous rectangle; nothing can be measured, validated, or
   analyzed as *planning*.

The result: planners either pay for and wrestle with pro CAD, or they lose all
domain intelligence to draw something quickly. Collaboration across a team, a
municipality, and a community is painful in both worlds.

## The product

**Thoth Blueprint is a cloud-based platform for site planning and community
planning** â€” a collaborative, web-native alternative to traditional CAD, scoped
specifically to land, sites, and neighborhoods rather than mechanical or product
design.

It combines:

- **The ergonomics of a modern web app** â€” open a link, edit together in real time,
  comment, review, and share; nothing to install.
- **A domain model that understands planning** â€” parcels, lots, zones, land uses,
  setbacks, rights-of-way, and infrastructure are first-class objects with real
  geometry, units, and rules â€” not just shapes.

You can lay out a subdivision, compose a mixed-use district, sketch a park or
campus, model a zoning envelope, allocate land uses, check density and coverage,
and hand a live, interactive plan to reviewers and the public. When it is time to
issue, the same model composes into standards-based architecture and engineering
**CAD sheet sets** â€” title blocks, dimensions, schedules, sections and details â€”
exported as multi-page vector PDF.

## Who it's for

- **Site planners & civil designers** â€” parcels, lots, roads, utilities, grading concepts.
- **Urban & community planners** â€” neighborhoods, zoning, land-use mixes, corridors.
- **Municipalities & review boards** â€” collaborative review and public engagement.
- **Developers & architects** â€” fast early-stage site concepts and feasibility.
- **Community stakeholders** â€” see and comment on plans without CAD skills.

## Principles

1. **Cloud-first and collaborative by default.** Plans are shared, versioned, and
   multi-user. Real-time collaboration is a foundation, not a feature bolted on.
2. **Domain-native, not shape-native.** The primitives are planning concepts. If a
   user draws a parcel, the system knows it's a parcel and can measure and validate it.
3. **Spatially honest.** Coordinate systems, units, scale, and layers are always
   explicit. A plan that claims to be to scale is actually to scale.
4. **Interoperable.** Planners live in an ecosystem (GeoJSON, KML, Shapefile,
   DXF/DWG, PDF). Thoth imports and exports what they already use.
5. **Approachable power.** CAD-grade precision (snapping, constraints, measurement)
   without CAD-grade friction.
6. **Governed and auditable.** Versioning, checkpoints, and audit trails make plans
   suitable for real review and public processes.
7. **Open.** GPLv3. The community can inspect, extend, and self-host.

## What this is *not*

- Not a mechanical/product CAD tool (no MCAD, no parametric part modeling).
- Not a full GIS analysis platform â€” it's planning-first, with practical spatial
  analysis, and interoperates with GIS rather than replacing it.
- Not the archived database-design app. That product lives on, read-only, in
  [`../artifact/`](../artifact/).

## How we get there

Incrementally, domain model first. See [ROADMAP.md](ROADMAP.md) for phases and
current status, and [ARCHITECTURE.md](ARCHITECTURE.md) for how the system is
structured.

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

