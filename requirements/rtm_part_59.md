# Requirements Traceability Matrix - Part 59
**Subject:** Railings (Chapter 28)
**Coverage:** Railing Styles, Balusters Spacing Layout, Path Anchoring (Stairs/Alignments), Height Parameters, 3D Posts Rendering, Fixed Post Editing, Directional Grip Controls

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-59-001 | Chapter 28 > Railings > Styles | The system shall support Railing Styles defining handrails, guardrails, posts, and balusters profiles. | Trace-to-Spec-v1 | Not implemented |
| REQ-59-002 | Chapter 28 > Railings > Balusters | The system shall support customizable balusters spacing and posts layout divisions. | Trace-to-Spec-v1 | Not implemented |
| REQ-59-003 | Chapter 28 > Railings > Path Anchors | The system shall support anchoring railings directly to stair runs or horizontal layout curves. | Trace-to-Spec-v1 | Coordinates offset calculations resolved relative to path lines in [geometry.ts](../packages/domain/src/geometry.ts) |
| REQ-59-004 | Chapter 28 > Railings > Heights | The system shall support setting handrail heights, offsets, and stair sloped transitions. | Trace-to-Spec-v1 | Not implemented |
| REQ-59-005 | Chapter 28 > Railings > 3D Posts | The system shall display railing guard posts and baluster meshes in 3D views. | Trace-to-Spec-v1 | Rendered inside three.js scene compiler in [buildScene.ts](../apps/web/src/features/canvas3d/buildScene.ts) |
| REQ-59-006 | Chapter 28 > Railings > Post Editing | The system shall support adding fixed posts at designated points and removing manually added posts while maintaining dynamic posts flow. | Trace-to-Spec-v1 | Not implemented |
| REQ-59-007 | Chapter 28 > Railings > Grip Controls | The system shall provide grips to translate location, stretch start/endpoints, or reverse the railing orientation path. | Trace-to-Spec-v1 | Not implemented |

