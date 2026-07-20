# Requirements Traceability Matrix - Part 98
**Subject:** Wall Cleanup Intersections (Chapter 20, Part 3)
**Coverage:** Wall Offsets Cleanup, Cleanup Radius Checks, Intersections Merging, Joint Overrides, Visual Audit Warnings

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-98-001 | Chapter 20 > Walls > Offsets Cleanup | The system shall compute offsets cleanup coordinates at joint intersections. | Trace-to-Spec-v1 | Line intersection calculations resolved in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-98-002 | Chapter 20 > Walls > Radius Checks | The system shall validate that intersecting wall segments sit within the cleanup radius range. | Trace-to-Spec-v1 | Not implemented |
| REQ-98-003 | Chapter 20 > Walls > Merging | The system shall merge wall components hatching fills at cleaned-up joints. | Trace-to-Spec-v1 | Not implemented |
| REQ-98-004 | Chapter 20 > Walls > Joint Overrides | The system shall support overriding joint cleanup at individual joints to allow clean separation. | Trace-to-Spec-v1 | Not implemented |
| REQ-98-005 | Chapter 20 > Walls > Audit Warnings | The system shall highlight wall segments that fail cleanup rules due to mismatched heights or angles. | Trace-to-Spec-v1 | Warning highlights rendered in properties lists in [PropertiesPanel.tsx](../apps/web/src/features/workspace/PropertiesPanel.tsx) |
