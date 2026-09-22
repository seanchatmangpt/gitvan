// src/process-mining/bottleneck-detector.mjs
import { createLogger } from '../utils/logger.mjs';

const logger = createLogger('process-mining:bottleneck');

export class BottleneckDetector {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    this.thresholds = options.thresholds || {
      warning: 2000,  // 2s
      critical: 5000  // 5s
    };
  }

  async detect(executions) {
    const stepMetrics = new Map(); // stepName -> { durations, count }

    // Collect metrics across all executions
    for (const execution of executions) {
      for (const activity of execution.activities) {
        if (!activity.duration) continue;

        const metrics = stepMetrics.get(activity.name) || { durations: [], count: 0 };
        metrics.durations.push(activity.duration);
        metrics.count++;
        stepMetrics.set(activity.name, metrics);
      }
    }

    // Calculate statistics and identify bottlenecks
    const bottlenecks = [];

    for (const [stepName, metrics] of stepMetrics) {
      const durations = metrics.durations.sort((a, b) => a - b);
      const p95 = this._percentile(durations, 95);
      const p99 = this._percentile(durations, 99);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

      let status = 'ok';
      if (p99 > this.thresholds.critical) {
        status = 'critical';
      } else if (p95 > this.thresholds.warning) {
        status = 'warning';
      }

      if (status !== 'ok') {
        bottlenecks.push({
          step: stepName,
          avg,
          p95,
          p99,
          status,
          executions: metrics.count
        });
      }
    }

    // Sort by severity (critical first, then by p99 duration)
    bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, ok: 2 };
      const severityDiff = severityOrder[a.status] - severityOrder[b.status];
      if (severityDiff !== 0) return severityDiff;
      return b.p99 - a.p99;
    });

    this.logger.info(`Detected ${bottlenecks.length} bottlenecks`);
    return bottlenecks;
  }

  _percentile(sortedArray, p) {
    // Use linear interpolation for more accurate percentiles
    const rank = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    const weight = rank - lower;

    if (lower === upper) {
      return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }
}
