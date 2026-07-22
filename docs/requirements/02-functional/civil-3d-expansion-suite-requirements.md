# Functional Requirements: Civil 3D Expansion Suite (REQ-101 to REQ-200)

This document defines the second formal expansion phase of functional system requirements for the Civil 3D Competitor Suite within **Thoth Blueprint**. It specifies advanced point formats, advanced linework & drafting, parcel layout parameters, layout templates, view frame group operations, cross-section plotting, model builder GIS integration, scripting/3D objects, advanced feature line generation, and grading/feature line editing.

---

## 1. Advanced Point Handling & Formats

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-101 | Survey / Import | The system shall support point file format filtering during the point import process. | Implemented |
| REQ-102 | Survey / Import | The system shall support XYZ_RGB, PNE, and PNEZ comma-delimited point file formats. | Implemented |
| REQ-103 | Survey / Import | The system shall provide advanced point import options for elevation adjustment. | Implemented |
| REQ-104 | Survey / Import | The system shall provide advanced point import options for coordinate transformation. | Implemented |
| REQ-105 | Survey / Import | The system shall provide advanced point import options for coordinate data expansion. | Implemented |
| REQ-106 | Survey / Point Groups | The system shall provide a query builder tab for defining complex point group inclusion criteria. | Implemented |
| REQ-107 | Survey / Point Groups | The system shall support adding points to a point group based on matching full descriptions. | Implemented |
| REQ-108 | Survey / Point Groups | The system shall support adding points to a point group based on matching specific elevations. | Implemented |

---

## 2. Advanced Linework & Geometry Tools

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-109 | Drafting / Geometry | The system shall support line creation using Grid Northing and Grid Easting coordinates. | Implemented |
| REQ-110 | Drafting / Geometry | The system shall support line creation using Latitude and Longitude coordinates. | Implemented |
| REQ-111 | Drafting / Geometry | The system shall support line creation using Deflection angles. | Implemented |
| REQ-112 | Drafting / Geometry | The system shall support line creation using Station and Offset values relative to an alignment. | Implemented |
| REQ-113 | Drafting / Geometry | The system shall support creating a line tangent from an existing point. | Implemented |
| REQ-114 | Drafting / Geometry | The system shall support creating a line perpendicular from an existing point. | Implemented |
| REQ-115 | Drafting / Grips | The system shall allow users to stretch polyline vertices interactively using midpoint grips. | Implemented |
| REQ-116 | Drafting / Grips | The system shall allow users to convert straight polyline segments to arcs using midpoint grips. | Implemented |
| REQ-117 | Drafting / Parcels | The system shall provide a dedicated Create Right of Way tool for parcel geometry generation. | Implemented |

---

## 3. Parcel Sizing & Layout Controls

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-118 | Civil / Parcels | The system shall allow users to set a specific minimum parcel area threshold during automatic layout. | Implemented |
| REQ-119 | Civil / Parcels | The system shall allow users to enforce a minimum parcel frontage requirement at a specified offset distance. | Implemented |
| REQ-120 | Civil / Parcels | The system shall allow users to define a maximum parcel depth during automatic layout generation. | Implemented |
| REQ-121 | Civil / Parcels | The system shall resolve multiple mathematical layout solutions by allowing a preference for the shortest frontage. | Implemented |
| REQ-122 | Civil / Parcels | The system shall provide an automatic layout option to place any remainder area into the last generated parcel. | Implemented |
| REQ-123 | Civil / Parcels | The system shall provide a customizable increment value setting when executing the Renumber Parcels command. | Implemented |
| REQ-124 | Civil / Parcels | The system shall support batch parcel renaming using a predefined name template. | Implemented |
| REQ-125 | Civil / Parcels | The system shall allow users to edit parcel elevations globally through the Multiple Parcel Properties tool. | Implemented |
| REQ-126 | Civil / Parcels | The system shall support moving selected parcel labels between distinct Sites. | Implemented |
| REQ-127 | Civil / Parcels | The system shall support copying selected parcel labels between distinct Sites. | Implemented |
| REQ-128 | Civil / Parcels | The system shall provide an Edit Parcel Properties dialog to modify general User Defined Classification data. | Implemented |
| REQ-129 | Civil / Parcels | The system shall support configuring table tag numbering using command-line prompt methods. | Implemented |

---

