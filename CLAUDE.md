# CLAUDE.md

Guidance for Claude Code and other AI agents working in this repository.

## What this project is

**Thoth Blueprint** is a **cloud-based site & community planning platform** — a
collaborative, web-native alternative to traditional CAD, focused on land, sites,
and neighborhoods. It is **not** a database-design tool. The original
database-design app has been **archived** under [`artifact/`](artifact/) and is
read-only.

Read these before doing substantive work:

- [`docs/VISION.md`](docs/VISION.md) — the product and its principles.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design and boundaries.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's in scope now (domain model first).
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — the vocabulary to use.
- [`docs/MIGRATION.md`](docs/MIGRATION.md) — why `artifact/` exists.

## Repository map

```
apps/            client apps (apps/web = planning workspace)      ← new product
services/        cloud backend (auth, projects, geospatial, collaboration)
packages/domain  framework-agnostic planning domain model         ← start here
docs/            product & engineering docs
artifact/        ARCHIVED original DB-design app (read-only)
.claude/         project agents & skills
```

## Rules of engagement

1. **Build at the root, never in `artifact/`.** Treat `artifact/` as read-only
   reference. Do not import from it, extend it, or "fix" it for new features. You
   may read it to learn patterns (React Flow canvas, Zustand state, Dexie
   persistence, import/export) and re-implement them cloud-first.
2. **Domain model is sacred and clean.** `packages/domain` is framework-agnostic:
   no React, no server framework, no database driver. Planning rules live here so
   the client, services, and tooling share one source of truth.
3. **Cloud-first, not offline-first.** This reverses the archived app's core
   assumption. Design for multi-user, server-backed, collaborative editing.
4. **Be spatially explicit.** Geometry always carries a coordinate system, units,
   and scale. Never introduce unitless "just a rectangle" shapes.
5. **Speak the glossary.** Use `Site`, `Parcel`, `Lot`, `Zone`, `LandUse`,
   `Setback`, `Right-of-Way`, `Checkpoint`, `ErosionControl`, `SoilType`, etc. as defined in the glossary — in
   code, comments, and UI.
6. **Strict mathematical boundaries.** Ensure subdivision, geometry, and plat rules throw explicit realistic errors for overlapping geometry, collisions, or impossible targets.
7. **Respect the roadmap.** The domain model (Phase 1) gates most later work; prefer
   changes that advance it. Don't build UI on primitives that don't exist yet.

## Working conventions

- **Monorepo:** each workspace owns its `package.json` and scripts. Run commands
  from the relevant workspace. The archived app builds from `artifact/`
  (`cd artifact && pnpm install && pnpm build`).
- **TypeScript, strict.** Avoid `any`. Prefer explicit domain types.
- **Docs move with behavior.** If you change structure or behavior, update the
  relevant file in `docs/`.
- **CI:** the `Build and Test` workflow builds the archived app from `artifact/`.
  When a scaffold package gains real build/test tooling, add a CI job beside
  `artifact-build`.
- **Scaffold honesty.** Files under `apps/`, `services/`, and `packages/` are
  currently placeholders that document intent. When you implement one, replace the
  placeholder with real code and update its `README.md`.

## Project agents & skills

See [`.claude/agents/`](.claude/agents/) and [`.claude/skills/`](.claude/skills/)
for domain-specialized agents (planning-domain modeling, geospatial/interop,
canvas/frontend) and repo-specific skills (scaffolding a new service/package). Use
them for the work they describe.

## Git & PRs

- Use conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- Don't open a PR unless explicitly asked. If you do, follow
  [`.github/pull_request_template.md`](.github/pull_request_template.md) and mark the
  correct **Area**.
