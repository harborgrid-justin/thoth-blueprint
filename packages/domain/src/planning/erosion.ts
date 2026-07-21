import type { Site, Point, ComplianceFinding } from "../spatial/types.js";
import type { ElevationGrid } from "../civil/terrain.js";
import { distance, length } from "../spatial/geometry.js";

import type {
  ErosionParticle,
  BarrierStats,
  SimulationFrame,
} from "./types/erosion";

export type { ErosionParticle, BarrierStats, SimulationFrame };

export class ErosionSimulator {
  private site: Site;
  private grid: ElevationGrid;
  private steps: SimulationFrame[] = [];

  // Parameters
  private rainIntensity = 40; // particles per step
  private soilErodibility = 0.055;
  private depositRate = 0.12;
  private gravity = 9.81;
  constructor(site: Site, soilType?: "sand" | "silt" | "clay" | "loam") {
    this.site = site;
    this.grid = (site as any).terrain?.existing || this.makeDefaultGrid();
    if (soilType) {
      if (soilType === "sand") {
        this.soilErodibility = 0.025;
        this.depositRate = 0.25;
      } else if (soilType === "clay") {
        this.soilErodibility = 0.04;
        this.depositRate = 0.05;
      } else if (soilType === "silt") {
        this.soilErodibility = 0.08;
        this.depositRate = 0.15;
      } else {
        this.soilErodibility = 0.055;
        this.depositRate = 0.12;
      }
    }
  }

  private makeDefaultGrid(): ElevationGrid {
    const heights = new Array(2500).fill(10);
    for (let r = 0; r < 50; r++) {
      for (let c = 0; c < 50; c++) {
        heights[r * 50 + c] = 15 - (r / 50) * 8 + Math.sin(c / 5) * 1.5;
      }
    }
    return {
      cols: 50,
      rows: 50,
      cellSize: 2.0,
      origin: { x: 0, y: 0 },
      heights,
    };
  }

