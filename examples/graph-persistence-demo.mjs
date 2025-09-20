#!/usr/bin/env node

/**
 * GitVan Graph Persistence Demo
 *
 * This script demonstrates the GitVan Graph Persistence feature
 * as described in the C4 model. It shows how to:
 * - Initialize a default graph
 * - Add data to the graph
 * - Save and load graph data
 * - Use the persistence helper
 */

import { useTurtle } from "../src/composables/turtle.mjs";
import { withGitVan } from "../src/composables/ctx.mjs";
import { createPersistenceHelper } from "../src/utils/persistence-helper.mjs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

async function demonstratePersistence() {
  console.log("🚀 GitVan Graph Persistence Demo");
  console.log("================================\n");

  // Create a temporary directory for the demo
  const demoDir = join(tmpdir(), `gitvan-persistence-demo-${randomUUID()}`);
  console.log(`📁 Demo directory: ${demoDir}\n`);

  // Create context for GitVan
  const context = {
    cwd: demoDir,
    root: demoDir,
  };

  await withGitVan(context, async () => {
    // Create the demo directory first
    const fs = await import("node:fs/promises");
    await fs.mkdir(demoDir, { recursive: true });

    // Initialize the turtle composable
    console.log("1️⃣  Initializing useTurtle composable...");
    const turtle = await useTurtle({ graphDir: demoDir });
    console.log(`   Graph directory: ${turtle.getGraphDir()}`);
    console.log(`   URI roots:`, turtle.getUriRoots());
    console.log();

    // Initialize default graph
    console.log("2️⃣  Initializing default graph...");
    const initResult = await turtle.initializeDefaultGraph();
    console.log(`   ✅ Default graph initialized: ${initResult.path}`);
    console.log(`   📊 Size: ${initResult.bytes} bytes`);
    console.log(`   🆕 Created: ${initResult.created}`);
    console.log();

    // Add some sample data to the graph
    console.log("3️⃣  Adding sample data to graph...");
    const { Store, DataFactory } = await import("n3");
    const { namedNode, literal } = DataFactory;

    // Add project information
    turtle.store.addQuad(
      namedNode("https://gitvan.dev/project/demo"),
      namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      namedNode("https://gitvan.dev/ontology#Project")
    );

    turtle.store.addQuad(
      namedNode("https://gitvan.dev/project/demo"),
      namedNode("http://purl.org/dc/terms/title"),
      literal("GitVan Persistence Demo")
    );

    turtle.store.addQuad(
      namedNode("https://gitvan.dev/project/demo"),
      namedNode("http://purl.org/dc/terms/description"),
      literal("Demonstration of GitVan graph persistence capabilities")
    );

    turtle.store.addQuad(
      namedNode("https://gitvan.dev/project/demo"),
      namedNode("http://purl.org/dc/terms/created"),
      literal(new Date().toISOString())
    );

    // Add some workflow data
    turtle.store.addQuad(
      namedNode("https://gitvan.dev/workflow/demo-workflow"),
      namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      namedNode("https://gitvan.dev/ontology#Workflow")
    );

    turtle.store.addQuad(
      namedNode("https://gitvan.dev/workflow/demo-workflow"),
      namedNode("http://purl.org/dc/terms/title"),
      literal("Demo Workflow")
    );

    turtle.store.addQuad(
      namedNode("https://gitvan.dev/workflow/demo-workflow"),
      namedNode("https://gitvan.dev/ontology#belongsToProject"),
      namedNode("https://gitvan.dev/project/demo")
    );

    const stats = turtle.getStoreStats();
    console.log(`   📊 Store statistics:`);
    console.log(`      Quads: ${stats.quads}`);
    console.log(`      Subjects: ${stats.subjects}`);
    console.log(`      Predicates: ${stats.predicates}`);
    console.log(`      Objects: ${stats.objects}`);
    console.log();

    // Save the graph to a named file
    console.log("4️⃣  Saving graph to named file...");
    const saveResult = await turtle.saveGraph("demo-data", {
      validate: true,
      createBackup: false,
      prefixes: {
        gv: "https://gitvan.dev/ontology#",
        dct: "http://purl.org/dc/terms/",
      },
    });
    console.log(`   ✅ Graph saved to: ${saveResult.path}`);
    console.log(`   📊 Size: ${saveResult.bytes} bytes`);
    console.log();

    // Save to default location
    console.log("5️⃣  Saving graph to default location...");
    const defaultSaveResult = await turtle.saveDefaultGraph({
      validate: true,
      createBackup: true,
    });
    console.log(`   ✅ Default graph saved to: ${defaultSaveResult.path}`);
    console.log(`   📊 Size: ${defaultSaveResult.bytes} bytes`);
    console.log();

    // List available files
    console.log("6️⃣  Listing available Turtle files...");
    const files = await turtle.listGraphFiles();
    console.log(`   📁 Found ${files.length} Turtle files:`);
    files.forEach((file) => console.log(`      - ${file}`));
    console.log();

    // Demonstrate loading
    console.log("7️⃣  Demonstrating graph loading...");

    // Clear the store
    turtle.store.removeQuads([...turtle.store]);
    console.log(`   🧹 Store cleared. Current quads: ${turtle.store.size}`);

    // Load from named file
    const loadResult = await turtle.loadGraph("demo-data", {
      validate: true,
      merge: false,
    });
    console.log(`   ✅ Graph loaded from: ${loadResult.path}`);
    console.log(`   📊 Loaded quads: ${loadResult.quads}`);

    // Verify the data was loaded correctly
    const loadedStats = turtle.getStoreStats();
    console.log(`   📊 Loaded store statistics:`);
    console.log(`      Quads: ${loadedStats.quads}`);
    console.log(`      Subjects: ${loadedStats.subjects}`);
    console.log();

    // Demonstrate persistence helper directly
    console.log("8️⃣  Demonstrating PersistenceHelper directly...");
    const persistence = createPersistenceHelper({
      logger: {
        debug: (msg) => console.log(`   🔍 DEBUG: ${msg}`),
        error: (msg) => console.log(`   ❌ ERROR: ${msg}`),
        warn: (msg) => console.log(`   ⚠️  WARN: ${msg}`),
      },
    });

    // Check if files exist
    const demoFileExists = await persistence.fileExists(
      join(demoDir, "demo-data.ttl")
    );
    const defaultFileExists = await persistence.fileExists(
      join(demoDir, "default.ttl")
    );
    console.log(`   📄 demo-data.ttl exists: ${demoFileExists}`);
    console.log(`   📄 default.ttl exists: ${defaultFileExists}`);

    // Get file statistics
    const demoStats = await persistence.getFileStats(
      join(demoDir, "demo-data.ttl")
    );
    const defaultStats = await persistence.getFileStats(
      join(demoDir, "default.ttl")
    );
    console.log(
      `   📊 demo-data.ttl stats: ${demoStats.size} bytes, modified ${demoStats.mtime}`
    );
    console.log(
      `   📊 default.ttl stats: ${defaultStats.size} bytes, modified ${defaultStats.mtime}`
    );
    console.log();

    // Demonstrate C4 Model Flow
    console.log("9️⃣  Demonstrating C4 Model Flow...");
    console.log("   Level 1: Developer → GitVan → File System");
    console.log("   Level 2: Workflow Engine → Graph Module → FS I/O Adapter");
    console.log("   Level 3: useTurtle → RdfEngine → PersistenceHelper");
    console.log(
      "   Level 4: Save Flow: saveGraph() → serializeTurtle() → writeTurtleFile()"
    );
    console.log();

    console.log("✅ Demo completed successfully!");
    console.log(`📁 All files saved in: ${demoDir}`);
    console.log(
      "🧹 Clean up: Files will be automatically cleaned up on system restart"
    );
  });
}

// Run the demo
demonstratePersistence().catch((error) => {
  console.error("❌ Demo failed:", error);
  process.exit(1);
});
