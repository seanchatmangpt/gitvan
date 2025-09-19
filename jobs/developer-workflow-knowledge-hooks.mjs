// jobs/developer-workflow-knowledge-hooks.mjs
// Developer-Centric Knowledge Hooks Integration
// Uses Scrum at Scale terminology and cadence

import { defineJob } from "../src/core/job-registry.mjs";
import { HookOrchestrator } from "../src/hooks/HookOrchestrator.mjs";
import { useGitVan } from "../src/core/context.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineJob({
  meta: {
    name: "developer-workflow-knowledge-hooks",
    desc: "Developer-centric Knowledge Hooks using Scrum at Scale terminology and cadence",
    tags: [
      "developer-workflow",
      "scrum-at-scale",
      "knowledge-hooks",
      "start-of-day",
      "end-of-day",
      "definition-of-done",
      "file-saving",
      "daily-scrum",
      "sprint-planning",
    ],
    version: "1.0.0",
  },

  // Developer workflow triggers (not Git hooks)
  hooks: [
    "start-of-day", // Developer starts work
    "end-of-day", // Developer ends work
    "file-saving", // Developer saves files
    "definition-of-done", // Work item meets DoD
    "daily-scrum", // Daily scrum preparation
    "sprint-planning", // Sprint planning activation
  ],

  async run(context) {
    console.log(
      "🎯 Developer Workflow Knowledge Hooks - Scrum at Scale Integration"
    );
    console.log(`   📡 Developer Signal: ${context.hookName}`);

    try {
      // Get GitVan context
      const gitvanContext = useGitVan();

      // Initialize Knowledge Hook Orchestrator for developer workflow
      const orchestrator = new HookOrchestrator({
        graphDir: "./hooks/developer-workflow", // Point to developer workflow hooks
        context: gitvanContext,
        logger: console,
      });

      // Extract developer context information
      const developerContext = await this.extractDeveloperContext(context);

      console.log(`   👨‍💻 Developer: ${developerContext.developer.name}`);
      console.log(`   🏃‍♂️ Sprint: ${developerContext.sprint.name}`);
      console.log(`   📅 Work Status: ${developerContext.workStatus}`);

      // Evaluate developer workflow knowledge hooks
      const evaluationResult = await orchestrator.evaluate({
        developerContext: developerContext,
        verbose: true,
        // Pass the current developer signal to the orchestrator
        developerSignal: context.hookName,
      });

      console.log(
        `   🧠 Developer Knowledge Hooks evaluated: ${evaluationResult.hooksEvaluated}`
      );
      console.log(
        `   ⚡ Developer Hooks triggered: ${evaluationResult.hooksTriggered}`
      );
      console.log(
        `   🔄 Developer Workflows executed: ${evaluationResult.workflowsExecuted}`
      );

      if (evaluationResult.hooksTriggered > 0) {
        console.log("   🎯 Triggered Developer Knowledge Hooks:");
        for (const hook of evaluationResult.triggeredHooks) {
          console.log(
            `     ✅ ${hook.id} (${hook.predicateType}) - ${hook.workflowCategory}`
          );
        }
      }

      // Generate a report for this developer workflow integration
      const workflowReport = {
        timestamp: new Date().toISOString(),
        developerSignal: context.hookName,
        developerContext: developerContext,
        evaluationSummary: {
          hooksEvaluated: evaluationResult.hooksEvaluated,
          hooksTriggered: evaluationResult.hooksTriggered,
          workflowsExecuted: evaluationResult.workflowsExecuted,
          triggeredHooks: evaluationResult.triggeredHooks.map((h) => ({
            id: h.id,
            title: h.title,
            predicateType: h.predicateType,
            workflowCategory: h.workflowCategory,
            evaluationResult: h.evaluationResult,
          })),
        },
        status:
          evaluationResult.hooksTriggered > 0 ? "TRIGGERED" : "NO_TRIGGER",
        message: `Developer signal '${context.hookName}' processed.`,
      };

      // Write report to disk
      const reportsDir = join(process.cwd(), "reports", "developer-workflow");
      mkdirSync(reportsDir, { recursive: true });
      const filename = `developer-workflow-report-${
        context.hookName
      }-${Date.now()}.json`;
      const filepath = join(reportsDir, filename);

      writeFileSync(filepath, JSON.stringify(workflowReport, null, 2));

      console.log(`📄 Developer Workflow Report written to: ${filepath}`);

      return {
        success: true,
        report: workflowReport,
      };
    } catch (error) {
      console.error(
        `❌ Developer Workflow Knowledge Hooks Error (${context.hookName}):`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        developerSignal: context.hookName,
      };
    }
  },

  /**
   * Extract developer context information
   */
  async extractDeveloperContext(context) {
    const timestamp = new Date().toISOString();
    const workStatus = this.determineWorkStatus(context.hookName);

    return {
      timestamp,
      developer: {
        id: "dev-001",
        name: "Developer",
        email: "developer@example.com",
        workStatus: workStatus,
        currentSprint: "sprint-001",
      },
      sprint: {
        id: "sprint-001",
        name: "Sprint 1",
        status: "active",
        startDate: "2025-09-18",
        endDate: "2025-10-02",
      },
      team: {
        id: "team-001",
        name: "Development Team",
        members: ["dev-001", "dev-002", "dev-003"],
      },
      workStatus: workStatus,
      signal: context.hookName,
    };
  },

  /**
   * Determine work status based on developer signal
   */
  determineWorkStatus(signal) {
    const statusMap = {
      "start-of-day": "starting",
      "end-of-day": "ending",
      "file-saving": "working",
      "definition-of-done": "completing",
      "daily-scrum": "synchronizing",
      "sprint-planning": "planning",
    };
    return statusMap[signal] || "unknown";
  },
});

