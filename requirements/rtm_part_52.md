# Requirements Traceability Matrix - Part 52
**Subject:** Walls (Chapter 20)
**Coverage:** Wall Styles (Composite Components), Justification (Inside/Outside Direction), Wall Endcaps, Cleanup Groups, Convert Polylines to Walls

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-52-001 | Chapter 20 > Walls > Styles | The system shall support Wall Styles with multiple components (e.g., studs, GWB, masonry) having individual widths. | Trace-to-Spec-v1 | Roadway assemblies sub-elements (Lanes, Sidewalks) mapped in [assembly.ts](../packages/domain/src/assembly.ts) |
| REQ-52-002 | Chapter 20 > Walls > Direction | The system shall track interior and exterior wall faces dynamically using component indexing relative to direction. | Trace-to-Spec-v1 | Curve direction and offset computations checked in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-52-003 | Chapter 20 > Walls > Endcaps | The system shall support customizable Wall Endcaps for wall start and end terminations. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-004 | Chapter 20 > Walls > Cleanup Groups | The system shall provide Wall Cleanup Groups to automatically clean wall intersections and corners. | Trace-to-Spec-v1 | Not implemented |
| REQ-52-005 | Chapter 20 > Walls > Convert Objects | The system shall support converting drawing 2D polylines into 3D Wall elements. | Trace-to-Spec-v1 | Polylines mapped as wall footprint paths during assembly sweeps in [corridor.ts](../packages/domain/src/corridor.ts) |
