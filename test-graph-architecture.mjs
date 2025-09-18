/**
 * GitVan Graph Architecture Test Suite
 * Comprehensive testing of the graph architecture system
 */

import { GitVanGraphArchitecture } from "../src/core/graph-architecture.mjs";
import { graphJobs } from "../src/jobs/graph-based-jobs.mjs";
import { graphCLI } from "../src/cli/graph.mjs";

console.log("🧪 Starting GitVan Graph Architecture Test Suite");
console.log("=".repeat(80));

async function testGraphArchitecture() {
  const results = {
    architecture: false,
    defaultGraphs: false,
    graphJobs: false,
    graphCLI: false,
    aiIntegration: false,
    packSystem: false,
    marketplace: false,
    daemon: false,
  };

  try {
    // Test 1: Graph Architecture Initialization
    console.log("\n🏗️ Testing Graph Architecture Initialization...");
    try {
      const graphArch = new GitVanGraphArchitecture();
      await graphArch.initialize();

      const arch = graphArch.getArchitecture();
      if (arch.initialized && arch.graphManager && arch.aiLoop) {
        console.log("✅ Graph architecture initialized successfully");
        results.architecture = true;
      } else {
        console.log("❌ Graph architecture initialization failed");
      }
    } catch (error) {
      console.log(`❌ Graph architecture test failed: ${error.message}`);
    }

    // Test 2: Default Graphs
    console.log("\n📊 Testing Default Graphs...");
    try {
      const graphArch = new GitVanGraphArchitecture();
      await graphArch.initialize();

      const defaultGraphs = ["project", "jobs", "packs", "ai", "marketplace"];

      let graphsWorking = 0;
      for (const graphName of defaultGraphs) {
        const graph = graphArch.graphManager.getDefaultGraph(graphName);
        if (graph && typeof graph.addTurtle === "function") {
          console.log(`✅ ${graphName} graph working`);
          graphsWorking++;
        } else {
          console.log(`❌ ${graphName} graph not working`);
        }
      }

      if (graphsWorking === defaultGraphs.length) {
        console.log("✅ All default graphs working");
        results.defaultGraphs = true;
      } else {
        console.log(
          `⚠️ ${graphsWorking}/${defaultGraphs.length} default graphs working`
        );
      }
    } catch (error) {
      console.log(`❌ Default graphs test failed: ${error.message}`);
    }

    // Test 3: Graph-Based Jobs
    console.log("\n🚀 Testing Graph-Based Jobs...");
    try {
      const availableJobs = Object.keys(graphJobs);
      console.log(`📋 Available jobs: ${availableJobs.join(", ")}`);

      let jobsWorking = 0;
      for (const jobName of availableJobs) {
        const job = graphJobs[jobName];
        if (job && typeof job.run === "function") {
          console.log(`✅ ${jobName} job available`);
          jobsWorking++;
        } else {
          console.log(`❌ ${jobName} job not available`);
        }
      }

      if (jobsWorking === availableJobs.length) {
        console.log("✅ All graph-based jobs available");
        results.graphJobs = true;
      } else {
        console.log(
          `⚠️ ${jobsWorking}/${availableJobs.length} graph-based jobs available`
        );
      }
    } catch (error) {
      console.log(`❌ Graph-based jobs test failed: ${error.message}`);
    }

    // Test 4: Graph CLI
    console.log("\n🔧 Testing Graph CLI...");
    try {
      const cliMethods = [
        "status",
        "query",
        "addData",
        "template",
        "analytics",
        "snapshot",
        "runJob",
        "ai",
        "pack",
        "marketplace",
        "daemon",
        "help",
      ];

      let cliMethodsWorking = 0;
      for (const method of cliMethods) {
        if (typeof graphCLI[method] === "function") {
          console.log(`✅ ${method} CLI method available`);
          cliMethodsWorking++;
        } else {
          console.log(`❌ ${method} CLI method not available`);
        }
      }

      if (cliMethodsWorking === cliMethods.length) {
        console.log("✅ All graph CLI methods available");
        results.graphCLI = true;
      } else {
        console.log(
          `⚠️ ${cliMethodsWorking}/${cliMethods.length} graph CLI methods available`
        );
      }
    } catch (error) {
      console.log(`❌ Graph CLI test failed: ${error.message}`);
    }

    // Test 5: AI Integration
    console.log("\n🤖 Testing AI Integration...");
    try {
      const graphArch = new GitVanGraphArchitecture();
      await graphArch.initialize();

      if (graphArch.aiLoop && graphArch.aiLoop.processTemplate) {
        console.log("✅ AI loop integration available");

        // Test AI template processing
        try {
          const result = await graphArch.processAITemplate(
            "test-template",
            { content: "test content" },
            { context: "test context" }
          );

          if (result && result.templateId === "test-template") {
            console.log("✅ AI template processing working");
            results.aiIntegration = true;
          } else {
            console.log("❌ AI template processing failed");
          }
        } catch (error) {
          console.log(
            `❌ AI template processing test failed: ${error.message}`
          );
        }
      } else {
        console.log("❌ AI loop integration not available");
      }
    } catch (error) {
      console.log(`❌ AI integration test failed: ${error.message}`);
    }

    // Test 6: Pack System
    console.log("\n📦 Testing Pack System...");
    try {
      const graphArch = new GitVanGraphArchitecture();
      await graphArch.initialize();

      if (graphArch.packSystem && graphArch.packSystem.registerPack) {
        console.log("✅ Pack system integration available");

        // Test pack registration
        try {
          const result = await graphArch.registerPack("test-pack", {
            name: "Test Pack",
            version: "1.0.0",
            description: "Test pack for testing",
          });

          if (result && result.packId === "test-pack") {
            console.log("✅ Pack registration working");
            results.packSystem = true;
          } else {
            console.log("❌ Pack registration failed");
          }
        } catch (error) {
          console.log(`❌ Pack registration test failed: ${error.message}`);
        }
      } else {
        console.log("❌ Pack system integration not available");
      }
    } catch (error) {
      console.log(`❌ Pack system test failed: ${error.message}`);
    }

    // Test 7: Marketplace
    console.log("\n🏪 Testing Marketplace...");
    try {
      const graphArch = new GitVanGraphArchitecture();
      await graphArch.initialize();

      if (graphArch.marketplace && graphArch.marketplace.searchMarketplace) {
        console.log("✅ Marketplace integration available");

        // Test marketplace search
        try {
          const result = await graphArch.searchMarketplace("test", {
            type: "pack",
          });

          if (Array.isArray(result)) {
            console.log("✅ Marketplace search working");
            results.marketplace = true;
          } else {
            console.log("❌ Marketplace search failed");
          }
        } catch (error) {
          console.log(`❌ Marketplace search test failed: ${error.message}`);
        }
      } else {
        console.log("❌ Marketplace integration not available");
      }
    } catch (error) {
      console.log(`❌ Marketplace test failed: ${error.message}`);
    }

    // Test 8: Daemon
    console.log("\n🔄 Testing Daemon...");
    try {
      const graphArch = new GitVanGraphArchitecture();
      await graphArch.initialize();

      if (graphArch.daemon && graphArch.daemon.processGitEvent) {
        console.log("✅ Daemon integration available");

        // Test Git event processing
        try {
          const result = await graphArch.processGitEvent("post-commit", {
            sha: "test-sha",
            message: "test commit",
            author: "test author",
            timestamp: new Date().toISOString(),
            files: ["test.js"],
          });

          if (result && result.processed) {
            console.log("✅ Git event processing working");
            results.daemon = true;
          } else {
            console.log("❌ Git event processing failed");
          }
        } catch (error) {
          console.log(`❌ Git event processing test failed: ${error.message}`);
        }
      } else {
        console.log("❌ Daemon integration not available");
      }
    } catch (error) {
      console.log(`❌ Daemon test failed: ${error.message}`);
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 GitVan Graph Architecture Test Results");
    console.log("=".repeat(80));

    const testResults = [
      { name: "Graph Architecture", passed: results.architecture },
      { name: "Default Graphs", passed: results.defaultGraphs },
      { name: "Graph-Based Jobs", passed: results.graphJobs },
      { name: "Graph CLI", passed: results.graphCLI },
      { name: "AI Integration", passed: results.aiIntegration },
      { name: "Pack System", passed: results.packSystem },
      { name: "Marketplace", passed: results.marketplace },
      { name: "Daemon", passed: results.daemon },
    ];

    let passedTests = 0;
    for (const test of testResults) {
      const status = test.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} ${test.name}`);
      if (test.passed) passedTests++;
    }

    console.log("=".repeat(80));
    console.log(
      `📈 Overall Results: ${passedTests}/${testResults.length} tests passed`
    );

    if (passedTests === testResults.length) {
      console.log("🎉 ALL GRAPH ARCHITECTURE TESTS PASSED!");
      console.log("✅ GitVan Graph Architecture is fully functional!");
    } else if (passedTests >= testResults.length * 0.8) {
      console.log(
        "✅ MOSTLY PASSED! Graph architecture is functional with minor issues."
      );
    } else {
      console.log("⚠️ MULTIPLE FAILURES! Graph architecture needs attention.");
    }

    console.log("=".repeat(80));

    return results;
  } catch (error) {
    console.error("❌ Graph architecture test suite failed:", error.message);
    console.error(error.stack);
    return results;
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGraphArchitecture().catch(console.error);
}

export { testGraphArchitecture };





