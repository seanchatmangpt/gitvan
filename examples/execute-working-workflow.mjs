#!/usr/bin/env node
// GitVan Working Workflow Execution Script
// Execute the test-cursor-workflow using the correct approach

import { WorkflowEngine } from "./src/workflow/workflow-engine.mjs";
import { withGitVan } from "./src/core/context.mjs";
import { useLog } from "./src/composables/log.mjs";
import { promises as fs } from "node:fs";

const logger = useLog("Working-Workflow-Execution");

async function executeWorkingWorkflow() {
  const startTime = performance.now();
  
  try {
    logger.info("🚀 Starting GitVan Working Workflow Execution");
    logger.info("Workflow: http://example.org/test-cursor-workflow");
    logger.info("=" .repeat(60));
    
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

    // Ensure test-results directory exists
    await fs.mkdir("test-results", { recursive: true });

    // Execute workflow within GitVan context
    const result = await withGitVan(context, async () => {
      logger.info("📊 Initializing WorkflowEngine...");
      
      // Initialize workflow engine
      const engine = new WorkflowEngine({
        graphDir: "./workflows",
        logger: logger
      });

      await engine.initialize();

      // List available workflows
      logger.info("📋 Discovering available workflows...");
      const workflows = await engine.listWorkflows();
      logger.info(`  Found ${workflows.length} workflows in system`);

      // Show available workflows
      if (workflows.length > 0) {
        logger.info("📋 Available workflows:");
        workflows.forEach((workflow, index) => {
          logger.info(`  ${index + 1}. ${workflow.id}`);
          logger.info(`     Title: ${workflow.title}`);
          logger.info(`     Pipelines: ${workflow.pipelineCount}`);
        });
      }

      // Try to execute the test-cursor-workflow
      logger.info("⚡ Executing test-cursor-workflow...");
      logger.info("  Workflow ID: http://example.org/test-cursor-workflow");
      
      const executionResult = await engine.executeWorkflow("http://example.org/test-cursor-workflow");

      return executionResult;
    });

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Results analysis
    logger.info("✅ Workflow execution completed!");
    logger.info("=" .repeat(60));
    logger.info("📊 EXECUTION RESULTS:");
    logger.info(`  Duration: ${result.duration || 'N/A'}ms`);
    logger.info(`  Total Time: ${totalDuration.toFixed(2)}ms`);
    logger.info(`  Steps executed: ${result.steps?.length || 0}`);
    logger.info(`  Success: ${result.success || false}`);

    // Step-by-step analysis
    if (result.steps && result.steps.length > 0) {
      logger.info("📋 STEP-BY-STEP ANALYSIS:");
      result.steps.forEach((step, index) => {
        const status = step.success ? "✅" : "❌";
        const duration = step.duration ? `${step.duration}ms` : "N/A";
        logger.info(`  ${status} Step ${index + 1}: ${step.stepId || step.id || "Unknown"}`);
        logger.info(`    Duration: ${duration}`);
        logger.info(`    Type: ${step.type || "unknown"}`);
        if (step.error) {
          logger.info(`    Error: ${step.error}`);
        }
      });
    }

    // Check for generated files
    logger.info("📁 GENERATED FILES:");
    try {
      const testResultsDir = "test-results";
      const files = await fs.readdir(testResultsDir);
      if (files.length > 0) {
        files.forEach(file => {
          logger.info(`  - ${file}`);
        });
      } else {
        logger.info("  - No files generated in test-results directory");
      }
    } catch (error) {
      logger.info("  - No test-results directory found");
    }

    // Final summary
    logger.info("🎯 EXECUTION SUMMARY:");
    logger.info(`  Workflow: http://example.org/test-cursor-workflow`);
    logger.info(`  Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`  Duration: ${totalDuration.toFixed(2)}ms`);
    logger.info(`  Steps: ${result.steps?.length || 0}`);
    
    logger.info("=" .repeat(60));
    logger.info("✅ Working workflow execution test completed!");
    
    return {
      success: true,
      result: result,
      totalDuration: totalDuration
    };

  } catch (error) {
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    logger.error("❌ Working workflow execution failed!");
    logger.error("=" .repeat(60));
    logger.error(`Error: ${error.message}`);
    logger.error(`Duration: ${totalDuration.toFixed(2)}ms`);
    
    // Try to provide helpful debugging information
    logger.info("🔍 DEBUGGING INFORMATION:");
    logger.info("  - Check if workflows directory exists and contains .ttl files");
    logger.info("  - Verify workflow ID matches exactly in Turtle file");
    logger.info("  - Check namespace prefixes in Turtle files");
    
    return {
      success: false,
      error: error.message,
      totalDuration: totalDuration
    };
  }
}

// Run the working workflow execution
executeWorkingWorkflow()
  .then((result) => {
    if (result.success) {
      console.log("✅ Working workflow execution completed successfully");
      console.log(`⏱️ Duration: ${result.totalDuration.toFixed(2)}ms`);
      process.exit(0);
    } else {
      console.error("❌ Working workflow execution failed");
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  });