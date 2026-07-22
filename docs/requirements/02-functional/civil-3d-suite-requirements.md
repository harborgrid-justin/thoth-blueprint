# Functional Requirements: Civil 3D Competitor Suite (REQ-001 to REQ-100)

This document defines the formal engineering and functional requirements for the Civil 3D Competitor Suite within **Thoth Blueprint**. It specifies point management, drafting linework, site topology, boundary parcels, dynamic annotations, parcel data tables, plan production view frames, sheet set management, cross sections, 3D feature lines, and surface/GIS/Revit 3D visualization.

---

## 1. Point Management & Point Groups

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-001 | Survey / Points | The system shall provide a Point Creation Tools toolbar accessible from the Home tab of the user interface. | Implemented |
| REQ-002 | Survey / Import | The system shall support importing ASCII text files containing point coordinate and descriptor data. | Implemented |
| REQ-003 | Survey / Import | The system shall support standard point file formats including PNEZD (Point Number, Northing, Easting, Elevation, Raw Description) and PENZD. | Implemented |
| REQ-004 | Survey / Import | The system shall present a preview window displaying column layouts and sample point data prior to executing a file import. | Implemented |
| REQ-005 | Survey / Import | The system shall support both comma-delimited and space-delimited text file parsing for point import. | Implemented |
| REQ-006 | Survey / Point Groups | The system shall allow users to automatically assign imported points directly to a designated point group during file selection. | Implemented |
| REQ-007 | Survey / Point Groups | The system shall maintain an automatically created, non-deletable default point group named _All Points upon importing point data. | Implemented |
| REQ-008 | Survey / Point Groups | The system shall enable the creation of an ALL OFF point group with both point style and point label style assigned to `<none>`. | Implemented |
| REQ-009 | Survey / Point Groups | The system shall support filtering points into point groups based on raw description matching with wildcard parameter support. | Implemented |
| REQ-010 | Survey / Point Groups | The system shall control point display, marker styles, and label styles based on a configurable point group priority hierarchy. | Implemented |
| REQ-011 | Survey / Point Groups | The system shall allow point group property overrides to supersede description key set default styles. | Implemented |
| REQ-012 | Survey / Point Groups | The system shall support point inclusion into point groups by manual point number selection or numerical range input. | Implemented |

---

## 2. Linework & Drafting Tools

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-013 | Drafting / Linework | The system shall provide line creation tools capable of generating contiguous lines using sequential point number ranges. | Implemented |
| REQ-014 | Drafting / Linework | The system shall enable line creation by directly selecting point objects on screen in model space. | Implemented |
| REQ-015 | Drafting / Linework | The system shall support line drafting using quadrant bearing input ($1=\text{NE}$, $2=\text{SE}$, $3=\text{SW}$, $4=\text{NW}$), bearing values, and linear distances. | Implemented |
| REQ-016 | Drafting / Linework | The system shall support generating line extensions from the endpoint of an existing object by specifying an extension distance. | Implemented |
| REQ-017 | Drafting / Linework | The system shall support joining selected line segments into a single, continuous polyline entity. | Implemented |
| REQ-018 | Drafting / Grips | The system shall provide midpoint grips on polyline segments to support vertex addition, stretching, and arc conversion. | Implemented |
| REQ-019 | Drafting / Transparent | The system shall provide a dedicated Transparent Commands toolbar to execute coordinate and geometric input sub-commands during active drafting commands. | Implemented |
| REQ-020 | Drafting / Transparent | The system shall support transparent command input for Angle-Distance, Bearing-Distance, Azimuth-Distance, and Deflection-Distance. | Implemented |
| REQ-021 | Drafting / Transparent | The system shall support transparent command linework generation using Point Number, Point Name, Point Object, and Zoom to Point inputs. | Implemented |
| REQ-022 | Drafting / Transparent | The system shall allow polyline drafting commands to automatically close back to the initial starting point during transparent command execution. | Implemented |

---

