#!/usr/bin/env node
/**
 * Verify that vendor/unrdf submodule is properly set up
 * This script checks:
 * 1. Submodule directory exists
 * 2. Submodule has been initialized (has .git)
 * 3. Build artifacts exist (dist directory)
 */

import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "..");
const vendorUnrdf = join(projectRoot, "vendor/unrdf");
const vendorUnrdfGit = join(vendorUnrdf, ".git");
const vendorUnrdfDist = join(vendorUnrdf, "dist");

let hasErrors = false;

console.log("🔍 Verifying vendor/unrdf submodule...\n");

// Check if vendor/unrdf exists
if (!existsSync(vendorUnrdf)) {
  console.error("❌ ERROR: vendor/unrdf directory not found!");
  console.error("   Run: git submodule update --init --recursive\n");
  hasErrors = true;
} else {
  console.log("✅ vendor/unrdf directory exists");
  
  // Check if .git exists (submodule initialized)
  if (!existsSync(vendorUnrdfGit)) {
    console.error("❌ ERROR: vendor/unrdf/.git not found!");
    console.error("   Submodule not initialized properly.");
    console.error("   Run: git submodule update --init --recursive\n");
    hasErrors = true;
  } else {
    console.log("✅ vendor/unrdf submodule initialized");
  }
  
  // Check if dist exists (built)
  if (!existsSync(vendorUnrdfDist)) {
    console.error("⚠️  WARNING: vendor/unrdf/dist not found!");
    console.error("   The submodule needs to be built.");
    console.error("   Run: cd vendor/unrdf && npm install && npm run build\n");
    hasErrors = true;
  } else {
    console.log("✅ vendor/unrdf build artifacts exist");
  }
}

console.log("");

if (hasErrors) {
  console.error("❌ Submodule verification failed!");
  console.error("   Please follow the instructions above to fix the issues.\n");
  process.exit(1);
} else {
  console.log("✨ All submodule checks passed!\n");
  process.exit(0);
}
