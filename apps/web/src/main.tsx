import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./theme/theme-provider";
import { registerDefaultGeoidPlugins } from "@thoth/domain";
import { initGeometryWasm } from "./lib/geometryWasm";
import "./index.css";

// Initialize local code standards globally
registerDefaultGeoidPlugins();

// Kick off loading the WASM geometry core in the background. Deliberately
// not awaited: nothing should block first paint on a wasm fetch. Call sites
// (e.g. PlatDrawing.tsx's centroidPreferWasm) fall back to the TS
// implementation until this resolves, so a slow or failed load degrades
// gracefully rather than breaking anything.
void initGeometryWasm().catch((err: unknown) => {
  console.warn("thoth-bindings wasm failed to load; using TS geometry fallback.", err);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
