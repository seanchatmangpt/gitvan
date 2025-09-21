import { defineConfig } from "vitest/config";
import { resolve } from "pathe";

export default defineConfig({
  test: {
    // Enable BDD mode
    environment: "node",
    globals: true,

    // Include BDD test files
    include: [
      "tests/**/*.test.mjs",
      "tests/bdd/**/*.feature",
      "tests/bdd/**/*.test.mjs",
    ],

    // Exclude node_modules
    exclude: ["node_modules/**", "dist/**", "build/**"],

    // Test timeout
    testTimeout: 30000,

    // Setup files
    setupFiles: ["tests/bdd/support/setup.mjs"],

    // Reporter configuration
    reporter: ["verbose", "json"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.mjs"],
      exclude: [
        "src/**/*.test.mjs",
        "src/**/*.spec.mjs",
        "tests/**",
        "node_modules/**",
      ],
    },
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@tests": resolve(__dirname, "tests"),
      "@bdd": resolve(__dirname, "tests/bdd"),
    },
  },
});