## 3. Site Management & Boundary Parcels

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-023 | Civil / Site | The system shall manage collections of parcels, alignments, grading objects, and feature lines within unified Site containers. | Implemented |
| REQ-024 | Civil / Site | The system shall enforce dynamic interaction and topology sharing between all design objects residing within the same Site. | Implemented |
| REQ-025 | Civil / Site | The system shall support multiple independent Sites within a single drawing file to isolate non-interacting spatial objects. | Implemented |
| REQ-026 | Civil / Parcels | The system shall allow starting parcel numbering sequences at user-defined starting values per Site. | Implemented |
| REQ-027 | Civil / Parcels | The system shall generate boundary parcels from existing drawing geometry, including lines, polylines, and arc entities. | Implemented |
| REQ-028 | Civil / Parcels | The system shall provide an option to automatically erase source CAD entities upon converting them into parcel objects. | Implemented |
| REQ-029 | Civil / Parcels | The system shall assign configurable parcel styles controlling boundary display color, linetype, and assigned layer. | Implemented |
| REQ-030 | Civil / Parcels | The system shall support manual parcel subdivision using two-point fixed line placement tools. | Implemented |
| REQ-031 | Civil / Parcels | The system shall support automatic parcel layout sizing based on parameters including Minimum Area, Minimum Frontage, Frontage Offset, Minimum Width, and Minimum Depth. | Implemented |
| REQ-032 | Civil / Parcels | The system shall execute automated lot layout using slide-line creation tools along selected frontage lines. | Implemented |
| REQ-033 | Civil / Parcels | The system shall support automatic parcel remainder distribution rules, including placing remainder in the last parcel or redistributing among all lots. | Implemented |
| REQ-034 | Civil / Parcels | The system shall provide a Renumber/Rename Parcels tool to batch renumber lots along a user-drawn selection fence line. | Implemented |
| REQ-035 | Civil / Parcels | The system shall dynamically recalculate parcel boundary geometry, area, and perimeter whenever connected boundary lines are edited. | Implemented |

---

## 4. Dynamic Annotations & Parcel Labels

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-036 | Annotations / Area | The system shall automatically insert an area label at the centroid of each newly generated parcel. | Implemented |
| REQ-037 | Annotations / Area | The system shall support dynamic updates to parcel area labels across single or multiple selected parcels simultaneously. | Implemented |
| REQ-038 | Annotations / UDP | The system shall support User Defined Properties for parcels, including Parcel Address and Parcel Tax ID fields. | Implemented |
| REQ-039 | Annotations / Segments | The system shall support automatic and manual placement of segment labels for parcel lines and curves. | Implemented |
| REQ-040 | Annotations / Segments | The system shall support segment label display configurations, including bearing over distance, delta over length, and radius values. | Implemented |
| REQ-041 | Annotations / Styles | The system shall allow creating child label styles that inherit properties from existing parent label styles. | Implemented |
| REQ-042 | Annotations / Readability | The system shall enforce a Plan Readability property in label styles to automatically prevent upside-down text presentation. | Implemented |
| REQ-043 | Annotations / Commands | The system shall provide a Reverse Label command to invert direction bearings across selected segment labels. | Implemented |
| REQ-044 | Annotations / Commands | The system shall provide a Flip Label command to swap label component positioning relative to the segment line. | Implemented |
| REQ-045 | Annotations / Dynamic | The system shall dynamically update label text content whenever the underlying geometric source object changes. | Implemented |
| REQ-046 | Annotations / References | The system shall maintain view frame label data and sheet numbering references even if the parent alignment is deleted. | Implemented |

---

