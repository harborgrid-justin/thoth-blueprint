# Requirements Traceability Matrix - Part 91
**Subject:** Cameras (Chapter 51)
**Coverage:** Placed 3D Cameras, Perspective Viewing Angles, Target LookAt Offsets, 2D Camera Markers, Preset Eye Heights

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-91-001 | Chapter 51 > Cameras > Placements | The system shall support placing 3D perspective cameras at coordinate points. | Trace-to-Spec-v1 | Camera instances initialized inside three.js in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-91-002 | Chapter 51 > Cameras > Perspective | The system shall support configuring camera field-of-view angles and focal lens ranges. | Trace-to-Spec-v1 | Camera FOV values configured in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-91-003 | Chapter 51 > Cameras > Targets | The system shall support specifying look-at target coordinates to focus the camera. | Trace-to-Spec-v1 | OrbitControls camera target offset vectors updated inside [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-91-004 | Chapter 51 > Cameras > Markers | The system shall render camera position markers and field-of-view cones on 2D plan layout sheets. | Trace-to-Spec-v1 | Not implemented |
| REQ-91-005 | Chapter 51 > Cameras > Eye Heights | The system shall support preset camera elevations (e.g. human eye height, bird's eye view). | Trace-to-Spec-v1 | Mapped to camera presets switches in [canvasStore.ts](../../../apps/web/src/store/canvasStore.ts) |

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


