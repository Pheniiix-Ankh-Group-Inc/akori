import { defineConfig } from "vitest/config"
import path from "node:path"

// Tests unitaires et de sécurité, sans réseau ni service externe.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
})
