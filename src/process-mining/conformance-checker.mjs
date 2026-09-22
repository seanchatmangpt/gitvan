// src/process-mining/conformance-checker.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:conformance');

// Fitness penalties (configurable)
const PENALTIES = {
  SKIP: 0.1,
  UNAUTHORIZED: 0.15,
  REORDER: 0.05
};

export class ConformanceChecker {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    this.penalties = options.penalties || PENALTIES;
  }

  async check(expectedSteps, actualSteps) {
    const deviations = [];
    let fitness = 1.0;

    // Use Set for O(1) lookups
    const expectedSet = new Set(expectedSteps);
    const actualSet = new Set(actualSteps);

    // Check for skipped steps (in expected but not in actual)
    for (const expected of expectedSteps) {
      if (!actualSet.has(expected)) {
        deviations.push({
          type: 'skip',
          step: expected,
          message: `Step "${expected}" was skipped`
        });
        fitness -= this.penalties.SKIP;
      }
    }

    // Check for unauthorized steps (in actual but not in expected)
    for (const actual of actualSteps) {
      if (!expectedSet.has(actual)) {
        deviations.push({
          type: 'unauthorized',
          step: actual,
          message: `Unexpected step "${actual}" was executed`
        });
        fitness -= this.penalties.UNAUTHORIZED;
      }
    }

    // Check for order deviations (compare arrays directly)
    if (expectedSteps.length !== actualSteps.length ||
        !expectedSteps.every((step, i) => step === actualSteps[i])) {
      deviations.push({
        type: 'reorder',
        expected: expectedSteps,
        actual: actualSteps,
        message: 'Steps executed in different order than expected'
      });
      fitness -= this.penalties.REORDER;
    }

    // Ensure fitness is between 0 and 1
    fitness = Math.max(0, Math.min(1, fitness));

    this.logger.info(`Conformance check complete: fitness=${fitness.toFixed(2)}, deviations=${deviations.length}`);

    return {
      fitness,
      deviations,
      expectedSteps,
      actualSteps
      // Removed timestamp for determinism
    };
  }

  async checkMultiple(expectedSteps, executions) {
    const results = [];
    let totalFitness = 0;

    for (const execution of executions) {
      const actualSteps = execution.activities.map(a => a.name);
      const result = await this.check(expectedSteps, actualSteps);
      results.push({
        caseId: execution.caseId,
        ...result
      });
      totalFitness += result.fitness;
    }

    return {
      averageFitness: totalFitness / executions.length,
      executions: results.length,
      results
      // Removed timestamp for determinism
    };
  }
}
