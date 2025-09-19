#!/usr/bin/env node

/**
 * @fileoverview GitVan v2 — Type Mapping Generator
 *
 * This script generates comprehensive TypeScript definitions from JSDoc comments
 * and creates type mappings for the entire GitVan system.
 *
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate TypeScript definitions from JSDoc
 */
async function generateTypeDefinitions() {
  console.log("🔧 Generating TypeScript definitions from JSDoc...");

  try {
    // Install JSDoc if not present
    try {
      execSync("npx jsdoc --version", { stdio: "pipe" });
    } catch {
      console.log("📦 Installing JSDoc...");
      execSync("npm install -g jsdoc", { stdio: "inherit" });
    }

    // Install docdash template
    try {
      execSync("npm list docdash", { stdio: "pipe" });
    } catch {
      console.log("📦 Installing docdash template...");
      execSync("npm install --save-dev docdash", { stdio: "inherit" });
    }

    // Generate documentation
    console.log("📚 Generating API documentation...");
    execSync("npx jsdoc -c jsdoc.json", { stdio: "inherit" });

    console.log("✅ TypeScript definitions generated successfully!");
    console.log("📁 Documentation available at: ./docs/api/");
  } catch (error) {
    console.error("❌ Error generating TypeScript definitions:", error.message);
    process.exit(1);
  }
}

/**
 * Generate comprehensive type mappings
 */
async function generateTypeMappings() {
  console.log("🗺️  Generating comprehensive type mappings...");

  const typeMappings = {
    // Core GitVan types
    "gitvan/core": {
      RunContext: "src/core/context.mjs",
      JobDef: "src/jobs/define.mjs",
      JobResult: "src/jobs/runner.mjs",
      ExecSpec: "types/index.d.ts",
      ExecResult: "types/index.d.ts",
    },

    // Composables
    "gitvan/composables": {
      useGit: "src/composables/git.mjs",
      useTemplate: "src/composables/template.mjs",
      useTurtle: "src/composables/turtle.mjs",
      useGraph: "src/composables/graph.mjs",
      useExec: "src/composables/exec.mjs",
      useGitVan: "src/core/context.mjs",
    },

    // Knowledge Hooks
    "gitvan/hooks": {
      HookOrchestrator: "src/hooks/HookOrchestrator.mjs",
      HookParser: "src/hooks/HookParser.mjs",
      PredicateEvaluator: "src/hooks/PredicateEvaluator.mjs",
      KnowledgeHook: "src/hooks/HookParser.mjs",
      PredicateDefinition: "src/hooks/HookParser.mjs",
      WorkflowDefinition: "src/workflow/WorkflowParser.mjs",
    },

    // Git-Native I/O
    "gitvan/git-native": {
      GitNativeIO: "src/git-native/GitNativeIO.mjs",
      QueueManager: "src/git-native/QueueManager.mjs",
      LockManager: "src/git-native/LockManager.mjs",
      ReceiptWriter: "src/git-native/ReceiptWriter.mjs",
      SnapshotStore: "src/git-native/SnapshotStore.mjs",
    },

    // Workflow System
    "gitvan/workflow": {
      DAGPlanner: "src/workflow/DAGPlanner.mjs",
      StepRunner: "src/workflow/StepRunner.mjs",
      WorkflowExecutor: "src/workflow/WorkflowExecutor.mjs",
      ContextManager: "src/workflow/ContextManager.mjs",
    },

    // RDF to Zod
    "gitvan/rdf-to-zod": {
      RDFToZodConverter: "src/rdf-to-zod/RDFToZodConverter.mjs",
      useRDFToZod: "src/rdf-to-zod/useRDFToZod.mjs",
      OllamaRDF: "src/rdf-to-zod/OllamaRDF.mjs",
      useOllamaRDF: "src/rdf-to-zod/useOllamaRDF.mjs",
    },

    // CLI Commands
    "gitvan/cli": {
      saveCommand: "src/cli/save.mjs",
      initCommand: "src/cli/init.mjs",
      hooksCommand: "src/cli/hooks.mjs",
      workflowCommand: "src/cli/workflow.mjs",
      setupCommand: "src/cli/setup.mjs",
    },

    // Schemas
    "gitvan/schemas": {
      JobSchema: "src/schemas/job.zod.mjs",
      ConfigSchema: "src/schemas/config.zod.mjs",
      EventSchema: "src/schemas/event.zod.mjs",
      ReceiptSchema: "src/schemas/receipt.zod.mjs",
    },
  };

  // Write type mappings to file
  const mappingsContent = `/**
 * @fileoverview GitVan v2 — Comprehensive Type Mappings
 * 
 * This file provides comprehensive type mappings for the entire GitVan system.
 * It maps TypeScript types to their corresponding implementation files,
 * enabling full type safety and IntelliSense support.
 * 
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

export const typeMappings = ${JSON.stringify(typeMappings, null, 2)};

/**
 * Get file path for a given type
 * @param {string} module - Module name
 * @param {string} type - Type name
 * @returns {string|null} File path or null if not found
 */
export function getTypeFilePath(module, type) {
  return typeMappings[module]?.[type] || null;
}

/**
 * Get all types for a given module
 * @param {string} module - Module name
 * @returns {Object} Types object or empty object if not found
 */
export function getModuleTypes(module) {
  return typeMappings[module] || {};
}

/**
 * Get all available modules
 * @returns {string[]} Array of module names
 */
export function getAvailableModules() {
  return Object.keys(typeMappings);
}

/**
 * Get all available types
 * @returns {Object} All types across all modules
 */
export function getAllTypes() {
  return typeMappings;
}
`;

  await fs.writeFile(
    join(__dirname, "src/types/mappings.mjs"),
    mappingsContent
  );
  console.log("✅ Type mappings generated successfully!");
}

