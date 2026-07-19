# Glossary

Shared vocabulary for Thoth Blueprint. Use these terms consistently in code,
docs, UI, and issues. The domain model in `packages/domain` should mirror this
language.

## Spatial foundation

- **Coordinate Reference System (CRS)** — the spatial reference (e.g., a projected
  or geographic system) that gives coordinates real-world meaning. Every plan has a
  CRS; geometry without one is invalid.
- **Units** — the measurement units for a plan (e.g., meters, feet). Attached
  explicitly; never assumed.
- **Scale** — the ratio between plan distance and real-world distance. A plan that
  claims to be to scale must be measurable.
- **Geometry** — points, polylines, and polygons that describe shape and location.
- **Layer** — a named, orderable grouping of elements (e.g., "parcels",
  "existing conditions", "proposed roads") that can be shown, hidden, or locked.

## Planning primitives

- **Site** — the overall area being planned; the top-level container for a project's
  spatial content.
- **Parcel** — a legally or conceptually distinct piece of land with a boundary. The
  fundamental unit of land in site planning.
- **Lot** — a subdivided unit of a parcel intended for a building or use (e.g., a
  residential lot in a subdivision).
- **Zone** — an area governed by a set of planning rules (e.g., zoning district)
  that constrains what land uses and building forms are allowed.
- **Land Use** — the designated purpose of an area (residential, commercial, park,
  civic, mixed-use, etc.). Allocated across the site and measured in metrics.
- **Right-of-Way (ROW)** — land reserved for streets, paths, or utilities, typically
  public.
- **Setback** — a required minimum distance between a building and a boundary (lot
  line, ROW, etc.). Drives buildable-area / envelope calculations.
- **Zoning Envelope** — the 2D/3D volume within which building is permitted on a lot,
  derived from setbacks, height limits, and coverage rules.
- **Infrastructure Network** — connected linear systems such as roads and utilities,
  modeled as nodes and edges rather than loose lines.

## Operations & rules

- **Subdivision** — dividing a parcel into lots according to rules (frontage, area,
  access).
- **Coverage** — the fraction of a parcel or zone occupied by buildings/impervious
  area.
- **Density** — a measure of intensity of use (e.g., dwelling units per acre, floor
  area ratio).
- **Land-Use Allocation** — how the total site area is distributed across land uses;
  a core planning metric.
- **Compliance Check** — validation of a plan against zoning/planning constraints
  (setbacks, coverage, density, allowed uses).

## Collaboration & governance

- **Project** — a server-persisted planning workspace containing a site and its
  plans, owned by an organization/team.
- **Checkpoint** — a named snapshot of a project at a point in time, allowing safe
  experimentation and rollback. (Carried forward from the archived app, now
  server-side and shareable.)
- **Version** — a tracked state of a project over time; underpins history and audit.
- **Review Thread** — a comment discussion anchored to a plan element, used in
  collaborative review and public engagement.
- **Presence** — real-time indication of who else is viewing or editing a plan.
- **Audit Trail** — the recorded history of changes for governance and public
  processes.

## Repository terms

- **Artifact / archived app** — the original offline database-design tool, retained
  read-only under [`../artifact/`](../artifact/). Not part of the new product's
  runtime.
- **Domain model** — the framework-agnostic planning primitives and rules in
  `packages/domain`.
