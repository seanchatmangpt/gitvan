import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  // Main CLI entry point
  entries: ["./src/cli.mjs", "./bin/gitvan.mjs"],

  // Output directory
  outDir: "dist",

  // Generate TypeScript declarations
  declaration: false,

  // Clean output directory before build
  clean: true,

  // Don't fail on warnings
  failOnWarn: false,

  // Enable bundling to minimize dependencies
  bundleless: false,

  // Rollup configuration
  rollup: {
    // External dependencies (don't bundle these)
    external: [
      // Node.js built-ins
      "node:fs",
      "node:path",
      "node:child_process",
      "node:os",
      "node:crypto",
      "node:util",
      "node:stream",
      "node:events",
      "node:buffer",
      "node:url",
      "node:querystring",
      "node:http",
      "node:https",
      "node:net",
      "node:tls",
      "node:zlib",
      "node:readline",
      "node:cluster",
      "node:worker_threads",
      "node:perf_hooks",
      "node:async_hooks",
      "node:timers",
      "node:tty",
      "node:vm",
      "node:assert",
      "node:fs/promises",
      "node:path/posix",
      "node:path/win32",
      // GitVan dependencies that should remain external
      "citty",
      "consola",
      "unctx",
      "pathe",
      "defu",
      "klona",
      "klona/full",
      "lru-cache",
      "zod",
      "tinyglobby",
      "gray-matter",
      "js-yaml",
      "json5",
      "inflection",
      "nunjucks",
      "hookable",
      "unrouting",
      "giget",
      "prompts",
      "minimatch",
      "semver",
      "@babel/parser",
      "@babel/traverse",
      "fuse.js",
      "node-cron",
      "cacache",
      "toml",
      "p-queue",
      "exceljs",
      "marked",
      "fdir",
      "picomatch",
      "brace-expansion",
      "concat-map",
      "balanced-match",
      // Type definitions (exclude from build)
      "@types/semver",
      "@types/node",
      // AI and additional dependencies
      "@ai-sdk/anthropic",
      "ollama",
      "ollama-ai-provider-v2",
      "memfs",
      "isomorphic-git",
      "ai",
      "ai/openai",
      "ai/anthropic",
    ],

    // Output configuration
    output: {
      // Preserve modules for better tree-shaking
      preserveModules: false,

      // Format configuration
      format: "esm",

      // Entry file names
      entryFileNames: "[name].mjs",

      // Chunk file names
      chunkFileNames: "[name]-[hash].mjs",

      // Asset file names
      assetFileNames: "[name]-[hash][extname]",
    },

    // ESBuild configuration for better performance
    esbuild: {
      target: "node18",
      minify: process.env.NODE_ENV === "production",
      sourcemap: process.env.NODE_ENV !== "production",
      treeShaking: true,
      platform: "node",
      format: "esm",
    },
  },

  // Copy additional files
  externals: [
    // Copy templates directory
    {
      input: "./templates",
      outDir: "./dist/templates",
    },
    // Copy packs directory
    {
      input: "./packs",
      outDir: "./dist/packs",
    },
    // Copy types directory
    {
      input: "./types",
      outDir: "./dist/types",
    },
    // Copy RDF ontologies (All Phases)
    {
      input: "./src/rdf/ontologies",
      outDir: "./dist/rdf/ontologies",
    },
    // Copy SPARQL query libraries (All Phases)
    {
      input: "./src/git-native/queries",
      outDir: "./dist/git-native/queries",
    },
    // Copy N3 rules (All Phases)
    {
      input: "./src/rdf/rules",
      outDir: "./dist/rdf/rules",
    },
  ],
});
