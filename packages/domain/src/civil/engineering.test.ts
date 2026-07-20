import { describe, expect, it } from "vitest";
import {
  type VerticalProfile,
  profileElevationAt,
  type CrossSection,
} from "./profile";
import {
  calculateSectionArea,
  averageEndAreaVolume,
} from "../drawing/qto";
import {
  compileLabelTemplate,
} from "../drawing/labeling";
import {
  validatePipeNetwork,
  type PipeDesignRules,
} from "./pipedesign";
import {
  generateViewFrames,
} from "../drawing/planproduction";
import {
  type HorizontalAlignment,
  resolveAlignment,
  validateAlignmentDesignSpeed,
} from "./alignment";
import {
  calculateSuperelevationRunoff,
  getSuperelevationSlope,
} from "./superelevation";
import {
  resolveAssemblyOffset,
} from "./assembly";
import {
  buildCorridorSections,
} from "./corridor";
import {
  calculateGradingVolumes,
  solveBalancedElevation,
} from "./grading";
import {
  type ElevationGrid,
} from "./terrain";
import {
  type InfrastructureNetwork,
} from "./network";

describe("Vertical Profiles Math & Curves", () => {
  // Setup a vertical profile with a PVI at station 500, elevation 100, curve length 200.
  // POB: Sta 0, Elev 50.
  // PVI: Sta 500, Elev 150, curve length 200.
  // POE: Sta 1000, Elev 100.
  // Incoming grade: (150 - 50)/500 = 0.20 (20%)
  // Outgoing grade: (100 - 150)/500 = -0.10 (-10%)
  const profile: VerticalProfile = {
    id: "vp1",
    name: "Profile 1",
    alignmentId: "a1",
    pvis: [
      { station: 0, elevation: 50 },
      { station: 500, elevation: 150, curveLength: 200 },
      { station: 1000, elevation: 100 },
    ],
  };

  it("calculates correct straight tangent elevations outside the curve", () => {
    // Sta 200 should be on incoming tangent: 50 + 0.2 * 200 = 90
    expect(profileElevationAt(profile, 200)).toBeCloseTo(90, 4);
    // Sta 800 should be on outgoing tangent: 150 - 0.1 * 300 = 120
    expect(profileElevationAt(profile, 800)).toBeCloseTo(120, 4);
  });

  it("calculates parabolic curve elevations inside the vertical curve", () => {
    // Curve spans from 500 - 200/2 = 400 to 500 + 200/2 = 600
    // At PVI station 500 (middle of curve):
    // Standard vertical offset at middle of parabolic curve: e = (A * L) / 800
    // A = |g2% - g1%| = |-10% - 20%| = 30
    // L = 200
    // e = (30 * 200) / 800 = 7.5 units.
    // Since it's a crest curve, the curve elevation should be PVI elev (150) minus e = 142.5.
    expect(profileElevationAt(profile, 500)).toBeCloseTo(142.5, 4);
  });
});

describe("Quantity Takeoff Average End Area Math", () => {
  it("calculates cross-section cut/fill areas", () => {
    // Simple flat sections at station 100.
    // Existing terrain is at elev 10. Proposed terrain is at elev 12 (flat pad).
    // Swath width is 50 (-25 to 25).
    // Total fill height = 2 units. Swath width = 50 units. Area = 100.
    const cs: CrossSection = {
      station: 100,
      centerpoint: { x: 0, y: 0 },
      existingPoints: [
        { offset: -25, elevation: 10 },
        { offset: 25, elevation: 10 },
      ],
      proposedPoints: [
        { offset: -25, elevation: 12 },
        { offset: 25, elevation: 12 },
      ],
    };

    const area = calculateSectionArea(cs);
    expect(area.fillArea).toBeCloseTo(100, 4);
    expect(area.cutArea).toBe(0);
  });

  it("calculates average end area volumes between two stations", () => {
    // Station A: Fill Area = 100
    // Station B: Fill Area = 200
    // Distance = 100 units
    // Volume = (100 + 200)/2 * 100 = 15,000 units³
    const csA: CrossSection = {
      station: 0,
      centerpoint: { x: 0, y: 0 },
      existingPoints: [{ offset: -25, elevation: 10 }, { offset: 25, elevation: 10 }],
      proposedPoints: [{ offset: -25, elevation: 12 }, { offset: 25, elevation: 12 }],
    };
    const csB: CrossSection = {
      station: 100,
      centerpoint: { x: 100, y: 0 },
      existingPoints: [{ offset: -25, elevation: 10 }, { offset: 25, elevation: 10 }],
      proposedPoints: [{ offset: -25, elevation: 14 }, { offset: 25, elevation: 14 }],
    };

    const vol = averageEndAreaVolume(csA, csB);
    expect(vol.fillVolume).toBeCloseTo(15000, 4);
    expect(vol.cutVolume).toBe(0);
  });
});

