# Functional Requirements: Prince William County, Virginia (Civil & Survey Plat Submissions)

This document defines the formal civil engineering, land development, zoning, boundary surveying, and plat composition requirements for submitting single-family residential house plats to the **Prince William County Department of Development Services — Land Development Division (LDD)** in the Commonwealth of Virginia.

---

## I. Regional Coordinate Reference System & Geodetic Control

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-PWC-001 | Spatial CRS | The system shall support Virginia North State Plane Zone (NAD83, EPSG:2283) in US Survey Feet as the primary coordinate reference system for Prince William County, VA. | Implemented |
| REQ-PWC-002 | Parcel GPIN | Plats and site plans shall display and track the 10-digit Prince William County Grid Parcel Identification Number (GPIN, e.g. `7892-34-5678`). | Implemented |
| REQ-PWC-003 | Magisterial District | The title block and plat metadata shall specify the applicable Prince William County Magisterial District (Coles, Brentsville, Gainesville, Neabsco, Occoquan, Potomac, Woodbridge). | Implemented |

---

## II. Subdivision & Zoning District Standards (R-4 Suburban Residential / A-1)

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-PWC-004 | Min Lot Area | The system shall enforce a minimum lot area requirement of 28,000 sq. ft. (or district minimums per Chapter 32 of PWC Zoning Ordinance) for suburban residential parcels. | Implemented |
| REQ-PWC-005 | Building Setbacks | The system shall enforce Building Restriction Lines (BRL): 35 ft Front Setback, 15 ft Side Setback (aggregate 35 ft), and 25 ft Rear Setback for principal dwellings. | Implemented |
| REQ-PWC-006 | Max Lot Coverage | The system shall calculate total impervious coverage and restrict building footprint to a maximum 35% lot coverage ratio. | Implemented |
| REQ-PWC-007 | Building Height | The system shall validate principal dwelling height limits (maximum 35 ft / 2.5 storeys above grade). | Implemented |

---

## III. Right-of-Way & Easement Dedications (VDOT / PWC DCSM)

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-PWC-008 | Public Road R.O.W. | The system shall model a 50 ft VDOT (Virginia Department of Transportation) Public Road Right-of-Way along property frontages. | Implemented |
| REQ-PWC-009 | Entrance Apron | The driveway apron connection to public roads shall comply with VDOT CG-11 entrance standards. | Implemented |
| REQ-PWC-10 | Front PU&DE | The system shall render a mandatory 10 ft Public Utility & Drainage Easement (PU&DE) parallel to all public road frontages. | Implemented |
| REQ-PWC-011 | Rear Utility Easement | The system shall render a minimum 15 ft rear sanitary sewer and drainage easement benefiting Prince William County Service Authority (PWCSA). | Implemented |

---

## IV. Legal Certificates & Surveyor Seals (Virginia APELSCIDLA)

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-PWC-012 | APELSCIDLA Certificate | Plats shall include the Virginia Licensed Professional Land Surveyor certification block complying with 18VAC10-20 Class A survey technical standards. | Implemented |
| REQ-PWC-013 | Owner's Dedication | Plats shall include the notarized Owner's Consent & Dedication Certificate dedicating R.O.W. and easements to the Board of County Supervisors of Prince William County. | Implemented |
| REQ-PWC-014 | PWC Approval Block | Plats shall include the Prince William County Department of Development Services Approval Block for signature by the Director of Development Services / County Surveyor. | Implemented |
| REQ-PWC-015 | Health / PWCSA Block | Plats shall include the PWCSA & Virginia Department of Health (VDH) public water and sanitary sewer connection approval certificate. | Implemented |

---

## V. Boundary Metes & Bounds and Plat Sheet Composition

| Req ID | Module Reference | Requirement Description | Traceability / Status |
|---|---|---|---|
| REQ-PWC-016 | Metes & Bounds DMS | Every parcel edge shall display exact metes-and-bounds bearings in Degrees-Minutes-Seconds (DMS, e.g. `N 18° 45' 00" E`) and distance in feet. | Implemented |
| REQ-PWC-017 | Curve Data Table | Curved parcel or R.O.W. boundaries shall generate a consolidated Curve Data Table listing Curve Number, Radius, Arc Length, Chord Bearing, and Chord Length. | Implemented |
| REQ-PWC-018 | Monumentation | Plats shall depict iron pipes set/found at all boundary corners and concrete monuments at R.O.W. baseline P.C. / P.T. points. | Implemented |
| REQ-PWC-019 | Sheet Border & Title Block | The sheet composer shall generate ANSI / ISO printable plat sheets (Arch D / 24x36 or Arch C) with standard PWC title block, scale bar, and North arrow. | Implemented |
| REQ-PWC-020 | Preset Generator | The system shall provide a 28,000 sq ft single-family house plat preset (`createPrinceWilliamHousePlat`) ready for immediate civil planning review. | Implemented |
