// src/process-mining/conformance-checker.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:conformance');

export class ConformanceChecker {
  constructor(options = {}) {
    this.logger = options.logger || logger;
  }

  async check(expectedSteps, actualSteps) {
    const deviations = [];
    let fitness = 1.0;

    // Check for skipped steps
    for (const expected of expectedSteps) {
      if (!actualSteps.includes(expected)) {
        deviations.push({
          type: 'skip',
          step: expected,
          message: `Step "${expected}" was skipped`
        });
        fitness -= 0.1;
      }
    }

    // Check for unauthorized steps
    for (const actual of actualSteps) {
      if (!expectedSteps.includes(actual)) {
        deviations.push({
          type: 'unauthorized',
          step: actual,
          message: `Unexpected step "${actual}" was executed`
        });
        fitness -= 0.15;
      }
    }

    // Check for order deviations
    const expectedOrder = expectedSteps.join(',');
    const actualOrder = actualSteps.join(',');
    if (expectedOrder !== actualOrder) {
      deviations.push({
        type: 'reorder',
        expected: expectedSteps,
        actual: actualSteps,
        message: 'Steps executed in different order than expected'
      });
      fitness -= 0.05;
    }

    // Ensure fitness is between 0 and 1
    fitness = Math.max(0, Math.min(1, fitness));

    this.logger.info(`Conformance check complete: fitness=${fitness.toFixed(2)}, deviations=${deviations.length}`);

    return {
      fitness,
      deviations,
      expectedSteps,
      actualSteps,
      timestamp: new Date().toISOString()
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
      results,
      timestamp: new Date().toISOString()
    };
  }
}