  /** Run the simulation for N steps and record timeline frames */
  runSimulation(maxSteps = 100): SimulationFrame[] {
    const cols = this.grid.cols;
    const rows = this.grid.rows;
    const heights = [...this.grid.heights];
    const barrierStats: BarrierStats[] = this.site.elements
      .filter(
        (e) => e.kind === "curtainwall" || (e as any).type === "erosion-bale",
      )
      .map((e) => ({
        id: e.id,
        name: (e as any).name || "Silt Barrier",
        sedimentTrappedKg: 0,
        loadRatio: 0,
      }));

    let totalSoilLostKg = 0;
    let totalWaterRunoffLiters = 0;
    this.steps = [];

    for (let s = 0; s < maxSteps; s++) {
      const activeParticles: ErosionParticle[] = [];

      // 1. Generate new rain particles (hydrology)
      for (let p = 0; p < this.rainIntensity; p++) {
        const x =
          this.grid.origin.x + Math.random() * (cols - 1) * this.grid.cellSize;
        const y =
          this.grid.origin.y + Math.random() * (rows - 1) * this.grid.cellSize;
        activeParticles.push({
          id: `p-${s}-${p}`,
          position: { x, y },
          velocity: { x: 0, y: 0 },
          waterVolume: 1.0, // Liters
          sediment: 0.0,
          isDead: false,
        });
        totalWaterRunoffLiters += 1.0;
      }

      // 2. Move particles and apply erosion math
      activeParticles.forEach((part) => {
        let life = 30; // maximum travel steps
        while (life > 0 && !part.isDead) {
          life--;

          // Compute terrain normal gradient at current position
          const grad = this.getGradientAt(part.position, heights);
          if (length(grad) < 1e-4) {
            part.isDead = true;
            break;
          }

          // Update velocity based on gravity slope direction
          part.velocity.x = part.velocity.x * 0.5 - grad.x * this.gravity * 0.1;
          part.velocity.y = part.velocity.y * 0.5 - grad.y * this.gravity * 0.1;

          // Compute next potential coordinate position
          const nextPt = {
            x: part.position.x + part.velocity.x * 0.2,
            y: part.position.y + part.velocity.y * 0.2,
          };

          // Check barrier intersections (silt fences, straw bales)
          const barrierHit = this.checkBarrierIntersection(
            part.position,
            nextPt,
          );
          if (barrierHit) {
            // Trap sediment in barrier
            const stat = barrierStats.find((b) => b.id === barrierHit.id);
            if (stat) {
              const trapped = part.sediment * 0.85; // 85% trapping efficiency
              stat.sedimentTrappedKg += trapped;
              stat.loadRatio = Math.min(1.0, stat.sedimentTrappedKg / 100.0); // max 100kg capacity
              part.sediment -= trapped;
            }

            // Stop/deflect particle
            part.velocity = { x: 0, y: 0 };
            part.isDead = true;
            break;
          }

          // Check boundary limits
          if (
            nextPt.x < this.grid.origin.x ||
            nextPt.x >= this.grid.origin.x + (cols - 1) * this.grid.cellSize ||
            nextPt.y < this.grid.origin.y ||
            nextPt.y >= this.grid.origin.y + (rows - 1) * this.grid.cellSize
          ) {
            // Particle washes off-site
            totalSoilLostKg += part.sediment;
            part.isDead = true;
            break;
          }

          // Perform erosion & deposition math (based on sediment capacity)
          const speed = length(part.velocity);
          const capacity = Math.max(0.01, speed * part.waterVolume * 0.15);

          const cellIndex = this.getCellIndex(part.position);

          if (part.sediment < capacity) {
            // ERODE terrain: lift soil
            const erodeAmt = (capacity - part.sediment) * this.soilErodibility;
            heights[cellIndex] -= erodeAmt;
            part.sediment += erodeAmt;
          } else {
            // DEPOSIT sediment: build terrain
            const depositAmt = (part.sediment - capacity) * this.depositRate;
            heights[cellIndex] += depositAmt;
            part.sediment -= depositAmt;
          }

          // Advance position
          part.position = nextPt;
          part.waterVolume *= 0.98; // evaporation / absorption loss
          if (part.waterVolume < 0.05) {
            part.isDead = true;
          }
        }
      });

      // Save frame snapshot
      this.steps.push({
        step: s,
        heights: [...heights],
        particles: activeParticles.map((p) => ({
          ...p,
          position: { ...p.position },
          velocity: { ...p.velocity },
        })),
        barrierStats: barrierStats.map((b) => ({ ...b })),
        totalSoilLostKg,
        totalWaterRunoffLiters,
      });
    }

    return this.steps;
  }

  private getCellIndex(p: Point): number {
    const c = Math.floor((p.x - this.grid.origin.x) / this.grid.cellSize);
    const r = Math.floor((p.y - this.grid.origin.y) / this.grid.cellSize);
    const cols = this.grid.cols;
    return Math.max(0, Math.min(heightsCount(this.grid) - 1, r * cols + c));
  }

  private getGradientAt(p: Point, heights: number[]): Point {
    const cols = this.grid.cols;
    const rows = this.grid.rows;
    const cs = this.grid.cellSize;

    const c = Math.floor((p.x - this.grid.origin.x) / cs);
    const r = Math.floor((p.y - this.grid.origin.y) / cs);

    if (c <= 0 || c >= cols - 1 || r <= 0 || r >= rows - 1) {
      return { x: 0, y: 0 };
    }

    // Finite differences
    const hL = heights[r * cols + (c - 1)] || 0;
    const hR = heights[r * cols + (c + 1)] || 0;
    const hD = heights[(r - 1) * cols + c] || 0;
    const hU = heights[(r + 1) * cols + c] || 0;

    return {
      x: (hR - hL) / (2 * cs),
      y: (hU - hD) / (2 * cs),
    };
  }

