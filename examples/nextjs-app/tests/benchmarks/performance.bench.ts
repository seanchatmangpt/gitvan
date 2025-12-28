/**
 * Performance Benchmarks - GitVan v4 Hooks
 *
 * Comprehensive performance benchmarks for hook operations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JTBDEngine } from '@/lib/jtbd-engine';
import { AutonomicWorkflowGenerator } from '@/lib/workflow-generator';
import { NunjucksTemplateEngine, TTL_TEMPLATES } from '@/lib/nunjucks-engine';
import { safeValidate, HookSchema, GitEventSchema, AnalyticsResultSchema } from '@/lib/schemas';
import { runBenchmark, measureExecutionTime, MockHookExecutor } from '../utils/test-utils';
import { HOOK_COLLECTION, GIT_EVENT_FIXTURES, JTBD_SCENARIO_FIXTURES } from '../fixtures';

describe('Performance Benchmarks', () => {
  // ============================================================================
  // Schema Validation Benchmarks
  // ============================================================================

  describe('Schema Validation Performance', () => {
    it('should validate hooks quickly', async () => {
      const benchmark = await runBenchmark(
        'hook-validation',
        () => {
          HOOK_COLLECTION.forEach((hook) => safeValidate(HookSchema, hook));
        },
        1000
      );

      console.log('Hook Validation Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
        minTime: `${benchmark.minTime.toFixed(3)}ms`,
        maxTime: `${benchmark.maxTime.toFixed(3)}ms`,
      });

      expect(benchmark.averageTime).toBeLessThan(1); // < 1ms per iteration
    });

    it('should validate git events quickly', async () => {
      const events = Object.values(GIT_EVENT_FIXTURES);

      const benchmark = await runBenchmark(
        'git-event-validation',
        () => {
          events.forEach((event) => safeValidate(GitEventSchema, event));
        },
        1000
      );

      console.log('Git Event Validation Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
        totalEvents: events.length,
      });

      expect(benchmark.averageTime).toBeLessThan(2);
    });
  });

  // ============================================================================
  // Template Rendering Benchmarks
  // ============================================================================

  describe('Template Rendering Performance', () => {
    let templateEngine: NunjucksTemplateEngine;

    beforeAll(() => {
      templateEngine = new NunjucksTemplateEngine();
    });

    it('should render basic hook template quickly', async () => {
      const benchmark = await runBenchmark(
        'basic-hook-template',
        async () => {
          await templateEngine.renderString(TTL_TEMPLATES.basicHook, {
            name: 'Benchmark Hook',
            description: 'Performance test',
            priority: 5,
            autoExecute: true,
            triggerType: 'git:CommitEvent',
            action: 'echo "test"',
          });
        },
        500
      );

      console.log('Basic Hook Template Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
        iterations: benchmark.iterations,
      });

      expect(benchmark.averageTime).toBeLessThan(5);
    });

    it('should render composite hook template efficiently', async () => {
      const benchmark = await runBenchmark(
        'composite-hook-template',
        async () => {
          await templateEngine.renderString(TTL_TEMPLATES.compositeActionHook, {
            name: 'Complex Hook',
            description: 'Complex hook',
            priority: 8,
            triggerType: 'git:PushEvent',
            steps: Array.from({ length: 10 }, (_, i) => ({
              action: `gh:Step${i}`,
              params: { index: i },
            })),
          });
        },
        200
      );

      console.log('Composite Hook Template Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
        stepsPerHook: 10,
      });

      expect(benchmark.averageTime).toBeLessThan(10);
    });

    it('should handle bulk template rendering', async () => {
      const count = 100;
      const { duration } = await measureExecutionTime(async () => {
        const promises = Array.from({ length: count }, (_, i) =>
          templateEngine.renderString('Hook {{ index }}', { index: i })
        );
        return Promise.all(promises);
      });

      console.log('Bulk Template Rendering:', {
        totalDuration: `${duration.toFixed(3)}ms`,
        templatesRendered: count,
        averagePerTemplate: `${(duration / count).toFixed(3)}ms`,
      });

      expect(duration / count).toBeLessThan(5);
    });
  });

  // ============================================================================
  // JTBD Engine Benchmarks
  // ============================================================================

  describe('JTBD Engine Performance', () => {
    let jtbdEngine: JTBDEngine;

    beforeAll(() => {
      jtbdEngine = new JTBDEngine();
      Object.values(JTBD_SCENARIO_FIXTURES).forEach((s) => jtbdEngine.registerScenario(s));
    });

    it('should execute scenarios quickly', async () => {
      // Use actual scenario IDs from the fixture objects
      const scenarioIds = Object.values(JTBD_SCENARIO_FIXTURES).map((s) => s.id);

      const benchmark = await runBenchmark(
        'scenario-execution',
        async () => {
          const id = scenarioIds[Math.floor(Math.random() * scenarioIds.length)];
          await jtbdEngine.executeScenario(id);
        },
        100
      );

      console.log('Scenario Execution Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
        scenarios: scenarioIds.length,
      });

      expect(benchmark.averageTime).toBeLessThan(50);
    });

    it('should calculate success rates efficiently', async () => {
      // Execute scenarios first
      await jtbdEngine.executeScenario('semantic-commit-flow');
      await jtbdEngine.executeScenario('code-review-flow');

      const benchmark = await runBenchmark(
        'success-rate-calculation',
        () => {
          jtbdEngine.getSummaryReport();
        },
        1000
      );

      console.log('Success Rate Calculation Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
      });

      expect(benchmark.averageTime).toBeLessThan(1);
    });
  });

  // ============================================================================
  // Hook Generation Benchmarks
  // ============================================================================

  describe('Hook Generation Performance', () => {
    let workflowGenerator: AutonomicWorkflowGenerator;

    beforeAll(() => {
      workflowGenerator = new AutonomicWorkflowGenerator();
    });

    it('should generate hooks from patterns efficiently', async () => {
      const patterns = [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'semantic',
          action: 'validate',
          params: {
            patternName: 'Semantic',
            description: 'Semantic commits',
            triggerEvent: 'git:CommitEvent',
            pattern: '^(feat|fix):',
          },
        },
      ];

      const benchmark = await runBenchmark(
        'hook-generation',
        async () => {
          await workflowGenerator.generateHooksFromPatterns(patterns);
        },
        100
      );

      console.log('Hook Generation Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
      });

      expect(benchmark.averageTime).toBeLessThan(20);
    });

    it('should detect automations quickly', async () => {
      const benchmark = await runBenchmark(
        'automation-detection',
        async () => {
          await workflowGenerator.detectRequiredAutomation();
        },
        200
      );

      console.log('Automation Detection Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
      });

      expect(benchmark.averageTime).toBeLessThan(5);
    });

    it('should optimize hooks efficiently', async () => {
      const benchmark = await runBenchmark(
        'hook-optimization',
        async () => {
          await workflowGenerator.optimizeExistingHooks(HOOK_COLLECTION);
        },
        200
      );

      console.log('Hook Optimization Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
        hooksOptimized: HOOK_COLLECTION.length,
      });

      expect(benchmark.averageTime).toBeLessThan(5);
    });
  });

  // ============================================================================
  // Hook Execution Benchmarks
  // ============================================================================

  describe('Hook Execution Performance', () => {
    let executor: MockHookExecutor;

    beforeAll(() => {
      executor = new MockHookExecutor();
    });

    it('should execute single hook quickly', async () => {
      const hook = HOOK_COLLECTION[0];

      const benchmark = await runBenchmark(
        'single-hook-execution',
        async () => {
          await executor.execute(hook);
        },
        500
      );

      console.log('Single Hook Execution Benchmark:', {
        averageTime: `${benchmark.averageTime.toFixed(3)}ms`,
      });

      expect(benchmark.averageTime).toBeLessThan(1);
    });

    it('should execute hook batch efficiently', async () => {
      const { duration } = await measureExecutionTime(async () => {
        const executions = HOOK_COLLECTION.map((h) => executor.execute(h));
        return Promise.all(executions);
      });

      console.log('Hook Batch Execution:', {
        totalDuration: `${duration.toFixed(3)}ms`,
        hooksExecuted: HOOK_COLLECTION.length,
        averagePerHook: `${(duration / HOOK_COLLECTION.length).toFixed(3)}ms`,
      });

      expect(duration / HOOK_COLLECTION.length).toBeLessThan(2);
    });

    it('should handle high-volume execution', async () => {
      const hookCount = 1000;
      const hooks = Array.from({ length: hookCount }, (_, i) => ({
        name: `volume-hook-${i}`,
        trigger: 'Event',
        condition: 'always',
        action: 'run',
        ttl: '@prefix gh: <test#> .',
        priority: 5,
        autoExecute: true,
      }));

      const { duration } = await measureExecutionTime(async () => {
        for (const hook of hooks) {
          await executor.execute(hook);
        }
      });

      console.log('High-Volume Execution:', {
        totalDuration: `${duration.toFixed(3)}ms`,
        hooksExecuted: hookCount,
        throughput: `${(hookCount / (duration / 1000)).toFixed(0)} hooks/sec`,
      });

      expect(duration).toBeLessThan(5000); // 1000 hooks in < 5s
    });
  });

  // ============================================================================
  // Concurrent Operation Benchmarks
  // ============================================================================

  describe('Concurrent Operation Performance', () => {
    it('should handle concurrent template rendering', async () => {
      const templateEngine = new NunjucksTemplateEngine();
      const concurrentCount = 50;

      const { duration } = await measureExecutionTime(async () => {
        const promises = Array.from({ length: concurrentCount }, (_, i) =>
          templateEngine.renderString(TTL_TEMPLATES.basicHook, {
            name: `Concurrent Hook ${i}`,
            description: 'Concurrent test',
            priority: 5,
            autoExecute: true,
            triggerType: 'git:CommitEvent',
            action: 'echo "concurrent"',
          })
        );
        return Promise.all(promises);
      });

      console.log('Concurrent Template Rendering:', {
        totalDuration: `${duration.toFixed(3)}ms`,
        concurrentOperations: concurrentCount,
        averagePerOperation: `${(duration / concurrentCount).toFixed(3)}ms`,
      });

      expect(duration / concurrentCount).toBeLessThan(50);
    });

    it('should handle concurrent scenario execution', async () => {
      const jtbdEngine = new JTBDEngine();
      const scenarios = Object.values(JTBD_SCENARIO_FIXTURES);
      scenarios.forEach((s) => jtbdEngine.registerScenario(s));

      // Use actual scenario IDs from the fixture objects
      const scenarioIds = scenarios.map((s) => s.id);

      const { duration } = await measureExecutionTime(async () => {
        const executions = scenarioIds.map((id) => jtbdEngine.executeScenario(id));
        return Promise.all(executions);
      });

      console.log('Concurrent Scenario Execution:', {
        totalDuration: `${duration.toFixed(3)}ms`,
        scenariosExecuted: scenarioIds.length,
      });

      expect(duration).toBeLessThan(1000);
    });
  });

  // ============================================================================
  // Memory Efficiency Benchmarks
  // ============================================================================

  describe('Memory Efficiency', () => {
    it('should maintain stable memory during hook generation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const workflowGenerator = new AutonomicWorkflowGenerator();

      // Generate many hooks
      for (let i = 0; i < 100; i++) {
        await workflowGenerator.createSelfHealingHooks();
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      console.log('Memory Usage:', {
        initialMB: `${(initialMemory / 1024 / 1024).toFixed(2)}`,
        finalMB: `${(finalMemory / 1024 / 1024).toFixed(2)}`,
        increaseMB: `${memoryIncrease.toFixed(2)}`,
      });

      expect(memoryIncrease).toBeLessThan(50); // < 50MB increase
    });
  });

  // ============================================================================
  // Summary Report
  // ============================================================================

  describe('Benchmark Summary', () => {
    it('should generate performance summary', () => {
      const summary = {
        testSuite: 'GitVan v4 Performance Benchmarks',
        date: new Date().toISOString(),
        performanceTargets: {
          schemaValidation: '< 1ms per validation',
          templateRendering: '< 5ms per template',
          hookGeneration: '< 20ms per hook',
          scenarioExecution: '< 50ms per scenario',
          highVolumeExecution: '> 200 hooks/sec',
        },
      };

      console.log('\n=== PERFORMANCE BENCHMARK SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));

      expect(summary.testSuite).toBeDefined();
    });
  });
});
