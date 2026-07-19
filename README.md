<div align="center">
  <img src="https://raw.githubusercontent.com/AHS12/thoth-blueprint/refs/heads/main/artifact/public/ThothBlueprint-icon.svg" alt="Thoth Blueprint Logo" width="64" height="64">
  <h1>Thoth Blueprint</h1>
  <p><strong>Cloud-based site &amp; community planning — a collaborative CAD alternative for the built environment.</strong></p>
</div>

<p align="center">
  <a href="https://github.com/AHS12/thoth-blueprint/stargazers">
    <img src="https://img.shields.io/github/stars/AHS12/thoth-blueprint?style=flat-square" alt="Stars">
  </a>
  <a href="https://github.com/AHS12/thoth-blueprint/actions/workflows/build_test.yml">
    <img src="https://github.com/AHS12/thoth-blueprint/actions/workflows/build_test.yml/badge.svg" alt="Build Status">
  </a>
  <a href="LICENSE.md">
    <img src="https://img.shields.io/badge/license-GPLv3-blue?style=flat-square" alt="License">
  </a>
</p>

> **We are building a new product.** Thoth Blueprint is evolving from an
> offline database-design tool into a **cloud-based platform for site planning and
> community planning** — think of a purpose-built, collaborative alternative to
> traditional CAD, focused on land, sites, and neighborhoods rather than
> mechanical parts.
>
> The original database-design app has been **archived** (not deleted) under
> [`artifact/`](artifact/), with its history intact. The repository root is now the
> home of the new platform. See [`docs/MIGRATION.md`](docs/MIGRATION.md) for the
> full story.

---

## What Thoth Blueprint is becoming

Site and community planning today is trapped between two bad options: heavyweight
desktop CAD/GIS suites that are expensive, single-player, and hard to learn — and
lightweight drawing tools that don't understand parcels, zoning, or land use.
Thoth Blueprint aims for the middle: **the ease and real-time collaboration of a
modern web app, with a domain model that actually understands the built
environment.**

Plan a subdivision, lay out a mixed-use district, sketch a park or campus, model
setbacks and zoning envelopes, allocate land uses, and share a live link with your
team and community stakeholders — all in the browser, all in the cloud.

### Who it's for

- **Site planners & civil designers** laying out parcels, lots, roads, and utilities.
- **Urban & community planners** shaping neighborhoods, zoning, and land-use mixes.
- **Municipalities & review boards** collaborating on and reviewing proposals.
- **Developers & architects** producing early-stage site concepts fast.
- **Community stakeholders** who need to see and comment on plans without CAD.

## Vision at a glance

- ☁️ **Cloud-native & collaborative** — projects live in the cloud; multiple people
  edit the same plan in real time, with roles, comments, and review workflows.
- 🗺️ **Spatially aware** — first-class coordinate systems, units, scale, and layers.
  Parcels, zones, and land uses are real domain objects, not anonymous shapes.
- 🏘️ **Planning-native primitives** — sites, parcels, lots, zones, land-use
  allocations, setbacks, rights-of-way, and infrastructure networks.
- 📐 **CAD-grade editing on the web** — precise drawing, snapping, measurement, and
  constraints in a fast canvas — no desktop install.
- 🔁 **Interoperable** — import/export the formats planners already use (GeoJSON,
  KML, DXF/DWG, Shapefile, PDF exhibits) so Thoth fits existing workflows.
- 📊 **Analysis & metrics** — density, coverage, land-use breakdowns, and
  program/zoning compliance surfaced as you plan.
- 🔐 **Governed & auditable** — versioning, checkpoints, and an audit trail suitable
  for public review processes.

> Not all of this exists yet. This repository currently contains the **product
> vision, architecture, and an initial scaffold**. See
> [`docs/ROADMAP.md`](docs/ROADMAP.md) for what is built, in progress, and planned.

## Repository layout

This is a monorepo. New product work happens at the root; the archived app is
self-contained under `artifact/`.

```
thoth-blueprint/
├── apps/
│   └── web/            # Cloud planning workspace (client) — scaffold
├── services/           # Cloud backend services — scaffolds
│   ├── auth/           #   identity & access
│   ├── projects/       #   projects, versions, checkpoints
│   ├── geospatial/     #   coordinate systems, layers, spatial ops
│   └── collaboration/  #   real-time multi-user editing & presence
├── packages/
│   └── domain/         # Framework-agnostic planning domain model — scaffold
├── docs/               # Vision, architecture, roadmap, glossary, migration
├── artifact/           # ARCHIVED original DB-design app (see artifact/README.md)
├── CLAUDE.md           # Guidance for AI agents working in this repo
└── .claude/            # Project agents & skills for the planning platform
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how these fit together.

## Getting started

The new platform is at the scaffold stage — the packages under `apps/`,
`services/`, and `packages/` define structure and intent, and are being filled in.
Start with the docs to understand the direction:

1. [`docs/VISION.md`](docs/VISION.md) — the problem, the product, and principles.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design and boundaries.
3. [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased plan and current status.
4. [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — shared planning vocabulary.

### Running the archived app

The original database-design tool still runs, from inside its folder:

```bash
cd artifact
pnpm install
pnpm dev
```

See [`artifact/README.md`](artifact/README.md) for details.

## Contributing

We'd love help building this. Please read the [Contributing Guide](CONTRIBUTING.md)
and the [Code of Conduct](CODE_OF_CONDUCT.md). Good first areas: shaping the
domain model in `packages/domain`, importer/exporter formats, and the canvas
workspace in `apps/web`.

## License

Open source under the **GNU General Public License v3.0**. See [LICENSE.md](LICENSE.md).
