# Competitive gap analysis: subdivision platting, engineering & survey

A gap analysis of Thoth Blueprint's current capability (as of the Rust core
migration — see `docs/RUST_MIGRATION.md`) against the major commercial
platforms engineers, architects, and surveyors use today to draw and manage
subdivisions: **Autodesk Civil 3D / InfraWorks**, **Bentley OpenSite
Designer / OpenRoads Designer**, **Trimble Business Center**, **Carlson
Civil Suite / Carlson Survey**, and **Esri ArcGIS Pro**, plus point solutions
like **HydroCAD/GeoSTORM** (hydrology) and **AutoTURN** (swept-path).

## What we already have (don't re-litigate these)

Per each crate's `STATUS.md`: a full planning element hierarchy (`Site`
through 21 concrete element kinds), slide-line/swing-line subdivision with
explicit error boundaries, buildable-envelope/setback computation, coverage/
FAR/density/land-use-allocation metrics, PLSS and metes-and-bounds survey
with traverse closure/adjustment, COGO point management, horizontal/vertical
alignments with a basic LandXML export, terrain/grading with cut/fill and
mass-haul, storm/sanitary pipe network *validation* (not full hydrology),
superelevation, corridor cross-sections, CAD sheet production (dimensions,
hatch, schedules, NCS layers), a parts/symbol catalog, coordinate
reprojection (Web Mercator/UTM/LCC), GeoJSON interop, and a first-pass
auth/projects/collaboration service layer.

## Gaps — organized by theme, 66 items

Each gap below is annotated with which competitor platform(s) set the bar and
which agent/crate below owns implementing it.

### Theme 1 — Stormwater hydrology & hydraulics (`thoth-hydrology`, Agent 1)
_Bar set by: GeoSTORM, HydroCAD, Hydrology Studio, Bentley's stormwater
module — none of this exists in our pipe-network validator today._

1. Rational Method peak-flow calculation (C·i·A)
2. Time of concentration (TR-55 sheet-flow / shallow-concentrated-flow /
   channel-flow segment method)
