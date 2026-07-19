# Software Requirements Specification (SRS)

**Product:** Thoth Blueprint — cloud site & community planning platform
**Status:** Draft · living document · Phase 0 (scaffold)
**Standard:** structured per ISO/IEC/IEEE 29148:2018

This is the master Software Requirements Specification. It is deliberately thin:
it establishes purpose, scope, and structure, then **points into** the detailed
requirement files rather than duplicating them. The catalog is the source of
truth; this document is the map to it.

## 1. Introduction

### 1.1 Purpose
Specify the requirements for Thoth Blueprint across its frontend workspace,
backend services, shared domain model, and interoperability — traceably and
verifiably — so the team builds the right product and can prove it did.

### 1.2 Scope
See [scope & context](scope-and-context.md). In scope: a collaborative,
web-native planning workspace; cloud services for identity, projects, geospatial,
and collaboration; a framework-agnostic planning domain model; and interop with
GeoJSON/KML/Shapefile/DXF/GeoPackage/CSV/PDF. Out of scope: mechanical CAD, a full
GIS suite, and construction-documentation deliverables.

### 1.3 Definitions
All defined terms use the project [glossary](../../GLOSSARY.md). Requirements
conventions (ID scheme, priority, verification) are in
[standards & conventions](standards-and-conventions.md).

### 1.4 References
- Product: [VISION](../../VISION.md), [ROADMAP](../../ROADMAP.md),
  [ARCHITECTURE](../../ARCHITECTURE.md), [GLOSSARY](../../GLOSSARY.md),
  [MIGRATION](../../MIGRATION.md)
- Research grounding: [competitive analysis](competitive-analysis.md) and
  [`_meta/`](../_meta/) captures
- External standards: ISO/IEC/IEEE 29148, ISO/IEC 25010, OGC Simple Features,
  GeoJSON RFC 7946, WCAG 2.2, OWASP ASVS 4.0

## 2. Overall description

### 2.1 Product perspective
A cloud service with a browser client, backend services, and a shared domain
model — the [system context](scope-and-context.md#system-context). It is the
successor to the archived database-design app under [`artifact/`](../../../artifact/),
which is read-only reference only.

### 2.2 Users
Seven actors from site planner to community stakeholder to integrator —
see [stakeholders](../01-business/stakeholders.md).

### 2.3 Constraints & assumptions
Ten binding constraints (`CON-001`–`CON-010`) —
see [scope & context](scope-and-context.md#constraints--assumptions). Chief among
them: web-first, cloud-first, domain-native, spatially explicit, framework-agnostic
domain model, GPLv3.

### 2.4 Design & competitive grounding
Requirement areas are justified against established tools (AutoCAD/Civil 3D,
ArcGIS Urban/Pro, CityEngine, UrbanFootprint, TestFit, Modelur, and collaborative
canvases) in the [competitive analysis](competitive-analysis.md).

## 3. Specific requirements

The detailed catalog, by layer:

| Layer | Document | Count |
| --- | --- | :--: |
| Business | [business-requirements.md](../01-business/business-requirements.md) | 11 |
| Stakeholder | [stakeholders.md](../01-business/stakeholders.md) | 7 |
| Functional — Frontend | [frontend-requirements.md](../02-functional/frontend-requirements.md) | 58 |
| Functional — Backend | [backend-requirements.md](../02-functional/backend-requirements.md) | 41 |
| Functional — Domain model | [domain-requirements.md](../02-functional/domain-requirements.md) | 55 |
| Functional — Interoperability | [interoperability-requirements.md](../02-functional/interoperability-requirements.md) | 21 |
| Non-functional | [nonfunctional-requirements.md](../03-nonfunctional/nonfunctional-requirements.md) | 42 |

## 4. Verification & traceability

Bidirectional traceability across BR → STK → {FE, BE, DOM, IOP} → phase · module ·
verification, plus NFR cross-cutting scope, is maintained in the
[Requirements Traceability Matrix](../04-traceability/traceability-matrix.md) and
validated in the [coverage report](../04-traceability/coverage-report.md).

## 5. Delivery sequencing

Requirements are scheduled into the roadmap phases; the domain model (Phase 1)
gates most later work. See the
[phase coverage matrix](../04-traceability/traceability-matrix.md#matrix-e--phase-coverage-roadmap-alignment).

## 6. Document control

This SRS and its catalog are living documents. Per project convention, *docs move
with behavior*: any change to structure or behavior updates the affected
requirement and its RTM row. Requirement IDs are stable and never reused
([stability rule](standards-and-conventions.md#identifier-scheme)).
