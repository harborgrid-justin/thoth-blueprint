import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react() as any],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@thoth/domain": fileURLToPath(
        new URL("../../packages/domain/src/index.ts", import.meta.url),
      ),
      "@thoth/storage": fileURLToPath(
        new URL("../../packages/storage/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