3. SCS/NRCS TR-55 curve-number runoff depth and dimensionless unit hydrograph
4. TR-20-style hydrograph convolution/routing for larger watersheds
5. Detention/retention pond stage-storage-discharge routing (Puls method)
6. Orifice and weir outlet-structure hydraulics (single- and multi-stage)
7. Culvert hydraulic design: inlet- vs. outlet-control headwater (HY-8-style)
8. Storm-sewer hydraulic/energy grade line (HGL/EGL) profile computation
9. Watershed/catchment delineation from a DEM (flow direction & accumulation
   over `thoth-civil`'s `ElevationGrid`)
10. Water-quality volume (WQv) / first-flush capture sizing
11. LID/BMP sizing: bioretention, permeable pavement, vegetated swales
12. Runoff-reduction crediting for green infrastructure
13. FEMA floodplain/floodway overlay and encroachment check

### Theme 2 — Transportation & traffic engineering (`thoth-transportation`, Agent 2)
_Bar set by: Civil 3D's roundabout/intersection tools, AutoTURN, OpenRoads
Designer's geometric-design checks._

14. AASHTO stopping-sight-distance check (horizontal & vertical)
15. AASHTO crest/sag vertical-curve minimum-length design
16. Superelevation design-speed policy compliance (extends existing runoff
    calculation with an AASHTO Green Book policy table check)
17. Minimum horizontal-curve-radius policy check by design speed
18. Intersection turning-radius templates (WB-40/WB-50/SU-30 design vehicles)
19. Vehicle swept-path analysis (AutoTURN-style tractrix simulation)
20. ITE trip-generation estimate from land-use/density inputs
21. Cul-de-sac / hammerhead turnaround standard-geometry generator
22. Roundabout geometry design (inscribed circle diameter, fastest-path check)
23. Pavement structural design (AASHTO 1993 flexible/rigid thickness design)
24. ADA accessible-route slope/cross-slope/landing compliance check
25. Traffic-signal warrant analysis (MUTCD peak-hour/volume warrants)

### Theme 3 — Field data & format interoperability (`thoth-interop`, Agent 3)
_Bar set by: LandXML (the de facto civil/survey exchange standard), Trimble
Business Center's field-to-finish workflow, Esri's parcel fabric._

26. Full LandXML import/export: surfaces (TIN), parcels, pipe networks,
    points, alignments (beyond the existing partial alignment-only export)
27. Shapefile import/export
28. DXF basemap import (entities → `PlanElement`s)
29. KML/KMZ export (public-engagement-friendly visualization)
30. GNSS raw-observation (RINEX) import and least-squares network adjustment
31. Total-station field-book import (Trimble JobXML, Leica GSI, Carlson RW5)
32. Point-cloud ground/non-ground semantic classification (beyond the
    existing XYZ/LAS/PLY/DXF parsing)
33. Cadastral parcel-fabric import and parcel-boundary matching against
    county/assessor data
34. IFC import (for coordinating with vertical building BIM models)
35. Datum transformation pipeline (NADCON/NTv2 grid shift), beyond the
    existing UTM/Mercator/LCC projection math
36. Survey control-network least-squares adjustment (beyond the existing
    simple Compass/Transit traverse rule)
37. Construction-staking point-list export (cut/fill-to-grade, offsets)

### Theme 4 — Subdivision design automation (`thoth-planning` extension, Agent 4)
_Bar set by: Civil 3D's AI-assisted grading optimization, OpenSite
Designer's layout/grading optimization, parcel-yield tools._

38. Automated lot-yield optimization (maximize conforming-lot count under
    zoning/frontage/area constraints)
39. Automated road-network layout generator respecting block-length and
    dead-end-length standards
40. Grading-optimization solver (cut/fill balance minimization over a
    candidate pad-elevation search, building on existing mass-haul reporting)
41. Automated building-envelope fit-check against setbacks + easements + FAR
    in one pass (composing existing rules, not a new geometry engine)
42. 3D utility conflict/clash detection (pipe vs. pipe, pipe vs. structure)
43. Automated ROW dedication and easement-polygon generation from
    subdivision geometry
44. Subdivision phasing / build-out sequencing model
45. Impact-fee calculation (schools/utilities/parks capacity formulas)
46. Open-space/park-dedication requirement calculator
47. Tree-preservation/canopy-retention ordinance compliance (extends
    existing `canopyCover` tracking with a preservation-percentage rule)
48. Zoning variance/waiver tracking against a rule library
49. Basic geotechnical screening: infinite-slope factor-of-safety check
50. Unified certified-plat composer (metes-and-bounds + curve table +
    monument callouts + surveyor's certificate into one document object)

### Theme 5 — Drawing production & specialty analysis (`thoth-drawing` extension, Agent 5)
_Bar set by: Civil 3D's plan production automation, lighting/AutoCAD
specialty verticals, and BIM 360-style submittal packaging._

51. Automated construction-staking sheet generation from the staking
    point list (Theme 3, item 37)
52. Automated submittal-package / plan-set index generation for municipal
    review
53. Professional-stamp/seal metadata workflow (who signed, license #, date,
    discipline) attached to a sheet set
54. Bond-estimate generator (quantities × unit-cost schedule → surety amount)
55. Photometric/lighting point-by-point illuminance-grid calculation
56. Pavement-marking and signage plan symbol placement
57. Sun/shadow study (solar position + shadow projection for lat/lon/date/time)
58. Viewshed analysis (line-of-sight visibility raster from a DTM)
59. Simplified traffic-noise contour prediction (FHWA-model-style)
60. Plan-revision redline diff (geometry/attribute changes between two
    versions of the same sheet or site)

### Theme 6 — Compliance, governance & collaboration (`thoth-governance`, Agent 6)
_Bar set by: municipal e-plan-review portals, Esri's ArcGIS Hub public
engagement, and enterprise PM/versioning tooling layered on top of CAD._

61. Parametric, jurisdiction-configurable zoning/ordinance rule engine
    (beyond the fixed buildable-envelope rule already in `thoth-planning`)
62. Plan-version comparison and merge (structured diff across checkpoints)
63. Redline-comment resolution workflow tied to a review cycle/status
64. Regulatory audit trail (who changed what, when, under which review round)
65. "Will-serve"/utility-capacity request tracking workflow
66. Public read-only engagement sharing (scoped, revocable share links over
    `thoth-services`' existing `CollaborationHub`/`StorageAdapter`)

## Assignment: 6 parallel agents, 1 exclusive crate each

| # | Agent | Crate | Gaps |
|---|---|---|---|
| 1 | Hydrology | `crates/thoth-hydrology` (new) | 1-13 |
| 2 | Transportation | `crates/thoth-transportation` (new) | 14-25 |
| 3 | Interop | `crates/thoth-interop` (new) | 26-37 |
| 4 | Planning automation | `crates/thoth-planning` (extend) | 38-50 |
| 5 | Drawing/specialty | `crates/thoth-drawing` (extend) | 51-60 |
| 6 | Governance | `crates/thoth-governance` (new) | 61-66 |

All new crates depend only on already-stable, frozen-by-completion sibling
crates (`thoth-spatial`, `thoth-civil`, `thoth-survey`, `thoth-planning`,
`thoth-services`) — see each new crate's `Cargo.toml`. Unlike the original
migration pass, these sibling crates are done and their public APIs are
stable, so agents may depend on them directly instead of working around a
documented `GAPS.md` cross-crate limitation.
