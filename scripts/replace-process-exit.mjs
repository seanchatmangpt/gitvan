#!/usr/bin/env node

/**
 * Replace process.exit() calls with exitWithError()
 * This script safely replaces direct process.exit() calls with
 * proper error handling using the centralized error handler.
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

// Files to exclude
const excludePatterns = [
  "node_modules/**",
  "dist/**",
  ".git/**",
  "test/**",
  "*.test.mjs",
  "*.spec.mjs",
];

async function findSourceFiles() {
  const files = await glob("src/**/*.mjs", {
    cwd: rootDir,
    ignore: excludePatterns,
  });
  return files;
}

function hasErrorHandlerImport(content) {
  return content.includes("import") && content.includes("exitWithError");
}

function addErrorHandlerImport(content) {
  if (hasErrorHandlerImport(content)) {
    return content;
  }

  // Find the last import statement
  const lines = content.split("\n");
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("import ")) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    // No imports found, add at the top
    return `import { exitWithError } from "../core/error-handler.mjs";\n\n${content}`;
  }

  // Add after last import
  lines.splice(lastImportIndex + 1, 0, 'import { exitWithError } from "../core/error-handler.mjs";');
  return lines.join("\n");
}

function replaceProcessExit(content, filePath) {
  // Pattern 1: process.exit(code) as standalone statement
  // Pattern 2: process.exit() within conditions/functions

  let modified = content;
  let replacementCount = 0;

  // Handle simple process.exit(0) - success case, just exit silently
  modified = modified.replace(/process\.exit\(\s*0\s*\);/g, () => {
    replacementCount++;
    return 'process.exit(0);'; // Keep success exits as-is
  });

  // Handle process.exit(1) and other error codes
  modified = modified.replace(
    /process\.exit\(\s*([^)]+)\s*\);/g,
    (match, code) => {
      if (code === "0") {
        return "process.exit(0);"; // Keep success exits
      }
      replacementCount++;
      return `await exitWithError(new Error("Operation failed"), ${code || 1});`;
    }
  );

  // Handle process.exit() without arguments (defaults to 0)
  modified = modified.replace(/process\.exit\(\);/g, () => {
    replacementCount++;
    return "process.exit(0);";
  });

  // If we made replacements and the function doesn't have exitWithError import
  if (
    replacementCount > 0 &&
    !hasErrorHandlerImport(modified)
  ) {
    // Calculate relative path for import
    const fileDir = path.dirname(filePath);
    const relativePath = path.relative(fileDir, path.join(rootDir, "src/core"));
    const importPath = `./${path.relative(fileDir, path.join(rootDir, "src/core/error-handler.mjs"))}`;

    // Add import at top level (after existing imports)
    modified = addErrorHandlerImport(modified);
  }

  return { modified, replacementCount };
}

async function main() {
  console.log("Process.exit() Migration\n===========================\n");

  const files = await findSourceFiles();
  console.log(`Found ${files.length} files to scan\n`);

  let totalReplaced = 0;
  let filesModified = 0;
  const failedFiles = [];

  for (const file of files) {
    const filePath = path.join(rootDir, file);

    try {
      const content = readFileSync(filePath, "utf-8");
      const { modified, replacementCount } = replaceProcessExit(content, file);

      if (replacementCount > 0) {
        writeFileSync(filePath, modified, "utf-8");
        filesModified++;
        totalReplaced += replacementCount;
        console.log(`✓ ${file} - Replaced ${replacementCount} call(s)`);
      }
    } catch (error) {
      failedFiles.push({ file, error: error.message });
    }
  }

  console.log(`\n=== Migration Statistics ===`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Process.exit() calls replaced: ${totalReplaced}`);

  if (failedFiles.length > 0) {
    console.log(`\n⚠ Failed files (${failedFiles.length}):`);
    failedFiles.forEach(({ file, error }) => {
      console.log(`  ✗ ${file}: ${error}`);
    });
  }

  console.log(`\n✓ Migration complete!`);
}

main().catch(console.error);
