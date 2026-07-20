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

## Sheets & drawing production

- **Sheet** — a single printable page of a construction/permit drawing set,
  bearing a title block and one or more viewports; the atomic unit of a CAD
  sheet set.
- **Sheet Set** — the ordered, discipline-organised collection of sheets that
  makes up a project's deliverable drawings.
- **Layout / Paper Space** — the virtual sheet at print size (Arch D, ISO A1,
  etc.) on which viewports, title blocks, and sheet-relative annotations are
  composed; distinct from *model space* where the world-scale drawing lives.
- **Model Space** — the coordinate world (drawn at 1:1 in real units) that
  viewports look into.
- **Viewport** — a rectangular window on a layout that displays a region of
  model space at an explicit plot scale, optionally clipped, rotated, or with
  per-viewport layer overrides.
- **Plot Scale** — the printed-to-real distance ratio at which a viewport is
  plotted (e.g. 1:100, 1/8″=1′-0″).
- **Title Block** — the framed region on a sheet carrying identifying data
  (project, sheet number, title, date, revision, seals) per ISO 7200.
- **Discipline Designator** — the single-letter code identifying which
  discipline a sheet belongs to, per US NCS v6 (`G` general, `C` civil, `S`
  structural, `A` architectural, `M` mechanical, `E` electrical, etc.).
- **Sheet Number** — an identifier of the form
  `<Discipline><Sheet-type><Sequence>` (e.g. `A-101`), where the sheet-type
  hundreds digit means plans (1), elevations (2), sections (3), enlarged (4),
  details (5), schedules (6), 3D (9).
- **CAD Layer Standard** — a rule-set for layer naming, colour, lineweight and
  linetype (US NCS / AIA · ISO 13567) that keeps a drawing intelligible across
  offices and consultants.
- **Plot Style** — a table (colour-dependent CTB or named STB) mapping on-screen
  layer/colour to printed lineweight, colour, screening, and linetype.
- **Annotative Scaling** — the property that lets a text, dimension, or symbol
  size itself against the sheet (2.5 mm at print) rather than the world, so a
  single object plots correctly in viewports of different scales.
- **Dimension** — an annotative measurement placed on a drawing (linear,
  aligned, angular, radial, ordinate, arc-length).
- **Symbol / Block** — a reusable, parametric graphic (grid bubble, section
  marker, detail bubble, north arrow, revision cloud, scale bar, hardware
  symbol).
- **Grid Line** — a labelled column-grid reference (A/B/C…, 1/2/3…) that
  appears on every applicable sheet at the same location.
- **Level Datum** — a labelled horizontal reference on sections and elevations
  (e.g. `L1 = 100.00`, `L2 = 112.50`).
- **Match Line** — a dashed break line on a plan that continues onto an
  adjacent sheet, tagged with the neighbour's sheet number.
- **Callout Marker** — an on-plan bubble that names the sheet and drawing
  number where a section, elevation, or detail is drawn; the destination
  drawing carries the reciprocal marker.
- **Schedule** — a data-driven table (door, window, room/finish, panel,
  fixture, equipment) sourced from the same domain objects that render on the
  plans.
- **Revision Cloud** — a scalloped freehand outline around a changed region of
  a drawing, paired with a **Delta Tag** carrying the revision number.
- **Revision Block** — the tabular history in a title block listing revision
  number, date, description, drawn/approved by.
- **Issue Set** — a named release ("For Permit", "For Bid", "Issued for
  Construction", "As-Built") that stamps every sheet on release.
- **Xref (External Reference)** — a drawing file referenced by another (a site
  plan referenced by every sheet) so source updates propagate.
- **Sheet Package** — the deliverable archive produced from an issue: a
  multi-sheet PDF and/or DXF/DWG sheet set with a manifest and checksums.

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
