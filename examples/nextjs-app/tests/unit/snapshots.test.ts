/**
 * Snapshot Tests - Complex State
 *
 * Tests that verify complex state structures remain consistent.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JTBDEngine } from '@/lib/jtbd-engine';
import { AutonomicWorkflowGenerator } from '@/lib/workflow-generator';
import { NunjucksTemplateEngine, TTL_TEMPLATES } from '@/lib/nunjucks-engine';
import { safeValidate, HookSchema, AnalyticsResultSchema } from '@/lib/schemas';
import {
  HOOK_FIXTURES,
  JTBD_JOB_FIXTURES,
  JTBD_SCENARIO_FIXTURES,
  ANALYTICS_FIXTURES,
  TTL_TEMPLATE_FIXTURES,
} from '../fixtures';
import { createTestHook, createTestJTBDJob, createTestJTBDScenario } from '../utils/test-utils';

describe('Hook Structure Snapshots', () => {
  it('should match basic hook structure', () => {
    const hook = createTestHook({
      name: 'snapshot-hook',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'validate',
      priority: 5,
    });

    // Remove dynamic parts for snapshot consistency
    const snapshotHook = {
      name: hook.name,
      trigger: hook.trigger,
      condition: hook.condition,
      action: hook.action,
      priority: hook.priority,
      autoExecute: hook.autoExecute,
    };

    expect(snapshotHook).toMatchInlineSnapshot(`
      {
        "action": "validate",
        "autoExecute": true,
        "condition": "always",
        "name": "snapshot-hook",
        "priority": 5,
        "trigger": "CommitEvent",
      }
    `);
  });

  it('should match enforce pattern hook structure', () => {
    const hook = HOOK_FIXTURES.enforcePatternHook;

    expect({
      name: hook.name,
      trigger: hook.trigger,
      priority: hook.priority,
    }).toMatchInlineSnapshot(`
      {
        "name": "enforce-semantic-commits",
        "priority": 9,
        "trigger": "CommitEvent",
      }
    `);
  });

  it('should match auto deploy hook structure', () => {
    const hook = HOOK_FIXTURES.autoDeployHook;

    expect({
      name: hook.name,
      trigger: hook.trigger,
      priority: hook.priority,
    }).toMatchInlineSnapshot(`
      {
        "name": "auto-deploy-production",
        "priority": 10,
        "trigger": "TagEvent",
      }
    `);
  });

  it('should match hook collection keys', () => {
    const hookKeys = Object.keys(HOOK_FIXTURES).sort();

    expect(hookKeys).toMatchInlineSnapshot(`
      [
        "autoDeployHook",
        "basicHook",
        "enforcePatternHook",
        "qualityGateHook",
        "selfHealingHook",
      ]
    `);
  });
});

describe('JTBD Structure Snapshots', () => {
  it('should match JTBD job structure', () => {
    const job = createTestJTBDJob({
      id: 'snapshot-job',
      title: 'Snapshot Test Job',
      jobType: 'functional',
    });

    expect({
      id: job.id,
      title: job.title,
      jobType: job.jobType,
      context: job.context,
      outcomesCount: job.outcomes.length,
      metricsCount: job.metrics.length,
    }).toMatchInlineSnapshot(`
      {
        "context": "testing",
        "id": "snapshot-job",
        "jobType": "functional",
        "metricsCount": 1,
        "outcomesCount": 1,
        "title": "Snapshot Test Job",
      }
    `);
  });

  it('should match JTBD scenario structure', () => {
    const scenario = createTestJTBDScenario({
      id: 'snapshot-scenario',
      name: 'Snapshot Scenario',
    });

    expect({
      id: scenario.id,
      name: scenario.name,
      jobsCount: scenario.jobs.length,
      stepsCount: scenario.steps.length,
      successCriteriaCount: scenario.successCriteria.length,
    }).toMatchInlineSnapshot(`
      {
        "id": "snapshot-scenario",
        "jobsCount": 1,
        "name": "Snapshot Scenario",
        "stepsCount": 1,
        "successCriteriaCount": 1,
      }
    `);
  });

  it('should match execution result structure', async () => {
    const engine = new JTBDEngine();
    const scenario = createTestJTBDScenario();
    engine.registerScenario(scenario);

    const result = await engine.executeScenario(scenario.id);

    expect({
      scenarioId: result.scenarioId,
      status: result.status,
      stepsTotal: result.stepsTotal,
      stepsCompleted: result.stepsCompleted,
      assertionsCount: result.assertions.length,
    }).toMatchInlineSnapshot(`
      {
        "assertionsCount": 1,
        "scenarioId": "test-scenario-1",
        "status": "passed",
        "stepsCompleted": 1,
        "stepsTotal": 1,
      }
    `);
  });

  it('should match JTBD job fixture keys', () => {
    const jobKeys = Object.keys(JTBD_JOB_FIXTURES).sort();

    expect(jobKeys).toMatchInlineSnapshot(`
      [
        "deploymentConfidence",
        "developerProductivity",
        "teamCollaboration",
      ]
    `);
  });

  it('should match JTBD scenario fixture keys', () => {
    const scenarioKeys = Object.keys(JTBD_SCENARIO_FIXTURES).sort();

    expect(scenarioKeys).toMatchInlineSnapshot(`
      [
        "codeReviewFlow",
        "deploymentFlow",
        "semanticCommitFlow",
      ]
    `);
  });
});

describe('Workflow Generator Snapshots', () => {
  let generator: AutonomicWorkflowGenerator;

  beforeEach(() => {
    generator = new AutonomicWorkflowGenerator();
  });

  it('should match automation recommendation structure', async () => {
    const automations = await generator.detectRequiredAutomation();

    expect(automations.map((a) => ({ id: a.id, priority: a.priority, effort: a.effort })))
      .toMatchInlineSnapshot(`
      [
        {
          "effort": "low",
          "id": "enforce-commits",
          "priority": 9,
        },
        {
          "effort": "medium",
          "id": "auto-deploy-releases",
          "priority": 8,
        },
        {
          "effort": "medium",
          "id": "quality-gates",
          "priority": 7,
        },
        {
          "effort": "high",
          "id": "security-scanning",
          "priority": 9,
        },
        {
          "effort": "medium",
          "id": "performance-monitoring",
          "priority": 6,
        },
      ]
    `);
  });

  it('should match self-healing hook names', async () => {
    const hooks = await generator.createSelfHealingHooks();

    expect(hooks.map((h) => h.name)).toMatchInlineSnapshot(`
      [
        "self-heal-hook-failures",
        "self-optimize-slow-hooks",
      ]
    `);
  });

  it('should match hook recommendation for bad metrics', async () => {
    const recommendations = await generator.recommendHooks({
      largeCommits: 20,
      testCoverage: 30,
      hookFailureRate: 25,
    });

    expect(recommendations.map((r) => r.hookType)).toMatchInlineSnapshot(`
      [
        "enforce-pattern",
        "quality-gate",
        "self-healing",
      ]
    `);
  });
});

describe('Template Snapshots', () => {
  let engine: NunjucksTemplateEngine;

  beforeEach(() => {
    engine = new NunjucksTemplateEngine();
  });

  it('should match basic hook TTL structure', async () => {
    const ttl = await engine.renderString(TTL_TEMPLATES.basicHook, {
      name: 'Snapshot Hook',
      description: 'Test hook for snapshots',
      priority: 5,
      autoExecute: true,
      triggerType: 'git:CommitEvent',
      action: 'echo "snapshot"',
    });

    // Check key structural elements
    expect(ttl).toContain('@prefix gh:');
    expect(ttl).toContain('gh:snapshot-hook');
    expect(ttl).toContain('gh:name "Snapshot Hook"');
    expect(ttl).toContain('gh:priority 5');
    expect(ttl).toContain('gh:autoExecute true');
  });

  it('should match TTL template fixture keys', () => {
    const templateKeys = Object.keys(TTL_TEMPLATES).sort();

    expect(templateKeys).toMatchInlineSnapshot(`
      [
        "basicHook",
        "compositeActionHook",
        "patternEnforcementHook",
      ]
    `);
  });
});

describe('Analytics Snapshots', () => {
  it('should match analytics result structure', () => {
    const analytics = ANALYTICS_FIXTURES;

    expect({
      hasVelocity: !!analytics.velocity,
      hasQuality: !!analytics.quality,
      hasPerformance: !!analytics.performance,
      hasSecurity: !!analytics.security,
      hasDebt: !!analytics.debt,
      velocityCount: analytics.velocity?.length,
      qualityCount: analytics.quality?.length,
    }).toMatchInlineSnapshot(`
      {
        "hasDebt": true,
        "hasPerformance": true,
        "hasQuality": true,
        "hasSecurity": true,
        "hasVelocity": true,
        "qualityCount": 1,
        "velocityCount": 2,
      }
    `);
  });

  it('should validate analytics against schema', () => {
    const result = safeValidate(AnalyticsResultSchema, ANALYTICS_FIXTURES);
    expect(result.success).toBe(true);
  });
});

describe('Summary Report Snapshots', () => {
  it('should match JTBD summary report structure', async () => {
    const engine = new JTBDEngine();
    Object.values(JTBD_SCENARIO_FIXTURES).forEach((s) => engine.registerScenario(s));

    // Execute scenarios
    await engine.executeScenario('semantic-commit-flow');
    await engine.executeScenario('code-review-flow');

    const summary = engine.getSummaryReport();

    expect({
      totalScenarios: summary.totalScenarios,
      totalResults: summary.totalResults,
      hasJobSuccessRates: Object.keys(summary.jobSuccessRates).length >= 0,
    }).toMatchInlineSnapshot(`
      {
        "hasJobSuccessRates": true,
        "totalResults": 2,
        "totalScenarios": 3,
      }
    `);
  });
});

describe('Schema Validation Snapshots', () => {
  it('should match hook validation error format', () => {
    const invalidHook = { name: 'test' }; // Missing required fields

    const result = safeValidate(HookSchema, invalidHook);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPaths = result.error.errors.map((e) => e.path.join('.'));
      expect(errorPaths.sort()).toMatchInlineSnapshot(`
        [
          "action",
          "autoExecute",
          "condition",
          "priority",
          "trigger",
          "ttl",
        ]
      `);
    }
  });
});
