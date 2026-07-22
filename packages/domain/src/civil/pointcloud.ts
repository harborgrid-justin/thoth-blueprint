/**
 * Colored point-cloud interchange: parse and serialize survey/LiDAR point data
 * across the formats planners exchange — XYZ, PTS, PLY, LAS, and DXF. Pure and
 * framework-agnostic; no I/O, no rendering. Text formats round-trip through
 * strings, LAS through an ArrayBuffer.
 *
 * Coordinates are in the plan's units; RGB channels are 0–255; intensity is the
 * raw sensor value where a format carries it.
 */

import { type Bounds } from "../spatial/geometry";
import type { SpotElevationPoint } from "../spatial/primitives";
import { createId } from "../spatial/id";

import type {
  CloudPoint,
  PointCloud,
  PointCloudFormat,
  PointCloudData,
} from "./types/pointCloud";

export type { CloudPoint, PointCloud, PointCloudFormat, PointCloudData };

/** Infer a {@link PointCloudFormat} from a filename extension. */
export function pointCloudFormatFromName(
  name: string,
): PointCloudFormat | null {
  const ext = name.toLowerCase().split(".").pop();
  switch (ext) {
    case "xyz":
      return "xyz";
    case "pts":
      return "pts";
    case "ply":
      return "ply";
    case "las":
      return "las";
    case "dxf":
      return "dxf";
    default:
      return null;
  }
}

/** Whether a format is delivered as binary bytes rather than text. */
export function isBinaryPointCloudFormat(format: PointCloudFormat): boolean {
  return format === "las";
}

/** Parse point-cloud data of a given format. */
export function parsePointCloud(
  data: PointCloudData,
  format: PointCloudFormat,
): PointCloud {
  switch (format) {
    case "xyz":
      return parseXYZ(asText(data));
    case "pts":
      return parsePTS(asText(data));
    case "ply":
      return parsePLY(data);
    case "las":
      return parseLAS(asBuffer(data));
    case "dxf":
      return parseDXF(asText(data));
  }
}

/** Serialize a point cloud to a given format. */
export function serializePointCloud(
  cloud: PointCloud,
  format: PointCloudFormat,
): PointCloudData {
  switch (format) {
    case "xyz":
      return writeXYZ(cloud);
    case "pts":
      return writePTS(cloud);
    case "ply":
      return writePLY(cloud);
    case "las":
      return writeLAS(cloud);
    case "dxf":
      return writeDXF(cloud);
  }
}

// ---------------------------------------------------------------------------
// XYZ — whitespace-separated "x y z [r g b]" or "x y z [intensity]"
// ---------------------------------------------------------------------------

export function parseXYZ(text: string): PointCloud {
  const points: CloudPoint[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      continue;
    }
    const t = line.split(/[\s,]+/).map(Number);
    if (t.length < 3 || t.slice(0, 3).some(Number.isNaN)) {
      continue;
    }
    const p: CloudPoint = { x: t[0], y: t[1], z: t[2] };
    if (t.length >= 6) {
      p.r = clampByte(t[3]);
      p.g = clampByte(t[4]);
      p.b = clampByte(t[5]);
    } else if (t.length === 4) {
      p.intensity = t[3];
    }
    points.push(p);
  }
  return { points };
}

