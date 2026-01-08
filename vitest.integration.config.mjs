// vitest.integration.config.mjs
// Vitest configuration for integration tests

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,
    maxConcurrency: 5,
    include: ["tests/integration/**/*.test.mjs"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.gitvan/**",
    ],
    // No global setup for integration tests
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.mjs"],
      exclude: [
        "src/**/*.test.mjs",
        "src/**/*.spec.mjs",
        "**/node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
      "@": resolve(__dirname, "./src"),
    },
  },
});
