#!/usr/bin/env node
/**
 * Export Analysis Script
 * Analyzes all exports in src/ directory and checks their usage
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SRC_DIR = join(process.cwd(), "src");
const TESTS_DIR = join(process.cwd(), "tests");

// Data structures to track exports
const exports = {
  composables: new Map(), // use* functions
  classes: new Map(), // default class exports
  functions: new Map(), // regular function exports
  constants: new Map(), // const exports
  types: new Map(), // type exports
};

const imports = {
  composables: new Map(),
  classes: new Map(),
  functions: new Map(),
  constants: new Map(),
  types: new Map(),
};

/**
 * Recursively get all .mjs and .ts files in directory
 */
function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.match(/\.(mjs|ts|tsx)$/) && !file.includes(".test.") && !file.includes(".spec.")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Extract exports from a file
 */
function extractExports(filePath, content) {
  const relPath = relative(process.cwd(), filePath);

  // Match: export function use*
  const composableMatches = content.matchAll(/export\s+function\s+(use[A-Z]\w*)/g);
  for (const match of composableMatches) {
    const name = match[1];
    if (!exports.composables.has(name)) {
      exports.composables.set(name, []);
    }
    exports.composables.get(name).push(relPath);
  }

  // Match: export default class
  const classMatches = content.matchAll(/export\s+default\s+class\s+(\w+)/g);
  for (const match of classMatches) {
    const name = match[1];
    if (!exports.classes.has(name)) {
      exports.classes.set(name, []);
    }
    exports.classes.get(name).push(relPath);
  }

  // Match: export class (named class)
  const namedClassMatches = content.matchAll(/export\s+class\s+(\w+)/g);
  for (const match of namedClassMatches) {
    const name = match[1];
    if (!exports.classes.has(name)) {
      exports.classes.set(name, []);
    }
    exports.classes.get(name).push(relPath);
  }

  // Match: export function (not use*)
  const functionMatches = content.matchAll(/export\s+function\s+(?!use[A-Z])(\w+)/g);
  for (const match of functionMatches) {
    const name = match[1];
    if (!exports.functions.has(name)) {
      exports.functions.set(name, []);
    }
    exports.functions.get(name).push(relPath);
  }

  // Match: export const
  const constMatches = content.matchAll(/export\s+const\s+(\w+)/g);
  for (const match of constMatches) {
    const name = match[1];
    if (!exports.constants.has(name)) {
      exports.constants.set(name, []);
    }
    exports.constants.get(name).push(relPath);
  }

  // Match: export { Name }
  const namedExportMatches = content.matchAll(/export\s*\{\s*([^}]+)\s*\}/g);
  for (const match of namedExportMatches) {
    const names = match[1].split(",").map(n => n.trim().split(/\s+as\s+/)[0].trim());
    names.forEach(name => {
      // Determine type by name pattern
      if (name.startsWith("use") && name[3] === name[3].toUpperCase()) {
        if (!exports.composables.has(name)) {
          exports.composables.set(name, []);
        }
        exports.composables.get(name).push(relPath);
      } else if (name[0] === name[0].toUpperCase()) {
        // Likely a class or constant
        if (!exports.classes.has(name)) {
          exports.classes.set(name, []);
        }
        exports.classes.get(name).push(relPath);
      } else {
        if (!exports.functions.has(name)) {
          exports.functions.set(name, []);
        }
        exports.functions.get(name).push(relPath);
      }
    });
  }

  // Match: export type
  const typeMatches = content.matchAll(/export\s+type\s+(\w+)/g);
  for (const match of typeMatches) {
    const name = match[1];
    if (!exports.types.has(name)) {
      exports.types.set(name, []);
    }
    exports.types.get(name).push(relPath);
  }
}

/**
 * Extract imports from a file
 */
