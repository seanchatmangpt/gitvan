#!/usr/bin/env node

/**
 * GitVan Graph Persistence CLI Demo
 * 
 * This script demonstrates the complete end-to-end CLI integration:
 * 1. Command line interface
 * 2. Graph persistence operations
 * 3. File system integration
 * 4. C4 model implementation
 * 
 * Usage: node examples/graph-persistence-cli-demo.mjs
 */

import { graphCommand } from "../src/cli/graph-command.mjs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";

async function demonstrateCLIIntegration() {
  console.log("🚀 GitVan Graph Persistence CLI Demo");
  console.log("====================================\n");

  // Create a temporary directory for the demo
  const demoDir = join(tmpdir(), `gitvan-cli-demo-${randomUUID()}`);
  await fs.mkdir(demoDir, { recursive: true });

  console.log(`📁 Demo directory: ${demoDir}\n`);

  try {
    // 1. Show help
    console.log("1️⃣  Showing graph command help...");
    await graphCommand(["help"]);
    console.log();

    // 2. Initialize default graph
    console.log("2️⃣  Initializing default graph...");
    await graphCommand(["init-default"], { graphDir: demoDir });
    console.log();

    // 3. Add some sample data programmatically
    console.log("3️⃣  Adding sample data to graph...");
    const { useTurtle } = await import("../src/composables/turtle.mjs");
    const { withGitVan } = await import("../src/composables/ctx.mjs");

    await withGitVan({ cwd: demoDir, root: demoDir }, async () => {
      const turtle = await useTurtle({ graphDir: demoDir });
      
      const { Store, DataFactory } = await import("n3");
      const { namedNode, literal } = DataFactory;

      // Add project information
      turtle.store.addQuad(
        namedNode("https://gitvan.dev/project/cli-demo"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("https://gitvan.dev/ontology#Project")
      );

      turtle.store.addQuad(
        namedNode("https://gitvan.dev/project/cli-demo"),
        namedNode("http://purl.org/dc/terms/title"),
        literal("GitVan CLI Demo Project")
      );

      turtle.store.addQuad(
        namedNode("https://gitvan.dev/project/cli-demo"),
        namedNode("http://purl.org/dc/terms/description"),
        literal("Demonstration of GitVan graph persistence CLI integration")
      );

      // Add workflow data
      turtle.store.addQuad(
        namedNode("https://gitvan.dev/workflow/cli-workflow"),
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("https://gitvan.dev/ontology#Workflow")
      );

      turtle.store.addQuad(
        namedNode("https://gitvan.dev/workflow/cli-workflow"),
        namedNode("http://purl.org/dc/terms/title"),
        literal("CLI Integration Workflow")
      );

      turtle.store.addQuad(
        namedNode("https://gitvan.dev/workflow/cli-workflow"),
        namedNode("https://gitvan.dev/ontology#belongsToProject"),
        namedNode("https://gitvan.dev/project/cli-demo")
      );
    });
    console.log("   ✅ Sample data added to graph");
    console.log();

    // 4. Show current statistics
    console.log("4️⃣  Showing current graph statistics...");
    await graphCommand(["stats"], { graphDir: demoDir });
    console.log();

    // 5. Save graph to named file
    console.log("5️⃣  Saving graph to named file...");
    await graphCommand(["save", "demo-data"], {
      graphDir: demoDir,
      backup: true,
    });
    console.log();

    // 6. Save to default location
    console.log("6️⃣  Saving graph to default location...");
    await graphCommand(["save-default"], {
      graphDir: demoDir,
      backup: true,
    });
    console.log();

    // 7. List available files
    console.log("7️⃣  Listing available Turtle files...");
    await graphCommand(["list-files"], { graphDir: demoDir });
    console.log();

    // 8. Demonstrate loading
    console.log("8️⃣  Demonstrating graph loading...");
    
    // Clear the store first
    await withGitVan({ cwd: demoDir, root: demoDir }, async () => {
      const turtle = await useTurtle({ graphDir: demoDir });
      turtle.store.removeQuads([...turtle.store]);
    });
    console.log("   🧹 Store cleared");

    // Load from named file
    await graphCommand(["load", "demo-data"], {
      graphDir: demoDir,
      validate: true,
    });
    console.log();

    // 9. Show statistics after loading
    console.log("9️⃣  Showing statistics after loading...");
    await graphCommand(["stats"], { graphDir: demoDir });
    console.log();

    // 10. Demonstrate C4 Model Flow
    console.log("🔟 Demonstrating C4 Model Flow...");
    console.log("   Level 1: Developer → GitVan CLI → File System");
    console.log("   Level 2: CLI Router → Graph Module → FS I/O Adapter");
    console.log("   Level 3: useTurtle → RdfEngine → PersistenceHelper");
    console.log("   Level 4: Save Flow: saveGraph() → serializeTurtle() → writeTurtleFile()");
    console.log("   Level 4: Load Flow: loadGraph() → parseTurtle() → readTurtleFile()");
    console.log();

    // 11. Demonstrate error handling
    console.log("1️⃣1️⃣ Demonstrating error handling...");
    try {
      await graphCommand(["load", "non-existent-file"]);
    } catch (error) {
      console.log(`   ❌ Expected error caught: ${error.message}`);
    }
    console.log();

    // 12. Show file system verification
    console.log("1️⃣2️⃣ Verifying file system integration...");
    const files = await fs.readdir(demoDir);
    console.log(`   📁 Files in demo directory: ${files.length}`);
    files.forEach(file => {
      const stats = await fs.stat(join(demoDir, file));
      console.log(`      - ${file} (${stats.size} bytes)`);
    });
    console.log();

    console.log("✅ CLI Demo completed successfully!");
    console.log(`📁 All files saved in: ${demoDir}`);
    console.log("🧹 Clean up: Files will be automatically cleaned up on system restart");
    console.log();
    console.log("🎯 Key CLI Commands Demonstrated:");
    console.log("   gitvan graph help                    - Show help");
    console.log("   gitvan graph init-default           - Initialize default graph");
    console.log("   gitvan graph save <fileName>        - Save graph to file");
    console.log("   gitvan graph load <fileName>        - Load graph from file");
    console.log("   gitvan graph save-default           - Save to default.ttl");
    console.log("   gitvan graph load-default           - Load from default.ttl");
    console.log("   gitvan graph list-files             - List Turtle files");
    console.log("   gitvan graph stats                   - Show statistics");
    console.log();
    console.log("🔧 CLI Options Demonstrated:");
    console.log("   --graph-dir <path>                  - Specify graph directory");
    console.log("   --backup true                       - Create backup files");
    console.log("   --validate true                     - Validate Turtle content");
    console.log("   --merge true                        - Merge with existing data");

  } catch (error) {
    console.error("❌ CLI Demo failed:", error);
    throw error;
  }
}

// Run the demo
demonstrateCLIIntegration().catch((error) => {
  console.error("❌ Demo failed:", error);
  process.exit(1);
});
