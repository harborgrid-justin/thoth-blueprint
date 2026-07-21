# @thoth/web — planning workspace

The browser client for Thoth Blueprint: a fast, collaborative canvas for **site & community planning**.

> **Status: implemented (Phase 2, single-player).** A working React planning workspace backed by the [`@thoth/domain`](../../packages/domain) model. Auth and the cloud services are represented by a swappable API client that persists locally today (see _Cloud-first, by design_ below).

## Running

```bash
# 1) install dependencies
yarn install

# 2) run dev server
yarn workspace @thoth/web dev          # vite dev server on http://localhost:5173
yarn workspace @thoth/web type-check   # tsc, strict
yarn workspace @thoth/web build        # type-check + production build
yarn workspace @thoth/web test:e2e     # run 81 Playwright E2E test cases across 15 spec files
```

## What's here

- **Planning canvas** (`src/features/canvas`) — an SVG canvas with pan/zoom, snapping, vertex editing, and an **enterprise right-click context menu system** (`ElementContextMenu`) powered by Radix UI. Right-clicking elements auto-selects them and presents real-time calculated properties (Name, Layer, Area, Perimeter) and actions (Delete).
- **Playwright E2E Test Suite** (`e2e/`) — 81 detailed, comprehensive end-to-end test cases across 15 spec files covering canvas context menus, properties inspection, layer & renovation workflows, command palette & keyboard shortcuts, typography, animations, accessibility, and viewports/reports (`yarn run test:e2e`).
- **Command palette & keyboard-first control** (`src/features/command`) — press **⌘K** for a searchable palette of every command, single-letter **tool shortcuts** (V/P/Z/…), and clipboard/edit shortcuts (**⌘C/X/V/D**, ⌘A). A discoverable **shortcuts reference** opens with `?`.
- **Find & filter** (`src/features/find`) — **⌘F** searches elements by name, type, land use, or attribute; select all matches, zoom to a result, or isolate matches on the canvas.
- **Display preferences** (`src/features/preferences`) — persisted choices for unit system (metric/imperial), area unit, bearing format (DMS/decimal), coordinate readout (plan/survey), and a **high-contrast** accessibility mode. Presentation-only: the plan's stored geometry and CRS never change.
- **Survey / civil symbology** (`src/features/canvas/patterns`, `CivilLayer`, `@thoth/domain/controls`) — hatch fill patterns, line-types, and metes-and-bounds bearing + distance on every parcel/lot line.
- **Regional plug-ins (jurisdictions)** (`@thoth/domain/regions`) — survey frameworks, default units/CRS, monuments, title blocks, and certificates.
- **Plat sheet composer** (`src/features/survey/PlatSheetDialog`) — title block, site plan, curve-data table, legend, scale, and certificate blocks exportable as vector SVG.
- **Roadway alignments & stationing** (`@thoth/domain/alignment`, `src/features/canvas/AlignmentLayer`) — baselines, curves, full-station ticks, labels (`10+00.00`), and curve tables.
- **Curved boundaries** — circular arc bulges with exact analytic geometry and midpoint arc handles.
- **Terrain & grading** (`src/features/terrain`) — spot elevations, contour lines, slope shading, and live cut/fill earthwork calculations.
- **3D view** (`src/features/canvas3d`) — three.js scene with terrain mesh, extruded buildings, draped land uses, and orbit controls.
- **Inspector** (`PropertiesPanel`) — edit planning attributes of selected elements with live area/perimeter readouts.
- **Layers** (`LayerPanel`) — visibility, lock, order, rename, and active layer selection.
- **Metrics** (`MetricsPanel`) — live coverage, FAR, density, dwelling units, impervious/open-space ratios, and compliance findings.

## Cloud-first, by design

The UI talks only to the [`ApiClient`](src/api/client.ts) interface, never to a concrete backend. Today that interface is implemented by [`LocalApiClient`](src/api/localClient.ts), which persists to the browser and simulates network latency so the workspace is usable without a server. When the `services/` backends land, drop in an HTTP/websocket client that implements the same interface — **no UI changes required**.

## Boundaries

- Renders and edits `@thoth/domain` objects; **does not** duplicate planning rules or geometry math — those come from the domain model.
- Never imports from `artifact/`. The archived app is a pattern reference only.
