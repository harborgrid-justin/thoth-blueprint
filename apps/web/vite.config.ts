import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The domain model is consumed directly from source via an alias — it is
// framework-agnostic TypeScript and needs no separate build step here. This
// keeps apps/web and packages/domain in lockstep during development.
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@thoth/domain": fileURLToPath(
        new URL("../../packages/domain/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
