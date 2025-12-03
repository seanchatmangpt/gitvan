/**
 * Comprehensive 360-Degree Test Runner for useGraph Composable
 * Runs all tests and provides a complete assessment
 */

import { runBasic360Test } from "./test-use-graph-basic-360.mjs";
import { testAITemplateLoopIntegration } from "./test-ai-template-loop-integration.mjs";

console.log("🚀 Starting Comprehensive 360-Degree Test Suite");
console.log("=".repeat(80));

async function runComprehensive360TestSuite() {
  const overallResults = {
    basicTests: null,
    aiIntegrationTests: null,
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
    },
  };

  try {
    // Run Basic 360-Degree Tests
    console.log("\n📊 Running Basic 360-Degree Tests...");
    overallResults.basicTests = await runBasic360Test();

    // Run AI Template Loop Integration Tests
    console.log("\n🤖 Running AI Template Loop Integration Tests...");
    overallResults.aiIntegrationTests = await testAITemplateLoopIntegration();

    // Calculate overall summary
    const basicTestCount = Object.keys(overallResults.basicTests).length;
    const aiTestCount = Object.keys(overallResults.aiIntegrationTests).length;
    overallResults.summary.totalTests = basicTestCount + aiTestCount;

    const basicPassed = Object.values(overallResults.basicTests).filter(
      Boolean
    ).length;
    const aiPassed = Object.values(overallResults.aiIntegrationTests).filter(
      Boolean
    ).length;
    overallResults.summary.passedTests = basicPassed + aiPassed;
    overallResults.summary.failedTests =
      overallResults.summary.totalTests - overallResults.summary.passedTests;

    // Final Summary
    console.log("\n" + "=".repeat(80));
    console.log("🎯 COMPREHENSIVE 360-DEGREE TEST SUITE RESULTS");
    console.log("=".repeat(80));

    console.log("\n📊 Basic Functionality Tests:");
    const basicTestNames = [
      { key: "csvToRDF", name: "CSV to RDF Conversion" },
      { key: "useGraph", name: "useGraph Composable" },
      { key: "fileStructure", name: "File Structure" },
      { key: "dataFiles", name: "Data Files" },
      { key: "jobIntegration", name: "Job Integration" },
    ];

    for (const test of basicTestNames) {
      const passed = overallResults.basicTests[test.key];
      const status = passed ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${status} ${test.name}`);
    }

    console.log("\n🤖 AI Template Loop Integration Tests:");
    const aiTestNames = [
      { key: "templateLearning", name: "Template Learning System" },
      { key: "promptEvolution", name: "Prompt Evolution Engine" },
      { key: "contextAwareGeneration", name: "Context-Aware AI Generation" },
      { key: "templateOptimization", name: "Template Optimization" },
      { key: "userFeedbackIntegration", name: "User Feedback Integration" },
      { key: "graphIntegration", name: "useGraph AI Integration" },
    ];

    for (const test of aiTestNames) {
      const passed = overallResults.aiIntegrationTests[test.key];
      const status = passed ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${status} ${test.name}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("📈 OVERALL SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${overallResults.summary.totalTests}`);
    console.log(`Passed: ${overallResults.summary.passedTests}`);
    console.log(`Failed: ${overallResults.summary.failedTests}`);
    console.log(
      `Success Rate: ${(
        (overallResults.summary.passedTests /
          overallResults.summary.totalTests) *
        100
      ).toFixed(1)}%`
    );

    if (
      overallResults.summary.passedTests === overallResults.summary.totalTests
    ) {
      console.log(
        "\n🎉 ALL TESTS PASSED! useGraph composable is fully functional and ready for production!"
      );
    } else if (
      overallResults.summary.passedTests >=
      overallResults.summary.totalTests * 0.8
    ) {
      console.log(
        "\n✅ MOSTLY PASSED! useGraph composable is functional with minor issues."
      );
    } else {
      console.log(
        "\n⚠️ MULTIPLE FAILURES! useGraph composable needs attention before production use."
      );
    }

    console.log("=".repeat(80));

    // Recommendations
    console.log("\n💡 RECOMMENDATIONS:");
    if (
      overallResults.summary.passedTests === overallResults.summary.totalTests
    ) {
      console.log("✅ Ready for production deployment");
      console.log("✅ Ready for AI Template Loop integration");
      console.log("✅ Ready for advanced RDF/SPARQL workflows");
    } else {
      console.log("🔧 Fix failing tests before production use");
      console.log("🔧 Review AI Template Loop integration");
      console.log("🔧 Test with real-world data scenarios");
    }

    console.log("=".repeat(80));

    return overallResults;
  } catch (error) {
    console.error("❌ Comprehensive test suite failed:", error.message);
    console.error(error.stack);
    return overallResults;
  }
}

// Run comprehensive test suite if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensive360TestSuite().catch(console.error);
}

export { runComprehensive360TestSuite };





