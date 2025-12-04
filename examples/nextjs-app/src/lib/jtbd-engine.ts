/**
 * JTBD (Jobs to Be Done) Engine
 *
 * Defines and executes JTBD scenarios with emotional/functional/social jobs
 * and measurable progress indicators.
 */

import { z } from 'zod';

/**
 * JTBD Progress indicator
 */
export const ProgressIndicatorSchema = z.object({
  metric: z.string(), // e.g., "commits per day", "test coverage"
  baseline: z.number(),
  target: z.number(),
  unit: z.string(), // e.g., "commits", "%", "ms"
});

export type ProgressIndicator = z.infer<typeof ProgressIndicatorSchema>;

/**
 * JTBD Outcome (desired state)
 */
export const OutcomeSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.enum(['must-have', 'should-have', 'nice-to-have']),
});

export type Outcome = z.infer<typeof OutcomeSchema>;

/**
 * JTBD Job (what users are trying to accomplish)
 */
export const JTBDJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  jobType: z.enum(['functional', 'emotional', 'social']),
  context: z.string(), // e.g., "developer workflow", "team coordination"
  outcomes: z.array(OutcomeSchema),
  metrics: z.array(ProgressIndicatorSchema),
});

export type JTBDJob = z.infer<typeof JTBDJobSchema>;

/**
 * JTBD Scenario (use case execution)
 */
export const JTBDScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  jobs: z.array(z.string()), // job IDs
  steps: z.array(
    z.object({
      order: z.number(),
      action: z.string(),
      expectedOutcome: z.string(),
      assertion: z.string(), // code that validates the outcome
    })
  ),
  successCriteria: z.array(z.string()),
  estimatedDuration: z.number(), // milliseconds
});

export type JTBDScenario = z.infer<typeof JTBDScenarioSchema>;

/**
 * JTBD Execution Result
 */
export const ExecutionResultSchema = z.object({
  scenarioId: z.string(),
  status: z.enum(['passed', 'failed', 'skipped']),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number(),
  stepsCompleted: z.number(),
  stepsTotal: z.number(),
  assertions: z.array(
    z.object({
      step: z.number(),
      assertion: z.string(),
      passed: z.boolean(),
      error: z.string().optional(),
    })
  ),
  metrics: z.record(z.string(), z.number()), // measured values
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

/**
 * JTBD Engine - Execute scenarios and track progress
 */
export class JTBDEngine {
  private jobs: Map<string, JTBDJob> = new Map();
  private scenarios: Map<string, JTBDScenario> = new Map();
  private results: ExecutionResult[] = [];

  /**
   * Register a JTBD job
   */
  registerJob(job: JTBDJob) {
    this.jobs.set(job.id, job);
  }

  /**
   * Register a JTBD scenario
   */
  registerScenario(scenario: JTBDScenario) {
    this.scenarios.set(scenario.id, scenario);
  }

  /**
   * Get all jobs
   */
  getJobs(): JTBDJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get all scenarios
   */
  getScenarios(): JTBDScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Get scenarios for a specific job
   */
  getScenariosForJob(jobId: string): JTBDScenario[] {
    return Array.from(this.scenarios.values()).filter((s) =>
      s.jobs.includes(jobId)
    );
  }

  /**
   * Execute a scenario (simplified - in real use, integrates with Playwright)
   */
  async executeScenario(
    scenarioId: string,
    executor?: (step: any) => Promise<boolean>
  ): Promise<ExecutionResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const startTime = new Date();
    let stepsCompleted = 0;
    const assertions: ExecutionResult['assertions'] = [];
    const metrics: Record<string, number> = {};

    // Execute each step
    for (const step of scenario.steps) {
      try {
        let passed = true;
        let error: string | undefined;

        if (executor) {
          passed = await executor(step);
        }

        assertions.push({
          step: step.order,
          assertion: step.assertion,
          passed,
          error,
        });

        if (passed) {
          stepsCompleted++;
        }
      } catch (err) {
        assertions.push({
          step: step.order,
          assertion: step.assertion,
          passed: false,
          error: String(err),
        });
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const status =
      stepsCompleted === scenario.steps.length
        ? 'passed'
        : stepsCompleted === 0
          ? 'skipped'
          : 'failed';

    const result: ExecutionResult = {
      scenarioId,
      status,
      startTime,
      endTime,
      duration,
      stepsCompleted,
      stepsTotal: scenario.steps.length,
      assertions,
      metrics,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Get execution results
   */
  getResults(): ExecutionResult[] {
    return this.results;
  }

  /**
   * Get results for a specific scenario
   */
  getScenarioResults(scenarioId: string): ExecutionResult[] {
    return this.results.filter((r) => r.scenarioId === scenarioId);
  }

  /**
   * Calculate job success rate
   */
  calculateJobSuccessRate(jobId: string): number {
    const scenarios = this.getScenariosForJob(jobId);
    if (scenarios.length === 0) return 0;

    const results = scenarios.flatMap((s) => this.getScenarioResults(s.id));
    if (results.length === 0) return 0;

    const passed = results.filter((r) => r.status === 'passed').length;
    return (passed / results.length) * 100;
  }

  /**
   * Get summary report
   */
  getSummaryReport() {
    const totalScenarios = this.scenarios.size;
    const totalResults = this.results.length;
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;

    const jobSuccessRates = Object.fromEntries(
      this.getJobs().map((job) => [
        job.id,
        this.calculateJobSuccessRate(job.id),
      ])
    );

    return {
      totalScenarios,
      totalResults,
      passed,
      failed,
      skipped,
      successRate: totalResults > 0 ? (passed / totalResults) * 100 : 0,
      jobSuccessRates,
      averageDuration:
        totalResults > 0
          ? this.results.reduce((sum, r) => sum + r.duration, 0) /
            totalResults
          : 0,
    };
  }
}

// Export singleton
export const jtbdEngine = new JTBDEngine();
