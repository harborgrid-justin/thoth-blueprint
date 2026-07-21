import {
  defaultSpatialContext,
  type Site,
  type Parcel,
  type Lot,
  type Building,
  type RightOfWay,
  type Easement,
  type Layer,
  type Polygon,
  type PlanNote,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";

/**
 * Builds the complete Lot 11 Section 6 Knightsbridge Drive House Location Survey
 * step-by-step FROM SCRATCH (starting from an empty site with 0 elements).
 */
export function buildKnightsbridgePlatFromScratch(): Site {
  // Step 1: Initialize Empty Site with 0 Elements & Spatial Context
  const layers: Layer[] = [
    { id: "c-prop", name: "C-PROP (Property Boundary)", order: 0, visible: true, locked: false, color: "#2563eb" },
    { id: "c-prop-lot", name: "C-PROP-LOT (Subdivision Lots)", order: 1, visible: true, locked: false, color: "#3b82f6" },
    { id: "a-bldg", name: "A-BLDG (Building Structures)", order: 2, visible: true, locked: false, color: "#dc2626" },
    { id: "c-road", name: "C-ROAD (Public Road R.O.W.)", order: 3, visible: true, locked: false, color: "#475569" },
    { id: "c-ease", name: "C-EASE (Easements & BRLs)", order: 4, visible: true, locked: false, color: "#d97706" },
  ];

  const blankSite: Site = {
    id: "site-built-from-scratch",
    name: "Lot 11, Section 6, Knightsbridge Drive (Built from Scratch)",
    jurisdictionId: "us-va-prince-william",
    spatial: defaultSpatialContext({ units: "feet", crs: "EPSG:2283" }),
    layers,
    elements: [],
  };

  // Set initial blank site state
  useWorkspaceStore.getState().loadSitePreset(blankSite, "Lot 11 Plat (Built from Scratch)");

  // Step 2: Add Boundary Traverse Vertices & Front Curve Arc Bulge
  const lotBoundary: Polygon = [
    { x: 0, y: 0 },          // P.O.B. SW Corner
    { x: 12.05, y: 178.23 }, // NW Corner (N 03°52'08" E 178.64')
    { x: 93.98, y: 190.12 }, // NE Corner (N 81°44'15" E 82.79')
    { x: 126.68, y: 3.57 },  // SE Corner (S 09°56'35" E 189.40')
  ];
  const lotArcs = { 3: -0.05527 }; // Front Arc A = 110.05', R = 498.00'

  const parcel: Parcel = {
    id: "parcel-scratch-11",
    kind: "parcel",
    name: "Lot 11, Section 6 — Knightsbridge Drive (19,430 sq ft)",
    boundary: lotBoundary,
    arcs: lotArcs,
    layerId: "c-prop",
  };

  const lot: Lot = {
    id: "lot-scratch-11",
    kind: "lot",
    name: "Lot 11 (19,430 sq ft)",
    boundary: lotBoundary,
    arcs: lotArcs,
    setback: 25,
    layerId: "c-prop-lot",
  };

  // Step 3: Add House Footprint (#12720 Two Story Brick & Frame House with Basement)
  const houseBuilding: Building = {
    id: "house-scratch-12720",
    kind: "building",
    name: "Two Story Brick & Frame House with Basement #12720",
    boundary: [
      { x: 26.65, y: 42.0 },   // Front-left
      { x: 66.55, y: 42.0 },   // Front-right (Garage)
      { x: 66.55, y: 78.4 },   // Rear-right
      { x: 52.05, y: 78.4 },   // Rear deck step
      { x: 52.05, y: 90.4 },   // Rear wood deck outer corner
      { x: 26.65, y: 90.4 },   // Rear wood deck left corner
      { x: 26.65, y: 78.4 },   // Rear house wall
    ],
    storeys: 2,
    height: 30,
    dwellingUnits: 1,
    layerId: "a-bldg",
  };

  // Step 4: Add Right-of-Way & Easements
  const row: RightOfWay = {
    id: "row-scratch-knightsbridge",
    kind: "row",
    name: "Knightsbridge Drive (54' R/W — 650.98' to P.C. @ Berwick Place)",
    boundary: [
      { x: -20, y: -54 },
      { x: 150, y: -54 },
      { x: 150, y: 0 },
      { x: -20, y: 0 },
    ],
    layerId: "c-road",
  };

  const northSewer: Easement = {
    id: "easement-scratch-sewer",
    kind: "easement",
    name: "20' Sanitary Sewer Easement",
    boundary: [
      { x: 12.05, y: 158.23 },
      { x: 93.98, y: 170.12 },
      { x: 93.98, y: 190.12 },
      { x: 12.05, y: 178.23 },
    ],
    layerId: "c-ease",
  };

  const westStorm: Easement = {
    id: "easement-scratch-storm",
    kind: "easement",
    name: "20' Storm Drainage Easement",
    boundary: [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 32.05, y: 178.23 },
      { x: 12.05, y: 178.23 },
    ],
    layerId: "c-ease",
  };

  const eastIngress: Easement = {
    id: "easement-scratch-ingress",
    kind: "easement",
    name: "40' Ingress-Egress and Utility Easement",
    boundary: [
      { x: 86.68, y: 3.57 },
      { x: 126.68, y: 3.57 },
      { x: 93.98, y: 190.12 },
      { x: 53.98, y: 190.12 },
    ],
    layerId: "c-ease",
  };

  const sightDistance: Easement = {
    id: "easement-scratch-sight",
    kind: "easement",
    name: "Sight Distance Easement (SE Front Corner)",
    boundary: [
      { x: 106.68, y: 3.57 },
      { x: 126.68, y: 3.57 },
      { x: 121.68, y: 25.0 },
    ],
    layerId: "c-ease",
  };

  const slopeMaintenance: Easement = {
    id: "easement-scratch-slope",
    kind: "easement",
    name: "Slope Maintenance Easement (SW Front Corner)",
    boundary: [
      { x: 0, y: 0 },
      { x: 25, y: 0 },
      { x: 20, y: 15 },
      { x: 0, y: 15 },
    ],
    layerId: "c-ease",
  };

  // Step 5: Add Annotations & Plan Notes
  const floodNote: PlanNote = {
    id: "note-scratch-flood",
    kind: "note",
    text: "HUD Flood Certification",
    position: { x: 50, y: 120 },
    layerId: "c-prop",
  };



  const elements = [
    parcel,
    lot,
    houseBuilding,
    row,
    northSewer,
    westStorm,
    eastIngress,
    sightDistance,
    slopeMaintenance,
    floodNote,
  ];

  const fullSite: Site = {
    ...blankSite,
    elements,
  };

  // Load the step-by-step constructed site into workspace store
  useWorkspaceStore.getState().loadSitePreset(fullSite, fullSite.name);
  return fullSite;
}