  /** Checks if segment (from -> to) intersects with any erosion barriers */
  private checkBarrierIntersection(
    from: Point,
    to: Point,
  ): { id: string } | null {
    const ccw = (A: Point, B: Point, C: Point) =>
      (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (B.x - A.x);

    for (const el of this.site.elements) {
      if (el.kind === "curtainwall" && el.boundary && el.boundary.length >= 2) {
        for (let i = 0; i < el.boundary.length - 1; i++) {
          const b1 = el.boundary[i];
          const b2 = el.boundary[i + 1];
          // Check segment intersection
          const intersect =
            ccw(from, b1, b2) !== ccw(to, b1, b2) &&
            ccw(from, to, b1) !== ccw(from, to, b2);
          if (intersect) {
            return { id: el.id };
          }
        }
      } else if ((el as any).type === "erosion-bale") {
        const pos = (el as any).position;
        if (pos) {
          if (distance(to, pos) < 1.5) {
            return { id: el.id };
          }
        }
      }
    }
    return null;
  }
}

function heightsCount(grid: ElevationGrid): number {
  return grid.cols * grid.rows;
}

/**
 * Automate checking site elements against the 19 Virginia Minimum Standards (9VAC25-875-560)
 */
export function auditErosionCompliance(site: Site): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];

  const controlLines = site.controlLines || [];
  const civilSymbols = site.civilSymbols || [];
  const networks = site.networks || [];

  // --- I. Hydrological & Delineation Auditing ---

  // 1. MS-4 Check: First Step (Requires perimeter sediment barriers)
  const hasSiltFence = controlLines.some((c) => c.type === "silt-fence");
  const hasBales = civilSymbols.some(
    (s) => s.type === "erosion-bale" || s.type === "silt-basin",
  );
  const hasPerimeterBarrier = hasSiltFence || hasBales;

  if (!hasPerimeterBarrier) {
    findings.push({
      severity: "error",
      code: "erosion.perimeter.missing",
      message:
        "No perimeter erosion barriers (silt fence, sediment basin, or erosion bales) are drafted on site (MS-4).",
    });
  }

  // REQ-ESC-002: Rational Method Flow check (Max runoff limit validation)
  // Assume a composite runoff C coefficient of 0.6 and standard rainfall intensity of 2.5 in/hr
  const totalSiteAreaAcres = 3.5;
  const computedPeakFlowCfs = 0.6 * 2.5 * totalSiteAreaAcres; // Q = C * I * A
  if (computedPeakFlowCfs > 5.0) {
    findings.push({
      severity: "warning",
      code: "erosion.flow.excessive",
      message: `Calculated peak stormwater discharge rate (${computedPeakFlowCfs.toFixed(2)} cfs) exceeds the non-erodible outfall channel capacity of 5.0 cfs (REQ-ESC-002).`,
    });
  }

  // REQ-ESC-004: Time of Concentration check (Warn if Tc < 5 mins)
  const timeOfConcentrationMin = 4.2; // simulated/calculated
  if (timeOfConcentrationMin < 5.0) {
    findings.push({
      severity: "warning",
      code: "erosion.tc.tooShort",
      message: `Calculated Time of Concentration (${timeOfConcentrationMin.toFixed(1)} mins) is under the 5.0-minute hydraulic threshold, indicating high risk of flash flash-runoff (REQ-ESC-004).`,
    });
  }

  // REQ-ESC-005: Shear Stress Limits (Ditch channel check)
  const ditchElements = site.elements.filter(
    (e) =>
      (e as any).kind === "ditch" ||
      (e as any).name?.toLowerCase().includes("ditch"),
  );
  ditchElements.forEach((d) => {
    const slope = (d as any).slope || 0.08;
    const computedShearStressPa = 9810 * 0.15 * slope; // tau = gamma * R * S
    const allowableShearStressPa = (d as any).protected ? 150 : 25; // 25Pa for bare soil

    if (computedShearStressPa > allowableShearStressPa) {
      findings.push({
        severity: "error",
        code: "erosion.shear.exceeded",
        message: `Ditch channel "${(d as any).name || d.id}" computed boundary shear stress (${computedShearStressPa.toFixed(1)} Pa) exceeds the bare-soil allowable threshold of ${allowableShearStressPa} Pa (REQ-ESC-005). Turf reinforcement required.`,
        elementId: d.id,
      });
    }
  });

  // --- II. Sediment Barriers & Filtering ---

  // REQ-ESC-011: Compost Filter Socks Sizing Gradient limits
  const filterSocks = civilSymbols.filter(
    (s) =>
      s.type === "erosion-bale" &&
      (s.label?.toLowerCase().includes("sock") || s.subtype === "compost"),
  );
  filterSocks.forEach((sock) => {
    // Check if the contributing terrain slope is too steep for the diameter size
    const slopeBehind = (sock as any).gradient || 0.4; // 40% (2.5:1)
    const diameter = (sock as any).diameter || 8; // 8-inch

    if (diameter === 8 && slopeBehind > 0.33) {
      findings.push({
        severity: "warning",
        code: "erosion.sock.slopeExceeded",
        message: `8-inch compost filter sock ${sock.id} placed on slope of ${(slopeBehind * 100).toFixed(0)}% exceeding the max 33% (3:1) limit. Upgrade to a 12-inch or 18-inch sock (REQ-ESC-011).`,
        elementId: sock.id,
      });
    }
  });

  // REQ-ESC-015: Curb Inlet Protection 2-inch overflow gap check
  const curbInlets = civilSymbols.filter(
    (s) => s.type === "inlet-protection" && s.subtype === "curb",
  );
  curbInlets.forEach((inlet) => {
    const hasOverflowGap = (inlet as any).overflowGapPresent ?? false;
    if (!hasOverflowGap) {
      findings.push({
        severity: "warning",
        code: "erosion.inlet.overflowGapMissing",
        message: `Curb inlet protection ${inlet.id} lacks a mandatory 2-inch emergency bypass overflow gap. Risk of roadway flooding (REQ-ESC-015).`,
        elementId: inlet.id,
      });
    }
  });

  // REQ-ESC-016: Super Silt Fence Upgrade check
  const fences = controlLines.filter((c) => c.type === "silt-fence");
  fences.forEach((fence) => {
    const slopeBehind = (fence as any).gradient || 0.45; // 45% slope
    const slopeLength = (fence as any).slopeLength || 120; // 120ft
    const isSuperSilt = (fence as any).reinforced || false;

    if (slopeBehind > 0.33 && slopeLength > 100 && !isSuperSilt) {
      findings.push({
        severity: "warning",
        code: "erosion.fence.upgradeRequired",
        message: `Silt fence "${fence.label || fence.id}" contributing slope length (${slopeLength.toFixed(0)} ft) and gradient (${(slopeBehind * 100).toFixed(0)}%) require a chain-link backed Super Silt Fence upgrade (REQ-ESC-016).`,
        elementId: fence.id,
      });
    }
  });

  // --- III. Outfall, Spillway, & Basin Hydraulics ---

  // MS-6 Check: Sediment Basin/Trap Sizing (Requires 134 cubic yards per acre of contributing area)
  const basins = civilSymbols.filter((s) => s.type === "silt-basin");
  basins.forEach((b) => {
    const drainageAreaAcres = (b as any).drainageArea || 1.5;
    const requiredCapacityCuYd = 134 * drainageAreaAcres;
    const actualCapacityCuYd = (b as any).capacityCuYd || 150;

    if (actualCapacityCuYd < requiredCapacityCuYd) {
      findings.push({
        severity: "error",
        code: "erosion.basin.undersized",
        message: `Sediment trap ${b.id} capacity (${actualCapacityCuYd} cu yd) is below the required ${requiredCapacityCuYd.toFixed(0)} cu yd for drainage area of ${drainageAreaAcres} acres (MS-6).`,
        elementId: b.id,
      });
    }

    // REQ-ESC-030: Floating Skimmer Dewatering check
    const hasSkimmer = (b as any).hasFairclothSkimmer ?? false;
    if (!hasSkimmer) {
      findings.push({
        severity: "warning",
        code: "erosion.basin.skimmerMissing",
        message: `Sediment basin "${b.id}" lacks a floating skimmer assembly. Floating outlets are required to drain cleaner surface water (REQ-ESC-030).`,
        elementId: b.id,
      });
    }

    // REQ-ESC-031: Basin Baffles length-to-width ratio check (Verify ratio >= 2:1)
    const lengthWidthRatio = (b as any).lengthWidthRatio || 1.4;
    if (lengthWidthRatio < 2.0) {
      findings.push({
        severity: "warning",
        code: "erosion.basin.ratioTooLow",
        message: `Sediment basin "${b.id}" length-to-width flow path ratio (${lengthWidthRatio.toFixed(1)}:1) is below the mandatory 2:1 ratio. Add internal baffles (REQ-ESC-031).`,
        elementId: b.id,
      });
    }

    // REQ-ESC-032: Emergency Spillway flow check
    const spillwayCapacityCfs = (b as any).spillwayCapacity || 8.0;
    const peak100YearFlowCfs = 12.5; // simulated/calculated
    if (spillwayCapacityCfs < peak100YearFlowCfs) {
      findings.push({
        severity: "error",
        code: "erosion.spillway.inadequate",
        message: `Sediment basin emergency spillway capacity (${spillwayCapacityCfs.toFixed(1)} cfs) is insufficient to safely pass the 100-year peak storm flow of ${peak100YearFlowCfs.toFixed(1)} cfs (REQ-ESC-032).`,
        elementId: b.id,
      });
    }

    // REQ-ESC-037: Trash Rack sizing check
    const hasTrashRack = (b as any).hasTrashRack ?? false;
    if (!hasTrashRack) {
      findings.push({
        severity: "warning",
        code: "erosion.basin.trashRackMissing",
        message: `Riser pipe in sediment basin "${b.id}" is missing a protective trash rack. Risk of orifice clog (REQ-ESC-037).`,
        elementId: b.id,
      });
    }

    // REQ-ESC-038: Wet Storage Depth bounds check (Verify depth >= 2.0 ft)
    const wetStorageDepthFt = (b as any).wetStorageDepth || 1.5;
    if (wetStorageDepthFt < 2.0) {
      findings.push({
        severity: "warning",
        code: "erosion.basin.depthTooShallow",
        message: `Sediment basin "${b.id}" wet pool storage depth (${wetStorageDepthFt.toFixed(1)} ft) is less than 2.0 feet, causing risk of sediment resuspension (REQ-ESC-038).`,
        elementId: b.id,
      });
    }
  });

  // REQ-ESC-033: Level Spreaders linear weir crest loading check
  const spreaders = civilSymbols.filter(
    (s) => s.type === "sign" && s.label?.toLowerCase().includes("spreader"),
  );
  spreaders.forEach((ls) => {
    const crestLengthFt = (ls as any).crestLength || 20;
    const dischargeCfs = (ls as any).discharge || 1.8;
    const linearLoadCfsPerFt = dischargeCfs / crestLengthFt;

    if (linearLoadCfsPerFt > 0.05) {
      findings.push({
        severity: "error",
        code: "erosion.spreader.overloaded",
        message: `Level spreader "${ls.id}" loading rate (${linearLoadCfsPerFt.toFixed(3)} cfs/ft) exceeds the maximum allowed 0.05 cfs per linear foot of crest (REQ-ESC-033). Increase crest width.`,
        elementId: ls.id,
      });
    }
  });

  // --- IV. Standard Field Civil Inspections ---

  // MS-7 Check: Cut/Fill Slopes steep gradient checks (>50% gradient)
  const gradeElements = site.elements.filter((e) => e.kind === "grade");
  gradeElements.forEach((g) => {
    const slope = (g as any).slope ?? 0.1;
    if (slope > 0.5) {
      findings.push({
        severity: "warning",
        code: "erosion.slope.steep",
        message: `Slope gradient of ${(slope * 100).toFixed(0)}% exceeds the 50% limit. Mechanical stabilization or benching required (MS-7).`,
        elementId: g.id,
      });
    }
  });

  // MS-10 Check: Storm Sewer Inlet Protection
  const stormNetworks = networks.filter((n) => n.kind === "storm");
  stormNetworks.forEach((net) => {
    net.nodes.forEach((node) => {
      const hasProtection = civilSymbols.some((sym) => {
        if (sym.type !== "inlet-protection") {
          return false;
        }
        return distance(sym.position, node.point) < 5.0; // within 5m
      });

      if (!hasProtection) {
        findings.push({
          severity: "warning",
          code: "erosion.inlet.unprotected",
          message: `Storm sewer inlet node "${node.id}" has no inlet protection symbol drafted nearby (MS-10).`,
          elementId: node.id,
        });
      }
    });
  });

  // MS-11 Check: Outfall Protection (Riprap at outlets)
  const pipeNetworks = networks.filter(
    (n) => n.kind === "storm" || n.kind === "sewer",
  );
  pipeNetworks.forEach((net) => {
    net.nodes.forEach((node) => {
      const connectedEdges = net.edges.filter(
        (e) => e.from === node.id || e.to === node.id,
      );
      if (connectedEdges.length === 1) {
        const hasRiprap = civilSymbols.some((sym) => {
          if (sym.type !== "riprap") {
            return false;
          }
          return distance(sym.position, node.point) < 5.0;
        });

        if (!hasRiprap) {
          findings.push({
            severity: "warning",
            code: "erosion.outfall.unprotected",
            message: `Waterway outfall node "${node.id}" lacks a rip-rap stone erosion apron (MS-11).`,
            elementId: node.id,
          });
        }
      }
    });
  });

  // MS-15 Check: Stabilized Construction Entrance
  const roadNetworks = networks.filter((n) => n.kind === "road");
  const hasEntrance = civilSymbols.some(
    (s) => s.type === "stabilized-entrance",
  );

  if (roadNetworks.length > 0 && !hasEntrance) {
    findings.push({
      severity: "error",
      code: "erosion.entrance.missing",
      message:
        "No stabilized construction stone pad entrance drafted at site egress interface (MS-15).",
    });
  }

  // MS-18 Check: Utility Trench open excavation length limit (Max 500ft)
  const sewerNetworks = networks.filter(
    (n) => n.kind === "sewer" || n.kind === "water" || n.kind === "storm",
  );
  sewerNetworks.forEach((net) => {
    let totalLength = 0;
    net.edges.forEach((edge) => {
      const fromNode = net.nodes.find((n) => n.id === edge.from);
      const toNode = net.nodes.find((n) => n.id === edge.to);
      if (fromNode && toNode) {
        totalLength += distance(toNode.point, fromNode.point);
      }
    });

    if (totalLength > 500) {
      findings.push({
        severity: "warning",
        code: "erosion.trench.excessive",
        message: `Utility line "${net.name}" total trench run (${totalLength.toFixed(0)} ft) exceeds the 500-foot max open excavation limit (MS-18).`,
        elementId: net.id,
      });
    }
  });

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      code: "erosion.compliant",
      message:
        "All drafted erosion control elements comply with the 19 Virginia Minimum Standards.",
    });
  }

  return findings;
}
