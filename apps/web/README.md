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
  scale-aware grid, snapping (to grid and to existing vertices), polygon drawing
  for every planning primitive, vertex editing, selection/move, and a 2-point
  measurement ruler. Lots render their buildable **setback** envelope, and the
  selected boundary is annotated with **bearing + distance** on every edge.
- **Plat & survey report** (`src/features/survey`) — for each tract, the full
  surveyor's record: a metes-and-bounds **line table** (quadrant bearings +
  distances), **corner coordinates** (northing/easting), **traverse closure /
  precision**, area (units² + acres), a generated **legal description**, and a
  courses **CSV export**. Open it per-element from the inspector or for the whole
  plat from the top bar.
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
- **Toolbar** — select, pan, and drawing tools for parcel, zone, land use, lot,
  building, right-of-way, open space, and notes, plus undo/redo.
- **Inspector** (`PropertiesPanel`) — edit the planning attributes of the selected
  element (zone designation/coverage/FAR, building storeys/units, land-use
  category, lot setback, …) with live area/perimeter readouts.
- **Layers** (`LayerPanel`) — visibility, lock, order, rename, and the active layer.
- **Metrics** (`MetricsPanel`) — live coverage, FAR, density, dwelling units,
  impervious/open-space ratios, a land-use allocation breakdown, and compliance
  findings — all computed by `@thoth/domain`.
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
