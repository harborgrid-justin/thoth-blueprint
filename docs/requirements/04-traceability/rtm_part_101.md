# Requirements Traceability Matrix - Part 101
**Subject:** Advanced Erosion & Sediment Control (ESC) CAD Specifications
**Coverage:** Hydrological Delineation, Rational Method, Runoff Velocities, Sediment Barriers, Slopes Protection, Outfall Apron, Basins Hydraulics, NCS Standards, Playback Simulation

| Req ID | Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-ESC-001 | Watershed | The system shall automatically compute contributing catchment boundaries uphill of barriers. | Trace-to-Spec-v1 | Delineated in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-002 | Hydrology | The system shall compute peak runoff flow rates using Rational Method equations. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-003 | Hydrology | The system shall calculate composite Curve Numbers based on soil cover overlays. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-004 | Hydrology | The system shall calculate Time of Concentration using sheet and channel flow. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-005 | Hydraulics | The system shall calculate boundary shear stress along drafted drainage ditches. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-006 | Simulation | The system shall support design storm hydrographs to drive runoff velocities. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-007 | Hydraulics | The system shall verify that stormwater diversion dikes maintain freeboard capacity. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-008 | Hydrology | The system shall adjust soil absorption rates based on Hydrologic Soil Groups. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-009 | Hydraulics | The system shall check that culvert diameters prevent headwater elevations from exceeding limits. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-010 | Hydraulics | The system shall recommend permanent turf reinforcement matting based on velocity. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-011 | Silt Barriers | The system shall support sizing compost filter socks based on slope gradient. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-012 | Silt Barriers | The system shall support drafting turbidity curtains in active water bodies. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-013 | Silt Barriers | The system shall automatically insert J-Hooks along silt fence runs. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-014 | Silt Barriers | The system shall layout gravel check dams automatically along ditch corridors. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-015 | Silt Barriers | The system shall verify curb inlet sediment barriers leave a 2-inch overflow gap. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-016 | Silt Barriers | The system shall automatically upgrade standard silt fence to super silt fence on steep slopes. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-017 | Silt Barriers | The system shall layout horizontal straw wattles along slope faces. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-018 | Silt Barriers | The system shall calculate anchoring stakes spacing for coir log elements. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-019 | Silt Barriers | The system shall validate that geotextile filter fabric meets grab tensile strength minimums. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-020 | Silt Barriers | The system shall support placing sediment filter dewatering bags. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-021 | Slope Protection | The system shall support drawing RECP rolled mats and compute overlapping QTO. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-022 | Slope Protection | The system shall generate benching terracing geometry on tall fill slopes. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-023 | Slope Protection | The system shall verify temporary straw mulching meets minimum application rates. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-024 | Slope Protection | The system shall calculate hydroseeding slurry component quantities. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-025 | Slope Protection | The system shall support designating undisturbed vegetative buffers. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-026 | Slope Protection | The system shall support a track-walking parameter on cut slopes to reduce erodibility. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-027 | Slope Protection | The system shall calculate dust control spraying requirements. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-028 | Slope Protection | The system shall size temporary slope drain pipes based on peak runoff. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-029 | Basin Hydraulics | The system shall size riprap outfall aprons based on flow velocity. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-030 | Basin Hydraulics | The system shall size floating skimmers for basin drawdown times. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-031 | Basin Hydraulics | The system shall layout internal silt basin baffles to increase travel paths. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-032 | Basin Hydraulics | The system shall verify emergency spillways pass 100-year storms. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-033 | Basin Hydraulics | The system shall size level spreader crests for sheet flow outfall. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-034 | Basin Hydraulics | The system shall verify sediment traps use stone outlet zones. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-035 | Basin Hydraulics | The system shall check principal spillway risers for anti-vortex conditions. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-036 | Basin Hydraulics | The system shall calculate anti-seep collars spacing. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-037 | Basin Hydraulics | The system shall support sizing trash racks on riser pipe inlets. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-038 | Basin Hydraulics | The system shall monitor wet storage depth to prevent sediment resuspension. | Trace-to-Spec-v1 | Implemented in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-039 | Compliance | The system shall enforce NCS symbols for all ESC components. | Trace-to-Spec-v1 | Implemented in [ErosionSimulator.tsx](../../../apps/web/src/features/workspace/ErosionSimulator.tsx) |
| REQ-ESC-040 | Compliance | The system shall generate a step-by-step ESC construction sequence plan. | Trace-to-Spec-v1 | Implemented in [ErosionSimulator.tsx](../../../apps/web/src/features/workspace/ErosionSimulator.tsx) |
| REQ-ESC-041 | Compliance | The system shall dynamically link ESC details to plan keynotes. | Trace-to-Spec-v1 | Implemented in [ErosionSimulator.tsx](../../../apps/web/src/features/workspace/ErosionSimulator.tsx) |
| REQ-ESC-042 | Compliance | The system shall generate maintenance schedules based on sediment loading. | Trace-to-Spec-v1 | Implemented in [ErosionSimulator.tsx](../../../apps/web/src/features/workspace/ErosionSimulator.tsx) |
| REQ-ESC-043 | Compliance | The system shall sync ESC boundary lines across sheets. | Trace-to-Spec-v1 | Implemented in [ErosionSimulator.tsx](../../../apps/web/src/features/workspace/ErosionSimulator.tsx) |
| REQ-ESC-044 | Compliance | The system shall export a complete SWPPP checklist in PDF. | Trace-to-Spec-v1 | Implemented in [ErosionSimulator.tsx](../../../apps/web/src/features/workspace/ErosionSimulator.tsx) |
| REQ-ESC-045 | Playback | The system shall simulate varying rainfall intensities dynamically. | Trace-to-Spec-v1 | Simulated in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-046 | Playback | The system shall simulate barrier breakout if sediment loads exceed 100%. | Trace-to-Spec-v1 | Simulated in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-047 | Playback | The system shall simulate vegetative growth reducing soil erodibility over time. | Trace-to-Spec-v1 | Simulated in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) |
| REQ-ESC-048 | Playback | The system shall support play, pause, step, and timeline scrubbing of simulation. | Trace-to-Spec-v1 | Implemented in [ErosionSimulator.tsx](../../../apps/web/src/features/workspace/ErosionSimulator.tsx) |
| REQ-ESC-049 | Playback | The system shall render a 3D heatmap of shear stress on terrain. | Trace-to-Spec-v1 | Rendered in [Scene3D.tsx](../../../apps/web/src/features/canvas3d/Scene3D.tsx) |
| REQ-ESC-050 | Playback | The system shall support selecting soil types to adjust sedimentation rates. | Trace-to-Spec-v1 | Simulated in [erosion.ts](../../../packages/domain/src/planning/erosion.ts) and [ErosionSimulator.tsx](../../../apps/web/src/features/workspace/ErosionSimulator.tsx) |
