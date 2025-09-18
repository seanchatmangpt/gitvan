import { createLogger } from '../../utils/logger.mjs';
import { performance } from 'node:perf_hooks';

export class PackProfiler {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:profiler');
    this.timings = new Map();
    this.marks = new Map();
    this.enabled = options.profile !== false;
  }

  start(name) {
    if (!this.enabled) return;

    const startTime = performance.now();
    this.marks.set(name, startTime);

    this.logger.debug(`Started: ${name}`);
  }

  end(name) {
    if (!this.enabled) return;

    const startTime = this.marks.get(name);
    if (!startTime) {
      this.logger.warn(`No start mark for: ${name}`);
      return;
    }

    const duration = performance.now() - startTime;

    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }

    this.timings.get(name).push(duration);
    this.marks.delete(name);

    this.logger.debug(`Completed: ${name} (${duration.toFixed(2)}ms)`);

    return duration;
  }

  async measure(name, fn) {
    this.start(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(name);
    }
  }

  getReport() {
    const report = {
      timings: {},
      summary: {
        total: 0,
        operations: 0
      }
    };

    for (const [name, durations] of this.timings) {
      const total = durations.reduce((sum, d) => sum + d, 0);
      const avg = total / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      report.timings[name] = {
        count: durations.length,
        total: Math.round(total),
        average: Math.round(avg),
        min: Math.round(min),
        max: Math.round(max)
      };

      report.summary.total += total;
      report.summary.operations += durations.length;
    }

    // Sort by total time
    const sorted = Object.entries(report.timings)
      .sort((a, b) => b[1].total - a[1].total);

    report.top = sorted.slice(0, 10).map(([name, stats]) => ({
      name,
      ...stats,
      percentage: Math.round((stats.total / report.summary.total) * 100)
    }));

    return report;
  }

  logReport() {
    const report = this.getReport();

    console.log('\n📊 Performance Report');
    console.log('='.repeat(50));

    console.log(`\n⏱️  Total Time: ${Math.round(report.summary.total)}ms`);
    console.log(`📦 Operations: ${report.summary.operations}`);

    if (report.top.length > 0) {
      console.log('\n🔥 Top Operations:');
      for (const op of report.top) {
        console.log(`   ${op.name}`);
        console.log(`     Time: ${op.total}ms (${op.percentage}%)`);
        console.log(`     Avg: ${op.average}ms | Min: ${op.min}ms | Max: ${op.max}ms`);
      }
    }

    return report;
  }

  reset() {
    this.timings.clear();
    this.marks.clear();
  }
}