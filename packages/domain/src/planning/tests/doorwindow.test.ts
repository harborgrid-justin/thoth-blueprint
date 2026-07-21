import { describe, it, expect } from "vitest";
import type { DoorElement, WindowElement } from "../../spatial/types.js";
import { calculateDoorGeometry, calculateWindowGeometry, compileUnitSchedule } from "../doorwindow.js";

describe("Door & Window Assemblies Calculations Engine", () => {
  it("should calculate swing door arc paths and knob anchors", () => {
    const door: DoorElement = {
      id: "door-1",
      name: "Entrance Swing Door",
      layerId: "layer-base",
      kind: "door",
      boundary: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0.15 },
        { x: 0, y: 0.15 },
      ],
      width: 1.0,
      height: 2.1,
      depth: 0.15,
      doorOperation: "swing",
      swingAngle: 90,
      thresholdHeight: 0.01,
    };

    const res = calculateDoorGeometry(door);
    expect(res.swingPath.length).toBeGreaterThan(0);
    expect(res.doorPanelPolygon.length).toBe(4);
    expect(res.hardwareAnchor).toBeDefined();
    expect(res.warnings.length).toBe(0); // complies with egress width (>0.81m)
  });

  it("should generate folding bi-fold panels and flag egress warnings", () => {
    const narrowDoor: DoorElement = {
      id: "door-2",
      name: "Narrow Closet Door",
      layerId: "layer-base",
      kind: "door",
      boundary: [
        { x: 0, y: 0 },
        { x: 0.6, y: 0 },
        { x: 0.6, y: 0.1 },
        { x: 0, y: 0.1 },
      ],
      width: 0.6,
      height: 2.0,
      depth: 0.1,
      doorOperation: "folding",
    };

    const res = calculateDoorGeometry(narrowDoor);
    expect(res.swingPath.length).toBe(3); // bi-fold folding points
    expect(res.warnings.length).toBeGreaterThan(0); // width < 0.81m egress warning
  });

  it("should calculate window sills and flag natural light compliance checks", () => {
    const win: WindowElement = {
      id: "win-1",
      name: "Small Living Window",
      layerId: "layer-base",
      kind: "window",
      boundary: [
        { x: 0, y: 0 },
        { x: 0.8, y: 0 },
        { x: 0.8, y: 0.15 },
        { x: 0, y: 0.15 },
      ],
      width: 0.8,
      height: 1.0,
      depth: 0.15,
      windowType: "single-hung",
    };

    const res = calculateWindowGeometry(win);
    expect(res.sillPolygon.length).toBe(4);
    expect(res.glazingPolygons.length).toBe(1);
    expect(res.warnings.length).toBeGreaterThan(0); // natural light warning (<8% of 12sqm served room)
  });

  it("should compile unit schedule inventories", () => {
    const elements = [
      {
        id: "d-1",
        kind: "door",
        name: "Door A",
        doorOperation: "swing",
        width: 0.9,
        height: 2.1,
        hardwareTrim: "lever",
        fireRating: "90-min",
        stcRating: 34,
        safetyGlazing: "tempered",
      },
      {
        id: "w-1",
        kind: "window",
        name: "Window A",
        windowType: "casement",
        width: 1.2,
        height: 1.5,
        stcRating: 28,
        safetyGlazing: "none",
      },
    ];

    const sched = compileUnitSchedule(elements as any);
    expect(sched.doors.length).toBe(1);
    expect(sched.windows.length).toBe(1);
    expect(sched.doors[0].fireRating).toBe("90-min");
    expect(sched.windows[0].stcRating).toBe(28);
  });
});
