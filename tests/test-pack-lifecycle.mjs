/**
 * Test Pack Lifecycle Management with MemFS
 * Tests the complete pack apply, plan, update, and remove operations using in-memory file system
 */

import { PackApplier } from "../src/pack/applier.mjs";
import { PackPlanner } from "../src/pack/planner.mjs";
import { PackManager } from "../src/pack/manager.mjs";
import { Pack } from "../src/pack/pack.mjs";
import { vol } from "memfs";
import { createMemFSTestEnvironment } from "./memfs-test-utils.mjs";

const testPackPath = "/test-pack";
const testTargetDir = "/test-target";

async function setupTestEnvironment() {
  // Create in-memory test environment
  const env = createMemFSTestEnvironment({
    testDir: testTargetDir,
    files: {
      "package.json": JSON.stringify(
        {
          name: "test-project",
          version: "1.0.0",
          scripts: {
            start: "node index.js",
          },
        },
        null,
        2
      ),
    },
  });

  console.log("✅ Test environment setup complete");
  return env;
}

async function testPackLoading() {
  console.log("\n🧪 Testing pack loading...");

  try {
    const pack = new Pack(testPackPath);
    await pack.load();

    console.log(`✅ Pack loaded: ${pack.manifest.id}@${pack.manifest.version}`);
    console.log(`   Description: ${pack.manifest.description}`);
    console.log(
      `   Provides: ${Object.keys(pack.manifest.provides).join(", ")}`
    );

    return pack;
  } catch (error) {
    console.error(`❌ Pack loading failed: ${error.message}`);
    throw error;
  }
}

async function testPackPlanning(pack, env) {
  console.log("\n🧪 Testing pack planning...");

  try {
    const planner = new PackPlanner();
    const plan = await planner.plan(pack, env.testDir, {
      projectName: "test-lifecycle-project",
    });

    console.log(`✅ Plan created with status: ${plan.status}`);
    console.log(`   Steps: ${plan.plan.steps.length}`);
    console.log(`   Estimated changes: ${plan.impacts.estimatedChanges}`);
    console.log(`   Creates: ${plan.impacts.creates.length} files`);
    console.log(`   Modifies: ${plan.impacts.modifies.length} files`);

    if (plan.conflicts.length > 0) {
      console.log(`   ⚠️  Conflicts: ${plan.conflicts.length}`);
    }

    return plan;
  } catch (error) {
    console.error(`❌ Pack planning failed: ${error.message}`);
    throw error;
  }
}

async function testPackApplication() {
  console.log("\n🧪 Testing pack application...");

  try {
    const applier = new PackApplier();
    const result = await applier.apply(testPackPath, testTargetDir, {
      projectName: "test-lifecycle-project",
    });

    console.log(`✅ Pack applied with status: ${result.status}`);
    console.log(`   Applied: ${result.applied?.length || 0} items`);

    if (result.errors?.length > 0) {
      console.log(`   ⚠️  Errors: ${result.errors.length}`);
      result.errors.forEach((err) => console.log(`      - ${err.error}`));
    }

    // Verify files were created
    const expectedFiles = ["README.md", "config.json", "jobs/test-job.mjs"];

    for (const file of expectedFiles) {
      const filePath = join(testTargetDir, file);
      if (existsSync(filePath)) {
        console.log(`   ✅ Created: ${file}`);
      } else {
        console.log(`   ❌ Missing: ${file}`);
      }
    }

    return result;
  } catch (error) {
    console.error(`❌ Pack application failed: ${error.message}`);
    throw error;
  }
}

async function testPackStatus() {
  console.log("\n🧪 Testing pack status...");

  try {
    const manager = new PackManager();
    const status = await manager.status(testTargetDir);

    console.log(`✅ Pack status retrieved`);
    console.log(`   Total installed: ${status.total}`);

    for (const pack of status.installed) {
      console.log(`   - ${pack.id}@${pack.version} (${pack.status})`);
    }

    return status;
  } catch (error) {
    console.error(`❌ Pack status failed: ${error.message}`);
    throw error;
  }
}

async function testPackUpdate() {
  console.log("\n🧪 Testing pack update...");

  try {
    const manager = new PackManager();
    const result = await manager.update(testPackPath, testTargetDir, {
      projectName: "updated-project-name",
    });

    console.log(`✅ Pack update completed with status: ${result.status}`);

    if (result.status === "CURRENT") {
      console.log(`   Pack is already up to date`);
    } else if (result.updated) {
      console.log(
        `   Updated from ${result.previousVersion} to ${result.pack?.manifest?.version}`
      );
    }

    return result;
  } catch (error) {
    console.error(`❌ Pack update failed: ${error.message}`);
    throw error;
  }
}

async function testPackRemoval() {
  console.log("\n🧪 Testing pack removal...");

  try {
    const manager = new PackManager();
    const result = await manager.remove("test-pack", testTargetDir);

    console.log(`✅ Pack removal completed with status: ${result.status}`);
    console.log(`   Removed: ${result.removed?.length || 0} items`);

    if (result.errors?.length > 0) {
      console.log(`   ⚠️  Errors: ${result.errors.length}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Pack removal failed: ${error.message}`);
    throw error;
  }
}

async function runAllTests() {
  console.log("🚀 Starting Pack Lifecycle Tests with MemFS\n");

  try {
    const env = await setupTestEnvironment();

    // Test pack loading
    const pack = await testPackLoading();
    if (!pack) {
      console.log("❌ Cannot continue without a valid pack");
      return;
    }

    // Test pack planning
    await testPackPlanning(pack, env);

    // Test pack application
    await testPackApplication(pack, env);

    // Test pack status
    await testPackStatus(pack, env);

    // Test pack update
    await testPackUpdate(pack, env);

    // Test pack removal
    await testPackRemoval(pack, env);

    console.log("\n🎉 All pack lifecycle tests completed successfully!");

    // Cleanup
    env.cleanup();
  } catch (error) {
    console.error(`\n💥 Test suite failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
