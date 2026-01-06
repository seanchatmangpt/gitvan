#!/usr/bin/env node
/**
 * Migration Script: Replace console.* with logger.*
 *
 * This script scans source files and replaces:
 * - console.log() → logger.info()
 * - console.error() → logger.error()
 * - console.warn() → logger.warn()
 * - console.debug() → logger.debug()
 *
 * It also adds logger import if not present.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, relative, dirname } from "path";
import { glob } from "glob";

const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  consoleReplaced: 0,
  importsAdded: 0,
};

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return (
    content.includes('from "../utils/logger.mjs"') ||
    content.includes("from '../utils/logger.mjs'") ||
    content.includes('from "../../utils/logger.mjs"') ||
    content.includes("from '../../utils/logger.mjs'") ||
    content.includes('from "../../../utils/logger.mjs"') ||
    content.includes("from '../../../utils/logger.mjs'") ||
    content.includes("createLogger(")
  );
}

/**
 * Calculate relative import path to logger
 */
function getLoggerImportPath(filePath) {
  const fileDir = dirname(filePath);
  const srcDir = resolve(process.cwd(), "src");
  const loggerPath = resolve(srcDir, "utils/logger.mjs");

  let relativePath = relative(fileDir, loggerPath);

  // Ensure it starts with ./
  if (!relativePath.startsWith(".")) {
    relativePath = "./" + relativePath;
  }

  // Normalize path separators for cross-platform
  relativePath = relativePath.replace(/\\/g, "/");

  return relativePath;
}

/**
 * Add logger import to file
 */
function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) {
    return content;
  }

  // Find the best place to add import (after existing imports)
  const lines = content.split("\n");
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("import ")) {
      lastImportIndex = i;
    } else if (lastImportIndex > -1 && line !== "" && !line.startsWith("//")) {
      // Found first non-import line
      break;
    }
  }

  const loggerImportPath = getLoggerImportPath(filePath);
  const importStatement = `import { createLogger } from "${loggerImportPath}";`;
  const loggerInit = '\nconst logger = createLogger("' + getModuleName(filePath) + '");';

  if (lastImportIndex > -1) {
    // Add after last import
    lines.splice(lastImportIndex + 1, 0, importStatement + loggerInit);
  } else {
    // Add at beginning
    lines.unshift(importStatement + loggerInit + "\n");
  }

  stats.importsAdded++;
  return lines.join("\n");
}

/**
 * Get module name from file path for logger tag
 */
function getModuleName(filePath) {
  const relativePath = relative(resolve(process.cwd(), "src"), filePath);
  return relativePath
    .replace(/\\/g, "/")
    .replace(/\.mjs$/, "")
    .replace(/\//g, ":");
}

/**
 * Replace console statements with logger calls
 */
function replaceConsoleCalls(content) {
  let modified = content;
  let replacements = 0;

  // Replace console.log → logger.info
  const logMatches = modified.match(/console\.log\(/g);
  if (logMatches) {
    modified = modified.replace(/console\.log\(/g, "logger.info(");
    replacements += logMatches.length;
  }

  // Replace console.error → logger.error
  const errorMatches = modified.match(/console\.error\(/g);
  if (errorMatches) {
    modified = modified.replace(/console\.error\(/g, "logger.error(");
    replacements += errorMatches.length;
  }

  // Replace console.warn → logger.warn
  const warnMatches = modified.match(/console\.warn\(/g);
  if (warnMatches) {
    modified = modified.replace(/console\.warn\(/g, "logger.warn(");
    replacements += warnMatches.length;
  }

  // Replace console.debug → logger.debug
  const debugMatches = modified.match(/console\.debug\(/g);
  if (debugMatches) {
    modified = modified.replace(/console\.debug\(/g, "logger.debug(");
    replacements += debugMatches.length;
  }

  stats.consoleReplaced += replacements;
  return { modified, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesScanned++;

  const content = readFileSync(filePath, "utf-8");

  // Check if file has console calls
  if (!content.includes("console.")) {
    if (VERBOSE) {
      console.log(`✓ ${filePath} - No console calls`);
    }
    return;
  }

  // Replace console calls
  const { modified: contentWithReplacements, replacements } =
    replaceConsoleCalls(content);

  if (replacements === 0) {
    if (VERBOSE) {
      console.log(`✓ ${filePath} - No console calls to replace`);
    }
    return;
  }

  // Add logger import if needed
  const finalContent = addLoggerImport(contentWithReplacements, filePath);

  // Write file
  if (!DRY_RUN) {
    writeFileSync(filePath, finalContent, "utf-8");
    stats.filesModified++;
  }

  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}✓ ${filePath} - Replaced ${replacements} console call(s)`
  );
}

/**
 * Main migration
 */
async function migrate() {
  console.log("Console to Logger Migration");
  console.log("===========================\n");

  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No files will be modified\n");
  }

  // Find all .mjs files in src/
  const files = await glob("src/**/*.mjs", {
    cwd: process.cwd(),
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/test/**", "**/tests/**"],
  });

  console.log(`Found ${files.length} files to scan\n`);

  // Process each file
  for (const file of files) {
    try {
      processFile(file);
    } catch (error) {
      console.error(`✗ ${file} - Error: ${error.message}`);
    }
  }

  // Print statistics
  console.log("\n=== Migration Statistics ===");
  console.log(`Files scanned: ${stats.filesScanned}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Console calls replaced: ${stats.consoleReplaced}`);
  console.log(`Logger imports added: ${stats.importsAdded}`);

  if (DRY_RUN) {
    console.log("\nℹ️  This was a dry run. Run without --dry-run to apply changes.");
  } else {
    console.log("\n✓ Migration complete!");
  }
}

// Run migration
migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
