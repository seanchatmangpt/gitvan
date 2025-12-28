/**
 * Unit Tests - JTBD Engine
 *
 * Comprehensive tests for Jobs-to-be-Done engine functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JTBDEngine, JTBDJobSchema, JTBDScenarioSchema, ExecutionResultSchema } from '@/lib/jtbd-engine';
import {
  createTestJTBDJob,
  createTestJTBDScenario,
  createTestExecutionResult,
} from '../utils/test-utils';
import { JTBD_JOB_FIXTURES, JTBD_SCENARIO_FIXTURES } from '../fixtures';

describe('JTBDEngine', () => {
  let engine: JTBDEngine;

  beforeEach(() => {
    engine = new JTBDEngine();
  });

  // ============================================================================
  // Job Registration Tests
  // ============================================================================

  describe('registerJob', () => {
    it('should register a valid job', () => {
      const job = createTestJTBDJob();
      engine.registerJob(job);

      const jobs = engine.getJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe(job.id);
    });

    it('should register multiple jobs', () => {
      const job1 = createTestJTBDJob({ id: 'job-1' });
      const job2 = createTestJTBDJob({ id: 'job-2' });

      engine.registerJob(job1);
      engine.registerJob(job2);

      expect(engine.getJobs()).toHaveLength(2);
    });

    it('should overwrite job with same id', () => {
      const job1 = createTestJTBDJob({ id: 'job-1', title: 'First' });
      const job2 = createTestJTBDJob({ id: 'job-1', title: 'Second' });

      engine.registerJob(job1);
      engine.registerJob(job2);

      const jobs = engine.getJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].title).toBe('Second');
    });

    it('should register job with all job types', () => {
      const functionalJob = createTestJTBDJob({ id: 'func', jobType: 'functional' });
      const emotionalJob = createTestJTBDJob({ id: 'emo', jobType: 'emotional' });
      const socialJob = createTestJTBDJob({ id: 'social', jobType: 'social' });

      engine.registerJob(functionalJob);
      engine.registerJob(emotionalJob);
      engine.registerJob(socialJob);

      expect(engine.getJobs()).toHaveLength(3);
    });
  });

  // ============================================================================
  // Scenario Registration Tests
  // ============================================================================

  describe('registerScenario', () => {
    it('should register a valid scenario', () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      const scenarios = engine.getScenarios();
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].id).toBe(scenario.id);
    });

    it('should register multiple scenarios', () => {
      const scenario1 = createTestJTBDScenario({ id: 'scenario-1' });
      const scenario2 = createTestJTBDScenario({ id: 'scenario-2' });

      engine.registerScenario(scenario1);
      engine.registerScenario(scenario2);

      expect(engine.getScenarios()).toHaveLength(2);
    });

    it('should register scenario with multiple steps', () => {
      const scenario = createTestJTBDScenario({
        steps: [
          { order: 1, action: 'Step 1', expectedOutcome: 'Result 1', assertion: 'true' },
          { order: 2, action: 'Step 2', expectedOutcome: 'Result 2', assertion: 'true' },
          { order: 3, action: 'Step 3', expectedOutcome: 'Result 3', assertion: 'true' },
        ],
      });

      engine.registerScenario(scenario);

      const scenarios = engine.getScenarios();
      expect(scenarios[0].steps).toHaveLength(3);
    });
  });

  // ============================================================================
  // Get Scenarios for Job Tests
  // ============================================================================

  describe('getScenariosForJob', () => {
    it('should return scenarios for specific job', () => {
      const job = createTestJTBDJob({ id: 'job-1' });
      const scenario1 = createTestJTBDScenario({ id: 's1', jobs: ['job-1'] });
      const scenario2 = createTestJTBDScenario({ id: 's2', jobs: ['job-2'] });

      engine.registerJob(job);
      engine.registerScenario(scenario1);
      engine.registerScenario(scenario2);

      const scenarios = engine.getScenariosForJob('job-1');
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].id).toBe('s1');
    });

    it('should return multiple scenarios for same job', () => {
      const scenario1 = createTestJTBDScenario({ id: 's1', jobs: ['job-1'] });
      const scenario2 = createTestJTBDScenario({ id: 's2', jobs: ['job-1'] });

      engine.registerScenario(scenario1);
      engine.registerScenario(scenario2);

      const scenarios = engine.getScenariosForJob('job-1');
      expect(scenarios).toHaveLength(2);
    });

    it('should return empty array for non-existent job', () => {
      const scenarios = engine.getScenariosForJob('non-existent');
      expect(scenarios).toHaveLength(0);
    });

    it('should handle scenarios with multiple jobs', () => {
      const scenario = createTestJTBDScenario({ id: 's1', jobs: ['job-1', 'job-2'] });
      engine.registerScenario(scenario);

      expect(engine.getScenariosForJob('job-1')).toHaveLength(1);
      expect(engine.getScenariosForJob('job-2')).toHaveLength(1);
    });
  });

  // ============================================================================
  // Execute Scenario Tests
  // ============================================================================

  describe('executeScenario', () => {
    it('should execute scenario with default executor (all pass)', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      const result = await engine.executeScenario(scenario.id);

      expect(result.status).toBe('passed');
      expect(result.stepsCompleted).toBe(result.stepsTotal);
    });

    it('should execute scenario with custom executor', async () => {
      const scenario = createTestJTBDScenario({
        steps: [
          { order: 1, action: 'Step 1', expectedOutcome: 'Pass', assertion: 'true' },
          { order: 2, action: 'Step 2', expectedOutcome: 'Fail', assertion: 'false' },
        ],
      });
      engine.registerScenario(scenario);

      let stepIndex = 0;
      const executor = async () => {
        stepIndex++;
        return stepIndex === 1; // First step passes, second fails
      };

      const result = await engine.executeScenario(scenario.id, executor);

      expect(result.status).toBe('failed');
      expect(result.stepsCompleted).toBe(1);
      expect(result.stepsTotal).toBe(2);
    });

    it('should throw for non-existent scenario', async () => {
      await expect(engine.executeScenario('non-existent')).rejects.toThrow(
        'Scenario not found: non-existent'
      );
    });

    it('should record execution duration', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      const result = await engine.executeScenario(scenario.id);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.endTime.getTime()).toBeGreaterThanOrEqual(result.startTime.getTime());
    });

    it('should handle executor errors gracefully', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      const executor = async () => {
        throw new Error('Executor error');
      };

      const result = await engine.executeScenario(scenario.id, executor);

      expect(result.status).toBe('failed');
      expect(result.assertions[0].passed).toBe(false);
      expect(result.assertions[0].error).toContain('Executor error');
    });

    it('should store results after execution', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      await engine.executeScenario(scenario.id);

      const results = engine.getResults();
      expect(results).toHaveLength(1);
    });

    it('should handle scenario with no steps', async () => {
      const scenario = createTestJTBDScenario({ steps: [] });
      engine.registerScenario(scenario);

      const result = await engine.executeScenario(scenario.id);

      expect(result.status).toBe('passed');
      expect(result.stepsCompleted).toBe(0);
      expect(result.stepsTotal).toBe(0);
    });
  });

  // ============================================================================
  // Results Management Tests
  // ============================================================================

  describe('getResults', () => {
    it('should return empty array initially', () => {
      expect(engine.getResults()).toHaveLength(0);
    });

    it('should return all results', async () => {
      const scenario1 = createTestJTBDScenario({ id: 's1' });
      const scenario2 = createTestJTBDScenario({ id: 's2' });

      engine.registerScenario(scenario1);
      engine.registerScenario(scenario2);

      await engine.executeScenario('s1');
      await engine.executeScenario('s2');

      expect(engine.getResults()).toHaveLength(2);
    });

    it('should preserve execution order', async () => {
      const scenario1 = createTestJTBDScenario({ id: 's1' });
      const scenario2 = createTestJTBDScenario({ id: 's2' });

      engine.registerScenario(scenario1);
      engine.registerScenario(scenario2);

      await engine.executeScenario('s1');
      await engine.executeScenario('s2');

      const results = engine.getResults();
      expect(results[0].scenarioId).toBe('s1');
      expect(results[1].scenarioId).toBe('s2');
    });
  });

  describe('getScenarioResults', () => {
    it('should return results for specific scenario', async () => {
      const scenario1 = createTestJTBDScenario({ id: 's1' });
      const scenario2 = createTestJTBDScenario({ id: 's2' });

      engine.registerScenario(scenario1);
      engine.registerScenario(scenario2);

      await engine.executeScenario('s1');
      await engine.executeScenario('s2');
      await engine.executeScenario('s1');

      const results = engine.getScenarioResults('s1');
      expect(results).toHaveLength(2);
      results.forEach((r) => expect(r.scenarioId).toBe('s1'));
    });

    it('should return empty array for unexecuted scenario', () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      expect(engine.getScenarioResults(scenario.id)).toHaveLength(0);
    });
  });

  // ============================================================================
  // Success Rate Calculation Tests
  // ============================================================================

  describe('calculateJobSuccessRate', () => {
    it('should return 0 for job with no scenarios', () => {
      const job = createTestJTBDJob({ id: 'job-1' });
      engine.registerJob(job);

      expect(engine.calculateJobSuccessRate('job-1')).toBe(0);
    });

    it('should return 0 for job with no executed scenarios', () => {
      const job = createTestJTBDJob({ id: 'job-1' });
      const scenario = createTestJTBDScenario({ jobs: ['job-1'] });

      engine.registerJob(job);
      engine.registerScenario(scenario);

      expect(engine.calculateJobSuccessRate('job-1')).toBe(0);
    });

    it('should calculate 100% success rate when all pass', async () => {
      const job = createTestJTBDJob({ id: 'job-1' });
      const scenario = createTestJTBDScenario({ jobs: ['job-1'] });

      engine.registerJob(job);
      engine.registerScenario(scenario);

      await engine.executeScenario(scenario.id);

      expect(engine.calculateJobSuccessRate('job-1')).toBe(100);
    });

    it('should calculate 50% success rate correctly', async () => {
      const job = createTestJTBDJob({ id: 'job-1' });
      const scenario = createTestJTBDScenario({ jobs: ['job-1'] });

      engine.registerJob(job);
      engine.registerScenario(scenario);

      // First execution passes
      await engine.executeScenario(scenario.id);

      // Second execution fails
      const failExecutor = async () => false;
      await engine.executeScenario(scenario.id, failExecutor);

      expect(engine.calculateJobSuccessRate('job-1')).toBe(50);
    });

    it('should handle multiple scenarios for same job', async () => {
      const job = createTestJTBDJob({ id: 'job-1' });
      const scenario1 = createTestJTBDScenario({ id: 's1', jobs: ['job-1'] });
      const scenario2 = createTestJTBDScenario({ id: 's2', jobs: ['job-1'] });

      engine.registerJob(job);
      engine.registerScenario(scenario1);
      engine.registerScenario(scenario2);

      await engine.executeScenario('s1');
      await engine.executeScenario('s2', async () => false);

      expect(engine.calculateJobSuccessRate('job-1')).toBe(50);
    });
  });

  // ============================================================================
  // Summary Report Tests
  // ============================================================================

  describe('getSummaryReport', () => {
    it('should return empty report initially', () => {
      const report = engine.getSummaryReport();

      expect(report.totalScenarios).toBe(0);
      expect(report.totalResults).toBe(0);
      expect(report.passed).toBe(0);
      expect(report.failed).toBe(0);
      expect(report.successRate).toBe(0);
    });

    it('should include all registered scenarios', () => {
      const scenario1 = createTestJTBDScenario({ id: 's1' });
      const scenario2 = createTestJTBDScenario({ id: 's2' });

      engine.registerScenario(scenario1);
      engine.registerScenario(scenario2);

      expect(engine.getSummaryReport().totalScenarios).toBe(2);
    });

    it('should calculate correct statistics after executions', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      await engine.executeScenario(scenario.id);
      await engine.executeScenario(scenario.id);
      await engine.executeScenario(scenario.id, async () => false);

      const report = engine.getSummaryReport();

      expect(report.totalResults).toBe(3);
      expect(report.passed).toBe(2);
      expect(report.failed).toBe(1);
      expect(report.successRate).toBeCloseTo(66.67, 0);
    });

    it('should include job success rates', async () => {
      const job = createTestJTBDJob({ id: 'job-1' });
      const scenario = createTestJTBDScenario({ jobs: ['job-1'] });

      engine.registerJob(job);
      engine.registerScenario(scenario);

      await engine.executeScenario(scenario.id);

      const report = engine.getSummaryReport();
      expect(report.jobSuccessRates['job-1']).toBe(100);
    });

    it('should calculate average duration', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      await engine.executeScenario(scenario.id);
      await engine.executeScenario(scenario.id);

      const report = engine.getSummaryReport();
      expect(report.averageDuration).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Schema Validation Tests
  // ============================================================================

  describe('Schema Validation', () => {
    it('should validate JTBDJobSchema', () => {
      const job = JTBD_JOB_FIXTURES.developerProductivity;
      const result = JTBDJobSchema.safeParse(job);
      expect(result.success).toBe(true);
    });

    it('should validate JTBDScenarioSchema', () => {
      const scenario = JTBD_SCENARIO_FIXTURES.semanticCommitFlow;
      const result = JTBDScenarioSchema.safeParse(scenario);
      expect(result.success).toBe(true);
    });

    it('should validate ExecutionResultSchema', () => {
      const executionResult = createTestExecutionResult();
      const result = ExecutionResultSchema.safeParse(executionResult);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle rapid sequential executions', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      const executions = await Promise.all([
        engine.executeScenario(scenario.id),
        engine.executeScenario(scenario.id),
        engine.executeScenario(scenario.id),
      ]);

      expect(executions).toHaveLength(3);
      expect(engine.getResults()).toHaveLength(3);
    });

    it('should handle scenario with very long execution', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      const slowExecutor = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return true;
      };

      const result = await engine.executeScenario(scenario.id, slowExecutor);

      expect(result.status).toBe('passed');
      expect(result.duration).toBeGreaterThanOrEqual(50);
    });

    it('should handle executor returning undefined', async () => {
      const scenario = createTestJTBDScenario();
      engine.registerScenario(scenario);

      const undefinedExecutor = async () => undefined as unknown as boolean;

      const result = await engine.executeScenario(scenario.id, undefinedExecutor);

      // Undefined is falsy, so step should fail
      expect(result.stepsCompleted).toBe(0);
    });
  });

  // ============================================================================
  // Fixture Integration Tests
  // ============================================================================

  describe('Fixture Integration', () => {
    it('should work with all job fixtures', () => {
      Object.values(JTBD_JOB_FIXTURES).forEach((job) => {
        engine.registerJob(job);
      });

      expect(engine.getJobs()).toHaveLength(Object.keys(JTBD_JOB_FIXTURES).length);
    });

    it('should work with all scenario fixtures', () => {
      Object.values(JTBD_SCENARIO_FIXTURES).forEach((scenario) => {
        engine.registerScenario(scenario);
      });

      expect(engine.getScenarios()).toHaveLength(Object.keys(JTBD_SCENARIO_FIXTURES).length);
    });

    it('should link fixtures correctly', async () => {
      engine.registerJob(JTBD_JOB_FIXTURES.developerProductivity);
      engine.registerScenario(JTBD_SCENARIO_FIXTURES.semanticCommitFlow);

      const scenarios = engine.getScenariosForJob('developer-productivity');
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].id).toBe('semantic-commit-flow');
    });
  });
});
