// src/process-mining/variant-analyzer.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:variant');

export class VariantAnalyzer {
  constructor(options = {}) {
    this.logger = options.logger || logger;
  }

  async discover(executions) {
    // Group executions by their step sequence
    const variantMap = new Map();

    for (const execution of executions) {
      const path = execution.activities.map(a => a.name);
      const pathKey = path.join('->');

      if (!variantMap.has(pathKey)) {
        variantMap.set(pathKey, {
          path,
          frequency: 0,
          caseIds: [],
          exampleCaseId: execution.caseId
        });
      }

      const variant = variantMap.get(pathKey);
      variant.frequency++;
      variant.caseIds.push(execution.caseId);
    }

    // Convert to array and sort by frequency
    const variants = Array.from(variantMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .map((variant, index) => ({
        ...variant,
        rank: index + 1,
        percentage: (variant.frequency / executions.length * 100).toFixed(1)
      }));

    this.logger.info(`Discovered ${variants.length} process variants`);
    return variants;
  }

  async getVariantStatistics(executions) {
    const variants = await this.discover(executions);

    return {
      totalVariants: variants.length,
      mostCommonVariant: variants[0] || null,
      variantCoverage: variants.map(v => ({
        path: v.path.join('->'),
        frequency: v.frequency,
        percentage: v.percentage
      })),
      entropy: this._calculateEntropy(variants, executions.length)
    };
  }

  _calculateEntropy(variants, totalExecutions) {
    let entropy = 0;

    for (const variant of variants) {
      const p = variant.frequency / totalExecutions;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }
}
