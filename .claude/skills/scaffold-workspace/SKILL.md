---
name: scaffold-workspace
description: >-
  Use when adding a new workspace to the Thoth Blueprint monorepo — a client app
  under apps/, a backend service under services/, or a shared library under
  packages/. Creates a consistent workspace skeleton (README, package.json,
  src/, docs pointers) that matches the platform's conventions. Trigger on
  requests like "scaffold a new service", "add a package for X", "create the
  collaboration service".
---

# Scaffold a monorepo workspace

Thoth Blueprint is a cloud site & community planning platform organized as a
monorepo. Use this skill to add a new workspace consistently.

## Before scaffolding

1. Confirm the workspace belongs. Read `docs/ARCHITECTURE.md` and place it in the
   right tier:
   - `apps/<name>` — a client application (has a UI).
   - `services/<name>` — a cloud backend service (auth, projects, geospatial,
     collaboration, or a new one justified by architecture).
   - `packages/<name>` — a shared, reusable library. Domain logic goes in the
     existing `packages/domain`; only add a new package for a genuinely separate
     concern.
2. Check it doesn't already exist. Never scaffold inside `artifact/` (archived,
   read-only).

## Steps

1. Create the directory and a `src/` folder.
2. Add a `README.md` that states the workspace's purpose, its boundaries (what it
   must NOT depend on), and its current status (scaffold vs. implemented).
3. Add a `package.json` with a scoped name (e.g. `@thoth/<name>`), `private: true`,
   `type: "module"`, and placeholder `scripts` (`build`, `type-check`, `test`)
   that are honest about being unimplemented.
4. Add a minimal `src/index.ts` that documents intent (exports/entry point stub).
5. If the workspace has real build/test tooling, add a CI job beside
   `artifact-build` in `.github/workflows/build_test.yml`.
6. Update the repository map in `README.md`, `CLAUDE.md`, and
   `docs/ARCHITECTURE.md` if the new workspace changes the top-level structure.

## Conventions to enforce

- Framework-agnostic packages (like `packages/domain`) must not import React, a
  server framework, or a database driver.
- Every workspace README documents what it depends on and what it must not.
- Use the planning vocabulary from `docs/GLOSSARY.md`.
- Keep placeholders honest: label unimplemented scripts and modules clearly so the
  scaffold is never mistaken for a finished feature.
