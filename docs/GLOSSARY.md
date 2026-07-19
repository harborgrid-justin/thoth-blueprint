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
- **Datum** — the reference frame (e.g., NAD83, WGS84) defining the earth model
  and coordinate origin for a CRS. Mixing datums shifts coordinates and must be
  transformed, not ignored.
- **Bearing / Azimuth** — a direction expressed as an angle, used in
  metes-and-bounds boundary descriptions and directional measurement.
- **Basemap / Underlay** — a read-only reference layer providing spatial context:
  a tile *basemap* from a provider, or a user-supplied *underlay* (raster image,
  PDF, or CAD drawing) positioned beneath the plan. Not part of the plan's domain
  objects.

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
- **Block** — an area of land bounded by rights-of-way that contains lots; the tier
  between parcel and lot in the Site → Parcel → Block → Lot hierarchy.
- **Building / Building Footprint** — a structure represented by a 2D footprint on a
  lot, carrying height/storey and use/dwelling-unit attributes (not 3D geometry). The
  source object for coverage, floor area, FAR, and density.
- **Easement** — an area encumbering a parcel/lot that restricts building (utility,
  access, drainage); excluded from buildable area.
- **Dedication** — land dedicated to public use (ROW, park, open space); excluded
  from net developable area.
- **Open Space / Common Area** — unbuilt land reserved as open space, distinct from a
  "park" land use (e.g., an HOA common area).
- **Scenario** — an alternative version (variant) of a plan sharing a common base,
  compared to others by metrics; may be organized into development phases (staging).

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
- **Floor Area Ratio (FAR / FSI)** — total gross floor area divided by lot area;
  controls building bulk/intensity. (FSI, Floor Space Index, is the same measure.)
- **Frontage** — the length of a parcel or lot boundary that abuts a street/ROW;
  governs subdivision access and lot conformance.
- **Yield** — the number of buildable lots or units a site produces after applying
  density, setbacks, ROW, coverage, and open-space constraints; the bottom-line
  output of a site-plan or subdivision test.
- **Metes and Bounds** — a boundary described as a sequence of bearing-and-distance
  *courses*; the survey/legal form of a parcel boundary.
- **Gross vs Net Area** — land area with (gross) versus without (net) deductions for
  ROW, easements, dedications, and undevelopable land; density/FAR/yield differ
  materially between the two.
- **Parking Ratio** — required off-street parking expressed per dwelling unit or per
  unit of floor area; compared against provided parking supply.
- **Impervious-Surface Ratio / Open-Space Ratio (GSI/OSR)** — the share of a site
  that is impervious, and the ratio of open (unbuilt) space; morphology metrics
  alongside coverage and FAR.

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