function extractImports(filePath, content) {
  // Match: import { name1, name2 } from "..."
  const namedImportMatches = content.matchAll(/import\s*\{\s*([^}]+)\s*\}\s*from/g);
  for (const match of namedImportMatches) {
    const names = match[1].split(",").map(n => n.trim().split(/\s+as\s+/)[0].trim());
    names.forEach(name => {
      // Track import
      if (exports.composables.has(name)) {
        if (!imports.composables.has(name)) {
          imports.composables.set(name, 0);
        }
        imports.composables.set(name, imports.composables.get(name) + 1);
      }
      if (exports.classes.has(name)) {
        if (!imports.classes.has(name)) {
          imports.classes.set(name, 0);
        }
        imports.classes.set(name, imports.classes.get(name) + 1);
      }
      if (exports.functions.has(name)) {
        if (!imports.functions.has(name)) {
          imports.functions.set(name, 0);
        }
        imports.functions.set(name, imports.functions.get(name) + 1);
      }
      if (exports.constants.has(name)) {
        if (!imports.constants.has(name)) {
          imports.constants.set(name, 0);
        }
        imports.constants.set(name, imports.constants.get(name) + 1);
      }
    });
  }

  // Match: import Name from "..."
  const defaultImportMatches = content.matchAll(/import\s+(\w+)\s+from/g);
  for (const match of defaultImportMatches) {
    const name = match[1];
    if (exports.classes.has(name)) {
      if (!imports.classes.has(name)) {
        imports.classes.set(name, 0);
      }
      imports.classes.set(name, imports.classes.get(name) + 1);
    }
  }
}

// Main analysis
console.log("🔍 Analyzing exports in src/...\n");

const srcFiles = getAllFiles(SRC_DIR);
const testFiles = getAllFiles(TESTS_DIR);
const allFiles = [...srcFiles, ...testFiles];

console.log(`Found ${srcFiles.length} source files`);
console.log(`Found ${testFiles.length} test files\n`);

