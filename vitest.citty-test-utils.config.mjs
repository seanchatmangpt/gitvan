import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test patterns
    include: [
      "tests/citty-test-utils/**/*.test.mjs",
      "tests/citty-test-utils/**/*.spec.mjs",
    ],

    // Test environment
    environment: "node",

    // Timeouts
    testTimeout: 30000, // 30 seconds for individual tests
    hookTimeout: 30000, // 30 seconds for setup/teardown

    // Coverage
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["vendors/citty-test-utils/**/*.js"],
      exclude: [
        "vendors/citty-test-utils/node_modules/**",
        "vendors/citty-test-utils/**/*.test.js",
        "vendors/citty-test-utils/**/*.spec.js",
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
      json: "test-results/citty-test-utils-results.json",
    },

    // Test organization
    testNamePattern: undefined,

    // Parallel execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Retry configuration
    retry: 2,

    // Global setup
    globalSetup: undefined,

    // Test isolation
    isolate: true,

    // Environment variables
    env: {
      NODE_ENV: "test",
      CITTY_TEST_UTILS_TESTING: "true",
    },
  },
});

