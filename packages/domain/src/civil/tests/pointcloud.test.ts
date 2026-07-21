import { describe, expect, it } from "vitest";
import {
  downsamplePointCloud,
  parseDXF,
  parseLAS,
  parsePLY,
  parsePTS,
  parseXYZ,
  parsePointCloud,
  pointCloudFormatFromName,
  pointCloudToSpots,
  serializePointCloud,
  writeDXF,
  writeLAS,
  writePLY,
  writePTS,
  writeXYZ,
  type PointCloud,
} from "../pointcloud";

const cloud: PointCloud = {
  points: [
    { x: 0, y: 0, z: 1.5, r: 255, g: 0, b: 0, intensity: 100 },
    { x: 10.25, y: -3.5, z: 2.75, r: 0, g: 128, b: 64, intensity: 200 },
    { x: 5, y: 5, z: 0.25, r: 10, g: 20, b: 30, intensity: 50 },
  ],
};

function expectClose(a: PointCloud, b: PointCloud, tol = 1e-3) {
  expect(a.points).toHaveLength(b.points.length);
  a.points.forEach((p, i) => {
    const q = b.points[i];
    expect(p.x).toBeCloseTo(q.x, 2);
    expect(p.y).toBeCloseTo(q.y, 2);
    expect(p.z).toBeCloseTo(q.z, 2);
    if (q.r != null) {
      expect(p.r).toBe(q.r);
      expect(p.g).toBe(q.g);
      expect(p.b).toBe(q.b);
    }
    void tol;
  });
}

describe("format detection", () => {
  it("maps extensions to formats", () => {
    expect(pointCloudFormatFromName("scan.LAS")).toBe("las");
    expect(pointCloudFormatFromName("a/b/c.ply")).toBe("ply");
    expect(pointCloudFormatFromName("nope.txt")).toBeNull();
  });
});

describe("XYZ round-trip", () => {
  it("preserves coordinates and color", () => {
    expectClose(parseXYZ(writeXYZ(cloud)), cloud);
  });
  it("ignores comments and blank lines", () => {
    const parsed = parseXYZ("# header\n1 2 3 255 255 255\n\n4 5 6 0 0 0\n");
    expect(parsed.points).toHaveLength(2);
  });
});

describe("PTS round-trip", () => {
  it("writes a count header and preserves color + intensity", () => {
    const text = writePTS(cloud);
    expect(text.split("\n")[0]).toBe("3");
    const parsed = parsePTS(text);
    expectClose(parsed, cloud);
    expect(parsed.points[0].intensity).toBe(100);
  });
});

describe("PLY round-trip (ascii)", () => {
  it("preserves coordinates and color", () => {
    const text = writePLY(cloud);
    expect(text.startsWith("ply")).toBe(true);
    expectClose(parsePLY(text), cloud);
  });
});

describe("PLY binary parsing", () => {
  it("reads a hand-built little-endian buffer", () => {
    const header =
      "ply\nformat binary_little_endian 1.0\nelement vertex 1\n" +
      "property float x\nproperty float y\nproperty float z\n" +
      "property uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n";
    const headerBytes = new TextEncoder().encode(header);
    const body = new ArrayBuffer(15);
    const dv = new DataView(body);
    dv.setFloat32(0, 1.5, true);
    dv.setFloat32(4, -2.5, true);
    dv.setFloat32(8, 3.5, true);
    dv.setUint8(12, 200);
    dv.setUint8(13, 100);
    dv.setUint8(14, 50);
    const buf = new Uint8Array(headerBytes.length + 15);
    buf.set(headerBytes, 0);
    buf.set(new Uint8Array(body), headerBytes.length);
    const parsed = parsePLY(buf.buffer);
    expect(parsed.points[0]).toMatchObject({ x: 1.5, y: -2.5, z: 3.5, r: 200, g: 100, b: 50 });
  });
});

describe("LAS round-trip (binary)", () => {
  it("preserves coordinates and color through write/read", () => {
    const buffer = writeLAS(cloud);
    expect(buffer.byteLength).toBe(227 + 3 * 26);
    const parsed = parseLAS(buffer);
    expectClose(parsed, cloud);
  });

  it("has a valid LASF signature", () => {
    const bytes = new Uint8Array(writeLAS(cloud));
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("LASF");
  });
});

describe("DXF round-trip", () => {
  it("preserves points and true color", () => {
    const text = writeDXF(cloud);
    expect(text).toContain("POINT");
    expectClose(parseDXF(text), cloud);
  });
});

describe("generic dispatch & helpers", () => {
  it("dispatches by format", () => {
    const text = serializePointCloud(cloud, "xyz") as string;
    expectClose(parsePointCloud(text, "xyz"), cloud);
  });

  it("downsamples to one point per cell", () => {
    const dense: PointCloud = {
      points: [
        { x: 0.1, y: 0.1, z: 0 },
        { x: 0.2, y: 0.2, z: 0 },
        { x: 5, y: 5, z: 0 },
      ],
    };
    expect(downsamplePointCloud(dense, 1).points).toHaveLength(2);
  });

  it("converts to spot elevations", () => {
    const spots = pointCloudToSpots(cloud, "layer-terrain");
    expect(spots).toHaveLength(3);
    expect(spots[0]).toMatchObject({ kind: "spot", z: 1.5 });
    expect(spots[0].position).toEqual({ x: 0, y: 0 });
  });
});
