import { describe, expect, it } from "vitest";
import { defaultSpatialContext } from "../../spatial/spatial";
import {
  connectedComponents,
  corridorArea,
  isConnected,
  junctions,
  networkFromPath,
  networkLength,
  serviceCoverage,
  type InfrastructureNetwork,
} from "../network";

const spatial = defaultSpatialContext();

let counter = 0;
const makeId = () => `n${counter++}`;

describe("networkFromPath", () => {
  it("chains a path into nodes and edges", () => {
    counter = 0;
    const net = networkFromPath(
      "net1",
      "Main St",
      "road",
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      makeId,
      { roadClass: "collector", width: 20 },
    );
    expect(net.nodes).toHaveLength(3);
    expect(net.edges).toHaveLength(2);
    expect(networkLength(net, spatial).meters).toBeCloseTo(200);
    expect(corridorArea(net)).toBeCloseTo(200 * 20);
    expect(isConnected(net)).toBe(true);
  });
});

describe("topology", () => {
  it("identifies intersections and dead ends", () => {
    // A + shaped network: center node with 4 spokes.
    const net: InfrastructureNetwork = {
      id: "x",
      name: "Cross",
      kind: "road",
      nodes: [
        { id: "c", point: { x: 0, y: 0 } },
        { id: "n", point: { x: 0, y: -10 } },
        { id: "s", point: { x: 0, y: 10 } },
        { id: "e", point: { x: 10, y: 0 } },
        { id: "w", point: { x: -10, y: 0 } },
      ],
      edges: [
        { id: "1", from: "c", to: "n" },
        { id: "2", from: "c", to: "s" },
        { id: "3", from: "c", to: "e" },
        { id: "4", from: "c", to: "w" },
      ],
    };
    const j = junctions(net);
    expect(j.intersections.map((n) => n.id)).toEqual(["c"]);
    expect(j.deadEnds.map((n) => n.id).sort()).toEqual(["e", "n", "s", "w"]);
    expect(connectedComponents(net)).toBe(1);
  });

  it("counts disconnected components", () => {
    const net: InfrastructureNetwork = {
      id: "d",
      name: "Split",
      kind: "water",
      nodes: [
        { id: "a", point: { x: 0, y: 0 } },
        { id: "b", point: { x: 1, y: 0 } },
        { id: "c", point: { x: 5, y: 5 } },
        { id: "d", point: { x: 6, y: 5 } },
      ],
      edges: [
        { id: "1", from: "a", to: "b" },
        { id: "2", from: "c", to: "d" },
      ],
    };
    expect(connectedComponents(net)).toBe(2);
    expect(isConnected(net)).toBe(false);
  });
});

describe("service coverage", () => {
  it("measures the fraction of points near the network", () => {
    counter = 0;
    const net = networkFromPath(
      "s",
      "Main",
      "sewer",
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      makeId,
    );
    const points = [
      { x: 50, y: 5 }, // 5 away — served
      { x: 50, y: 40 }, // 40 away — not served
    ];
    expect(serviceCoverage(net, points, 10)).toBeCloseTo(0.5);
    expect(serviceCoverage(net, points, 50)).toBeCloseTo(1);
  });
});
