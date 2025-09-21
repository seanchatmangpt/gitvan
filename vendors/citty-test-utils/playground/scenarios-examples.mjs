// examples/scenarios-examples.mjs
import { scenarios } from "../scenarios.js";

async function demonstrateScenarios() {
  console.log("🎯 Demonstrating citty-test-utils Scenarios Pack\n");

  try {
    // Basic scenarios
    console.log("📋 Basic Scenarios:");

    console.log("  Testing help scenario...");
    const helpResult = await scenarios.help("local").execute();
    console.log(`  ✅ Help: ${helpResult.success}`);

    console.log("  Testing version scenario...");
    const versionResult = await scenarios.version("local").execute();
    console.log(`  ✅ Version: ${versionResult.success}`);

    console.log("  Testing invalid command scenario...");
    const invalidResult = await scenarios
      .invalidCommand("nope", "local")
      .execute();
    console.log(`  ✅ Invalid Command: ${invalidResult.success}`);

    // Subcommand testing
    console.log("\n🔧 Subcommand Testing:");

    console.log("  Testing subcommand scenario...");
    const subcommandResult = await scenarios
      .subcommand("ensure", [], "local")
      .execute();
    console.log(`  ✅ Subcommand: ${subcommandResult.success}`);

    // Concurrent testing
    console.log("\n⚡ Concurrent Testing:");

    console.log("  Testing concurrent execution...");
    const concurrentResult = await scenarios
      .concurrent(
        [{ args: ["--help"] }, { args: ["--version"] }, { args: ["ensure"] }],
        "local"
      )
      .execute();
    console.log(`  ✅ Concurrent: ${concurrentResult.success}`);
    console.log(
      `  📊 Executed ${concurrentResult.results.length} commands concurrently`
    );

    // Error testing
    console.log("\n❌ Error Testing:");

    console.log("  Testing error case...");
    const errorResult = await scenarios
      .errorCase(["invalid-command"], /Unknown command/i, "local")
      .execute();
    console.log(`  ✅ Error Case: ${errorResult.success}`);

    console.log("\n🎉 All scenarios demonstrated successfully!");

    // Show usage patterns
    console.log("\n📖 Usage Patterns:");
    console.log("  // Basic usage");
    console.log("  await scenarios.help().execute()");
    console.log('  await scenarios.version("cleanroom").execute()');
    console.log("");
    console.log("  // With custom parameters");
    console.log('  await scenarios.initProject("my-app").execute()');
    console.log('  await scenarios.configSet("theme", "dark").execute()');
    console.log("");
    console.log("  // Robustness testing");
    console.log('  await scenarios.idempotent(["init", "test"]).execute()');
    console.log(
      '  await scenarios.concurrent([{args: ["--help"]}, {args: ["--version"]}]).execute()'
    );
  } catch (error) {
    console.error("❌ Scenario demonstration failed:", error.message);
    process.exit(1);
  }
}

// Run demonstration
demonstrateScenarios();