## 5. Dynamic Parcel & Data Tables

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-047 | Tables / Types | The system shall support four distinct parcel table types: line tables, curve tables, segment tables, and area tables. | Implemented |
| REQ-048 | Tables / Segment | The system shall combine line and curve geometric values into consolidated segment tables. | Implemented |
| REQ-049 | Tables / Tags | The system shall convert segment labels into sequential tags (e.g., L1, L2, C1, C2) upon incorporating them into tables. | Implemented |
| REQ-050 | Tables / Reactivity | The system shall support both Dynamic and Static reactivity modes for generated parcel data tables. | Implemented |
| REQ-051 | Tables / Reactivity | The system shall lock static data tables to prevent them from reacting to drawing edits or being converted back to dynamic mode. | Implemented |
| REQ-052 | Tables / Sorting | The system shall support automatic sorting of table rows based on a designated column in ascending or descending order. | Implemented |
| REQ-053 | Tables / Editor | The system shall allow editing table titles, column headers, and data formatting using a Text Component Editor. | Implemented |
| REQ-054 | Tables / Layout | The system shall support automatic text wrapping and maintenance of view orientation within table structures. | Implemented |
| REQ-055 | Tables / Tiling | The system shall support splitting large data tables into multiple tiled stacks across layout sheets with configurable maximum row limits and offsets. | Implemented |

---

## 6. Plan Production, View Frames & Match Lines

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-056 | Sheets / ViewFrames | The system shall provide a Create View Frames wizard to generate sequential view frames along a designated horizontal alignment. | Implemented |
| REQ-057 | Sheets / ViewFrames | The system shall support view frame generation for Plan Only, Profile Only, Plan over Plan, Profile over Profile, and Plan and Profile sheet configurations. | Implemented |
| REQ-058 | Sheets / ViewFrames | The system shall extract view frame scale, shape, and dimensions from named viewports in specified DWT drawing templates. | Implemented |
| REQ-059 | Sheets / ViewFrames | The system shall assign unique names to individual view frames using customizable incremental counter naming templates. | Implemented |
| REQ-060 | Sheets / Prospector | The system shall manage view frames within a parent View Frame Group object displayed in the Prospector tree. | Implemented |
| REQ-061 | Sheets / Orientation | The system shall support view frame orientation options aligned along the alignment or rotated to True North. | Implemented |
| REQ-062 | Sheets / Grips | The system shall allow editing view frame positions using center grips, slider grips (along alignment), and rotation grips. | Implemented |
| REQ-063 | Sheets / MatchLines | The system shall automatically insert Match Lines where adjacent view frames intersect along an alignment. | Implemented |
| REQ-064 | Sheets / MatchLines | The system shall support rounding match line station values down to the nearest user-specified station increment. | Implemented |
| REQ-065 | Sheets / MatchLines | The system shall support additional view frame overlap distances to allow match line repositioning. | Implemented |
| REQ-066 | Sheets / MatchLines | The system shall display match line objects exclusively in paper space plan view viewports. | Implemented |
| REQ-067 | Sheets / MatchLines | The system shall support match line masking using solid true-color (255,255,255) hatches to blank out content past match boundaries. | Implemented |
| REQ-068 | Sheets / MatchLines | The system shall support customizable left-side and right-side match line labels displaying previous and next sheet numbers. | Implemented |
| REQ-069 | Sheets / MatchLines | The system shall allow positioning match line labels at the top, middle, or end of match line segments. | Implemented |
| REQ-070 | Sheets / ViewFrames | The system shall enforce fixed view frame dimensions to match the physical aspect ratio of the referenced layout viewport. | Implemented |

---

## 7. Sheet Creation, Sheet Sets & Data References

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-071 | Sheets / Creation | The system shall provide a Create Sheets wizard to automatically generate paper space layout sheets from view frame groups. | Implemented |
| REQ-072 | Sheets / Creation | The system shall support layout creation options including one layout per new drawing, all layouts in one new drawing, or all layouts in the current drawing. | Implemented |
| REQ-073 | Sheets / Creation | The system shall notify users and recommend creating no more than 10 layout sheets per individual DWG file for optimal performance. | Implemented |
| REQ-074 | Sheets / Blocks | The system shall automatically orient paper space North Arrow blocks linked to layout viewports based on True North rotation. | Implemented |
| REQ-075 | Sheets / SSM | The system shall integrate generated layout sheets directly into new or existing Sheet Set Manager (.dst) files. | Implemented |
| REQ-076 | Sheets / SSM | The system shall open the Sheet Set Manager palette automatically upon successfully creating plot sheets. | Implemented |
| REQ-077 | Sheets / Alignment | The system shall provide view alignment settings to align plan and profile views at the start, center, or end of station ranges. | Implemented |
| REQ-078 | DataRef / Shortcuts | The system shall support creating Data References (data shortcuts) in destination sheet drawings for Surfaces, Alignments, Profiles, Pipe Networks, and Pressure Networks. | Implemented |
| REQ-079 | DataRef / Shortcuts | The system shall support copying pipe network and pressure network annotation labels into destination sheet drawings during data referencing. | Implemented |
| REQ-080 | DataRef / Shortcuts | The system shall lock referenced source geometry against modification in destination sheet files while allowing style and label overrides. | Implemented |