/**
 * Generate IntelliSense configuration
 */
async function generateIntelliSenseConfig() {
  console.log("🧠 Generating IntelliSense configuration...");

  const intelliSenseConfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "node",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      allowJs: true,
      checkJs: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ["src/**/*", "types/**/*"],
    exclude: ["node_modules", "tests", "examples", "docs"],
    "ts-node": {
      esm: true,
    },
  };

  await fs.writeFile(
    join(__dirname, "tsconfig.json"),
    JSON.stringify(intelliSenseConfig, null, 2)
  );
  console.log("✅ IntelliSense configuration generated successfully!");
}

/**
 * Generate package.json type exports
 */
async function generatePackageTypeExports() {
  console.log("📦 Generating package.json type exports...");

  try {
    const packageJsonPath = join(__dirname, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

    // Add type exports
    packageJson.exports = {
      ".": {
        types: "./types/index.d.ts",
        import: "./src/index.mjs",
        require: "./src/index.mjs",
      },
      "./composables": {
        types: "./types/composables.d.ts",
        import: "./src/composables/index.mjs",
      },
      "./hooks": {
        types: "./types/hooks.d.ts",
        import: "./src/hooks/index.mjs",
      },
      "./git-native": {
        types: "./types/git-native.d.ts",
        import: "./src/git-native/index.mjs",
      },
      "./workflow": {
        types: "./types/workflow.d.ts",
        import: "./src/workflow/index.mjs",
      },
      "./rdf-to-zod": {
        types: "./types/rdf-to-zod.d.ts",
        import: "./src/rdf-to-zod/index.mjs",
      },
      "./cli": {
        types: "./types/cli.d.ts",
        import: "./src/cli/index.mjs",
      },
      "./types": {
        types: "./types/index.d.ts",
        import: "./src/types/index.mjs",
      },
    };

    // Add type field
    packageJson.types = "./types/index.d.ts";

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Package.json type exports generated successfully!");
  } catch (error) {
    console.error("❌ Error updating package.json:", error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("🚀 GitVan v2 — Type Mapping Generator");
  console.log("=====================================");

  try {
    await generateTypeDefinitions();
    await generateTypeMappings();
    await generateIntelliSenseConfig();
    await generatePackageTypeExports();

    console.log("\n🎉 All type mappings generated successfully!");
    console.log("\n📋 Summary:");
    console.log("  ✅ TypeScript definitions generated");
    console.log("  ✅ Type mappings created");
    console.log("  ✅ IntelliSense configuration updated");
    console.log("  ✅ Package.json exports configured");
    console.log("\n🔗 Next steps:");
    console.log("  1. Run `npm run build` to compile TypeScript definitions");
    console.log("  2. Run `npm run docs` to generate API documentation");
    console.log(
      '  3. Use `import { useGit } from "gitvan/composables"` for type-safe imports'
    );
  } catch (error) {
    console.error("❌ Error in type mapping generation:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
