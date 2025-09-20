#!/usr/bin/env node
// Test GitVan Workflow Execution Script
// Execute and optimize the test-cursor-workflow

import { WorkflowExecutor } from "./src/workflow/workflow-executor.mjs";
import { withGitVan } from "./src/core/context.mjs";
import { useLog } from "./src/composables/log.mjs";

const logger = useLog("Workflow-Test");

async function executeTestCursorWorkflow() {
  try {
    logger.info("🚀 Starting GitVan Workflow Execution Test");
    logger.info("Workflow: http://example.org/test-cursor-workflow (Test Cursor Workflow)");
    
    // Create GitVan context
    const context = {
      cwd: process.cwd(),
      env: process.env,
      config: {
        workflows: {
          directory: "./workflows"
        }
      }
    };

    // Execute workflow within GitVan context
    await withGitVan(context, async () => {
      logger.info("📊 Initializing WorkflowExecutor...");
      
      // Initialize workflow executor
      const executor = new WorkflowExecutor({
        graphDir: "./workflows",
        context: context,
        logger: logger,
        timeoutMs: 60000 // 1 minute timeout
      });

      // List available workflows first
      logger.info("📋 Listing available workflows...");
      const workflows = await executor.listWorkflows();
      logger.info(`Found ${workflows.length} workflows`);

      // Execute the test-cursor-workflow
      logger.info("⚡ Executing test-cursor-workflow...");
      const result = await executor.execute("http://example.org/test-cursor-workflow", {
        testMode: true,
        optimize: true
      });

      logger.info("✅ Workflow execution completed!");
      logger.info(`Duration: ${result.duration}ms`);
      logger.info(`Steps executed: ${result.stepCount}`);
      logger.info(`Success: ${result.success}`);

      if (result.steps && result.steps.length > 0) {
        logger.info("📊 Step Results:");
        result.steps.forEach((step, index) => {
          const status = step.success ? "✅" : "❌";
          logger.info(`  ${status} Step ${index + 1}: ${step.stepId || step.id || "Unknown"}`);
          if (step.error) {
            logger.info(`    Error: ${step.error}`);
          }
        });
      }

      // Optimization suggestions
      logger.info("🔧 Optimization Analysis:");
      if (result.duration > 5000) {
        logger.info("  ⚠️ Workflow execution took longer than 5 seconds");
        logger.info("  💡 Consider optimizing SPARQL queries or reducing step complexity");
      } else {
        logger.info("  ✅ Workflow execution time is optimal");
      }

      if (result.stepCount === 1) {
        logger.info("  💡 Workflow has only 1 step - consider adding more steps for better automation");
      }

      logger.info("🎯 Workflow execution test completed successfully!");
      
      return result;
    });

  } catch (error) {
    logger.error("❌ Workflow execution failed:", error.message);
    logger.error("Stack trace:", error.stack);
    throw error;
  }
}

// Run the test
executeTestCursorWorkflow()
  .then(() => {
    console.log("✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  });