// First pass: Extract all exports
for (const file of srcFiles) {
  try {
    const content = readFileSync(file, "utf-8");
    extractExports(file, content);
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
}

// Second pass: Extract all imports
for (const file of allFiles) {
  try {
    const content = readFileSync(file, "utf-8");
    extractImports(file, content);
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
}

// Report
console.log("=" .repeat(80));
console.log("📊 EXPORT ANALYSIS REPORT");
console.log("=".repeat(80));
console.log();

// Composables
console.log("🎯 COMPOSABLES (use* functions)");
console.log("-".repeat(80));
const composableList = Array.from(exports.composables.keys()).sort();
console.log(`Total composables: ${composableList.length}\n`);

const unusedComposables = composableList.filter(name => !imports.composables.has(name) || imports.composables.get(name) === 0);
const usedComposables = composableList.filter(name => imports.composables.has(name) && imports.composables.get(name) > 0);

console.log(`✅ Used: ${usedComposables.length}`);
console.log(`❌ Unused: ${unusedComposables.length}`);
console.log();

if (unusedComposables.length > 0) {
  console.log("Unused composables:");
  unusedComposables.forEach(name => {
    const locations = exports.composables.get(name);
    console.log(`  - ${name} (${locations.join(", ")})`);
  });
  console.log();
}

// Classes
console.log("🏗️  CLASSES");
console.log("-".repeat(80));
const classList = Array.from(exports.classes.keys()).sort();
console.log(`Total classes: ${classList.length}\n`);

const unusedClasses = classList.filter(name => !imports.classes.has(name) || imports.classes.get(name) === 0);
const usedClasses = classList.filter(name => imports.classes.has(name) && imports.classes.get(name) > 0);

console.log(`✅ Used: ${usedClasses.length}`);
console.log(`❌ Unused: ${unusedClasses.length}`);
console.log();

if (unusedClasses.length > 0) {
  console.log("Unused classes:");
  unusedClasses.slice(0, 20).forEach(name => {
    const locations = exports.classes.get(name);
    console.log(`  - ${name} (${locations[0]})`);
  });
  if (unusedClasses.length > 20) {
    console.log(`  ... and ${unusedClasses.length - 20} more`);
  }
  console.log();
}

// Functions
console.log("⚡ FUNCTIONS (non-composable)");
console.log("-".repeat(80));
const functionList = Array.from(exports.functions.keys()).sort();
console.log(`Total functions: ${functionList.length}\n`);

const unusedFunctions = functionList.filter(name => !imports.functions.has(name) || imports.functions.get(name) === 0);
const usedFunctions = functionList.filter(name => imports.functions.has(name) && imports.functions.get(name) > 0);

console.log(`✅ Used: ${usedFunctions.length}`);
console.log(`❌ Unused: ${unusedFunctions.length}`);
console.log();

if (unusedFunctions.length > 0) {
  console.log("Unused functions (first 20):");
  unusedFunctions.slice(0, 20).forEach(name => {
    const locations = exports.functions.get(name);
    console.log(`  - ${name} (${locations[0]})`);
  });
  if (unusedFunctions.length > 20) {
    console.log(`  ... and ${unusedFunctions.length - 20} more`);
  }
  console.log();
}

// Constants
console.log("📦 CONSTANTS & OBJECTS");
console.log("-".repeat(80));
const constantList = Array.from(exports.constants.keys()).sort();
console.log(`Total constants: ${constantList.length}\n`);

const unusedConstants = constantList.filter(name => !imports.constants.has(name) || imports.constants.get(name) === 0);
const usedConstants = constantList.filter(name => imports.constants.has(name) && imports.constants.get(name) > 0);

console.log(`✅ Used: ${usedConstants.length}`);
console.log(`❌ Unused: ${unusedConstants.length}`);
console.log();

if (unusedConstants.length > 0) {
  console.log("Unused constants (first 20):");
  unusedConstants.slice(0, 20).forEach(name => {
    const locations = exports.constants.get(name);
    console.log(`  - ${name} (${locations[0]})`);
  });
  if (unusedConstants.length > 20) {
    console.log(`  ... and ${unusedConstants.length - 20} more`);
  }
  console.log();
}

// Summary
console.log("=".repeat(80));
console.log("📋 SUMMARY");
console.log("=".repeat(80));
console.log();
console.log(`Total exports: ${composableList.length + classList.length + functionList.length + constantList.length}`);
console.log(`Total unused: ${unusedComposables.length + unusedClasses.length + unusedFunctions.length + unusedConstants.length}`);
console.log();

const unusedPercentage = ((unusedComposables.length + unusedClasses.length + unusedFunctions.length + unusedConstants.length) / (composableList.length + classList.length + functionList.length + constantList.length) * 100).toFixed(1);
console.log(`Unused percentage: ${unusedPercentage}%`);
console.log();

// Export consistency check
console.log("=".repeat(80));
console.log("✅ EXPORT CONSISTENCY CHECK");
console.log("=".repeat(80));
console.log();

let consistencyIssues = 0;

// Check composables follow pattern
console.log("Checking composables follow 'export function use*' pattern...");
for (const [name, locations] of exports.composables.entries()) {
  if (!name.startsWith("use") || name[3] !== name[3].toUpperCase()) {
    console.log(`  ⚠️  ${name} doesn't follow pattern (${locations[0]})`);
    consistencyIssues++;
  }
}

console.log(`${consistencyIssues === 0 ? "✓" : "✗"} ${consistencyIssues} issues found\n`);

// Top imports
console.log("=".repeat(80));
console.log("🔥 MOST USED EXPORTS (Top 20)");
console.log("=".repeat(80));
console.log();

const allImports = [
  ...Array.from(imports.composables.entries()).map(([name, count]) => ({ name, count, type: "composable" })),
  ...Array.from(imports.classes.entries()).map(([name, count]) => ({ name, count, type: "class" })),
  ...Array.from(imports.functions.entries()).map(([name, count]) => ({ name, count, type: "function" })),
  ...Array.from(imports.constants.entries()).map(([name, count]) => ({ name, count, type: "constant" })),
];

allImports.sort((a, b) => b.count - a.count);

allImports.slice(0, 20).forEach(({ name, count, type }, idx) => {
  console.log(`${idx + 1}. ${name} (${type}) - ${count} imports`);
});

console.log();
console.log("Analysis complete! ✨");
