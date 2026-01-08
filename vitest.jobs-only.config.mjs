/**
 * Vitest Configuration for Job System Tests Only
 * Simplified config without AI dependencies
 */

import { defineConfig } from "vitest/config";
import { join } from "pathe";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",

    // Test file patterns
    include: ["tests/jobs-bree-integration-comprehensive.test.mjs"],

    // Exclude patterns
    exclude: ["node_modules/**", "dist/**", "**/*.d.ts"],

    // Test timeout
    testTimeout: 30000,

    // NO setup files or global setup for this run

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/jobs/**",
        "src/composables/lock.mjs",
        "src/composables/receipt.mjs",
      ],
      exclude: [
        "node_modules/**",
        "dist/**",
        "tests/**",
        "**/*.d.ts",
        "**/*.config.*",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Reporter configuration
    reporter: ["verbose"],

    // Watch mode configuration
    watch: false,

    // Parallel execution
    pool: "threads",
    maxConcurrency: 5,
    minWorkers: 1,
    maxWorkers: 4,
  },

  // Resolve configuration
  resolve: {
    alias: {
      "@": join(process.cwd(), "src"),
      "@tests": join(process.cwd(), "tests"),
    },
  },
});