## 4. Layout Templates & Sheet Configuration

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-130 | Sheets / Templates | The system shall provide standard imperial templates optimized for Plan Only sheet generation. | Implemented |
| REQ-131 | Sheets / Templates | The system shall provide standard imperial templates optimized for Profile Only sheet generation. | Implemented |
| REQ-132 | Sheets / Templates | The system shall provide standard imperial templates optimized for Plan over Plan sheet generation. | Implemented |
| REQ-133 | Sheets / Templates | The system shall provide standard imperial templates optimized for Section sheet generation. | Implemented |
| REQ-134 | Sheets / Viewports | The system shall allow users to lock the display state of designated layout viewports. | Implemented |
| REQ-135 | Sheets / Viewports | The system shall allow users to assign specific standardized annotation scales to layout viewports. | Implemented |
| REQ-136 | Sheets / LayoutTools | The system shall support placing Legend, North Arrow, and Scale Bar elements directly from the Layout Tools ribbon. | Implemented |
| REQ-137 | Sheets / MatchLines | The system shall display match lines exclusively within plan view and model space viewports. | Implemented |
| REQ-138 | Sheets / MatchLines | The system shall allow users to configure match line mask linetypes, colors, and lineweights. | Implemented |
| REQ-139 | Sheets / Bands | The system shall dynamically shift profile views within viewports to accommodate profile band titles. | Implemented |
| REQ-140 | Sheets / Bands | The system shall allow users to configure profile band text box widths and offsets. | Implemented |
| REQ-141 | Sheets / Bands | The system shall allow users to independently toggle the visibility of band borders and band title boxes in profile band styles. | Implemented |

---

## 5. View Frame Group & Match Line Operations

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-142 | Prospector / ViewFrames | The system shall provide a View Frame Group object in the Prospector tree that actively manages view frames displaying consecutive station ranges. | Implemented |
| REQ-143 | Prospector / ViewFrames | The system shall delete all associated view frames, match lines, and labels when an entire View Frame Group is deleted. | Implemented |
| REQ-144 | Prospector / ViewFrames | The system shall restrict View Frame Groups from being moved as a single unified entity. | Implemented |
| REQ-145 | Prospector / ViewFrames | The system shall support inserting a newly defined view frame into a previously established View Frame Group. | Implemented |
| REQ-146 | Prospector / ViewFrames | The system shall allow users to define an offset distance to set the first view frame prior to the start of the alignment. | Implemented |
| REQ-147 | Prospector / ViewFrames | The system shall allow users to map view frames to specific drafting layers. | Implemented |
| REQ-148 | Sheets / ProfileWizard | The system shall provide a Profile View Wizard accessible via a settings option directly within the Create Sheets dialog. | Implemented |
| REQ-149 | Sheets / Creation | The system shall allow users to manually override and select individual view frames when creating sheets instead of processing the entire group. | Implemented |

---

## 6. Output & Cross-Section Plotting

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-150 | Output / Sheets | The system shall allow users to define the exact number of layouts generated per newly created drawing file. | Implemented |
| REQ-151 | Output / SheetSet | The system shall support assigning specific file path storage locations for newly generated sheet sets. | Implemented |
| REQ-152 | Output / SheetSet | The system shall launch the Sheet Set Manager palette automatically upon the successful completion of sheet creation. | Implemented |
| REQ-153 | Output / SheetSet | The system shall support opening a specific sheet directly by double-clicking its name inside the Sheet Set Manager. | Implemented |
| REQ-154 | Sections / Plotting | The system shall provide an option to output cross sections in a Draft mode, placing sections in a model space grid instead of creating sheet layouts. | Implemented |
| REQ-155 | Sections / Plotting | The system shall support arraying cross-section plots sequentially by rows. | Implemented |
| REQ-156 | Sections / Plotting | The system shall support arraying cross-section plots sequentially by columns. | Implemented |
| REQ-157 | Sections / Plotting | The system shall allow aligning multiple section views about their defined centerline. | Implemented |
| REQ-158 | Sections / Plotting | The system shall allow users to define the starting corner (e.g., Upper Left) for populating section view arrays. | Implemented |
| REQ-159 | Sections / Plotting | The system shall allow users to define specific column and row spacing distances between adjacent section views. | Implemented |
| REQ-160 | Sections / Plotting | The system shall provide an option to add a drafting buffer size to the spatial gaps between section views. | Implemented |

---

## 7. Model Builder & GIS Integration

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-161 | GIS / ModelBuilder | The system shall allow cloud model generation of contiguous areas up to 200 square kilometers using the Model Builder. | Implemented |
| REQ-162 | GIS / ModelBuilder | The system shall allow physical model boundaries to be defined using multi-point polygons rather than restrictive rectangles. | Implemented |
| REQ-163 | GIS / Raster | The system shall support manual adjustment of the raster tile level resolution parameter for ground imagery. | Implemented |
| REQ-164 | GIS / Import | The system shall support importing Shapefiles (SHP) as a valid source for existing condition mapping. | Implemented |
| REQ-165 | GIS / Styling | The system shall allow assigning coverage styles to zoning data layers imported from GIS sources. | Implemented |
| REQ-166 | GIS / DWG | The system shall support importing AutoCAD Civil 3D DWG objects while actively ignoring standard linework. | Implemented |
| REQ-167 | GIS / Coordinates | The system shall provide a "Convert to Grid" configuration option that can be toggled off to ensure accurate survey coordinate representation. | Implemented |
| REQ-168 | GIS / Surface | The system shall allow users to draw manual coverage areas to force surface smoothing operations over mismatched topography. | Implemented |
| REQ-169 | GIS / SDF | The system shall support converting tree point text files to Spatial Data File (SDF) format using map conversion commands. | Implemented |

