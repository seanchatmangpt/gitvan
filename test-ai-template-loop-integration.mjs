/**
 * AI Template Loop Integration Test for useGraph Composable
 * Tests integration with GitVan's AI Template Loop Enhancement system
 */

console.log("🤖 Testing useGraph Integration with AI Template Loop System");
console.log("=".repeat(60));

async function testAITemplateLoopIntegration() {
  const results = {
    templateLearning: false,
    promptEvolution: false,
    contextAwareGeneration: false,
    templateOptimization: false,
    userFeedbackIntegration: false,
    graphIntegration: false,
  };

  try {
    // Test 1: Template Learning System Integration
    console.log("\n🧠 Testing Template Learning System Integration...");
    try {
      const fs = await import("node:fs/promises");

      // Check if AI template learning system exists
      const templateLearningPath = "src/ai/template-learning.mjs";
      try {
        await fs.access(templateLearningPath);
        console.log("✅ Template Learning System exists");

        // Check if it can be imported
        const { TemplateLearningSystem } = await import(
          "./src/ai/template-learning.mjs"
        );
        if (TemplateLearningSystem) {
          console.log("✅ Template Learning System can be imported");
          results.templateLearning = true;
        } else {
          console.log("❌ Template Learning System import failed");
        }
      } catch (error) {
        console.log("❌ Template Learning System not found");
      }
    } catch (error) {
      console.log(`❌ Template Learning test failed: ${error.message}`);
    }

    // Test 2: Prompt Evolution Engine Integration
    console.log("\n🔄 Testing Prompt Evolution Engine Integration...");
    try {
      const fs = await import("node:fs/promises");

      const promptEvolutionPath = "src/ai/prompt-evolution.mjs";
      try {
        await fs.access(promptEvolutionPath);
        console.log("✅ Prompt Evolution Engine exists");

        const { PromptEvolutionEngine } = await import(
          "./src/ai/prompt-evolution.mjs"
        );
        if (PromptEvolutionEngine) {
          console.log("✅ Prompt Evolution Engine can be imported");
          results.promptEvolution = true;
        } else {
          console.log("❌ Prompt Evolution Engine import failed");
        }
      } catch (error) {
        console.log("❌ Prompt Evolution Engine not found");
      }
    } catch (error) {
      console.log(`❌ Prompt Evolution test failed: ${error.message}`);
    }

    // Test 3: Context-Aware AI Generation Integration
    console.log("\n🎯 Testing Context-Aware AI Generation Integration...");
    try {
      const fs = await import("node:fs/promises");

      const contextAwarePath = "src/ai/context-aware-generation.mjs";
      try {
        await fs.access(contextAwarePath);
        console.log("✅ Context-Aware AI Generation exists");

        const { ContextAwareGenerator } = await import(
          "./src/ai/context-aware-generation.mjs"
        );
        if (ContextAwareGenerator) {
          console.log("✅ Context-Aware AI Generation can be imported");
          results.contextAwareGeneration = true;
        } else {
          console.log("❌ Context-Aware AI Generation import failed");
        }
      } catch (error) {
        console.log("❌ Context-Aware AI Generation not found");
      }
    } catch (error) {
      console.log(
        `❌ Context-Aware AI Generation test failed: ${error.message}`
      );
    }

    // Test 4: Template Optimization Integration
    console.log("\n⚡ Testing Template Optimization Integration...");
    try {
      const fs = await import("node:fs/promises");

      const templateOptimizationPath = "src/ai/template-optimization.mjs";
      try {
        await fs.access(templateOptimizationPath);
        console.log("✅ Template Optimization exists");

        const { TemplateOptimizer } = await import(
          "./src/ai/template-optimization.mjs"
        );
        if (TemplateOptimizer) {
          console.log("✅ Template Optimization can be imported");
          results.templateOptimization = true;
        } else {
          console.log("❌ Template Optimization import failed");
        }
      } catch (error) {
        console.log("❌ Template Optimization not found");
      }
    } catch (error) {
      console.log(`❌ Template Optimization test failed: ${error.message}`);
    }

    // Test 5: User Feedback Integration
    console.log("\n💬 Testing User Feedback Integration...");
    try {
      const fs = await import("node:fs/promises");

      const userFeedbackPath = "src/ai/user-feedback-integration.mjs";
      try {
        await fs.access(userFeedbackPath);
        console.log("✅ User Feedback Integration exists");

        const { UserFeedbackSystem } = await import(
          "./src/ai/user-feedback-integration.mjs"
        );
        if (UserFeedbackSystem) {
          console.log("✅ User Feedback Integration can be imported");
          results.userFeedbackIntegration = true;
        } else {
          console.log("❌ User Feedback Integration import failed");
        }
      } catch (error) {
        console.log("❌ User Feedback Integration not found");
      }
    } catch (error) {
      console.log(`❌ User Feedback Integration test failed: ${error.message}`);
    }

    // Test 6: useGraph Integration with AI Template Loop
    console.log("\n🔗 Testing useGraph Integration with AI Template Loop...");
    try {
      // Test if useGraph can work with AI template loop components
      const { useGraph } = await import("./src/composables/graph.mjs");

      if (typeof useGraph === "function") {
        console.log("✅ useGraph composable available for integration");

        // Test if useGraph can handle AI-generated templates
        const aiGeneratedTemplate = `---
baseIRI: "https://example.org/"
queryName: "ai_results"
entityType: "AI_Generated"
ai_generated: true
prompt: "Generate a report from the data"
---

# AI Generated Report

## Summary
Total records: {{ ai_results | length }}

## AI Analysis
{% for record in ai_results %}
- **{{ record.name }}**: {{ record.value }}
{% endfor %}

## AI Insights
This report was generated using AI template loop enhancement.`;

        // Test if useGraph can process AI-generated templates
        try {
          const graph = await useGraph({ baseIRI: "https://example.org/" });
          await graph.setTemplate(aiGeneratedTemplate);
          console.log("✅ useGraph can process AI-generated templates");

          // Test if useGraph can work with AI-generated data
          const aiGeneratedData = `name,value,confidence
AI_Insight_1,High,0.95
AI_Insight_2,Medium,0.78
AI_Insight_3,Low,0.45`;

          await graph.addTurtle(
            csvToRDF(aiGeneratedData, "https://example.org/", "AI_Generated")
          );
          console.log("✅ useGraph can process AI-generated data");

          results.graphIntegration = true;
        } catch (error) {
          console.log(
            `❌ useGraph AI integration test failed: ${error.message}`
          );
        }
      } else {
        console.log("❌ useGraph composable not available");
      }
    } catch (error) {
      console.log(`❌ useGraph AI integration test failed: ${error.message}`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🤖 AI Template Loop Integration Test Results");
    console.log("=".repeat(60));

    const testResults = [
      { name: "Template Learning System", passed: results.templateLearning },
      { name: "Prompt Evolution Engine", passed: results.promptEvolution },
      {
        name: "Context-Aware AI Generation",
        passed: results.contextAwareGeneration,
      },
      { name: "Template Optimization", passed: results.templateOptimization },
      {
        name: "User Feedback Integration",
        passed: results.userFeedbackIntegration,
      },
      { name: "useGraph AI Integration", passed: results.graphIntegration },
    ];

    let passedTests = 0;
    for (const test of testResults) {
      const status = test.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} ${test.name}`);
      if (test.passed) passedTests++;
    }

    console.log("=".repeat(60));
    console.log(
      `📈 Overall Results: ${passedTests}/${testResults.length} tests passed`
    );

    if (passedTests === testResults.length) {
      console.log(
        "🎉 ALL AI INTEGRATION TESTS PASSED! useGraph is ready for AI Template Loop!"
      );
    } else {
      console.log(
        "⚠️ Some AI integration tests failed. Check the output above for details."
      );
    }

    console.log("=".repeat(60));

    return results;
  } catch (error) {
    console.error(
      "❌ AI Template Loop integration test failed:",
      error.message
    );
    console.error(error.stack);
    return results;
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAITemplateLoopIntegration().catch(console.error);
}

export { testAITemplateLoopIntegration };


