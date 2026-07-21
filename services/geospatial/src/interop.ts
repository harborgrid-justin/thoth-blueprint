import { reprojectPoints, reprojectPoint } from "./projections.js";
import {
  createId,
  type PlanElement,
  type Point,
  type Polygon,
  type RightOfWay,
  type LandUseCategory,
} from "@thoth/domain";

// GeoJSON Types
export interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point" | "LineString" | "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
  properties: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  crs?: {
    type: string;
    properties: {
      name: string;
    };
  };
}

/** Translate GeoJSON coordinates to a flat Point[] array */
function parseGeoJSONPolygon(coords: unknown): Point[] {
  const coordsList = coords as Array<Array<[number, number]>>;
  const ring = coordsList[0];
  if (!ring || ring.length === 0) {
    return [];
  }

  const points: Point[] = [];
  const first = ring[0];
  const last = ring[ring.length - 1];

  const limit =
    ring.length > 1 &&
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1]
      ? ring.length - 1
      : ring.length;

  for (let i = 0; i < limit; i++) {
    const pt = ring[i];
    if (pt) {
      points.push({ x: pt[0], y: pt[1] });
    }
  }
  return points;
}

/** Translate GeoJSON LineString coordinates to Point[] */
function parseGeoJSONLineString(coords: unknown): Point[] {
  const list = coords as Array<[number, number]>;
  return list.map(([x, y]) => ({ x, y }));
}

