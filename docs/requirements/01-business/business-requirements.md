# Business Requirements (`BR`)

Business requirements state **why the product exists** — the outcomes it must
deliver for its market. They are the top of the traceability chain: every
stakeholder and functional requirement traces up to at least one `BR`, and every
`BR` traces down to at least one stakeholder requirement (rule
[`R1`](../00-overview/standards-and-conventions.md#traceability-model)).

Source: [`VISION.md`](../../VISION.md) (problem, product, principles). Priority is
MoSCoW (see [conventions](../00-overview/standards-and-conventions.md)).

| ID | Business requirement | Rationale / source | Priority | Traces down to |
| --- | --- | --- | :--: | --- |
| `BR-001` | The product shall deliver a **web-native planning workspace** that requires no desktop install to view, edit, or comment on a plan. | Removes the install/licensing friction of desktop CAD; a shared link is the unit of collaboration. VISION §problem, principle 1. | M | `STK-001`,`STK-002`,`STK-005`; `FE-*`, `NFR-COMPAT`, `NFR-USE` |
| `BR-002` | The product shall be **domain-native**: parcels, lots, zones, land uses, setbacks, rights-of-way, and infrastructure shall be first-class objects that can be measured, validated, and analyzed as planning — not anonymous shapes. | Core differentiator vs generic drawing tools; validated by every surveyed CAD/GIS tool modeling parcels as objects. VISION principle 2. | M | `STK-001`,`STK-002`; `DOM-*`, `FE-CANVAS`, `FE-METRIC` |
| `BR-003` | The product shall support **real-time, multi-user collaboration and review by default**, including presence, comments, and shared source of truth. | Collaboration across teams, municipalities, and community is painful in existing tools; cloud collaboration is the product's reason to exist. VISION principle 1. | M | `STK-003`,`STK-005`; `BE-COLLAB`,`BE-COMMENT`,`FE-PRESENCE`,`FE-REVIEW` |
| `BR-004` | The product shall be **spatially honest**: coordinate systems, units, and scale are always explicit, and a plan that claims to be to scale shall be measurable to scale. | Prevents the "unitless rectangle" failure mode; correctness of every metric depends on it. VISION principle 3. | M | `STK-001`,`STK-002`; `DOM-CRS`,`DOM-UNIT`,`DOM-GEOM`,`BE-GEO`,`NFR-COMPAT` |
| `BR-005` | The product shall **interoperate with the formats planners already use** — import and export GeoJSON, KML, Shapefile, DXF/DWG, GeoPackage, CSV, and PDF exhibits. | Planners will not adopt a tool that cannot read/write their ecosystem; interop is a first-class service. VISION principle 4. | M | `STK-001`,`STK-004`,`STK-007`; `IOP-*`,`BE-IMPORT`,`BE-EXPORT` |
| `BR-006` | The product shall offer **CAD-grade precision** — snapping, constraints, coordinate entry, and measurement — without CAD-grade friction. | "Approachable power": precision is required for real planning, ease is required for adoption. VISION principle 5. | M | `STK-001`,`STK-004`; `FE-PRECISION`,`FE-MEASURE`,`FE-SELECT` |
| `BR-007` | The product shall be **governed and auditable**: projects are versioned, support named checkpoints, record an audit trail, and can be shared for review and public engagement. | Plans feed real review and public processes; governance makes the output trustworthy. VISION principle 6. | M | `STK-003`,`STK-005`,`STK-006`; `BE-VERSION`,`BE-AUDIT`,`BE-ACCESS`,`FE-PROJECT` |
| `BR-008` | The product shall deliver **planning intelligence** generic tools cannot: live metrics (coverage, density, land-use allocation, FAR) and compliance checks against planning constraints. | The measurable/analyzable half of "domain-native"; a differentiator seen across ArcGIS Urban, TestFit, Modelur. VISION principle 2. | M | `STK-001`,`STK-002`,`STK-004`; `DOM-METRIC`,`DOM-COMPLY`,`FE-METRIC` |
| `BR-009` | The product shall serve the **full stakeholder spectrum**, from professional planners to non-CAD community stakeholders, with role-appropriate capability. | Adoption depends on both power users and the public being able to participate. VISION §who it's for. | S | `STK-001`–`STK-007`; `BE-ACCESS`,`FE-ACCOUNT`,`FE-REVIEW`,`NFR-A11Y` |
| `BR-010` | The product shall be **open and self-hostable** under GPLv3, inspectable and extensible by the community. | Openness is a stated product principle and a trust/adoption lever. VISION principle 7; `CON-007`. | S | `STK-007`; `BE-API`,`NFR-PORT`,`NFR-LEGAL`,`NFR-MAINT` |
| `BR-011` | The product shall be delivered **incrementally, domain-model first**, so later capability builds on a correct, shared planning model. | The domain model gates most later work; sequencing reduces rework. ROADMAP; `CON-010`. | M | all functional areas via phase mapping; `DOM-*` (P1) |
| `BR-012` | The product shall **produce complete architecture and engineering CAD sheet sets** from the shared planning model — composed, standards-conformant, discipline-organised, printable, and deliverable as multi-sheet PDF and DXF/DWG sheet sets for design review, permit, issue-for-construction, and record submissions. | Planners' output *is* drawings; a live plan that cannot be issued as a CAD sheet set stops short of the deliverable that permits, funds, and builds the project. ROADMAP Phase 6; `CON-011`, `CON-012`. | M | `STK-004`, `STK-008`; `FE-SHEET*`, `FE-VIEWPORT`, `FE-TITLE`, `FE-PLOT`, `FE-ANNO`, `FE-SYMBOL`, `FE-REV`, `FE-SCHEDULE`, `FE-GRIDLINE`, `FE-MATCHLINE`, `FE-SHEETSET`, `BE-SHEET`, `BE-TEMPLATE`, `BE-PLOT`, `BE-SCHEDULE`, `BE-PACKAGE`, `DOM-SHEET`, `DOM-TITLEBLOCK`, `DOM-SHEETSET`, `DOM-PLOTSTYLE`, `DOM-SYMBOL`, `DOM-DIM`, `DOM-ANNO`, `DOM-LAYERSTD`, `DOM-GRID`, `DOM-SCHEDULE`, `DOM-REV`, `DOM-XREF`, `DOM-MATCHLINE`, `DOM-DISCIPLINE`, `DOM-NUMBERING`, `IOP-DXFSHEET`, `IOP-PDFSHEET`, `IOP-PLTSTYLE`, `IOP-LAYERMAP`, `IOP-TITLEBLOCK`, `IOP-BLOCK`, `NFR-PLOT`, `NFR-STD` |

## Notes

- `BR-011` is a delivery/business requirement rather than a product feature; it is
  realized through the **Phase** column on every functional requirement and the
  RTM's phase view, not through a single feature.
- `BR-012` expands the product beyond a live planning canvas into the produced
  drawings that permit, fund, and build the project. It reverses two earlier
  non-goals (construction documentation and multi-sheet plan sets) that are
  now Phase-6 scope in [ROADMAP.md](../../ROADMAP.md); *engineering
  calculations* that populate those sheets remain out of scope.
- Business requirements intentionally omit the AREA segment of the ID scheme (they
  are product-wide). See the
  [identifier scheme](../00-overview/standards-and-conventions.md#identifier-scheme).