---

## 8. Cross Sections & Sample Line Groups

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-081 | Civil / SampleLines | The system shall generate Sample Lines along horizontal alignments to sample elevation cross-sections across surface data. | Implemented |
| REQ-082 | Civil / SampleLines | The system shall support batch sample line creation by station ranges with specified left and right swath widths. | Implemented |
| REQ-083 | Civil / SampleLines | The system shall support customizable sampling increments along tangents, curves, and spirals. | Implemented |
| REQ-084 | Civil / SectionViews | The system shall provide a Create Multiple Section Views wizard to place production-ready section views in model space. | Implemented |
| REQ-085 | Civil / SectionViews | The system shall require a layout template containing a Section-type viewport as a prerequisite for section sheet generation. | Implemented |
| REQ-086 | Civil / SectionViews | The system shall support Group Plot Styles to format section view arrays into structured rows or columns with drafting buffers. | Implemented |
| REQ-087 | Civil / SectionViews | The system shall support user-specified offset ranges and automatic elevation ranges for section view displays. | Implemented |
| REQ-088 | Civil / SectionSheets | The system shall provide a Create Section Sheets command to convert model space section view arrays into paper space plot layouts integrated with Sheet Sets. | Implemented |

---

## 9. Feature Lines & Subdivision Grading

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-089 | Civil / FeatureLines | The system shall support 3D Feature Lines capable of containing true geometric arcs and elevation attributes along curves. | Implemented |
| REQ-090 | Civil / FeatureLines | The system shall enforce a single-elevation topology rule per unique XY coordinate for all feature lines residing within the same Site. | Implemented |
| REQ-091 | Civil / FeatureLines | The system shall support feature line creation from raw input, existing CAD polylines, alignments/profiles, and corridor models. | Implemented |
| REQ-092 | Civil / FeatureLines | The system shall maintain dynamic elevation links between feature lines and parent surface models or corridor models. | Implemented |
| REQ-093 | Civil / MapClean | The system shall provide Drawing Cleanup tools (MAPCLEAN) to break crossing entities, eliminate zero-length objects, and snap clustered nodes prior to feature line conversion. | Implemented |
| REQ-094 | Civil / FeatureLines | The system shall provide feature line editing commands, including Insert/Delete PI, Quick Elevation Edit, Stepped Offset, and Elevation Editor Panorama. | Implemented |
| REQ-095 | Civil / FeatureLines | The system shall support grade break calculations along feature lines using Insert High/Low Elevation Point and Grade Extension by Reference commands. | Implemented |

---

## 10. Surface Modeling, GIS & 3D Visualization

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-096 | Civil / Surfaces | The system shall support adding feature lines to TIN surface definitions as breaklines with configurable mid-ordinate distances (e.g., 0.1 ft). | Implemented |
| REQ-097 | Civil / Surfaces | The system shall support combining multiple surface models via Paste Surface operations, processing the last pasted surface as highest precedence. | Implemented |
| REQ-098 | Interop / GIS | The system shall support importing GIS vector files (SHP/SDF) to generate coverage areas, parcels, and style rules based on feature attribute tables. | Implemented |
| REQ-099 | Visual / 3D | The system shall support high-resolution aerial imagery configuration up to Tile Level 19 in 3D conceptual design environments. | Implemented |
| REQ-100 | Visual / Revit | The system shall support importing Autodesk Revit (.RVT) architectural models into 3D conceptual environments using dedicated Navisworks views (NAVIS-) or interactive placement. | Implemented |
