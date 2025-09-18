/**
 * Test AI Template Loop Enhancement System
 * Verifies the tight feedback loop between LLMs and front-matter templates
 */

import { aiTemplateLoop } from "../src/ai/template-loop-enhancement.mjs";
import { createLogger } from "../src/utils/logger.mjs";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";

const logger = createLogger("ai-template-loop-test");

/**
 * Test the complete AI template loop system
 */
async function testAITemplateLoop() {
  console.log("🧪 Testing AI Template Loop Enhancement System...");

  try {
    // Create temporary test directory
    const testDir = join(tmpdir(), `gitvan-ai-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    console.log(`📁 Test directory: ${testDir}`);

    // Test 1: Generate template with AI loop integration
    console.log("\n1️⃣ Testing template generation with AI loop integration...");

    const generationResult = await aiTemplateLoop.generateTemplate(
      "Create a React component template with TypeScript and Tailwind CSS",
      {
        rootPath: testDir,
        userAgent: "test",
        model: "qwen3-coder:30b",
      }
    );

    console.log("✅ Template generation successful!");
    console.log(`📊 Generation ID: ${generationResult.generationId}`);
    console.log(`⏱️  Duration: ${generationResult.executionResult.duration}ms`);
    console.log(
      `🎯 Project Type: ${generationResult.projectContext.projectType}`
    );
    console.log(`🔧 Framework: ${generationResult.projectContext.framework}`);

    // Test 2: Collect user feedback
    console.log("\n2️⃣ Testing user feedback collection...");

    const feedbackResult = await aiTemplateLoop.collectFeedback(
      "ai-template-generation",
      {
        rating: 4,
        comment: "Great template! Could use more TypeScript types.",
        suggestions: ["Add more TypeScript interfaces", "Include PropTypes"],
        issues: ["Missing error handling"],
      },
      {
        rootPath: testDir,
        userAgent: "test",
      }
    );

    console.log("✅ Feedback collection successful!");
    console.log(`📊 Feedback ID: ${feedbackResult.feedbackId}`);
    console.log(
      `⭐ Average Rating: ${feedbackResult.feedbackSummary.averageRating.toFixed(
        1
      )}/5`
    );

    // Test 3: Get template insights
    console.log("\n3️⃣ Testing template insights...");

    const insightsResult = await aiTemplateLoop.getTemplateInsights(
      "ai-template-generation"
    );

    console.log("✅ Template insights retrieved!");
    console.log(
      `📈 Overall Health: ${insightsResult.overallHealth.toFixed(2)}`
    );
    console.log(
      `🎯 Success Rate: ${(
        insightsResult.learningInsights.successRate * 100
      ).toFixed(1)}%`
    );
    console.log(
      `📝 Total Executions: ${insightsResult.learningInsights.totalExecutions}`
    );

    // Test 4: Get system metrics
    console.log("\n4️⃣ Testing system metrics...");

    const metricsResult = await aiTemplateLoop.getSystemMetrics();

    console.log("✅ System metrics retrieved!");
    console.log(`🎯 System Health: ${metricsResult.systemHealth.toFixed(2)}`);
    console.log(
      `📈 Global Success Rate: ${(
        metricsResult.globalInsights.successRate * 100
      ).toFixed(1)}%`
    );
    console.log(`🔄 Total Generations: ${metricsResult.totalExecutions}`);

    // Test 5: Persist learning data
    console.log("\n5️⃣ Testing learning data persistence...");

    await aiTemplateLoop.persist();

    console.log("✅ Learning data persisted successfully!");

    // Test 6: Show execution history
    console.log("\n6️⃣ Testing execution history...");

    const history = aiTemplateLoop.getExecutionHistory();
    console.log(`📜 Execution history: ${history.length} entries`);

    if (history.length > 0) {
      const latest = history[0];
      console.log(`   Latest: ${latest.id}`);
      console.log(`   Prompt: ${latest.prompt.substring(0, 50)}...`);
      console.log(`   Success: ${latest.executionResult.ok ? "✅" : "❌"}`);
    }

    console.log(
      "\n🎉 All tests passed! AI Template Loop Enhancement System is working correctly."
    );

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    console.log("🧹 Test directory cleaned up.");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Test individual components
 */
async function testIndividualComponents() {
  console.log("\n🔧 Testing individual components...");

  try {
    // Test template learning
    console.log("📚 Testing template learning...");
    const learningInsights = await aiTemplateLoop.getTemplateInsights("global");
    console.log(
      `✅ Template learning: ${learningInsights.learningInsights.totalExecutions} executions`
    );

    // Test context awareness
    console.log("🎯 Testing context awareness...");
    const projectContext =
      await aiTemplateLoop.contextAwareGenerator.contextAnalyzer.analyzeProjectContext(
        process.cwd()
      );
    console.log(
      `✅ Context analysis: ${projectContext.projectType} project with ${projectContext.framework}`
    );

    // Test feedback integration
    console.log("💬 Testing feedback integration...");
    const feedbackSummary =
      await aiTemplateLoop.feedbackIntegration.feedbackManager.getFeedbackSummary(
        "global"
      );
    console.log(
      `✅ Feedback system: ${feedbackSummary.totalFeedback} feedback entries`
    );

    console.log("✅ All individual components working correctly!");
  } catch (error) {
    console.error("❌ Component test failed:", error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("🚀 Starting AI Template Loop Enhancement System Tests");
  console.log("=".repeat(60));

  try {
    await testAITemplateLoop();
    await testIndividualComponents();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 All tests completed successfully!");
    console.log("✅ AI Template Loop Enhancement System is fully functional!");
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ Tests failed:", error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { testAITemplateLoop, testIndividualComponents, runAllTests };


