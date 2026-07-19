# @thoth/web — planning workspace

The browser client for Thoth Blueprint: a fast, collaborative canvas for **site &
community planning**.

> **Status: implemented (Phase 2, single-player).** A working React planning
> workspace backed by the [`@thoth/domain`](../../packages/domain) model. Auth and
> the cloud services are represented by a swappable API client that persists
> locally today (see _Cloud-first, by design_ below).

## Running

```bash
# 1) install the domain model's dev deps (consumed directly from source)
cd ../../packages/domain && npm install

# 2) install and run the app
cd ../../apps/web && npm install
npm run dev          # vite dev server on http://localhost:5173
npm run type-check   # tsc, strict
npm run build        # type-check + production build
```

## What's here

- **Planning canvas** (`src/features/canvas`) — an SVG canvas with pan/zoom, a
  scale-aware grid, snapping (to grid and to existing vertices, with a live
  snap indicator), polygon drawing for every planning primitive, and full vertex
  editing: drag to move, **double-click an edge to insert**, **Alt-click to
  delete**. A **multi-point measurement ruler** reports cumulative distance and
  bearing. On-canvas overlays add a cartographic **scale bar**, a **north arrow**,
  and a **land-use legend**. Lots render their buildable **setback** envelope, and
  the selected boundary is annotated with **bearing + distance** on every edge.
- **Command palette & keyboard-first control** (`src/features/command`) — press
  **⌘K** for a searchable palette of every command, single-letter **tool
  shortcuts** (V/P/Z/…), and clipboard/edit shortcuts (**⌘C/X/V/D**, ⌘A). A
  discoverable **shortcuts reference** opens with `?`.
- **Find & filter** (`src/features/find`) — **⌘F** searches elements by name,
  type, land use, or attribute; select all matches, zoom to a result, or isolate
  matches on the canvas.
- **Display preferences** (`src/features/preferences`) — persisted choices for
  unit system (metric/imperial), area unit, bearing format (DMS/decimal),
  coordinate readout (plan/survey), and a **high-contrast** accessibility mode.
  Presentation-only: the plan's stored geometry and CRS never change.
- **Survey / civil symbology** (`src/features/canvas/patterns`, `CivilLayer`,
  `@thoth/domain/controls`) — the drafting density of a real plan sheet: hatch
  fill patterns (water, wetland marsh, woods, agricultural rows, earthwork
  crosshatch, rip-rap stipple, concrete, open space), special line-types (silt
  fence with posts + fabric triangles, scalloped tree line, slope-intercept
  hachures, arrowed surface-water flow), and **dense metes-and-bounds** —
  bearing + distance on every parcel/lot line. All carried onto the plat sheet.
- **Regional plug-ins (jurisdictions)** (`@thoth/domain/regions`) — the platform
  ships **100% of the plat/civil capabilities enabled**, and a region plug-in
  *adjusts* them for a place: the survey framework (PLSS vs. the **Georgia Land
  Lot System** vs. metes-and-bounds), default units/CRS, recognized monuments,
  the sheet's title-block fields and **required certificates**, curve-table
  columns, and local subdivision standards. Ships **Newton County, Georgia**
  (202.5-acre land lots, Georgia West State Plane, Georgia plat certificates) and
  a generic US-PLSS default; pick one in Preferences. New jurisdictions are pure
  data — nothing is hard-coded to a place.
- **Plat sheet composer** (`src/features/survey/PlatSheetDialog`) — a
  jurisdiction-driven plan sheet: title block, the site plan (parcels/lots/
  easements, monuments, survey framework, alignment centerlines), a
  **consolidated curve-data table** (every boundary arc and alignment curve,
  C1…Cn), a legend, north arrow, and graphic scale, plus the jurisdiction's
  **certificate blocks** — exportable as vector SVG.
- **Easements** — drawn as typed planning elements (utility/access/drainage) with
  a dashed offset style and label, carried onto the plat sheet.
- **PLSS framework & survey monuments** (`@thoth/domain/plss`, `/monument`) —
  the rectangular-survey basis of a U.S. plat: Township/Range/Section with
  aliquot-part geometry and nominal acreage (640 → 160 → 40 …), section &
  quarter corners, and PLSS legal nomenclature. The canvas draws the controlling
  **section framework** (boundary, quarter-section cross, corners, `T3S, R16E`
  label) and **survey monuments** with standard symbology (PRM, PCP, section/
  quarter corner, iron rod/pipe, concrete, nail & disc — filled = set, open =
  found) plus a plat **legend**; the plat's legal description is tied to the
  section (“lying in Section 8, Township 3 South, Range 16 East”).
