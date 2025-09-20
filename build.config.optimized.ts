import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  // Main CLI entry point
  entries: ["./src/cli.mjs", "./bin/gitvan.mjs"],

  // Output directory
  outDir: "dist",

  // Generate TypeScript declarations
  declaration: "compatible",

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
      // AI and additional dependencies
      "@ai-sdk/anthropic",
      "ollama",
      "memfs",
      "isomorphic-git",
      "ai",
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
      minify: true, // Enable minification
      sourcemap: false, // Disable sourcemaps for production
      treeShaking: true, // Enable tree shaking
      drop: ["console", "debugger"], // Remove console logs and debugger statements
    },

    // Terser configuration for additional minification
    terser: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
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
  ],
});
