# Requirements Traceability Matrix - Part 61
**Subject:** Structural Members (Chapter 31)
**Coverage:** Column & Beam Styles (Steel/Concrete/Timber), Grid Placements, Offsets & Rotations, Trim & Split Rules, 3D AISC Shapes, Baseplates, Angled Bracing, Rebar Schedules, Timber Joists, Load Indicators, Deflection Audits, Shear Tabs, Footings Foundations, Structural Analysis Export

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-61-001 | Chapter 31 > Structural > Styles | The system shall support Structural Member Styles modeling columns, beams, and braces. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-002 | Chapter 31 > Structural > Plids | The system shall support placing columns at coordinate intersections of layouts grids. | Trace-to-Spec-v1 | Snapping logic to layout lines intersections in [PlanningCanvas.tsx](../apps/web/src/features/canvas/PlanningCanvas.tsx#L161) |
| REQ-61-003 | Chapter 31 > Structural > Justification | The system shall support configuring vertical offset, horizontal justification, and rotations. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-004 | Chapter 31 > Structural > Trimming | The system shall support trimming and split cuts on structural members overlapping boundaries. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-005 | Chapter 31 > Structural > AISC Shapes | The system shall extrude standard shapes (AISC I-beams, hollow tubes) in the 3D model. | Trace-to-Spec-v1 | Custom structural shapes swept in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-61-006 | Chapter 31 > Structural > Baseplates | The system shall support placing custom column steel baseplates with anchor bolt holes and dimensions metadata. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-007 | Chapter 31 > Structural > Bracing | The system shall support placing angled braces snapped to beam-column intersection joints. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-008 | Chapter 31 > Structural > Rebar | The system shall support concrete reinforcement detailing schedules (rebar spacing and layout diameter formulas). | Trace-to-Spec-v1 | Not implemented |
| REQ-61-009 | Chapter 31 > Structural > Timber Joists | The system shall support joist layout configurations defining nominal timber spacing parameters. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-010 | Chapter 31 > Structural > Design Loads | The system shall support storing design dead and live loads attributes directly on structural member properties. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-011 | Chapter 31 > Structural > Deflection | The system shall run deflection limit audit checks and prompt warnings when members exceed thresholds (e.g. L/360). | Trace-to-Spec-v1 | Not implemented |
| REQ-61-012 | Chapter 31 > Structural > Multi-Component | The system shall support multi-component members representing wrapped structures (e.g. concrete column steel jackets). | Trace-to-Spec-v1 | Not implemented |
| REQ-61-013 | Chapter 31 > Structural > Connections | The system shall support standard connections shapes (clip angles, shear tabs) from steel profiles database catalogs. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-014 | Chapter 31 > Structural > Foundations | The system shall support strip footings and pad foundations placed dynamically under columns and walls. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-015 | Chapter 31 > Structural > CIS2 Export | The system shall support exporting skeleton centerlines analytical models in CIS/2 or IFC Structural formats. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-016 | Chapter 31 > Structural > Grout Offsets | The system shall support specifying leveling grout gap offsets below column baseplates. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-017 | Chapter 31 > Structural > Beams Array | The system shall support distributing beam layout arrays at custom maximum span limits automatically. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-018 | Chapter 31 > Structural > Concrete Stirrups | The system shall support modeling shear stirrup spacing layouts within concrete reinforcement cages. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-019 | Chapter 31 > Structural > Load Combinations | The system shall validate members designs against load combination coefficients. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-020 | Chapter 31 > Structural > Eccentric Loading | The system shall analyze member designs and flag stability risks from second-order eccentricity loading. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-021 | Chapter 31 > Structural > Fireproofing Thickness | The system shall compute required thickness specifications of spray-applied fireproofing coatings based on rating hours. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-022 | Chapter 31 > Structural > European Profiles | The system shall maintain databases catalogs for European steel profiles including HEA, HEB, and IPE shapes. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-023 | Chapter 31 > Structural > Step Footings | The system shall support automatic step elevation transitions on sloped foundation layouts. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-024 | Chapter 31 > Structural > SAF Export | The system shall support exporting member design attributes using standard SAF structural analysis formats. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-025 | Chapter 31 > Structural > Cope Clearances | The system shall support specifying custom cope cutout clearance dimensions at beam joints. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-026 | Chapter 31 > Structural > Column Splices | The system shall locate column splice connections automatically at configured height offsets. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-027 | Chapter 31 > Structural > Anchor Bolt Uplift | The system shall check design anchor bolt embedment lengths against uplift load limits. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-028 | Chapter 31 > Structural > Concrete Keyways | The system shall support modeling horizontal shear keyways at wall-to-footing connections. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-029 | Chapter 31 > Structural > Glulam Beams | The system shall support modeling multi-layer laminated timber beam assemblies parameters. | Trace-to-Spec-v1 | Not implemented |
| REQ-61-030 | Chapter 31 > Structural > Tonnage Schedules | The system shall compile QTO schedules listing total steel tonnage categorized by member style and profile. | Trace-to-Spec-v1 | Not implemented |