---

## 8. Scripts, Rules & 3D Objects

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-170 | Scripts / DataImport | The system shall support executing JavaScript code to map external ID and description fields during data source import configuration. | Implemented |
| REQ-171 | Scripts / Scaling | The system shall support writing import scripts to dynamically scale 3D models based on survey attributes and values. | Implemented |
| REQ-172 | Interop / SDF | The system shall provide an export tool capable of writing Civil 3D parcel objects to an SDF format. | Implemented |
| REQ-173 | Visual / Parcels | The system shall support rendering parcel boundaries using linear strokes rather than solid polygon fills. | Implemented |
| REQ-174 | Visual / Contours | The system shall provide a toggle within the Asset Card to display contour lines derived from coverage areas. | Implemented |
| REQ-175 | GIS / Coverage | The system shall support configuring imported SDF polylines as terrain Coverage Areas. | Implemented |
| REQ-176 | GIS / Coverage | The system shall support creating an elevated buffer area based on a specified unit (e.g., 2 inches) around imported coverage lines. | Implemented |
| REQ-177 | GIS / Coverage | The system shall provide a "Convert Closed Polylines to Polygons" toggle that can be disabled for imported coverage sources. | Implemented |
| REQ-178 | Interop / Extraction | The system shall provide data extraction wizards to export block placement coordinates and attributes into CSV files. | Implemented |
| REQ-179 | 3D / Placement | The system shall allow setting the 3D architectural model insertion point parameter to "Center 2D". | Implemented |
| REQ-180 | 3D / Placement | The system shall provide an Interactive Placing tool to position imported 3D models manually on the terrain by double-clicking. | Implemented |

---

## 9. Advanced Feature Line Generation

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-181 | FeatureLines / Creation | The system shall allow new feature line elevations to be assigned as a relative vertical offset from the previous vertex. | Implemented |
| REQ-182 | FeatureLines / Creation | The system shall allow assigning an elevation to a feature line with a relative vertical offset dynamically linked to a surface. | Implemented |
| REQ-183 | FeatureLines / Weeding | The system shall support applying weeding factors based simultaneously on angle and grade parameter thresholds. | Implemented |
| REQ-184 | FeatureLines / Weeding | The system shall support applying a 3D distance parameter strictly for close point removal during line weeding. | Implemented |
| REQ-185 | FeatureLines / Dynamic | The system shall provide an option to generate feature lines dynamically linked to an underlying alignment and profile. | Implemented |
| REQ-186 | FeatureLines / Alignment | The system shall support defining a specific spiral tessellation factor when creating feature lines from an alignment. | Implemented |
| REQ-187 | FeatureLines / Corridor | The system shall allow extracting standard, editable feature lines from locked corridor feature lines. | Implemented |
| REQ-188 | FeatureLines / Corridor | The system shall provide an option to dynamically join extracted corridor feature lines across adjacent corridor regions. | Implemented |
| REQ-189 | FeatureLines / Editing | The system shall provide a "Delete PI" command to specifically target and remove vertices from a feature line. | Implemented |
| REQ-190 | FeatureLines / Editing | The system shall provide a "Stepped Offset" command to create parallel feature lines placed at specified grades, slopes, or elevation differences. | Implemented |

---

## 10. Grading & Feature Line Editing

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-191 | Grading / Panorama | The system shall display an Elevation Editor in a Panorama window outlining Station, Elevation, Length, Grade Back, and Grade Ahead columns. | Implemented |
| REQ-192 | Grading / Editing | The system shall provide a "Set Grade/Slope between Points" command to apply a uniform slope across multiple intermediate feature line segments simultaneously. | Implemented |
| REQ-193 | Grading / Editing | The system shall provide a "Set Elevation by Reference" command to calculate a single vertex elevation relative to another spatial point. | Implemented |
| REQ-194 | Grading / Editing | The system shall provide an "Adjacent Elevations by Reference" command to parallel-adjust feature line elevations (e.g., matching flowline to back-of-curb). | Implemented |
| REQ-195 | Grading / Breaklines | The system shall support supplementing breakline factors with additional vertices based on a defined maximum distance parameter. | Implemented |
| REQ-196 | Grading / FeatureLines | The system shall support adding Elevation Points that explicitly change the grade of a feature line without altering its horizontal geometry. | Implemented |
| REQ-197 | Grading / Surfaces | The system shall automatically update surface models configured to "Rebuild Automatic" instantly when source feature line elevations are edited. | Implemented |
| REQ-198 | Grading / Topology | The system shall provide a Feature Line Site Properties dialog to establish split point resolution hierarchies when feature lines of different styles cross. | Implemented |
| REQ-199 | Grading / ProfileView | The system shall strictly project a feature line into a profile view using its assigned Feature Line Style. | Implemented |
| REQ-200 | Grading / Surfaces | The system shall prioritize overlapping surface data strictly based on the sequential order in which surfaces are pasted together (last pasted overrides). | Implemented |
