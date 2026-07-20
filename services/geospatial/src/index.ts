import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { reprojectPoints, reprojectPoint } from "./projections.js";
import { geojsonToElements, elementsToGeojson } from "./interop.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(morgan("dev"));

// 1. Reproject coordinates endpoint
app.post("/api/geospatial/reproject", (req, res) => {
  const { geometry, fromCrs, toCrs } = req.body;
  if (!geometry || !fromCrs || !toCrs) {
    return res.status(400).json({ error: "Missing parameters: geometry, fromCrs, or toCrs" });
  }

  try {
    if (Array.isArray(geometry)) {
      const result = reprojectPoints(geometry, fromCrs, toCrs);
      return res.json({ geometry: result });
    } else if (typeof geometry === "object" && "x" in geometry && "y" in geometry) {
      const result = reprojectPoint(geometry, fromCrs, toCrs);
      return res.json({ geometry: result });
    } else {
      return res.status(400).json({ error: "Invalid geometry format. Must be a Point or Point[]" });
    }
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// 2. Import GeoJSON
app.post("/api/geospatial/import", (req, res) => {
  const { geojson, sourceCrs, projectCrs } = req.body;
  if (!geojson || !projectCrs) {
    return res.status(400).json({ error: "Missing parameters: geojson or projectCrs" });
  }

  try {
    // Try to auto-detect source CRS from the GeoJSON URN/properties if not explicitly provided
    let detectedCrs = sourceCrs || "EPSG:4326";
    if (!sourceCrs && geojson.crs?.properties?.name) {
      const name: string = geojson.crs.properties.name;
      // e.g. urn:ogc:def:crs:OGC:1.3:EPSG:3857 or EPSG:3857
      const match = name.match(/EPSG:\d+/i);
      if (match) {
        detectedCrs = match[0].toUpperCase();
      }
    }

    const elements = geojsonToElements(geojson, detectedCrs, projectCrs);
    return res.json({ elements });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// 3. Export to GeoJSON
app.post("/api/geospatial/export", (req, res) => {
  const { elements, projectCrs, targetCrs } = req.body;
  if (!elements || !projectCrs) {
    return res.status(400).json({ error: "Missing parameters: elements or projectCrs" });
  }

  try {
    const geojson = elementsToGeojson(elements, projectCrs, targetCrs || "EPSG:4326");
    return res.json(geojson);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[geospatial-service] Server running at http://localhost:${PORT}`);
});
