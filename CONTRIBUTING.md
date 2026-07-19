# Contributing to Thoth Blueprint

Thank you for considering contributing to **Thoth Blueprint** — the cloud-based
site & community planning platform! This guide covers how the repository is
organized and how to propose changes.

> **Heads up:** Thoth Blueprint recently pivoted from an offline database-design
> tool to a cloud planning platform. The original app is archived under
> [`artifact/`](artifact/). New feature work belongs at the repository root, not in
> `artifact/`. See [`docs/MIGRATION.md`](docs/MIGRATION.md).

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report unacceptable
behavior to the project maintainers.

## Before you start

Read the product context so your contribution fits the direction:

- [`docs/VISION.md`](docs/VISION.md) — what we're building and why.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system boundaries and where code
  belongs.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's in scope now.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — use these terms consistently.

## How can I contribute?

### Reporting bugs

Check existing issues first to avoid duplicates. When filing a bug, include a
clear title and description, steps to reproduce, expected vs. actual behavior,
environment details, and screenshots where relevant. Note whether the issue is in
the new platform (root) or the archived app (`artifact/`).

### Suggesting enhancements

Enhancements are welcome — especially ones that sharpen the planning domain model
or unblock the roadmap. Provide a clear description, the planning use case (who
needs it and why), and any implementation ideas.

### Pull requests

1. **Fork** the repository.
2. **Create a feature branch** from `main`.
3. **Make your changes** following the conventions below.
4. **Keep the domain model clean** — `packages/domain` stays framework-agnostic.
5. **Update documentation** when you change behavior or structure.
6. **Ensure the relevant workspace builds** (see below).
7. **Submit a pull request** using the repository template.

## Repository structure

This is a monorepo. Each workspace is self-contained and owns its own tooling.

- **`apps/`** — client applications
  - `web/` — the cloud planning workspace (canvas + UI)
- **`services/`** — cloud backend services
  - `auth/`, `projects/`, `geospatial/`, `collaboration/`
- **`packages/`** — shared libraries
  - `domain/` — the planning domain model (parcels, zones, land use, …)
- **`docs/`** — product & engineering documentation
- **`artifact/`** — archived original DB-design app (reference only)

## Development setup

Because each workspace has its own `package.json`, run commands from the workspace
you're working in. For example, the archived app:

```bash
cd artifact
pnpm install
pnpm dev
pnpm lint
pnpm type-check
```

New scaffold packages document their own setup in their `README.md` as they gain
real implementations. When you add build/test tooling to a scaffold package, add a
matching CI job next to `artifact-build` in
[`.github/workflows/build_test.yml`](.github/workflows/build_test.yml).

## Coding standards

- Follow **TypeScript and React best practices**; prefer strict typing over `any`.
- Use **meaningful names** and add **type declarations** where possible.
- Keep the **planning domain model framework-agnostic** — no React, server, or
  database imports in `packages/domain`.
- Be **spatially explicit**: coordinate systems, units, and scale are never
  implicit.
- Follow existing patterns before introducing new abstractions.

## Commit messages

Use clear, conventional commit messages:

```
feat: add parcel subdivision to the domain model
fix: correct setback calculation on irregular lots
docs: expand the planning glossary
refactor: extract layer ordering into a shared util
chore: bump CI node version
```

Prefix types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`.

## Review process

1. **Automated checks** must pass (build, lint, type-check).
2. **Manual review** by maintainers.
3. **Discussion** and iteration if changes are needed.
4. **Approval** and merge.

## Getting help

- **GitHub Issues** — bugs and feature requests.
- **GitHub Discussions** — questions and general discussion.

Thank you for helping build Thoth Blueprint! 🏘️
