import proj4 from "proj4";
import type { Point, Bounds } from "@thoth/domain";

// Registry of common projections used in civil engineering and municipal planning
const PROJECTION_DEFS: Record<string, string> = {
  // WGS84 Geographic Lat/Lon
  "EPSG:4326": "+proj=longlat +datum=WGS84 +no_defs",
  // Web Mercator (standard web map tiles)
  "EPSG:3857":
    "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs",

  // NAD83 UTM Zones (common in North America, units = meters)
  "EPSG:26910": "+proj=utm +zone=10 +datum=NAD83 +units=m +no_defs",
  "EPSG:26911": "+proj=utm +zone=11 +datum=NAD83 +units=m +no_defs",
  "EPSG:26912": "+proj=utm +zone=12 +datum=NAD83 +units=m +no_defs",
  "EPSG:26913": "+proj=utm +zone=13 +datum=NAD83 +units=m +no_defs",
  "EPSG:26914": "+proj=utm +zone=14 +datum=NAD83 +units=m +no_defs",
  "EPSG:26915": "+proj=utm +zone=15 +datum=NAD83 +units=m +no_defs",
  "EPSG:26916": "+proj=utm +zone=16 +datum=NAD83 +units=m +no_defs",
  "EPSG:26917": "+proj=utm +zone=17 +datum=NAD83 +units=m +no_defs",
  "EPSG:26918": "+proj=utm +zone=18 +datum=NAD83 +units=m +no_defs",

  // NAD83 California State Plane Zones (common in municipal plans, units = US Survey feet)
  "EPSG:2225":
    "+proj=lcc +lat_1=41.66666666666666 +lat_2=40 +lat_0=39.33333333333334 +lon_0=-122 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs",
  "EPSG:2226":
    "+proj=lcc +lat_1=39.83333333333334 +lat_2=38.33333333333334 +lat_0=37.66666666666666 +lon_0=-122 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs",
  "EPSG:2227":
    "+proj=lcc +lat_1=38.43333333333333 +lat_2=37.06666666666667 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs",
  "EPSG:2228":
    "+proj=lcc +lat_1=36 +lat_2=34.03333333333333 +lat_0=34.75 +lon_0=-119 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs",
  "EPSG:2229":
    "+proj=lcc +lat_1=34.63333333333333 +lat_2=32.78333333333333 +lat_0=34.08333333333334 +lon_0=-118.25 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs",
};

// Initialize proj4 definitions
export function registerProjections(): void {
  // Proj4 has EPSG:4326 and EPSG:3857 built-in sometimes, but let's register all to be explicit
  for (const [code, def] of Object.entries(PROJECTION_DEFS)) {
    proj4.defs(code, def);
  }
}

// Call registration immediately on import
registerProjections();

/** Resolve a projection string. Returns WGS84 def if not found. */
export function getProjectionDef(crs: string): string {
  const norm = crs.toUpperCase().trim();
  if (PROJECTION_DEFS[norm]) {
    return PROJECTION_DEFS[norm]!;
  }
  // Try fallback logic or assume standard proj4 string
  if (norm.startsWith("+PROJ=")) {
    return crs;
  }

  // Return default WGS84
  return PROJECTION_DEFS["EPSG:4326"]!;
}

/** Reproject a single coordinate point {x, y} */
export function reprojectPoint(
  point: Point,
  fromCrs: string,
  toCrs: string,
): Point {
  const fromDef = getProjectionDef(fromCrs);
  const toDef = getProjectionDef(toCrs);

  if (fromDef === toDef) {
    return { ...point };
  }

  // proj4 takes [x, y] or [lng, lat]
  const [rx, ry] = proj4(fromDef, toDef, [point.x, point.y]);
  return { x: rx, y: ry };
}

/** Reproject a polyline/polygon array of points */
export function reprojectPoints(
  points: Point[],
  fromCrs: string,
  toCrs: string,
): Point[] {
  const fromDef = getProjectionDef(fromCrs);
  const toDef = getProjectionDef(toCrs);

  if (fromDef === toDef) {
    return points.map((p) => ({ ...p }));
  }

  const transformer = proj4(fromDef, toDef);
  return points.map((p) => {
    const [rx, ry] = transformer.forward([p.x, p.y]);
    return { x: rx, y: ry };
  });
}

/** Reproject bounding box bounds */
export function reprojectBounds(
  bounds: Bounds,
  fromCrs: string,
  toCrs: string,
): Bounds {
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];

  const reprojected = reprojectPoints(corners, fromCrs, toCrs);
  const xs = reprojected.map((p) => p.x);
  const ys = reprojected.map((p) => p.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}