export function writeXYZ(cloud: PointCloud): string {
  return cloud.points
    .map((p) => {
      const hasColor = p.r != null && p.g != null && p.b != null;
      return hasColor
        ? `${num(p.x)} ${num(p.y)} ${num(p.z)} ${p.r} ${p.g} ${p.b}`
        : `${num(p.x)} ${num(p.y)} ${num(p.z)}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// PTS — first line is the point count, then "x y z [intensity] [r g b]"
// ---------------------------------------------------------------------------

export function parsePTS(text: string): PointCloud {
  const lines = text.split(/\r?\n/);
  const points: CloudPoint[] = [];
  let start = 0;
  // A lone integer on the first non-empty line is the count header.
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) {
      continue;
    }
    if (/^\d+$/.test(l)) {
      start = i + 1;
    }
    break;
  }
  for (let i = start; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) {
      continue;
    }
    const t = l.split(/[\s,]+/).map(Number);
    if (t.length < 3 || t.slice(0, 3).some(Number.isNaN)) {
      continue;
    }
    const p: CloudPoint = { x: t[0], y: t[1], z: t[2] };
    if (t.length >= 4) {
      p.intensity = t[3];
    }
    if (t.length >= 7) {
      p.r = clampByte(t[4]);
      p.g = clampByte(t[5]);
      p.b = clampByte(t[6]);
    }
    points.push(p);
  }
  return { points };
}

export function writePTS(cloud: PointCloud): string {
  const header = String(cloud.points.length);
  const body = cloud.points.map((p) => {
    const intensity = p.intensity ?? 0;
    const r = p.r ?? 255;
    const g = p.g ?? 255;
    const b = p.b ?? 255;
    return `${num(p.x)} ${num(p.y)} ${num(p.z)} ${intensity} ${r} ${g} ${b}`;
  });
  return [header, ...body].join("\n");
}

// ---------------------------------------------------------------------------
// PLY — Stanford format, ascii and binary_little_endian
// ---------------------------------------------------------------------------

interface PlyProperty {
  name: string;
  type: string;
}

export function parsePLY(data: PointCloudData): PointCloud {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data);
  // Read the ascii header up to and including "end_header\n".
  const headerEnd = indexOfSubarray(
    bytes,
    new TextEncoder().encode("end_header"),
  );
  if (headerEnd < 0) {
    throw new Error("PLY: missing end_header");
  }
  let cursor = headerEnd + "end_header".length;
  while (cursor < bytes.length && bytes[cursor] !== 0x0a) {
    cursor++;
  }
  cursor++; // past the newline
  const headerText = new TextDecoder().decode(bytes.subarray(0, headerEnd));

  let format = "ascii";
  let vertexCount = 0;
  const props: PlyProperty[] = [];
  let inVertex = false;
  for (const line of headerText.split(/\r?\n/)) {
    const t = line.trim().split(/\s+/);
    if (t[0] === "format") {
      format = t[1];
    } else if (t[0] === "element") {
      inVertex = t[1] === "vertex";
      if (inVertex) {
        vertexCount = Number(t[2]);
      }
    } else if (t[0] === "property" && inVertex) {
      props.push({ type: t[1], name: t[t.length - 1] });
    }
  }

  const points: CloudPoint[] = [];
  if (format === "ascii") {
    const bodyLines = new TextDecoder()
      .decode(bytes.subarray(cursor))
      .split(/\r?\n/)
      .filter((l) => l.trim());
    for (let i = 0; i < vertexCount && i < bodyLines.length; i++) {
      const t = bodyLines[i].trim().split(/\s+/).map(Number);
      points.push(plyPointFromValues(props, t));
    }
  } else {
    const little = format.includes("little");
    const view = new DataView(bytes.buffer, bytes.byteOffset + cursor);
    let off = 0;
    for (let i = 0; i < vertexCount; i++) {
      const values: number[] = [];
      for (const prop of props) {
        const [val, size] = readPlyScalar(view, off, prop.type, little);
        values.push(val);
        off += size;
      }
      points.push(plyPointFromValues(props, values));
    }
  }
  return { points };
}

function plyPointFromValues(
  props: PlyProperty[],
  values: number[],
): CloudPoint {
  const p: CloudPoint = { x: 0, y: 0, z: 0 };
  props.forEach((prop, i) => {
    const v = values[i];
    switch (prop.name) {
      case "x":
        p.x = v;
        break;
      case "y":
        p.y = v;
        break;
      case "z":
        p.z = v;
        break;
      case "red":
        p.r = clampByte(v);
        break;
      case "green":
        p.g = clampByte(v);
        break;
      case "blue":
        p.b = clampByte(v);
        break;
      case "intensity":
      case "scalar_intensity":
        p.intensity = v;
        break;
    }
  });
  return p;
}

function readPlyScalar(
  view: DataView,
  off: number,
  type: string,
  le: boolean,
): [number, number] {
  switch (type) {
    case "char":
    case "int8":
      return [view.getInt8(off), 1];
    case "uchar":
    case "uint8":
      return [view.getUint8(off), 1];
    case "short":
    case "int16":
      return [view.getInt16(off, le), 2];
    case "ushort":
    case "uint16":
      return [view.getUint16(off, le), 2];
    case "int":
    case "int32":
      return [view.getInt32(off, le), 4];
    case "uint":
    case "uint32":
      return [view.getUint32(off, le), 4];
    case "float":
    case "float32":
      return [view.getFloat32(off, le), 4];
    case "double":
    case "float64":
      return [view.getFloat64(off, le), 8];
    default:
      throw new Error(`PLY: unsupported property type ${type}`);
  }
}

export function writePLY(cloud: PointCloud): string {
  const n = cloud.points.length;
  const header = [
    "ply",
    "format ascii 1.0",
    "comment Thoth Blueprint point cloud",
    `element vertex ${n}`,
    "property float x",
    "property float y",
    "property float z",
    "property uchar red",
    "property uchar green",
    "property uchar blue",
    "end_header",
  ];
  const body = cloud.points.map(
    (p) =>
      `${num(p.x)} ${num(p.y)} ${num(p.z)} ${p.r ?? 255} ${p.g ?? 255} ${p.b ?? 255}`,
  );
  return [...header, ...body].join("\n");
}

// ---------------------------------------------------------------------------
// LAS — ASPRS LiDAR binary (reads point formats 0–3; writes format 2 w/ RGB)
// ---------------------------------------------------------------------------

const LAS_HEADER_SIZE = 227; // LAS 1.2 public header block

export function parseLAS(buffer: ArrayBuffer): PointCloud {
  const byteOffset = (buffer as { byteOffset?: number }).byteOffset ?? 0;
  const byteLength = buffer.byteLength;
  const view = new DataView(buffer, byteOffset, byteLength);
  const signature = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (signature !== "LASF") {
    throw new Error("LAS: bad signature");
  }

  const offsetToPointData = view.getUint32(96, true);
  const pointFormat = view.getUint8(104);
  const recordLength = view.getUint16(105, true);
  const pointCount = view.getUint32(107, true);
  const scaleX = view.getFloat64(131, true);
  const scaleY = view.getFloat64(139, true);
  const scaleZ = view.getFloat64(147, true);
  const offX = view.getFloat64(155, true);
  const offY = view.getFloat64(163, true);
  const offZ = view.getFloat64(171, true);

  // Byte offset of the RGB triple within a record, by point format (−1 = none).
  const colorOffset = pointFormat === 2 ? 20 : pointFormat === 3 ? 28 : -1;

  const points: CloudPoint[] = [];
  for (let i = 0; i < pointCount; i++) {
    const base = offsetToPointData + i * recordLength;
    if (base + recordLength > buffer.byteLength) {
      break;
    }
    const p: CloudPoint = {
      x: view.getInt32(base, true) * scaleX + offX,
      y: view.getInt32(base + 4, true) * scaleY + offY,
      z: view.getInt32(base + 8, true) * scaleZ + offZ,
      intensity: view.getUint16(base + 12, true),
    };
    if (colorOffset >= 0) {
      const red = view.getUint16(base + colorOffset, true);
      const green = view.getUint16(base + colorOffset + 2, true);
      const blue = view.getUint16(base + colorOffset + 4, true);
      const scale16 = red > 255 || green > 255 || blue > 255;
      p.r = clampByte(scale16 ? red / 257 : red);
      p.g = clampByte(scale16 ? green / 257 : green);
      p.b = clampByte(scale16 ? blue / 257 : blue);
    }
    points.push(p);
  }
  return { points };
}

export function writeLAS(cloud: PointCloud): ArrayBuffer {
  const pts = cloud.points;
  const recordLength = 26; // point format 2
  const total = LAS_HEADER_SIZE + pts.length * recordLength;
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);

  const b = pointCloudBounds(cloud);
  const zr = pointCloudElevationRange(cloud);
  const scale = 0.001;
  const offX = b.minX;
  const offY = b.minY;
  const offZ = zr.min;

  // Public header block.
  view.setUint8(0, 0x4c); // L
  view.setUint8(1, 0x41); // A
  view.setUint8(2, 0x53); // S
  view.setUint8(3, 0x46); // F
  view.setUint8(24, 1); // version major
  view.setUint8(25, 2); // version minor
  writeAscii(view, 26, "Thoth Blueprint", 32); // system id
  writeAscii(view, 58, "Thoth Blueprint", 32); // generating software
  view.setUint16(94, LAS_HEADER_SIZE, true); // header size
  view.setUint32(96, LAS_HEADER_SIZE, true); // offset to point data
  view.setUint32(100, 0, true); // number of VLRs
  view.setUint8(104, 2); // point data record format
  view.setUint16(105, recordLength, true);
  view.setUint32(107, pts.length, true); // legacy point count
  view.setFloat64(131, scale, true);
  view.setFloat64(139, scale, true);
  view.setFloat64(147, scale, true);
  view.setFloat64(155, offX, true);
  view.setFloat64(163, offY, true);
  view.setFloat64(171, offZ, true);
  view.setFloat64(179, b.maxX, true);
  view.setFloat64(187, b.minX, true);
  view.setFloat64(195, b.maxY, true);
  view.setFloat64(203, b.minY, true);
  view.setFloat64(211, zr.max, true);
  view.setFloat64(219, zr.min, true);

  let off = LAS_HEADER_SIZE;
  for (const p of pts) {
    view.setInt32(off, Math.round((p.x - offX) / scale), true);
    view.setInt32(off + 4, Math.round((p.y - offY) / scale), true);
    view.setInt32(off + 8, Math.round((p.z - offZ) / scale), true);
    view.setUint16(off + 12, clampU16(p.intensity ?? 0), true);
    view.setUint8(off + 14, 0); // return bits
    view.setUint8(off + 15, 0); // classification
    view.setInt8(off + 16, 0); // scan angle
    view.setUint8(off + 17, 0); // user data
    view.setUint16(off + 18, 0, true); // point source id
    view.setUint16(off + 20, (p.r ?? 255) * 257, true);
    view.setUint16(off + 22, (p.g ?? 255) * 257, true);
    view.setUint16(off + 24, (p.b ?? 255) * 257, true);
    off += recordLength;
  }
  return buffer;
}

function writeAscii(
  view: DataView,
  offset: number,
  text: string,
  length: number,
) {
  for (let i = 0; i < length; i++) {
    view.setUint8(offset + i, i < text.length ? text.charCodeAt(i) : 0);
  }
}

function clampU16(v: number): number {
  return Math.max(0, Math.min(65535, Math.round(v)));
}

// ---------------------------------------------------------------------------
// DXF — CAD interchange; POINT entities with true-color (group code 420)
// ---------------------------------------------------------------------------

export function parseDXF(text: string): PointCloud {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const points: CloudPoint[] = [];
  let current: CloudPoint | null = null;
  const flush = () => {
    if (current) {
      points.push(current);
    }
    current = null;
  };

  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i]);
    const value = lines[i + 1];
    if (Number.isNaN(code)) {
      continue;
    }
    if (code === 0) {
      flush();
      if (value === "POINT") {
        current = { x: 0, y: 0, z: 0 };
      }
    } else if (current) {
      const v = Number(value);
      switch (code) {
        case 10:
          current.x = v;
          break;
        case 20:
          current.y = v;
          break;
        case 30:
          current.z = v;
          break;
        case 62:
          Object.assign(current, aciToRgb(v));
          break;
        case 420: {
          current.r = (v >> 16) & 0xff;
          current.g = (v >> 8) & 0xff;
          current.b = v & 0xff;
          break;
        }
      }
    }
  }
  flush();
  return { points };
}

export function writeDXF(cloud: PointCloud): string {
  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  for (const p of cloud.points) {
    out.push("0", "POINT", "8", "PointCloud");
    out.push("10", num(p.x), "20", num(p.y), "30", num(p.z));
    if (p.r != null && p.g != null && p.b != null) {
      out.push(
        "420",
        String(((p.r & 0xff) << 16) | ((p.g & 0xff) << 8) | (p.b & 0xff)),
      );
    }
  }
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n");
}

/** A tiny AutoCAD Color Index → RGB map for the common indices. */
function aciToRgb(index: number): { r: number; g: number; b: number } {
  const table: Record<number, [number, number, number]> = {
    1: [255, 0, 0],
    2: [255, 255, 0],
    3: [0, 255, 0],
    4: [0, 255, 255],
    5: [0, 0, 255],
    6: [255, 0, 255],
    7: [255, 255, 255],
    8: [128, 128, 128],
    9: [192, 192, 192],
  };
  const [r, g, b] = table[index] ?? [255, 255, 255];
  return { r, g, b };
}

// ---------------------------------------------------------------------------
// Helpers shared below
// ---------------------------------------------------------------------------

function asText(data: PointCloudData): string {
  return typeof data === "string"
    ? data
    : new TextDecoder().decode(new Uint8Array(data));
}

function asBuffer(data: PointCloudData): ArrayBuffer {
  if (typeof data !== "string") {
    return data;
  }
  return new TextEncoder().encode(data).buffer;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function num(v: number): string {
  return Number.isInteger(v)
    ? String(v)
    : v.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function indexOfSubarray(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        continue outer;
      }
    }
    return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Cloud helpers
// ---------------------------------------------------------------------------

/** Bounding box of a cloud's XY footprint. */
export function pointCloudBounds(cloud: PointCloud): Bounds {
  if (cloud.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < cloud.points.length; i++) {
    const p = cloud.points[i];
    if (p.x < minX) {
      minX = p.x;
    }
    if (p.y < minY) {
      minY = p.y;
    }
    if (p.x > maxX) {
      maxX = p.x;
    }
    if (p.y > maxY) {
      maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

/** Elevation range of a cloud. */
export function pointCloudElevationRange(cloud: PointCloud): {
  min: number;
  max: number;
} {
  let min = Infinity;
  let max = -Infinity;
  for (const p of cloud.points) {
    if (p.z < min) {
      min = p.z;
    }
    if (p.z > max) {
      max = p.z;
    }
  }
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0,
  };
}

/**
 * Voxel-downsample a cloud to at most one point per `cellSize` XY grid cell,
 * keeping the first point encountered. Useful before rendering a dense scan.
 */
export function downsamplePointCloud(
  cloud: PointCloud,
  cellSize: number,
): PointCloud {
  if (cellSize <= 0) {
    return cloud;
  }
  const seen = new Set<string>();
  const points: CloudPoint[] = [];
  for (const p of cloud.points) {
    const key = `${Math.floor(p.x / cellSize)}:${Math.floor(p.y / cellSize)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    points.push(p);
  }
  return { points };
}

/** Convert a cloud into spot-elevation planning elements on a layer. */
export function pointCloudToSpots(
  cloud: PointCloud,
  layerId: string,
): SpotElevationPoint[] {
  return cloud.points.map((p, i) => ({
    id: createId("spot"),
    kind: "spot",
    layerId,
    position: { x: p.x, y: p.y },
    z: p.z,
    label: `PC${i + 1}`,
  }));
}

/** Build a cloud from spot elevations (inverse of {@link pointCloudToSpots}). */
export function spotsToPointCloud(spots: SpotElevationPoint[]): PointCloud {
  return {
    points: spots.map((s) => ({ x: s.position.x, y: s.position.y, z: s.z })),
  };
}
