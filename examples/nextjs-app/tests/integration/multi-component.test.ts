/**
 * Integration Tests - Multi-Component Interactions
 *
 * Tests for interactions between multiple system components.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JTBDEngine } from '@/lib/jtbd-engine';
import { AutonomicWorkflowGenerator } from '@/lib/workflow-generator';
import { EnhancedWorkflowGenerator } from '@/lib/enhanced-workflow-generator';
import { NunjucksTemplateEngine, TTL_TEMPLATES } from '@/lib/nunjucks-engine';
import { safeValidate, HookSchema, GitEventSchema, AnalyticsResultSchema } from '@/lib/schemas';
import {
  JTBD_JOB_FIXTURES,
  JTBD_SCENARIO_FIXTURES,
  HOOK_FIXTURES,
  GIT_EVENT_FIXTURES,
  ANALYTICS_FIXTURES,
} from '../fixtures';
import { StateTracker, MockHookExecutor, measureExecutionTime } from '../utils/test-utils';

// Mock AI engine selector
vi.mock('@/lib/ai-engine-selector', () => ({
  aiEngineSelector: {
    ask: vi.fn().mockResolvedValue('Mock AI response'),
  },
}));

describe('Multi-Component Integration', () => {
  let jtbdEngine: JTBDEngine;
  let workflowGenerator: AutonomicWorkflowGenerator;
  let enhancedGenerator: EnhancedWorkflowGenerator;
  let templateEngine: NunjucksTemplateEngine;

  beforeEach(() => {
    jtbdEngine = new JTBDEngine();
    workflowGenerator = new AutonomicWorkflowGenerator();
    enhancedGenerator = new EnhancedWorkflowGenerator();
    templateEngine = new NunjucksTemplateEngine();
  });

  // ============================================================================
  // JTBD + Workflow Generator Integration
  // ============================================================================

  describe('JTBD Engine + Workflow Generator', () => {
    it('should generate hooks based on JTBD job outcomes', async () => {
      // Register JTBD job
      const job = JTBD_JOB_FIXTURES.developerProductivity;
      jtbdEngine.registerJob(job);

      // Generate hooks based on job outcomes
      const patterns = job.outcomes.map((outcome) => ({
        type: 'enforce-pattern',
        trigger: 'CommitEvent',
        condition: outcome.name,
        action: outcome.description,
        params: {
          patternName: outcome.name,
          description: outcome.description,
          triggerEvent: 'git:CommitEvent',
          pattern: '.*',
        },
      }));

      const hooks = await workflowGenerator.generateHooksFromPatterns(patterns);

      // Verify hooks align with job outcomes
      expect(hooks.length).toBeGreaterThan(0);
    });

    it('should track scenario execution state through workflow', async () => {
      // Register scenario
      const scenario = JTBD_SCENARIO_FIXTURES.semanticCommitFlow;
      jtbdEngine.registerScenario(scenario);

      // Create state tracker
      const stateTracker = new StateTracker<string>('idle');

      // Execute scenario with state tracking
      stateTracker.update('executing');
      const result = await jtbdEngine.executeScenario(scenario.id);
      stateTracker.update(result.status);

      expect(stateTracker.getHistory()).toEqual(['idle', 'executing', 'passed']);
    });

    it('should recommend hooks based on scenario failure patterns', async () => {
      const scenario = JTBD_SCENARIO_FIXTURES.semanticCommitFlow;
      jtbdEngine.registerScenario(scenario);

      // Simulate failed execution
      const failingExecutor = async () => false;
      await jtbdEngine.executeScenario(scenario.id, failingExecutor);

      // Get recommendations based on failure
      const metrics = { hookFailureRate: 100, testCoverage: 0, largeCommits: 0 };
      const recommendations = await workflowGenerator.recommendHooks(metrics);

      expect(recommendations.some((r) => r.hookType === 'self-healing')).toBe(true);
    });
  });

  // ============================================================================
  // Template Engine + Enhanced Generator Integration
  // ============================================================================

  describe('Template Engine + Enhanced Generator', () => {
    it('should generate and validate hooks end-to-end', async () => {
      // Generate hook using enhanced generator
      const hook = await enhancedGenerator.generateHookFromPattern({
        type: 'integration-test',
        trigger: 'CommitEvent',
        condition: 'semantic',
        action: 'validate',
        params: {},
        priority: 8,
      });

      // Validate with Zod
      const validation = safeValidate(HookSchema, hook);
      expect(validation.success).toBe(true);

      // Verify TTL is renderable
      const ttlIsValid = hook.ttl.includes('@prefix');
      expect(ttlIsValid).toBe(true);
    });

    it('should chain template rendering with hook generation', async () => {
      // Render custom TTL template
      const customTTL = await templateEngine.renderString(TTL_TEMPLATES.basicHook, {
        name: 'Chained Hook',
        description: 'Created through template chain',
        priority: 7,
        autoExecute: true,
        triggerType: 'git:PushEvent',
        action: 'echo "chained"',
      });

      // Use in hook generation
      const hook = await enhancedGenerator.generateCompositeHook({
        name: 'Composite Chain',
        description: 'Composite hook from chain',
        trigger: 'PushEvent',
        priority: 8,
        steps: [
          { action: 'gh:ValidateTemplate', params: { template: customTTL.substring(0, 50) } },
        ],
      });

      expect(hook.metadata?.steps).toHaveLength(1);
    });

    it('should generate documentation from hook chain', async () => {
      // Generate hook
      const hook = await enhancedGenerator.generateHookFromPattern({
        type: 'documented',
        trigger: 'TagEvent',
        condition: 'version',
        action: 'deploy',
        params: { env: 'production' },
      });

      // Generate documentation
      const docs = await enhancedGenerator.generateHookDocumentation(hook);

      // Verify documentation completeness
      expect(docs).toContain('# Hook:');
      expect(docs).toContain('TagEvent');
      expect(docs).toContain('TTL Definition');
    });
  });

  // ============================================================================
  // Schema Validation + Event Processing Integration
  // ============================================================================

  describe('Schema Validation + Event Processing', () => {
    it('should validate git events and generate hooks', async () => {
      const events = [
        GIT_EVENT_FIXTURES.validCommit,
        GIT_EVENT_FIXTURES.pushEvent,
        GIT_EVENT_FIXTURES.fixCommit,
      ];

      for (const event of events) {
        // Validate event
        const validation = safeValidate(GitEventSchema, event);
        expect(validation.success).toBe(true);

        // Generate hook based on event type
        const hook = await enhancedGenerator.generateHookFromPattern({
          type: `process-${event.type}`,
          trigger: event.type,
          condition: 'always',
          action: 'process',
          params: { eventType: event.type },
        });

        expect(hook.trigger).toBe(event.type);
      }
    });

    it('should process analytics and recommend automations', async () => {
      // Validate analytics
      const validation = safeValidate(AnalyticsResultSchema, ANALYTICS_FIXTURES);
      expect(validation.success).toBe(true);

      // Generate recommendations based on analytics
      const metrics = {
        largeCommits: ANALYTICS_FIXTURES.velocity?.length || 0,
        testCoverage: 75,
        hookFailureRate: 2,
      };

      const recommendations = await workflowGenerator.recommendHooks(metrics);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  // ============================================================================
  // Full Workflow Integration
  // ============================================================================

  describe('Full Workflow Integration', () => {
    it('should execute complete JTBD scenario with hooks', async () => {
      // Setup JTBD
      jtbdEngine.registerJob(JTBD_JOB_FIXTURES.developerProductivity);
      jtbdEngine.registerScenario(JTBD_SCENARIO_FIXTURES.semanticCommitFlow);

      // Generate hooks for scenario
      const hooks = await workflowGenerator.createSelfHealingHooks();
      expect(hooks.length).toBeGreaterThan(0);

      // Execute scenario
      const result = await jtbdEngine.executeScenario('semantic-commit-flow');
      expect(result.scenarioId).toBe('semantic-commit-flow');

      // Generate documentation
      const summary = jtbdEngine.getSummaryReport();
      expect(summary.totalResults).toBeGreaterThan(0);
    });

    it('should track state through entire workflow', async () => {
      const stateTracker = new StateTracker<{
        phase: string;
        hooks: number;
        executed: number;
      }>({
        phase: 'init',
        hooks: 0,
        executed: 0,
      });

      // Phase 1: Generate hooks
      stateTracker.update({ phase: 'generating', hooks: 0, executed: 0 });
      const hooks = await enhancedGenerator.generateAndOptimizeHooks([
        { type: 'p1', trigger: 'CommitEvent', condition: 'a', action: 'x', params: {} },
        { type: 'p2', trigger: 'PushEvent', condition: 'b', action: 'y', params: {} },
      ]);
      stateTracker.update({ phase: 'generated', hooks: hooks.length, executed: 0 });

      // Phase 2: Execute hooks
      stateTracker.update({ phase: 'executing', hooks: hooks.length, executed: 0 });
      const executor = new MockHookExecutor();
      for (const hook of hooks) {
        await executor.execute(hook);
      }
      stateTracker.update({
        phase: 'complete',
        hooks: hooks.length,
        executed: executor.getExecutionCount(),
      });

      // Verify state progression
      expect(stateTracker.getHistory()).toHaveLength(5);
      expect(stateTracker.getCurrent().phase).toBe('complete');
      expect(stateTracker.getCurrent().executed).toBe(hooks.length);
    });

    it('should measure performance across components', async () => {
      const measurements: { component: string; duration: number }[] = [];

      // Measure JTBD
      const jtbdMeasurement = await measureExecutionTime(async () => {
        jtbdEngine.registerJob(JTBD_JOB_FIXTURES.teamCollaboration);
        jtbdEngine.registerScenario(JTBD_SCENARIO_FIXTURES.codeReviewFlow);
        return await jtbdEngine.executeScenario('code-review-flow');
      });
      measurements.push({ component: 'jtbd', duration: jtbdMeasurement.duration });

      // Measure hook generation
      const hookMeasurement = await measureExecutionTime(async () => {
        return await enhancedGenerator.generateAndOptimizeHooks([
          { type: 'perf', trigger: 'Event', condition: 'a', action: 'b', params: {} },
        ]);
      });
      measurements.push({ component: 'hook-gen', duration: hookMeasurement.duration });

      // Measure template rendering
      const templateMeasurement = await measureExecutionTime(async () => {
        return await templateEngine.renderString(TTL_TEMPLATES.compositeActionHook, {
          name: 'Perf Test',
          description: 'Performance test',
          priority: 5,
          triggerType: 'git:Event',
          steps: [],
        });
      });
      measurements.push({ component: 'template', duration: templateMeasurement.duration });

      // All should complete quickly
      measurements.forEach((m) => {
        expect(m.duration).toBeLessThan(5000);
      });
    });
  });

  // ============================================================================
  // Error Recovery Integration
  // ============================================================================

  describe('Error Recovery Integration', () => {
    it('should recover from JTBD execution failure', async () => {
      const scenario = JTBD_SCENARIO_FIXTURES.deploymentFlow;
      jtbdEngine.registerScenario(scenario);

      // First execution fails
      const failResult = await jtbdEngine.executeScenario(scenario.id, async () => false);
      expect(failResult.status).toBe('failed');

      // Generate self-healing hook
      const healingHooks = await workflowGenerator.createSelfHealingHooks();
      expect(healingHooks.length).toBeGreaterThan(0);

      // Retry execution succeeds
      const successResult = await jtbdEngine.executeScenario(scenario.id);
      expect(successResult.status).toBe('passed');

      // Verify recovery in summary
      const summary = jtbdEngine.getSummaryReport();
      expect(summary.totalResults).toBe(2);
    });

    it('should handle template rendering errors gracefully', async () => {
      // Valid template should work
      const validResult = await templateEngine.renderString('{{ name }}', { name: 'test' });
      expect(validResult).toBe('test');

      // Invalid template should throw but be catchable
      try {
        await templateEngine.renderString('{% invalid %}', {});
        expect(false).toBe(true); // Should not reach
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Engine should still work after error
      const afterErrorResult = await templateEngine.renderString('{{ x }}', { x: 42 });
      expect(afterErrorResult).toBe('42');
    });

    it('should continue workflow despite hook execution failures', async () => {
      const executor = new MockHookExecutor();
      const hooks = Object.values(HOOK_FIXTURES);

      // First hook fails
      executor.setShouldFail(true);
      await executor.execute(hooks[0]);
      executor.setShouldFail(false);

      // Continue with remaining hooks
      for (let i = 1; i < hooks.length; i++) {
        await executor.execute(hooks[i]);
      }

      const log = executor.getExecutionLog();
      expect(log[0].result).toBe(false);
      expect(log.slice(1).every((l) => l.result)).toBe(true);
    });
  });

  // ============================================================================
  // Concurrent Operations Integration
  // ============================================================================

  describe('Concurrent Operations', () => {
    it('should handle concurrent scenario executions', async () => {
      Object.values(JTBD_SCENARIO_FIXTURES).forEach((scenario) => {
        jtbdEngine.registerScenario(scenario);
      });

      const executions = Object.keys(JTBD_SCENARIO_FIXTURES).map((id) =>
        jtbdEngine.executeScenario(id)
      );

      const results = await Promise.all(executions);

      expect(results.length).toBe(Object.keys(JTBD_SCENARIO_FIXTURES).length);
      results.forEach((r) => {
        expect(['passed', 'failed', 'skipped']).toContain(r.status);
      });
    });

    it('should handle concurrent hook generation', async () => {
      const patterns = Array.from({ length: 20 }, (_, i) => ({
        type: `concurrent-${i}`,
        trigger: 'Event',
        condition: 'test',
        action: 'run',
        params: {},
      }));

      const generations = patterns.map((p) => enhancedGenerator.generateHookFromPattern(p));
      const hooks = await Promise.all(generations);

      expect(hooks).toHaveLength(20);
    });

    it('should handle concurrent template rendering', async () => {
      const templates = Array.from({ length: 50 }, (_, i) => ({
        template: '{{ name }}-{{ index }}',
        vars: { name: 'hook', index: i },
      }));

      const renderings = templates.map((t) => templateEngine.renderString(t.template, t.vars));
      const results = await Promise.all(renderings);

      results.forEach((r, i) => {
        expect(r).toBe(`hook-${i}`);
      });
    });
  });
});
