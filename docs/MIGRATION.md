# Migration: from DB-design tool to cloud planning platform

This document records the realignment of the Thoth Blueprint repository and how to
work with the result.

## What changed

Thoth Blueprint began as an **offline-first, browser-based database schema design
tool** â€” a drag-and-drop schema editor with DBML/SQL/JSON/SVG export and framework
migration generation, storing everything locally in IndexedDB.

The project has been repurposed into a **cloud-based site & community planning
platform**: a collaborative, web-native alternative to traditional CAD, focused on
land, sites, and neighborhoods. The name **Thoth Blueprint** is retained.

## What happened to the original app

**It was archived, not deleted.** The entire original application was moved with
`git mv` into [`../artifact/`](../artifact/), so its full history is preserved and
`git log --follow` still works across the move. Nothing in it was modified during
the migration.

The archived app remains fully functional and buildable from inside its own folder:

```bash
cd artifact
pnpm install
pnpm dev
```

See [`../artifact/README.md`](../artifact/README.md).

### Exactly what moved into `artifact/`

- Application source (`src/`) and static assets (`public/`, `index.html`).
- Build/tooling config: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`,
  `tsconfig*.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`,
  `components.json`, `.husky/`.
- Deployment config: `Dockerfile`, `docker-compose.yml`, `nginx.conf`,
  `.dockerignore`, `vercel.json`.
- App-specific docs and assets: `AI_RULES.md`, `docs/VERSIONING.md`,
  `image1.png`, `image2.png`.

### What stayed at the repository root

- Repository-level meta: `LICENSE.md`, `CODE_OF_CONDUCT.md`, `.gitignore`,
  `.github/`.
- **Rewritten** for the new product: `README.md`, `CONTRIBUTING.md`,
  `.github/copilot-instructions.md`.
- **New** product docs (`docs/VISION.md`, `docs/ARCHITECTURE.md`,
  `docs/ROADMAP.md`, `docs/GLOSSARY.md`, this file).
- **New** agent tooling: `CLAUDE.md` and `.claude/` (agents + skills).
- **New** scaffold: `apps/`, `services/`, `packages/domain`.

## CI impact

The `Build and Test` workflow was updated so its build job runs inside `artifact/`
(the archived app keeps building and guards against regressions). As real scaffold
packages gain build/test tooling, add matching CI jobs next to `artifact-build`.

## Why archive instead of a fresh repository

- **Preserve history and credit** â€” contributors and commit history stay intact.
- **Reuse patterns** â€” the archived app is a strong reference for canvas editing
  (React Flow), state orchestration (Zustand), local persistence (Dexie), and
  import/export ergonomics. We re-implement these cloud-first rather than starting
  from zero knowledge.
- **Continuity of the name and community** â€” the project and its audience carry
  forward.

## Guidance for contributors

- Build new features at the **repository root**, following
  [ARCHITECTURE.md](ARCHITECTURE.md).
- Treat `artifact/` as **read-only reference**. Don't import from it or extend it.
- Keep the planning **domain model** (`packages/domain`) framework-agnostic.
- Use the shared **vocabulary** in [GLOSSARY.md](GLOSSARY.md).

---

## Related Requirement Documents

For the complete set of system requirements and traceability matrices, refer to the following documents:
- [Requirements Suite README](file:///f:/AutoCAD%20Competitor/docs/requirements/README.md)
- [Master Requirements Traceability Matrix (RTM)](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/traceability-matrix.md)
- [Requirements Coverage Report](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/coverage-report.md)
- [Unimplemented / Partially-Implemented Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/04-traceability/unimplemented_requirements.md)
- [Frontend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/frontend-requirements.md)
- [Backend Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/backend-requirements.md)
- [Domain Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/domain-requirements.md)
- [Interoperability Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/02-functional/interoperability-requirements.md)
- [Non-Functional Requirements](file:///f:/AutoCAD%20Competitor/docs/requirements/03-nonfunctional/nonfunctional-requirements.md)

