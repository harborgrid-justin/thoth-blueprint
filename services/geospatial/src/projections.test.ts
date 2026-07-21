import { describe, it, expect } from "vitest";
import { reprojectPoint } from "./projections.js";
import {
  geojsonToElements,
  elementsToGeojson,
  type GeoJSONFeatureCollection,
} from "./interop.js";
import type { PlanElement } from "@thoth/domain";

describe("Geospatial Projections Engine", () => {
  it("should reproject longitude/latitude (EPSG:4326) to Web Mercator (EPSG:3857)", () => {
    // Prime meridian at equator
    const origin = { x: 0, y: 0 };
    const mercOrigin = reprojectPoint(origin, "EPSG:4326", "EPSG:3857");

    expect(mercOrigin.x).toBeCloseTo(0, 1);
    expect(mercOrigin.y).toBeCloseTo(0, 1);

    // San Francisco coords (~ 122.4194 W, 37.7749 N)
    const sf = { x: -122.4194, y: 37.7749 };
    const sfMerc = reprojectPoint(sf, "EPSG:4326", "EPSG:3857");

    expect(sfMerc.x).toBeCloseTo(-13627665.3, 0);
    expect(sfMerc.y).toBeCloseTo(4547675.4, 0);
  });

  it("should support UTM Zones (EPSG:26910) reprojections", () => {
    // San Francisco coords (~ 122.4194 W, 37.7749 N)
    const sf = { x: -122.4194, y: 37.7749 };
    const sfUtm = reprojectPoint(sf, "EPSG:4326", "EPSG:26910");

    // UTM Zone 10N coordinates for SF
    expect(sfUtm.x).toBeCloseTo(551130.8, 0);
    expect(sfUtm.y).toBeCloseTo(4180998.9, 0);
  });
});

describe("Geospatial GeoJSON Translation", () => {
  it("should translate GeoJSON Polygon to a Thoth Parcel element", () => {
    const geojson: GeoJSONFeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-122.4, 37.7],
                [-122.3, 37.7],
                [-122.3, 37.8],
                [-122.4, 37.8],
                [-122.4, 37.7], // Closed loop
              ],
            ],
          },
          properties: {
            kind: "parcel",
            name: "San Francisco Block A",
            apn: "999-88-77",
          },
        },
      ],
    };

    const elements = geojsonToElements(geojson, "EPSG:4326", "EPSG:3857");
    expect(elements.length).toBe(1);

    const el = elements[0];
    expect(el.kind).toBe("parcel");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((el as any).name).toBe("San Francisco Block A");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((el as any).apn).toBe("999-88-77");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const boundary = (el as any).boundary;
    expect(boundary.length).toBe(4); // The duplicate end point is removed
    expect(boundary[0].x).toBeCloseTo(-13625505.7, 0);
    expect(boundary[0].y).toBeCloseTo(4537132.1, 0);
  });

  it("should export Thoth elements to GeoJSON feature collection", () => {
    const elements: PlanElement[] = [
      {
        id: "proj-123",
        kind: "parcel",
        name: "SF Test Parcel",
        layerId: "layer-base",
        boundary: [
          { x: -13625460.3, y: 4537845.5 },
          { x: -13614328.7, y: 4537845.5 },
          { x: -13614328.7, y: 4551877.8 },
          { x: -13625460.3, y: 4551877.8 },
        ],
        apn: "111-22-33",
      },
    ];

    const geojson = elementsToGeojson(elements, "EPSG:3857", "EPSG:4326");
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBe(1);

    const f = geojson.features[0];
    expect(f.geometry.type).toBe("Polygon");
    expect(f.properties.kind).toBe("parcel");
    expect(f.properties.name).toBe("SF Test Parcel");
    expect(f.properties.apn).toBe("111-22-33");

    const rings = f.geometry.coordinates as number[][][];
    expect(rings[0].length).toBe(5); // Repeated end point to close the ring
    const firstPoint = rings[0][0];
    expect(firstPoint).toBeDefined();
    expect(firstPoint![0]).toBeCloseTo(-122.4, 2);
    expect(firstPoint![1]).toBeCloseTo(37.705, 3);
  });
});
