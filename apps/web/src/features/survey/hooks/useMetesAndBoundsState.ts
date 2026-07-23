import * as React from "react";
import {
  type Parcel,
  type Lot,
  type Building,
  type Easement,
  type RightOfWay,
} from "@thoth/domain";

import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import {
  type CourseRow,
  DEFAULT_COURSES,
  computeMetesAndBoundsGeometry,
} from "../helpers/metesAndBoundsHelpers";

export function useMetesAndBoundsState() {
  const open = useUiStore((s) => s.cogoOpen);
  const setOpen = useUiStore((s) => s.setCogoOpen);
  const site = useWorkspaceStore((s) => s.site);

  const [pobX] = React.useState<number>(0);
  const [pobY] = React.useState<number>(0);
  const [courses, setCourses] = React.useState<CourseRow[]>(DEFAULT_COURSES);
  const [lotName] = React.useState<string>("Lot 11, Section 6 — Knightsbridge Drive");
  const [includeResidence, setIncludeResidence] = React.useState<boolean>(true);
  const [includeEasements, setIncludeEasements] = React.useState<boolean>(true);

  const geometry = React.useMemo(
    () => computeMetesAndBoundsGeometry(courses, pobX, pobY),
    [courses, pobX, pobY],
  );

  function addCourse() {
    setCourses((prev) => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        ns: "N",
        deg: 0,
        min: 0,
        sec: 0,
        ew: "E",
        distance: 100,
        isCurve: false,
        arcLength: 0,
        radius: 0,
      },
    ]);
  }

  function updateCourse(id: string, updates: Partial<CourseRow>) {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function removeCourse(id: string) {
    if (courses.length <= 3) {return;}
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function commitPlatToCanvas() {
    if (!site) {return;}

    const parcel: Parcel = {
      id: `parcel_cogo_${Date.now()}`,
      kind: "parcel",
      name: `${lotName} (${geometry.calculatedAreaSqFt.toFixed(0)} sq ft)`,
      boundary: geometry.boundary,
      arcs: geometry.arcs,
      layerId: "c-prop",
    };

    const lot: Lot = {
      id: `lot_cogo_${Date.now()}`,
      kind: "lot",
      name: lotName,
      boundary: geometry.boundary,
      arcs: geometry.arcs,
      setback: 25,
      layerId: "c-prop-lot",
    };

    const newElements: (Parcel | Lot | Building | Easement | RightOfWay)[] = [parcel, lot];


    if (includeResidence) {
      const house: Building = {
        id: `bldg_cogo_${Date.now()}`,
        kind: "building",
        name: "Two Story Brick & Frame House with Basement #12720",
        boundary: [
          { x: pobX + 26.65, y: pobY + 42.0 },
          { x: pobX + 66.55, y: pobY + 42.0 },
          { x: pobX + 66.55, y: pobY + 78.4 },
          { x: pobX + 52.05, y: pobY + 78.4 },
          { x: pobX + 52.05, y: pobY + 90.4 },
          { x: pobX + 26.65, y: pobY + 90.4 },
        ],
        storeys: 2,
        height: 30,
        dwellingUnits: 1,
        layerId: "a-bldg",
      };
      newElements.push(house);
    }

    if (includeEasements) {
      const row: RightOfWay = {
        id: `row_cogo_${Date.now()}`,
        kind: "row",
        name: "Knightsbridge Drive (54' R/W — 650.98' to P.C. @ Berwick Place)",
        boundary: [
          { x: pobX - 20, y: pobY - 54 },
          { x: pobX + 150, y: pobY - 54 },
          { x: pobX + 150, y: pobY },
          { x: pobX - 20, y: pobY },
        ],
        layerId: "c-road",
      };

      const northSewer: Easement = {
        id: `esmt_sewer_${Date.now()}`,
        kind: "easement",
        name: "20' Sanitary Sewer Easement",
        boundary: [
          { x: pobX + 12.05, y: pobY + 158.23 },
          { x: pobX + 93.98, y: pobY + 170.12 },
          { x: pobX + 93.98, y: pobY + 190.12 },
          { x: pobX + 12.05, y: pobY + 178.23 },
        ],
        layerId: "c-ease",
      };

      const westStorm: Easement = {
        id: `esmt_storm_${Date.now()}`,
        kind: "easement",
        name: "20' Storm Drainage Easement",
        boundary: [
          { x: pobX, y: pobY },
          { x: pobX + 20, y: pobY },
          { x: pobX + 32.05, y: pobY + 178.23 },
          { x: pobX + 12.05, y: pobY + 178.23 },
        ],
        layerId: "c-ease",
      };

      const eastUtility: Easement = {
        id: `esmt_ingress_${Date.now()}`,
        kind: "easement",
        name: "40' Ingress-Egress and Utility Easement",
        boundary: [
          { x: pobX + 86.68, y: pobY + 3.57 },
          { x: pobX + 126.68, y: pobY + 3.57 },
          { x: pobX + 93.98, y: pobY + 190.12 },
          { x: pobX + 53.98, y: pobY + 190.12 },
        ],
        layerId: "c-ease",
      };

      newElements.push(row, northSewer, westStorm, eastUtility);
    }

    useWorkspaceStore.getState().addElements(newElements);
    setOpen(false);
  }

  return {
    open,
    setOpen,
    site,
    pobX,
    pobY,
    courses,
    lotName,
    includeResidence,
    setIncludeResidence,
    includeEasements,
    setIncludeEasements,
    boundary: geometry.boundary,
    arcs: geometry.arcs,
    totalPerimeter: geometry.totalPerimeter,
    calculatedAreaSqFt: geometry.calculatedAreaSqFt,
    closureError: geometry.closureError,
    addCourse,
    updateCourse,
    removeCourse,
    commitPlatToCanvas,
  };
}
