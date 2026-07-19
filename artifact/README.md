# Thoth Blueprint — Archived DB-Design App (`artifact/`)

> **This folder is an archive.** It contains the original Thoth Blueprint
> application — an offline-first, browser-based **database schema design tool** —
> exactly as it existed before the project was realigned into a **cloud-based site
> & community planning platform**. See the repository root [`README.md`](../README.md)
> and [`docs/VISION.md`](../docs/VISION.md) for the new direction, and
> [`docs/MIGRATION.md`](../docs/MIGRATION.md) for why this code was archived rather
> than deleted.

Nothing here has been modified during the migration — it was moved with
`git mv`, so its full history is preserved. It remains a fully functional app and
a useful reference for patterns we carry forward (React Flow canvas editing,
Dexie/IndexedDB persistence, Zustand orchestration, DBML import/export, and
framework migration codegen).

## What it is

A free, powerful database design tool with a drag-and-drop schema editor. Create,
edit, and export database designs to SQL, DBML, JSON, and SVG, and generate
migration files for Laravel, TypeORM, and Django. All data is stored locally in
the browser (IndexedDB), so it works fully offline.

## Running the archived app

All commands run **from inside this `artifact/` folder** (its `package.json` did
not move to the repo root):

```bash
cd artifact
pnpm install
pnpm dev          # start the dev server
pnpm build        # type-check + lint + production build
pnpm preview      # preview the production build
```

Docker also still works from here:

```bash
cd artifact
docker build -t thothblueprint .
docker run -d -p 8080:80 --name thothblueprint thothblueprint
```

## Layout

| Path | Purpose |
| --- | --- |
| `src/components` | UI + React Flow editor components |
| `src/store` | Zustand state orchestration |
| `src/lib` | Data logic — Dexie, import/export, parsing, codegen |
| `src/pages` | Route views |
| `public` | Static assets / PWA manifest |
| `docs/VERSIONING.md` | Version-bump process for the archived app |
| `AI_RULES.md` | Stack/layout rules for the archived app |

## Status

Maintenance-only. New product work happens at the repository root. If you need a
database-design feature, prefer building it into the new platform's data-modeling
surface rather than extending this archive.