/** Translates GeoJSON FeatureCollection into Thoth PlanElements */
export function geojsonToElements(
  geojson: GeoJSONFeatureCollection,
  sourceCrs: string,
  projectCrs: string,
): PlanElement[] {
  const elements: PlanElement[] = [];

  for (const feature of geojson.features) {
    if (!feature.geometry) {
      continue;
    }

    const properties = feature.properties || {};
    const kind =
      (properties.kind as string) || getKindFromGeometry(feature.geometry.type);
    const name = (properties.name as string) || `${kind.toUpperCase()} Element`;
    const layerId =
      (properties.layerId as string) || getDefaultLayerForKind(kind);

    try {
      if (feature.geometry.type === "Polygon") {
        const rawBoundary = parseGeoJSONPolygon(feature.geometry.coordinates);
        const boundary = reprojectPoints(rawBoundary, sourceCrs, projectCrs);
        if (boundary.length < 3) {
          continue;
        }

        elements.push(
          buildPolygonElement(kind, name, layerId, boundary, properties),
        );
      } else if (feature.geometry.type === "LineString") {
        const rawPath = parseGeoJSONLineString(feature.geometry.coordinates);
        const path = reprojectPoints(rawPath, sourceCrs, projectCrs);
        if (path.length < 2) {
          continue;
        }

        elements.push(buildLineElement(kind, name, layerId, path, properties));
      } else if (feature.geometry.type === "Point") {
        const coords = feature.geometry.coordinates as [number, number];
        const position = reprojectPoint(
          { x: coords[0], y: coords[1] },
          sourceCrs,
          projectCrs,
        );

        elements.push(
          buildPointElement(kind, name, layerId, position, properties),
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Failed to parse GeoJSON feature:", err);
    }
  }

  return elements;
}

/** Translate Thoth PlanElements back into GeoJSON FeatureCollection */
export function elementsToGeojson(
  elements: PlanElement[],
  projectCrs: string,
  targetCrs: string,
): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = [];

  for (const el of elements) {
    let geometry: GeoJSONFeature["geometry"] | null = null;
    const properties: Record<string, unknown> = {
      id: el.id,
      kind: el.kind,
      name: "name" in el && typeof el.name === "string" ? el.name : "",
      layerId: el.layerId,
    };

    // Extract type-specific properties
    if (el.kind === "parcel" && "apn" in el) {
      properties.apn = el.apn;
    }
    if (el.kind === "zone") {
      if ("designation" in el) {
        properties.designation = el.designation;
      }
      if ("maxCoverage" in el) {
        properties.maxCoverage = el.maxCoverage;
      }
      if ("maxFar" in el) {
        properties.maxFar = el.maxFar;
      }
    }
    if (el.kind === "landuse" && "category" in el) {
      properties.category = el.category;
    }
    if (el.kind === "building") {
      if ("storeys" in el) {
        properties.storeys = el.storeys;
      }
      if ("use" in el) {
        properties.use = el.use;
      }
    }

    // Geometry translation & reprojection
    if ("boundary" in el && Array.isArray(el.boundary)) {
      const boundary = reprojectPoints(el.boundary, projectCrs, targetCrs);
      const ring = boundary.map((p) => [p.x, p.y]);
      if (ring.length > 0) {
        const first = boundary[0];
        if (first) {
          ring.push([first.x, first.y]);
        }
      }
      geometry = {
        type: "Polygon",
        coordinates: [ring],
      };
    } else if (
      "position" in el &&
      el.position &&
      typeof el.position === "object"
    ) {
      const pos = reprojectPoint(el.position as Point, projectCrs, targetCrs);
      geometry = {
        type: "Point",
        coordinates: [pos.x, pos.y],
      };
      if ("z" in el) {
        properties.z = el.z;
      }
    }

    if (geometry) {
      features.push({
        type: "Feature",
        geometry,
        properties,
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
    crs: {
      type: "name",
      properties: {
        name: `urn:ogc:def:crs:OGC:1.3:${targetCrs}`,
      },
    },
  };
}

function getKindFromGeometry(geomType: string): string {
  switch (geomType) {
    case "Polygon":
    case "MultiPolygon":
      return "parcel";
    case "LineString":
      return "row";
    case "Point":
      return "tree";
    default:
      return "parcel";
  }
}

function getDefaultLayerForKind(kind: string): string {
  switch (kind) {
    case "parcel":
      return "layer-base";
    case "zone":
      return "layer-zoning";
    case "landuse":
      return "layer-landuse";
    case "lot":
      return "layer-lots";
    case "building":
      return "layer-buildings";
    case "row":
      return "layer-row";
    case "tree":
      return "layer-landscape";
    case "spot":
      return "layer-terrain";
    default:
      return "layer-base";
  }
}

function buildPolygonElement(
  kind: string,
  name: string,
  layerId: string,
  boundary: Polygon,
  props: Record<string, unknown>,
): PlanElement {
  const id = createId(kind.slice(0, 4));
  switch (kind) {
    case "parcel":
      return {
        id,
        kind: "parcel",
        name,
        layerId,
        boundary,
        apn: (props.apn as string) || "",
      };
    case "zone":
      return {
        id,
        kind: "zone",
        name,
        layerId,
        boundary,
        designation: (props.designation as string) || "R-1",
        allowedUses: (props.allowedUses as LandUseCategory[]) || [
          "residential",
        ],
        maxCoverage: (props.maxCoverage as number) || 0.4,
        maxFar: (props.maxFar as number) || 0.8,
        maxHeight: (props.maxHeight as number) || 10,
        minSetback: (props.minSetback as number) || 3,
      };
    case "landuse":
      return {
        id,
        kind: "landuse",
        name,
        layerId,
        boundary,
        category: (props.category as LandUseCategory) || "residential",
      };
    case "lot":
      return {
        id,
        kind: "lot",
        name,
        layerId,
        boundary,
        setback: (props.setback as number) || 3,
      };
    case "building":
      return {
        id,
        kind: "building",
        name,
        layerId,
        boundary,
        storeys: (props.storeys as number) || 1,
        height: (props.height as number) || 4,
        dwellingUnits: (props.dwellingUnits as number) || 1,
        use: (props.use as LandUseCategory) || "residential",
      };
    default:
      return { id, kind: "parcel", name, layerId, boundary };
  }
}

function buildLineElement(
  kind: string,
  name: string,
  layerId: string,
  path: Point[],
  props: Record<string, unknown>,
): PlanElement {
  const id = createId(kind.slice(0, 4));
  return {
    id,
    kind: "row",
    name,
    layerId,
    boundary: path,
    width: (props.width as number) || 20,
  } as RightOfWay;
}

function buildPointElement(
  kind: string,
  _name: string,
  layerId: string,
  position: Point,
  props: Record<string, unknown>,
): PlanElement {
  const id = createId(kind.slice(0, 4));
  switch (kind) {
    case "tree":
      return {
        id,
        kind: "tree",
        layerId,
        position,
        species: (props.species as string) || "Deciduous",
        canopyRadius: (props.canopyRadius as number) || 4,
      };
    case "spot":
      return {
        id,
        kind: "spot",
        layerId,
        position,
        z: (props.z as number) || 0,
        label: (props.label as string) || `SP`,
      };
    default:
      return {
        id,
        kind: "tree",
        layerId,
        position,
        species: (props.species as string) || "Generic",
        canopyRadius: (props.canopyRadius as number) || 3,
      };
  }
}
