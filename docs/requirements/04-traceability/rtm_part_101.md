# Requirements Traceability Matrix - Part 101
**Subject:** Prince William County, Virginia — Civil & Survey Plat Requirements (28,000 sq ft House Plat)
**Coverage:** Virginia State Plane (EPSG:2283), GPIN, VDOT R.O.W., BRL Setbacks, APELSCIDLA Certificates, PWC LDD Approval, 28k House Plat Preset

| Req ID | Requirement Reference / Module | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-PWC-001 | Spatial CRS | Virginia North State Plane (EPSG:2283, NAD83, US Survey Feet) | Trace-to-Code | Defined in [regions.ts](../../../packages/domain/src/planning/regions.ts#L265) & [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L170) |
| REQ-PWC-002 | Parcel GPIN | 10-digit Grid Parcel Identification Number (GPIN) | Trace-to-Code | Handled in [regions.ts](../../../packages/domain/src/planning/regions.ts#L274) & [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L36) |
| REQ-PWC-003 | Magisterial District | PWC Magisterial District metadata (Coles District) | Trace-to-Code | Tracked in [regions.ts](../../../packages/domain/src/planning/regions.ts#L275) & [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L39) |
| REQ-PWC-004 | Min Lot Area | 28,000 sq. ft. minimum lot area enforcement | Trace-to-Code | Enforced in [regions.ts](../../../packages/domain/src/planning/regions.ts#L320) & [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L23) |
| REQ-PWC-005 | Building Setbacks | 35' Front, 15' Side, 25' Rear Building Restriction Lines | Trace-to-Code | Set in [regions.ts](../../../packages/domain/src/planning/regions.ts#L321) & [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-PWC-006 | Max Lot Coverage | Maximum 35% impervious lot coverage ratio | Trace-to-Code | Calculated in [metrics.ts](../../../packages/domain/src/planning/metrics.ts) & [MetricsPanel.tsx](../../../apps/web/src/features/workspace/MetricsPanel.tsx) |
| REQ-PWC-007 | Building Height | 35 ft max building height / 2.5 storeys limit | Trace-to-Code | Checked in [building.ts](../../../packages/domain/src/planning/building.ts) & [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L80) |
| REQ-PWC-008 | Public Road R.O.W. | 50 ft VDOT Public Road Right-of-Way modeling | Trace-to-Code | Rendered in [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L90) |
| REQ-PWC-009 | Entrance Apron | VDOT CG-11 concrete driveway entrance apron | Trace-to-Code | Mapped in [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L10) |
| REQ-PWC-010 | Front PU&DE | 10 ft Public Utility & Drainage Easement parallel to R.O.W. | Trace-to-Code | Created in [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L115) |
| REQ-PWC-011 | Rear Utility Easement | 15 ft rear PWCSA sanitary sewer & drainage easement | Trace-to-Code | Created in [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts#L140) |
| REQ-PWC-012 | APELSCIDLA Certificate | Virginia APELSCIDLA Licensed Surveyor certificate block | Trace-to-Code | Configured in [regions.ts](../../../packages/domain/src/planning/regions.ts#L283) & [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-PWC-013 | Owner's Dedication | Owner's Consent & Easement Dedication certificate | Trace-to-Code | Configured in [regions.ts](../../../packages/domain/src/planning/regions.ts#L293) & [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-PWC-014 | PWC Approval Block | Prince William County LDD approval signature block | Trace-to-Code | Configured in [regions.ts](../../../packages/domain/src/planning/regions.ts#L303) & [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-PWC-015 | Health / PWCSA Block | PWCSA and VDH public water/sewer approval block | Trace-to-Code | Configured in [regions.ts](../../../packages/domain/src/planning/regions.ts#L311) & [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-PWC-016 | Metes & Bounds DMS | Boundary bearings in DMS (N/S Deg Min Sec E/W) and feet | Trace-to-Code | Formatted in [survey.ts](../../../packages/domain/src/survey/survey.ts) & [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-PWC-017 | Curve Data Table | Consolidated Curve Table (Radius, Arc, Chord, Delta) | Trace-to-Code | Generated in [curve.ts](../../../packages/domain/src/spatial/curve.ts) & [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-PWC-018 | Monumentation | Concrete monuments & Iron Pipes set/found | Trace-to-Code | Rendered in [monument.ts](../../../packages/domain/src/survey/monument.ts) & [CivilLayer.tsx](../../../apps/web/src/features/canvas/CivilLayer.tsx) |
| REQ-PWC-019 | Sheet Border & Title Block | ISO/ANSI Arch D plat sheet composer layout | Trace-to-Code | Rendered in [PlatSheetDialog.tsx](../../../apps/web/src/features/survey/PlatSheetDialog.tsx) |
| REQ-PWC-020 | Preset Generator | 28,000 sq ft PWC House Plat preset (`createPrinceWilliamHousePlat`) | Trace-to-Code | Implemented in [princeWilliamHousePlat.ts](../../../packages/domain/src/planning/presets/princeWilliamHousePlat.ts) |

---

## Related Requirement Documents

- [Prince William County Virginia Functional Requirements](../02-functional/prince-william-va-requirements.md)
- [Master Requirements Traceability Matrix](traceability-matrix.md)
- [Requirements Suite README](../README.md)
