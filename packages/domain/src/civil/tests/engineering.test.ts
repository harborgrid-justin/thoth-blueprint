import { describe, expect, it } from "vitest";
import {
  type VerticalProfile,
  profileElevationAt,
  type CrossSection,
} from "../profile";
import { calculateSectionArea, averageEndAreaVolume } from "../../drawing/qto";
import { compileLabelTemplate } from "../../drawing/labeling";
import { validatePipeNetwork, type PipeDesignRules } from "../pipedesign";
import { generateViewFrames } from "../../drawing/planproduction";
import {
  type HorizontalAlignment,
  resolveAlignment,
  validateAlignmentDesignSpeed,
} from "../alignment";
import {
  calculateSuperelevationRunoff,
  getSuperelevationSlope,
} from "../superelevation";
import { resolveAssemblyOffset } from "../assembly";
import { buildCorridorSections } from "../corridor";
import { calculateGradingVolumes, solveBalancedElevation } from "../grading";
import { type ElevationGrid } from "../terrain";
import { type InfrastructureNetwork } from "../network";

describe("Vertical Profiles Math & Curves", () => {
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
    expect(profileElevationAt(profile, 200)).toBeCloseTo(90, 4);
    expect(profileElevationAt(profile, 800)).toBeCloseTo(120, 4);
  });

  it("calculates parabolic curve elevations inside the vertical curve", () => {
    expect(profileElevationAt(profile, 500)).toBeCloseTo(142.5, 4);
  });
});

describe("Quantity Takeoff Average End Area Math", () => {
  it("calculates cross-section cut/fill areas", () => {
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
    const csA: CrossSection = {
      station: 0,
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
    const csB: CrossSection = {
      station: 100,
      centerpoint: { x: 100, y: 0 },
      existingPoints: [
        { offset: -25, elevation: 10 },
        { offset: 25, elevation: 10 },
      ],
      proposedPoints: [
        { offset: -25, elevation: 14 },
        { offset: 25, elevation: 14 },
      ],
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
    heights: [10, 10, 10, 10, 10, 10, 10, 10, 10],
  };

  const net: InfrastructureNetwork = {
    id: "n1",
    name: "Sewer Network",
    kind: "sewer",
    nodes: [
      { id: "node1", point: { x: 0, y: 0 } },
      { id: "node2", point: { x: 20, y: 0 } },
    ],
    edges: [{ id: "edge1", from: "node1", to: "node2", width: 1.5 }],
  };

  const rules: PipeDesignRules = {
    minCover: 4.0, // 4 units min cover
    minSlope: 0.005, // 0.5% min slope
    maxSlope: 0.08, // 8% max slope
    minPipeDiameter: 1.0,
    defaultSumpDepth: 1.5,
  };

  it("flags cover depth violations when pipe is too shallow", () => {
    const inverts = { node1: 8, node2: 8 };
    const res = validatePipeNetwork(net, grid, rules, inverts);
    expect(res.violations.some((v) => v.type === "low_cover")).toBe(true);
  });

  it("passes when cover depth and slope rules are fully satisfied", () => {
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
      pis: [{ point: { x: 0, y: 0 } }, { point: { x: 1000, y: 0 } }],
    };
    const r = resolveAlignment(align)!;

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
    expect(curve.transitionStations[3].description).toBe(
      "Full Superelevation Start (FS)",
    );
  });

  it("interpolates lane slope within transition ranges", () => {
    const align: HorizontalAlignment = {
      id: "a1",
      name: "Super Road",
      startStation: 0,
      pis: [{ point: { x: 0, y: 0 } }, { point: { x: 1000, y: 0 } }],
    };
    const curve = calculateSuperelevationRunoff(align, 45, 0.06, -0.02);
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
        {
          id: "l1",
          name: "Left Lane",
          side: "left" as const,
          type: "Lane" as const,
          parameters: [{ name: "Width", value: 12 }],
        },
      ],
      rightSubassemblies: [
        {
          id: "r1",
          name: "Right Lane",
          side: "right" as const,
          type: "Lane" as const,
          parameters: [{ name: "Width", value: 12 }],
        },
      ],
    };
    const points = resolveAssemblyOffset(assembly, -0.02, -0.02);
    expect(points.length).toBe(3);
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
    const profile = {
      id: "p1",
      name: "Profile",
      alignmentId: "a1",
      pvis: [
        { station: 0, elevation: 100 },
        { station: 500, elevation: 110 },
      ],
    };
    const assembly = {
      id: "as-1",
      name: "Assembly A",
      leftSubassemblies: [
        {
          id: "l1",
          name: "Left Lane",
          side: "left" as const,
          type: "Lane" as const,
          parameters: [{ name: "Width", value: 10 }],
        },
      ],
      rightSubassemblies: [
        {
          id: "r1",
          name: "Right Lane",
          side: "right" as const,
          type: "Lane" as const,
          parameters: [{ name: "Width", value: 10 }],
        },
      ],
    };
    const corridor = {
      id: "c1",
      name: "Corridor",
      alignmentId: "a1",
      profileId: "p1",
      assemblyId: "as-1",
      frequency: 100,
    };
    const sections = buildCorridorSections(corridor, align, profile, assembly);
    expect(sections.length).toBeGreaterThan(0);
    const cl = sections.find(
      (s) => s.station === 100 && s.code === "Centerline",
    );
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
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
      10, 10, 10, 10, 10, 10, 10,
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
    const res = calculateGradingVolumes(pad, 12, surface, 10);
    expect(res.fillVolume).toBeGreaterThan(0);
    expect(res.cutVolume).toBe(0);
  });

  it("finds the balanced elevation near terrain height", () => {
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
      designSpeed: 55,
      pis: [
        { point: { x: 0, y: 0 } },
        { point: { x: 500, y: 200 }, radius: 250 },
        { point: { x: 1000, y: 0 } },
      ],
    };
    const r = resolveAlignment(align)!;
    const checks = validateAlignmentDesignSpeed(align, r);
    expect(checks.some((c) => c.isViolation)).toBe(true);
  });
});
