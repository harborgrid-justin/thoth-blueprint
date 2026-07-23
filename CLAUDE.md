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
- [`docs/RUST_MIGRATION.md`](docs/RUST_MIGRATION.md) — status of the TS-to-Rust migration.

## Repository map

```
apps/            client apps (apps/web = planning workspace)      <- new product
services/        cloud backend (auth, projects, geospatial, collaboration)
packages/domain  framework-agnostic planning domain model         <- start here
packages/storage default internal storage layer (SQLite by default, swappable)
crates/          Rust core: domain logic migration + wasm/napi integration
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
8. **New business logic goes in Rust, under `crates/`, not in TypeScript.**
   `packages/domain` and `services/*` logic is being migrated to Rust (see
   [`docs/RUST_MIGRATION.md`](docs/RUST_MIGRATION.md) and
   [`crates/README.md`](crates/README.md)). Treat `crates/thoth-spatial` as
   the frozen shared contract every other crate depends on -- never edit it;
   if it's missing something a port needs, document the gap (see
   `crates/thoth-planning/GAPS.md` and `crates/thoth-civil/GAPS.md` for the
   pattern) and work around it locally instead. Unless work is genuinely
   UI-only (React components, styling, layout), prefer adding new planning/
   survey/civil/drawing/service logic to the relevant Rust crate over the
   TypeScript package it's superseding. `crates/thoth-bindings` (wasm-bindgen,
   for `apps/web`) and `crates/thoth-napi` (napi-rs, for `services/*`) are the
   integration layer that exposes ported Rust logic back to the JS/TS side --
   extend those following their own module docs and `crates/README.md` rather
   than reimplementing the same logic a second time in TypeScript.

## Working conventions

- **Monorepo:** each workspace owns its `package.json` and scripts. Run commands
  from the relevant workspace. The archived app builds from `artifact/`
  (`cd artifact && pnpm install && pnpm build`).
- **Testing:** Unit tests run via `yarn test`. End-to-End Playwright test suite (81 test cases across 15 spec files) runs via `yarn workspace @thoth/web test:e2e` or `yarn workspace @thoth/web test:e2e:ui`.
- **TypeScript, strict.** Avoid `any`. Prefer explicit domain types.
- **Docs move with behavior.** If you change structure or behavior, update the
  relevant file in `docs/`.
- **CI:** the `Build and Test` workflow builds the archived app from `artifact/`.
  When a scaffold package gains real build/test tooling, add a CI job beside
  `artifact-build`. The `rust-workspace` job runs `cargo fmt`/`clippy`/`test`
  across `crates/`; see `docs/RUST_MIGRATION.md` for its current pass/fail
  state and why a domain crate being mid-port can legitimately fail it.
- **Rust tooling:** `yarn build:rust` / `yarn test:rust` / `yarn fmt:rust` /
  `yarn clippy:rust` wrap the equivalent `cargo` commands from the repo root.
  `yarn build:wasm` (re)generates the `thoth-bindings` wasm package
  `apps/web` imports; `yarn build:napi` (re)builds the `thoth-napi` native
  Node addon. See `crates/README.md`.
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
