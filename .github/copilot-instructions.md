# Project Guidelines

Thoth Blueprint is a **cloud-based site & community planning platform** — a
collaborative CAD alternative focused on site planning and community/urban
planning. The repository is a monorepo. The original offline-first database-design
app has been archived under `artifact/` and is not where new product work happens.

## Repository Layout

- `apps/` — client applications (the `web` planning workspace).
- `services/` — cloud backend services (auth, projects, geospatial, collaboration).
- `packages/` — shared libraries; `packages/domain` holds the planning domain model.
- `docs/` — product vision, architecture, roadmap, glossary, migration notes.
- `artifact/` — **archived** original DB-design app. Do not extend it for new
  features; treat it as read-only reference. It has its own `package.json`,
  tooling, and build — run its commands from inside `artifact/`.

## Code Style

- Use TypeScript with strict typing; avoid `any` unless there is a clear constraint.
- Prefer small, composable modules with explicit domain types over ad-hoc shapes.
- Keep the planning domain model (`packages/domain`) framework-agnostic: no React,
  no server, no database imports there.
- Reuse patterns proven in `artifact/` (canvas editing, state orchestration,
  import/export) but re-implement them cloud-first rather than copying wholesale.

## Architecture Principles

- **Cloud-first, not offline-first.** Projects are server-backed and multi-user;
  design for real-time collaboration, authorization, and persistence in a
  service — not IndexedDB. (The archived app was offline-first; that constraint no
  longer applies.)
- **Geospatial-aware.** Site and community plans are spatial. Keep coordinate
  systems, units, and layers explicit in the domain model.
- **Separation of concerns.** Domain logic in `packages/domain`; transport/storage
  in `services/`; rendering/interaction in `apps/`.

## Build And Verification

- Each workspace owns its own scripts. Check the nearest `package.json` before
  assuming a command exists.
- The archived app builds from `artifact/` (`cd artifact && pnpm install && pnpm build`).
- New scaffold packages are placeholders; wire up real build/test tooling as they
  are implemented, and add CI jobs alongside `artifact-build`.

## Documentation Links

- Product vision: `docs/VISION.md`
- Architecture: `docs/ARCHITECTURE.md`
- Roadmap: `docs/ROADMAP.md`
- Domain glossary: `docs/GLOSSARY.md`
- Why the old app was archived: `docs/MIGRATION.md`
- Contribution workflow: `CONTRIBUTING.md`
- Agent/automation guidance: `CLAUDE.md`
