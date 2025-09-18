/**
 * Vitest Configuration for GitVan AI Commands Testing
 */

import { defineConfig } from "vitest/config";
import { join } from "pathe";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",

    // Test file patterns
    include: ["tests/**/*.test.mjs", "tests/**/*.spec.mjs"],

    // Exclude patterns
    exclude: ["node_modules/**", "dist/**", "**/*.d.ts"],

    // Test timeout
    testTimeout: 30000, // 30 seconds for AI operations

    // Setup files
    setupFiles: [join(process.cwd(), "tests/setup.mjs")],

    // Global setup
    globalSetup: join(process.cwd(), "tests/global-setup.mjs"),

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
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
    reporter: ["verbose", "json"],
    outputFile: {
      json: "test-results.json",
    },

    // Watch mode configuration
    watch: false,

    // Parallel execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },

  // Resolve configuration
  resolve: {
    alias: {
      "@": join(process.cwd(), "src"),
      "@tests": join(process.cwd(), "tests"),
    },
  },
});
