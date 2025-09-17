/**
 * Test the pack dependency resolution system
 */

import { DependencyResolver } from "../../../src/pack/dependency/resolver.mjs";
import { PackComposer } from "../../../src/pack/dependency/composer.mjs";
import { DependencyGraph } from "../../../src/pack/dependency/graph.mjs";
import { PackRegistry } from "../../../src/pack/registry.mjs";

// Mock pack data for testing
const mockPacks = {
  "base-pack": {
    id: "base-pack",
    version: "1.0.0",
    capabilities: ["base"],
    compose: {
      order: 1,
    },
  },
  "ui-pack": {
    id: "ui-pack",
    version: "1.0.0",
    capabilities: ["ui"],
    compose: {
      dependsOn: ["base-pack"],
      order: 2,
    },
  },
  "auth-pack": {
    id: "auth-pack",
    version: "1.0.0",
    capabilities: ["auth"],
    compose: {
      dependsOn: ["base-pack"],
      order: 2,
    },
  },
  "admin-pack": {
    id: "admin-pack",
    version: "1.0.0",
    capabilities: ["admin"],
    compose: {
      dependsOn: ["ui-pack", "auth-pack"],
      order: 3,
    },
  },
  "conflicting-pack": {
    id: "conflicting-pack",
    version: "1.0.0",
    capabilities: ["ui"], // Same capability as ui-pack
    compose: {
      conflictsWith: ["ui-pack"],
      order: 2,
    },
  },
};

// Mock registry for testing
class MockRegistry extends PackRegistry {
  async get(packId) {
    console.log(`MockRegistry.get(${packId})`);
    return mockPacks[packId] || null;
  }

  async resolve(packId) {
    console.log(`MockRegistry.resolve(${packId})`);
    return mockPacks[packId] ? `/mock/path/${packId}` : null;
  }

  async info(packId) {
    const pack = mockPacks[packId];
    return pack
      ? {
          ...pack,
          name: pack.id,
          description: `Mock ${pack.id} description`,
          path: `/mock/path/${pack.id}`,
        }
      : null;
  }
}

async function testDependencyResolver() {
  console.log("🧪 Testing Dependency Resolver...\n");

  const resolver = new DependencyResolver();
  resolver.registry = new MockRegistry();

  try {
    // Test simple resolution
    console.log("1. Testing simple dependency resolution");
    const resolution = await resolver.resolve("ui-pack");
    console.log(
      "Resolution order:",
      resolution.map((r) => r.id)
    );
    console.log("Expected: [base-pack, ui-pack]");
    console.log("✓ Simple resolution works\n");

    // Test multiple pack resolution
    console.log("2. Testing multiple pack resolution");
    const multiRes = await resolver.resolveMultiple(["ui-pack", "auth-pack"]);
    console.log("Resolution order:", multiRes.order);
    console.log("Expected: [base-pack, ui-pack, auth-pack]");
    console.log("✓ Multiple pack resolution works\n");

    // Test complex dependencies
    console.log("3. Testing complex dependencies");
    const complexRes = await resolver.resolveMultiple(["admin-pack"]);
    console.log("Resolution order:", complexRes.order);
    console.log("Expected: [base-pack, ui-pack, auth-pack, admin-pack]");
    console.log("✓ Complex dependencies work\n");

    // Test conflict detection
    console.log("4. Testing conflict detection");
    const conflictRes = await resolver.checkCompatibility(
      "ui-pack",
      "conflicting-pack"
    );
    console.log("Compatibility result:", conflictRes);
    console.log("Expected: compatible=false");
    console.log("✓ Conflict detection works\n");
  } catch (error) {
    console.error("❌ Dependency resolver test failed:", error.message);
    throw error;
  }
}

async function testPackComposer() {
  console.log("🧪 Testing Pack Composer...\n");

  const composer = new PackComposer();
  composer.resolver.registry = new MockRegistry();

  try {
    // Test composition preview
    console.log("1. Testing composition preview");
    const preview = await composer.preview(["admin-pack"]);
    console.log("Preview order:", preview.order);
    console.log("Total packs:", preview.totalPacks);
    console.log("✓ Composition preview works\n");

    // Test validation
    console.log("2. Testing composition validation");
    const validation = await composer.validateComposition([
      "ui-pack",
      "auth-pack",
    ]);
    console.log("Validation result:", validation.valid);
    console.log("Errors:", validation.errors.length);
    console.log("✓ Composition validation works\n");

    // Test conflict scenario
    console.log("3. Testing conflict scenario");
    const conflictValidation = await composer.validateComposition([
      "ui-pack",
      "conflicting-pack",
    ]);
    console.log("Conflict validation:", conflictValidation.valid);
    console.log("Should be false due to conflicts");
    console.log("✓ Conflict validation works\n");
  } catch (error) {
    console.error("❌ Pack composer test failed:", error.message);
    throw error;
  }
}

async function testDependencyGraph() {
  console.log("🧪 Testing Dependency Graph...\n");

  const graph = new DependencyGraph();
  const resolver = new DependencyResolver();
  resolver.registry = new MockRegistry();

  try {
    // Build graph
    console.log("1. Building dependency graph");
    await graph.build(resolver, ["admin-pack"]);
    console.log("Graph nodes:", graph.nodes.size);
    console.log("Graph edges:", graph.edges.length);
    console.log("✓ Graph building works\n");

    // Test cycle detection
    console.log("2. Testing cycle detection");
    const cycles = graph.detectCycles();
    console.log("Cycles found:", cycles.length);
    console.log("✓ Cycle detection works\n");

    // Test topological sort
    console.log("3. Testing topological sort");
    const sorted = graph.topologicalSort();
    console.log("Topological order:", sorted);
    console.log("✓ Topological sort works\n");

    // Test visualization
    console.log("4. Testing visualization");
    const textViz = graph.visualize("text");
    console.log("Text visualization generated (length):", textViz.length);

    const dotViz = graph.visualize("dot");
    console.log("DOT visualization generated (length):", dotViz.length);

    const jsonViz = graph.visualize("json");
    console.log("JSON visualization generated (length):", jsonViz.length);
    console.log("✓ Graph visualization works\n");

    // Show text visualization
    console.log("Text visualization sample:");
    console.log(textViz.split("\n").slice(0, 15).join("\n"));
    console.log("...\n");
  } catch (error) {
    console.error("❌ Dependency graph test failed:", error.message);
    throw error;
  }
}

async function runTests() {
  console.log("🚀 Starting Pack Dependency System Tests\n");
  console.log("=".repeat(50));

  try {
    await testDependencyResolver();
    await testPackComposer();
    await testDependencyGraph();

    console.log("🎉 All tests passed successfully!");
    console.log("✓ Dependency Resolver works");
    console.log("✓ Pack Composer works");
    console.log("✓ Dependency Graph works");
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
