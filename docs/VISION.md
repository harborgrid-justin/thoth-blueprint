# Vision

## The problem

Planning the built environment — subdivisions, districts, campuses, parks,
neighborhoods — is stuck between two categories of tools:

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
planning** — a collaborative, web-native alternative to traditional CAD, scoped
specifically to land, sites, and neighborhoods rather than mechanical or product
design.

It combines:

- **The ergonomics of a modern web app** — open a link, edit together in real time,
  comment, review, and share; nothing to install.
- **A domain model that understands planning** — parcels, lots, zones, land uses,
  setbacks, rights-of-way, and infrastructure are first-class objects with real
  geometry, units, and rules — not just shapes.

You can lay out a subdivision, compose a mixed-use district, sketch a park or
campus, model a zoning envelope, allocate land uses, check density and coverage,
and hand a live, interactive plan to reviewers and the public.

## Who it's for

- **Site planners & civil designers** — parcels, lots, roads, utilities, grading concepts.
- **Urban & community planners** — neighborhoods, zoning, land-use mixes, corridors.
- **Municipalities & review boards** — collaborative review and public engagement.
- **Developers & architects** — fast early-stage site concepts and feasibility.
- **Community stakeholders** — see and comment on plans without CAD skills.

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
- Not a full GIS analysis platform — it's planning-first, with practical spatial
  analysis, and interoperates with GIS rather than replacing it.
- Not the archived database-design app. That product lives on, read-only, in
  [`../artifact/`](../artifact/).

## How we get there

Incrementally, domain model first. See [ROADMAP.md](ROADMAP.md) for phases and
current status, and [ARCHITECTURE.md](ARCHITECTURE.md) for how the system is
structured.
