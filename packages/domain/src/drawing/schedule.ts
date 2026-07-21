/**
 * Schedules — the tabular data blocks a sheet carries: door, window, room, and
 * finish schedules derived from the building model, plus curve/line schedules
 * derived from survey data. One generic {@link ScheduleTable} type feeds the
 * sheet renderer uniformly, so every table (survey or architectural) draws the
 * same way.
 */

import _ from "lodash";
import {
  roomArea,
  type BuildingModel,
} from "../planning/building";
import type { SiteCurve } from "./platset";
import type { AreaUnit, SpatialContext } from "../spatial/spatial";
import { areaUnitLabel } from "../spatial/spatial";

import type { ScheduleColumn, ScheduleRow, ScheduleTable } from "./types/schedule";

export type { ScheduleColumn, ScheduleRow, ScheduleTable };

/** Door schedule from a building model. */
export function doorSchedule(model: BuildingModel): ScheduleTable {
  const feetIn = (v: number) => {
    const totalIn = Math.round(v * 12);
    const ft = Math.floor(totalIn / 12);
    const inch = totalIn - ft * 12;
    return `${ft}'-${inch}"`;
  };
  const sortedDoors = _.sortBy(model.doors, "mark");
  const rows: ScheduleRow[] = sortedDoors.map((d) => ({
    mark: d.mark,
    width: feetIn(d.width),
    height: feetIn(d.height),
    leaf: d.leaf,
    swing: d.swing,
  }));
  return {
    id: "door-schedule",
    title: "Door Schedule",
    columns: [
      { key: "mark", label: "Mark" },
      { key: "width", label: "Width", align: "right" },
      { key: "height", label: "Height", align: "right" },
      { key: "leaf", label: "Type" },
      { key: "swing", label: "Swing", align: "center" },
    ],
    rows,
  };
}

/** Window schedule from a building model. */
export function windowSchedule(model: BuildingModel): ScheduleTable {
  const feetIn = (v: number) => {
    const totalIn = Math.round(v * 12);
    const ft = Math.floor(totalIn / 12);
    const inch = totalIn - ft * 12;
    return `${ft}'-${inch}"`;
  };
  const sortedWindows = _.sortBy(model.windows, "mark");
  const rows: ScheduleRow[] = sortedWindows.map((w) => ({
    mark: w.mark,
    width: feetIn(w.width),
    height: feetIn(w.height),
    sill: feetIn(w.sill),
  }));
  return {
    id: "window-schedule",
    title: "Window Schedule",
    columns: [
      { key: "mark", label: "Mark" },
      { key: "width", label: "Width", align: "right" },
      { key: "height", label: "Height", align: "right" },
      { key: "sill", label: "Sill", align: "right" },
    ],
    rows,
  };
}

/** Room schedule (name/number/area) from a building model. */
export function roomSchedule(
  model: BuildingModel,
  spatial: SpatialContext,
  unit: AreaUnit = "sqft",
): ScheduleTable {
  const sortedRooms = _.sortBy(model.rooms, "number");
  const rows: ScheduleRow[] = sortedRooms.map((r) => ({
    number: r.number,
    name: r.name,
    area: `${roomArea(r, spatial, unit).toFixed(0)} ${areaUnitLabel(unit)}`,
    finish: r.floorFinish ?? "—",
  }));
  return {
    id: "room-schedule",
    title: "Room Schedule",
    columns: [
      { key: "number", label: "No." },
      { key: "name", label: "Room" },
      { key: "area", label: "Area", align: "right" },
      { key: "finish", label: "Floor" },
    ],
    rows,
  };
}

/** Finish schedule (floor/base/wall/ceiling per room). */
export function finishSchedule(model: BuildingModel): ScheduleTable {
  const sortedRooms = _.sortBy(model.rooms, "number");
  const rows: ScheduleRow[] = sortedRooms.map((r) => ({
    number: r.number,
    name: r.name,
    floor: r.floorFinish ?? "—",
    base: r.baseFinish ?? "—",
    wall: r.wallFinish ?? "—",
    ceiling: r.ceilingFinish ?? "—",
  }));
  return {
    id: "finish-schedule",
    title: "Room Finish Schedule",
    columns: [
      { key: "number", label: "No." },
      { key: "name", label: "Room" },
      { key: "floor", label: "Floor" },
      { key: "base", label: "Base" },
      { key: "wall", label: "Wall" },
      { key: "ceiling", label: "Clg." },
    ],
    rows,
  };
}

/** Curve schedule from consolidated site curves (C1…Cn). */
export function curveSchedule(curves: SiteCurve[]): ScheduleTable {
  const rows: ScheduleRow[] = curves.map((c) => ({
    label: c.label,
    radius: c.radius.toFixed(2),
    arcLength: c.arcLength.toFixed(2),
    delta: `${c.deltaDeg.toFixed(2)}°`,
    chord: c.chord.toFixed(2),
    chordBearing: c.chordBearing,
    tangent: c.tangent.toFixed(2),
  }));
  return {
    id: "curve-schedule",
    title: "Curve Table",
    columns: [
      { key: "label", label: "Curve" },
      { key: "radius", label: "Radius", align: "right" },
      { key: "arcLength", label: "Length", align: "right" },
      { key: "delta", label: "Delta", align: "right" },
      { key: "chord", label: "Chord", align: "right" },
      { key: "chordBearing", label: "Chord Brg." },
      { key: "tangent", label: "Tangent", align: "right" },
    ],
    rows,
  };
}