describe("Pipe Network Rules Validation", () => {
  const grid: ElevationGrid = {
    origin: { x: 0, y: 0 },
    cellSize: 10,
    cols: 3,
    rows: 3,
    heights: [
      10, 10, 10,
      10, 10, 10,
      10, 10, 10,
    ],
  };

  const net: InfrastructureNetwork = {
    id: "n1",
    name: "Sewer Network",
    kind: "sewer",
    nodes: [
      { id: "node1", point: { x: 0, y: 0 } },
      { id: "node2", point: { x: 20, y: 0 } },
    ],
    edges: [
      { id: "edge1", from: "node1", to: "node2", width: 1.5 },
    ],
  };

  const rules: PipeDesignRules = {
    minCover: 4.0,     // 4 units min cover
    minSlope: 0.005,   // 0.5% min slope
    maxSlope: 0.08,    // 8% max slope
    minPipeDiameter: 1.0,
    defaultSumpDepth: 1.5,
  };

  it("flags cover depth violations when pipe is too shallow", () => {
    // Terrain at node1 and node2 is 10.
    // If inverts are at 8, pipe depth is 10 - (8 + 1.5) = 0.5 units cover.
    // Violates minCover of 4.0.
    const inverts = { node1: 8, node2: 8 };
    const res = validatePipeNetwork(net, grid, rules, inverts);
    expect(res.violations.some((v) => v.type === "low_cover")).toBe(true);
  });

  it("passes when cover depth and slope rules are fully satisfied", () => {
    // Terrain is 10.
    // Invert at node1: 4.0 (Cover = 10 - 4 - 1.5 = 4.5 >= 4.0)
    // Invert at node2: 3.5 (Cover = 10 - 3.5 - 1.5 = 5.0 >= 4.0)
    // Slope = (4.0 - 3.5) / 20 = 0.025 (2.5%) (Inside range 0.5% to 8%)
    const inverts = { node1: 4, node2: 3.5 };
    const res = validatePipeNetwork(net, grid, rules, inverts);
    expect(res.violations.length).toBe(0);
  });
});

describe("Labels Expressions Compilation", () => {
  it("compiles name and formatted station variables correctly", () => {
    const template = "ALIGN: {Name} (STA: {Station})";
    const vars = { Name: "MAIN ROAD", Station: 1250.5 };
    const res = compileLabelTemplate(template, vars);
    expect(res).toBe("ALIGN: MAIN ROAD (STA: 12+50.50)");
  });

  it("evaluates mathematical expressions inside curly brackets", () => {
    const template = "CORRECTED ELEV: {Elevation + 2.50} FT";
    const vars = { Elevation: 100 };
    const res = compileLabelTemplate(template, vars);
    expect(res).toBe("CORRECTED ELEV: 102.50 FT");
  });
});

describe("Plan Production View Frames Splitter", () => {
  it("splits a straight horizontal alignment into view frames", () => {
    const align: HorizontalAlignment = {
      id: "a1",
      name: "PLAN ROAD",
      startStation: 0,
      pis: [
        { point: { x: 0, y: 0 } },
        { point: { x: 1000, y: 0 } },
      ],
    };
    const r = resolveAlignment(align)!;

    // View frame width = 400. Overlap = 10% (step = 360).
    // Length 1000:
    // Frame 1: 0 to 400
    // Frame 2: 360 to 760
    // Frame 3: 720 to 1000 (end)
    const vfg = generateViewFrames(r, "a1", "1:500", 8, 5, "feet", 0.1);
    expect(vfg.frames.length).toBeGreaterThanOrEqual(2);
    expect(vfg.matchLines.length).toBe(vfg.frames.length - 1);
  });
});

describe("Superelevation attainment logic", () => {
  it("generates correct AASHTO transition stations", () => {
    const align: HorizontalAlignment = {
      id: "a1",
      name: "Super Road",
      startStation: 0,
      pis: [
        { point: { x: 0, y: 0 } },
        { point: { x: 500, y: 0 } },
        { point: { x: 1000, y: 0 } },
      ],
    };
    const curve = calculateSuperelevationRunoff(align, 45, 0.06, -0.02);
    expect(curve.transitionStations.length).toBe(8);
    expect(curve.transitionStations[0].description).toBe("Normal Crown (NC)");
    expect(curve.transitionStations[3].description).toBe("Full Superelevation Start (FS)");
  });

  it("interpolates lane slope within transition ranges", () => {
    const align: HorizontalAlignment = {
      id: "a1",
      name: "Super Road",
      startStation: 0,
      pis: [
        { point: { x: 0, y: 0 } },
        { point: { x: 1000, y: 0 } },
      ],
    };
    const curve = calculateSuperelevationRunoff(align, 45, 0.06, -0.02);
    // Interpolate right at the middle of transition from reverse crown (0.02) to full super (0.06)
    const rcStation = curve.transitionStations[2].station;
    const fsStation = curve.transitionStations[3].station;
    const midStation = (rcStation + fsStation) / 2;
    const slopes = getSuperelevationSlope(curve, midStation);
    expect(slopes.leftSlope).toBeCloseTo(0.04, 2);
    expect(slopes.rightSlope).toBeCloseTo(-0.04, 2);
  });
});

