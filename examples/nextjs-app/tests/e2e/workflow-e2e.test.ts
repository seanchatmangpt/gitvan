/**
 * E2E Tests - Key Workflows
 *
 * End-to-end tests for complete user workflows in gitvan v4.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { JTBDEngine } from '@/lib/jtbd-engine';
import { AutonomicWorkflowGenerator } from '@/lib/workflow-generator';
import { EnhancedWorkflowGenerator } from '@/lib/enhanced-workflow-generator';
import { NunjucksTemplateEngine, TTL_TEMPLATES } from '@/lib/nunjucks-engine';
import { safeValidate, HookSchema, GitEventSchema } from '@/lib/schemas';
import {
  StateTracker,
  MockHookExecutor,
  MemoryTracker,
  createCleanupTracker,
  measureExecutionTime,
  wait,
} from '../utils/test-utils';
import {
  JTBD_JOB_FIXTURES,
  JTBD_SCENARIO_FIXTURES,
  HOOK_FIXTURES,
  GIT_EVENT_FIXTURES,
} from '../fixtures';

describe('E2E: Developer Commit Workflow', () => {
  let jtbdEngine: JTBDEngine;
  let workflowGenerator: AutonomicWorkflowGenerator;
  let templateEngine: NunjucksTemplateEngine;
  let hookExecutor: MockHookExecutor;
  let stateTracker: StateTracker<string>;
  const cleanup = createCleanupTracker();

  beforeAll(() => {
    jtbdEngine = new JTBDEngine();
    workflowGenerator = new AutonomicWorkflowGenerator();
    templateEngine = new NunjucksTemplateEngine();
    hookExecutor = new MockHookExecutor();
    stateTracker = new StateTracker('workflow-start');
  });

  afterAll(async () => {
    await cleanup.runAll();
  });

  beforeEach(() => {
    hookExecutor.clear();
    stateTracker.reset('workflow-start');
  });

  it('should execute complete semantic commit workflow', async () => {
    // Phase 1: Initialize workflow
    stateTracker.update('initializing');

    // Register JTBD jobs and scenarios
    jtbdEngine.registerJob(JTBD_JOB_FIXTURES.developerProductivity);
    jtbdEngine.registerScenario(JTBD_SCENARIO_FIXTURES.semanticCommitFlow);

    // Phase 2: Validate incoming commit event
    stateTracker.update('validating-event');
    const commitEvent = GIT_EVENT_FIXTURES.validCommit;
    const eventValidation = safeValidate(GitEventSchema, commitEvent);
    expect(eventValidation.success).toBe(true);

    // Phase 3: Generate enforcement hooks
    stateTracker.update('generating-hooks');
    const hooks = [
      HOOK_FIXTURES.enforcePatternHook,
      HOOK_FIXTURES.qualityGateHook,
    ];

    for (const hook of hooks) {
      const validation = safeValidate(HookSchema, hook);
      expect(validation.success).toBe(true);
    }

    // Phase 4: Execute hooks
    stateTracker.update('executing-hooks');
    for (const hook of hooks) {
      const result = await hookExecutor.execute(hook);
      expect(result.success).toBe(true);
    }

    // Phase 5: Run JTBD scenario
    stateTracker.update('running-scenario');
    const scenarioResult = await jtbdEngine.executeScenario('semantic-commit-flow');
    expect(scenarioResult.status).toBe('passed');

    // Phase 6: Generate summary
    stateTracker.update('complete');
    const summary = jtbdEngine.getSummaryReport();
    expect(summary.successRate).toBe(100);

    // Verify workflow progression
    expect(stateTracker.getHistory()).toEqual([
      'workflow-start',
      'initializing',
      'validating-event',
      'generating-hooks',
      'executing-hooks',
      'running-scenario',
      'complete',
    ]);
  });

  it('should handle failed commit validation gracefully', async () => {
    stateTracker.update('processing-invalid-commit');

    // Invalid commit event
    const invalidEvent = {
      type: 'CommitEvent',
      hash: 'short-hash', // Invalid: not 40 chars
      author: 'test@example.com',
      message: 'bad commit',
      timestamp: new Date().toISOString(),
      files: [],
      additions: 0,
      deletions: 0,
      branch: 'main',
    };

    const validation = safeValidate(GitEventSchema, invalidEvent);
    expect(validation.success).toBe(false);

    // Generate self-healing hooks
    stateTracker.update('generating-healing-hooks');
    const healingHooks = await workflowGenerator.createSelfHealingHooks();
    expect(healingHooks.length).toBeGreaterThan(0);

    stateTracker.update('recovered');
    expect(stateTracker.getCurrent()).toBe('recovered');
  });
});

describe('E2E: Code Review Workflow', () => {
  let jtbdEngine: JTBDEngine;
  let enhancedGenerator: EnhancedWorkflowGenerator;
  let hookExecutor: MockHookExecutor;

  beforeAll(() => {
    jtbdEngine = new JTBDEngine();
    enhancedGenerator = new EnhancedWorkflowGenerator();
    hookExecutor = new MockHookExecutor();
  });

  it('should execute complete code review workflow', async () => {
    // Setup
    jtbdEngine.registerJob(JTBD_JOB_FIXTURES.teamCollaboration);
    jtbdEngine.registerScenario(JTBD_SCENARIO_FIXTURES.codeReviewFlow);

    // Generate review hooks
    const reviewHook = await enhancedGenerator.generateCompositeHook({
      name: 'Code Review Hook',
      description: 'Automated code review',
      trigger: 'PullRequestEvent',
      priority: 9,
      steps: [
        { action: 'gh:ValidateChanges', params: {} },
        { action: 'gh:CheckCoverage', params: { threshold: 80 } },
        { action: 'gh:RunLinters', params: {} },
        { action: 'gh:GenerateFeedback', params: {} },
      ],
    });

    expect(reviewHook.metadata?.steps).toHaveLength(4);

    // Execute hook
    const executionResult = await hookExecutor.execute(reviewHook);
    expect(executionResult.success).toBe(true);

    // Run scenario
    const scenarioResult = await jtbdEngine.executeScenario('code-review-flow');
    expect(['passed', 'failed']).toContain(scenarioResult.status);

    // Verify job success rate
    const successRate = jtbdEngine.calculateJobSuccessRate('team-collaboration');
    expect(successRate).toBeGreaterThanOrEqual(0);
  });

  it('should track review metrics over multiple executions', async () => {
    jtbdEngine.registerScenario(JTBD_SCENARIO_FIXTURES.codeReviewFlow);

    // Execute multiple reviews
    const executionCount = 5;
    for (let i = 0; i < executionCount; i++) {
      await jtbdEngine.executeScenario('code-review-flow');
    }

    const results = jtbdEngine.getScenarioResults('code-review-flow');
    expect(results).toHaveLength(executionCount);

    const summary = jtbdEngine.getSummaryReport();
    expect(summary.totalResults).toBe(executionCount);
  });
});

describe('E2E: Deployment Automation Workflow', () => {
  let jtbdEngine: JTBDEngine;
  let workflowGenerator: AutonomicWorkflowGenerator;
  let enhancedGenerator: EnhancedWorkflowGenerator;
  let hookExecutor: MockHookExecutor;
  let stateTracker: StateTracker<{ stage: string; success: boolean }>;

  beforeAll(() => {
    jtbdEngine = new JTBDEngine();
    workflowGenerator = new AutonomicWorkflowGenerator();
    enhancedGenerator = new EnhancedWorkflowGenerator();
    hookExecutor = new MockHookExecutor();
    stateTracker = new StateTracker({ stage: 'init', success: false });
  });

  it('should execute complete deployment workflow', async () => {
    // Phase 1: Pre-deployment checks
    stateTracker.update({ stage: 'pre-deployment', success: true });

    const preDeployHook = HOOK_FIXTURES.qualityGateHook;
    await hookExecutor.execute(preDeployHook);

    // Phase 2: Staging deployment
    stateTracker.update({ stage: 'staging', success: true });

    const stagingHook = await enhancedGenerator.generateCompositeHook({
      name: 'Staging Deploy',
      description: 'Deploy to staging',
      trigger: 'TagEvent',
      priority: 8,
      steps: [
        { action: 'gh:BuildArtifact', params: {} },
        { action: 'gh:DeployStaging', params: { timeout: 300 } },
        { action: 'gh:RunSmokeTests', params: {} },
      ],
    });

    await hookExecutor.execute(stagingHook);

    // Phase 3: Production deployment
    stateTracker.update({ stage: 'production', success: true });

    const prodHook = await enhancedGenerator.generateCompositeHook({
      name: 'Production Deploy',
      description: 'Deploy to production',
      trigger: 'ApprovalEvent',
      priority: 10,
      steps: [
        { action: 'gh:DeployProduction', params: { rollback: true } },
        { action: 'gh:MonitorHealth', params: { duration: 60 } },
        { action: 'gh:NotifyTeam', params: {} },
      ],
    });

    const prodResult = await hookExecutor.execute(prodHook);
    expect(prodResult.success).toBe(true);

    // Phase 4: Post-deployment
    stateTracker.update({ stage: 'complete', success: true });

    // Verify deployment flow
    expect(hookExecutor.getExecutionCount()).toBe(3);
    expect(stateTracker.getCurrent().stage).toBe('complete');
  });

  it('should handle deployment failure and rollback', async () => {
    stateTracker.reset({ stage: 'init', success: false });

    // Simulate deployment failure
    hookExecutor.setShouldFail(true);

    const deployHook = HOOK_FIXTURES.autoDeployHook;
    const deployResult = await hookExecutor.execute(deployHook);
    expect(deployResult.success).toBe(false);

    stateTracker.update({ stage: 'failed', success: false });

    // Trigger rollback
    hookExecutor.setShouldFail(false);

    const rollbackHook = await enhancedGenerator.generateCompositeHook({
      name: 'Rollback Deploy',
      description: 'Rollback failed deployment',
      trigger: 'FailureEvent',
      priority: 10,
      steps: [
        { action: 'gh:RevertChanges', params: {} },
        { action: 'gh:RestorePrevious', params: {} },
        { action: 'gh:NotifyFailure', params: {} },
      ],
    });

    const rollbackResult = await hookExecutor.execute(rollbackHook);
    expect(rollbackResult.success).toBe(true);

    stateTracker.update({ stage: 'rolled-back', success: true });
    expect(stateTracker.getCurrent().stage).toBe('rolled-back');
  });
});

describe('E2E: Continuous Improvement Workflow', () => {
  let jtbdEngine: JTBDEngine;
  let workflowGenerator: AutonomicWorkflowGenerator;
  let enhancedGenerator: EnhancedWorkflowGenerator;

  beforeAll(() => {
    jtbdEngine = new JTBDEngine();
    workflowGenerator = new AutonomicWorkflowGenerator();
    enhancedGenerator = new EnhancedWorkflowGenerator();
  });

  it('should analyze and improve based on metrics', async () => {
    // Collect metrics
    const metrics = {
      largeCommits: 8,
      testCoverage: 65,
      hookFailureRate: 12,
    };

    // Get recommendations
    const recommendations = await workflowGenerator.recommendHooks(metrics);
    expect(recommendations.length).toBeGreaterThan(0);

    // Generate improvement hooks
    const improvementHooks = await enhancedGenerator.generateAndOptimizeHooks(
      recommendations.map((r) => ({
        type: r.hookType,
        trigger: 'MetricEvent',
        condition: r.reason,
        action: r.estimatedBenefit,
        params: { priority: r.priority },
      }))
    );

    expect(improvementHooks.length).toBeGreaterThanOrEqual(recommendations.length);

    // Generate automation recommendations
    const automations = await workflowGenerator.detectRequiredAutomation();
    expect(automations.length).toBeGreaterThan(0);
  });

  it('should track improvement over time', async () => {
    // Register scenarios for tracking
    Object.values(JTBD_SCENARIO_FIXTURES).forEach((scenario) => {
      jtbdEngine.registerScenario(scenario);
    });

    // Simulate improvement over iterations
    const iterations = 3;
    const successRates: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Execute all scenarios
      const results = await Promise.all(
        Object.keys(JTBD_SCENARIO_FIXTURES).map((id) =>
          jtbdEngine.executeScenario(id)
        )
      );

      const passed = results.filter((r) => r.status === 'passed').length;
      successRates.push((passed / results.length) * 100);
    }

    // All iterations should have a success rate
    expect(successRates).toHaveLength(iterations);
    successRates.forEach((rate) => {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });
});

describe('E2E: Performance Critical Workflow', () => {
  it('should complete workflow within performance budget', async () => {
    const performanceBudget = 5000; // 5 seconds

    const { duration } = await measureExecutionTime(async () => {
      const jtbdEngine = new JTBDEngine();
      const enhancedGenerator = new EnhancedWorkflowGenerator();
      const hookExecutor = new MockHookExecutor();

      // Setup
      Object.values(JTBD_JOB_FIXTURES).forEach((job) => jtbdEngine.registerJob(job));
      Object.values(JTBD_SCENARIO_FIXTURES).forEach((s) => jtbdEngine.registerScenario(s));

      // Generate hooks
      const hooks = await enhancedGenerator.generateAndOptimizeHooks([
        { type: 'perf-1', trigger: 'Event', condition: 'a', action: 'x', params: {} },
        { type: 'perf-2', trigger: 'Event', condition: 'b', action: 'y', params: {} },
        { type: 'perf-3', trigger: 'Event', condition: 'c', action: 'z', params: {} },
      ]);

      // Execute hooks
      for (const hook of hooks) {
        await hookExecutor.execute(hook);
      }

      // Run scenarios
      await Promise.all(
        Object.keys(JTBD_SCENARIO_FIXTURES).map((id) =>
          jtbdEngine.executeScenario(id)
        )
      );

      return jtbdEngine.getSummaryReport();
    });

    expect(duration).toBeLessThan(performanceBudget);
  });

  it('should handle high-volume hook execution', async () => {
    const hookExecutor = new MockHookExecutor();
    const hookCount = 100;

    const hooks = Array.from({ length: hookCount }, (_, i) => ({
      name: `high-volume-hook-${i}`,
      trigger: 'Event',
      condition: 'always',
      action: 'run',
      ttl: '@prefix gh: <test#> .',
      priority: 5,
      autoExecute: true,
    }));

    const { duration } = await measureExecutionTime(async () => {
      await Promise.all(hooks.map((h) => hookExecutor.execute(h)));
    });

    expect(hookExecutor.getExecutionCount()).toBe(hookCount);
    expect(duration).toBeLessThan(10000); // 10 seconds for 100 hooks
  });
});

describe('E2E: Error Recovery Workflow', () => {
  it('should recover from cascading failures', async () => {
    const jtbdEngine = new JTBDEngine();
    const hookExecutor = new MockHookExecutor();
    const stateTracker = new StateTracker<string>('healthy');

    // Register scenario
    jtbdEngine.registerScenario(JTBD_SCENARIO_FIXTURES.deploymentFlow);

    // Phase 1: Initial failure
    stateTracker.update('failing');
    hookExecutor.setShouldFail(true);

    const failedResult = await hookExecutor.execute(HOOK_FIXTURES.autoDeployHook);
    expect(failedResult.success).toBe(false);

    // Phase 2: Detection
    stateTracker.update('detected');
    const failedExecutions = hookExecutor.getExecutionLog().filter((e) => !e.result);
    expect(failedExecutions.length).toBeGreaterThan(0);

    // Phase 3: Recovery
    stateTracker.update('recovering');
    hookExecutor.setShouldFail(false);

    const recoveryResult = await hookExecutor.execute(HOOK_FIXTURES.selfHealingHook);
    expect(recoveryResult.success).toBe(true);

    // Phase 4: Verification
    stateTracker.update('verified');
    const scenarioResult = await jtbdEngine.executeScenario('deployment-flow');
    expect(scenarioResult.status).toBe('passed');

    // Phase 5: Complete
    stateTracker.update('recovered');

    expect(stateTracker.getHistory()).toEqual([
      'healthy',
      'failing',
      'detected',
      'recovering',
      'verified',
      'recovered',
    ]);
  });
});