- **Roadway alignments & stationing** (`@thoth/domain/alignment`,
  `src/features/canvas/AlignmentLayer`) — horizontal baselines defined by the
  **PI method** (tangents + fitted circular curves), the math behind a DOT plan
  sheet. The canvas draws the chain-dash centerline with **full-station ticks
  and labels** (`10+00.00`), **PC/PT** curve points, and POB/POE; the
  **Alignment & Stationing report** tabulates each tangent and the **curve data**
  (PC/PI/PT stations, R, L, T, Δ, degree of curve, external, middle ordinate,
  direction). Draw one with the Alignment tool (I). `stationOffsetOfPoint` and
  `pointAtStation` convert between coordinates and station/offset.
- **Curved boundaries** — any boundary edge can be a **circular arc**, encoded
  per edge as a DXF-style **bulge** (`bulge = tan(Δ/4)`) with exact analytic
  geometry (`@thoth/domain/curve`). Arc-aware area and perimeter flow through the
  metrics and the plat. Drag an edge's ◇ midpoint handle on the canvas to curve
  it (or straighten it from the inspector).
- **Plat & survey report** (`src/features/survey`) — for each tract, an
  engineering-grade **plat of survey**: a drawn SVG exhibit (labelled
  metes-and-bounds courses, **curved courses** with radius/arc-length and a
  radius tick, corner monuments with a Point of Beginning, interior angles,
  setback envelope, area callout, north arrow, graphic scale, and title block,
  exportable as vector SVG), plus the full surveyor's record — a **line table**
  with latitudes/departures, a **curve table** (radius, arc length, delta,
  tangent, chord bearing/length, direction), **interior angles** (summing to
  (n−2)×180°), **corner coordinates**, both **coordinate closure** and
  **as-recorded closure/precision**, an **area cross-checked by the Double
  Meridian Distance method**, a generated **legal description** (with
  curve-to-the-left/right language), and a courses **CSV export**. Open it
  per-element from the inspector or for the whole plat from the top bar.
- **Terrain & grading** (`src/features/terrain`) — spot elevations build a ground
  surface; the canvas draws **contour lines** and **slope shading**, and the
  Terrain tab reports slope analysis and live **cut/fill earthwork** for grading
  regions. All computed by `@thoth/domain`.
- **Community & infrastructure** — roads and utility mains drawn as connected
  networks (length, connectivity, service), plus community metrics (population,
  density, park/open-space level of service). A `Region` tier and km²/mi² units
  support territory-scale plans (the estate template).
- **3D view** (`src/features/canvas3d`) — a three.js scene of the plan: the terrain
  as a shaded mesh, extruded buildings, draped land uses/water, and trees, with
  orbit controls. Toggle 2D/3D in the top bar.
- **Interop** (`src/features/interop`, the top-bar **File** menu):
  - **Import meshes** — `.obj`, `.dae`, `.fbx`, `.stl`, `.gltf`/`.glb` via three.js
    loaders, placed in the 3D scene.
  - **Import/export colored point clouds** — `.xyz`, `.pts`, `.ply`, `.las`, `.xyz`,
    `.dxf`. Imported clouds render in 2D and 3D, or bake into terrain spot
    elevations; terrain spots export back out to any format.
  - **Import blueprints** as `.png`/`.jpg` raster underlays; **export** the plan as a
    `.png` image or a COLLADA `.dae` 3D model.
  Imported meshes/clouds/underlays are session reference data (not persisted);
  baking a cloud into spot elevations promotes it into the saved plan.
- **Toolbar** — select, pan, and drawing tools for parcel, zone, land use, lot,
  building, right-of-way, open space, and notes, plus undo/redo. Selections can be
  **copied, cut, pasted (across projects), and duplicated** with an offset.
- **Inspector** (`PropertiesPanel`) — edit the planning attributes of the selected
  element (zone designation/coverage/FAR, building storeys/units, land-use
  category, lot setback, …) with live area/perimeter readouts.
- **Layers** (`LayerPanel`) — visibility, lock, order, rename, and the active layer.
- **Metrics** (`MetricsPanel`) — live coverage, FAR, density, dwelling units,
  impervious/open-space ratios, a land-use allocation breakdown, and compliance
  findings — all computed by `@thoth/domain`. Metrics also scope to the current
  **selection**, and each compliance finding is **click-to-locate** on the canvas.
- **Checkpoints** — named, restorable snapshots of a project's site.
- **Dashboard** — project listing, creation from starter templates, and presence.

## Cloud-first, by design

The UI talks only to the [`ApiClient`](src/api/client.ts) interface, never to a
concrete backend. Today that interface is implemented by
[`LocalApiClient`](src/api/localClient.ts), which persists to the browser and
simulates network latency so the workspace is usable without a server. When the
`services/` backends land, drop in an HTTP/websocket client that implements the
same interface — **no UI changes required**. This keeps the app cloud-first in
structure while remaining runnable today; the local store is a transport stand-in,
not an offline-first source of truth.

## Boundaries

- Renders and edits `@thoth/domain` objects; **does not** duplicate planning rules
  or geometry math — those come from the domain model.
- Never imports from `artifact/`. The archived app is a pattern reference only.