describe("Assemblies & Subassemblies template", () => {
  it("resolves coordinate offsets along assembly components", () => {
    const assembly = {
      id: "as-1",
      name: "Assembly A",
      leftSubassemblies: [
        { id: "l1", name: "Left Lane", side: "left" as const, type: "Lane" as const, parameters: [{ name: "Width", value: 12 }] }
      ],
      rightSubassemblies: [
        { id: "r1", name: "Right Lane", side: "right" as const, type: "Lane" as const, parameters: [{ name: "Width", value: 12 }] }
      ],
    };
    const points = resolveAssemblyOffset(assembly, -0.02, -0.02);
    expect(points.length).toBe(3); // Centerline, Left edge, Right edge
    expect(points.find((p) => p.code === "EdgeOfPavement_left")?.x).toBe(-12);
    expect(points.find((p) => p.code === "EdgeOfPavement_right")?.x).toBe(12);
  });
});

describe("Corridor Extrusion modeler", () => {
  it("builds 3D coordinate points along baseline stations", () => {
    const align: HorizontalAlignment = {
      id: "a1",
      name: "Road Corridor",
      startStation: 0,
      pis: [{ point: { x: 0, y: 0 } }, { point: { x: 500, y: 0 } }],
    };
    const profile = { id: "p1", name: "Profile", alignmentId: "a1", pvis: [{ station: 0, elevation: 100 }, { station: 500, elevation: 110 }] };
    const assembly = {
      id: "as-1",
      name: "Assembly A",
      leftSubassemblies: [
        { id: "l1", name: "Left Lane", side: "left" as const, type: "Lane" as const, parameters: [{ name: "Width", value: 10 }] }
      ],
      rightSubassemblies: [
        { id: "r1", name: "Right Lane", side: "right" as const, type: "Lane" as const, parameters: [{ name: "Width", value: 10 }] }
      ],
    };
    const corridor = { id: "c1", name: "Corridor", alignmentId: "a1", profileId: "p1", assemblyId: "as-1", frequency: 100 };
    const sections = buildCorridorSections(corridor, align, profile, assembly);
    expect(sections.length).toBeGreaterThan(0);
    // At station 100, elevation is 102. Centerline point should be (0, 0, 102)
    const cl = sections.find((s) => s.station === 100 && s.code === "Centerline");
    expect(cl?.z).toBeCloseTo(102, 1);
  });
});

describe("Grading Pad volume balance", () => {
  const surface: ElevationGrid = {
    cols: 5,
    rows: 5,
    origin: { x: 0, y: 0 },
    cellSize: 20,
    heights: [
      10, 10, 10, 10, 10,
      10, 10, 10, 10, 10,
      10, 10, 10, 10, 10,
      10, 10, 10, 10, 10,
      10, 10, 10, 10, 10,
    ],
  };

  const pad = {
    id: "g1",
    name: "Pad 1",
    points: [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ],
    targetElevation: 12,
    cutSlope: 2,
    fillSlope: 3,
  };

  it("calculates grading volumes correctly", () => {
    // Terrain is 10. Pad is 12 (Fill). Fill volume should be positive.
    const res = calculateGradingVolumes(pad, 12, surface, 10);
    expect(res.fillVolume).toBeGreaterThan(0);
    expect(res.cutVolume).toBe(0);
  });

  it("finds the balanced elevation near terrain height", () => {
    // Since terrain is flat 10, the balanced elevation with zero net volume should be near 10.
    const balZ = solveBalancedElevation(pad, surface, 0, 5);
    expect(balZ).toBeCloseTo(10, 0.5);
  });
});

describe("Alignment Design Standard Checks", () => {
  it("flags curve design violations for narrow radii at fast design speed", () => {
    const align: HorizontalAlignment = {
      id: "a1",
      name: "Fast highway",
      startStation: 0,
      designSpeed: 55, // 55 mph requires min radius 1000 ft
      pis: [
        { point: { x: 0, y: 0 } },
        { point: { x: 500, y: 200 }, radius: 250 }, // 250 ft is tight
        { point: { x: 1000, y: 0 } },
      ],
    };
    const r = resolveAlignment(align)!;
    const checks = validateAlignmentDesignSpeed(align, r);
    expect(checks.some((c) => c.isViolation)).toBe(true);
  });
});

