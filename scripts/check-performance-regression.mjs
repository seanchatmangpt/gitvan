#!/usr/bin/env node
/**
 * Check for Performance Regressions
 *
 * Compares current benchmark results with previous baseline.
 * Fails if any operation is >10% slower than baseline.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BENCHMARKS_DIR = '.benchmarks';
const REGRESSION_THRESHOLD = 0.10; // 10% slowdown is considered a regression

async function loadBenchmark(filename) {
  const path = join(BENCHMARKS_DIR, filename);
  if (!existsSync(path)) {
    return null;
  }
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

async function checkRegression() {
  // Load current results
  const current = await loadBenchmark('latest.json');
  if (!current) {
    console.log('No current benchmark results found. Skipping regression check.');
    return true;
  }

  // Try to load baseline (previous successful run)
  const baseline = await loadBenchmark('baseline.json');
  if (!baseline) {
    console.log('No baseline found. Using current results as new baseline.');
    return true;
  }

  console.log('\n' + '='.repeat(80));
  console.log('Performance Regression Check');
  console.log('='.repeat(80) + '\n');

  console.log(`Current:  ${current.timestamp}`);
  console.log(`Baseline: ${baseline.timestamp}`);
  console.log(`Threshold: ${(REGRESSION_THRESHOLD * 100).toFixed(0)}% slowdown\n`);

  const regressions = [];
  const improvements = [];

  const maxNameLength = Math.max(
    ...Object.keys(current.results).map(k => k.length)
  );

  console.log(
    'Operation'.padEnd(maxNameLength + 2) +
    'Current'.padStart(12) +
    'Baseline'.padStart(12) +
    'Change'.padStart(12) +
    '  Status'
  );
  console.log('-'.repeat(80));

  for (const [name, currentStats] of Object.entries(current.results)) {
    const baselineStats = baseline.results[name];

    if (!baselineStats) {
      console.log(
        name.padEnd(maxNameLength + 2) +
        `${currentStats.p95.toFixed(2)}ms`.padStart(12) +
        'N/A'.padStart(12) +
        'NEW'.padStart(12) +
        '  ℹ️  NEW'
      );
      continue;
    }

    const currentP95 = currentStats.p95;
    const baselineP95 = baselineStats.p95;
    const change = (currentP95 - baselineP95) / baselineP95;
    const changePercent = (change * 100).toFixed(1);
    const changeStr = change >= 0 ? `+${changePercent}%` : `${changePercent}%`;

    let status = '✓ OK';
    let statusIcon = '';

    if (change > REGRESSION_THRESHOLD) {
      status = '✗ REGRESSION';
      statusIcon = '⚠️ ';
      regressions.push({
        name,
        current: currentP95,
        baseline: baselineP95,
        change: changePercent,
      });
    } else if (change < -REGRESSION_THRESHOLD) {
      status = '✓ IMPROVED';
      statusIcon = '🚀 ';
      improvements.push({
        name,
        current: currentP95,
        baseline: baselineP95,
        change: changePercent,
      });
    }

    console.log(
      name.padEnd(maxNameLength + 2) +
      `${currentP95.toFixed(2)}ms`.padStart(12) +
      `${baselineP95.toFixed(2)}ms`.padStart(12) +
      changeStr.padStart(12) +
      `  ${statusIcon}${status}`
    );
  }

  console.log('-'.repeat(80) + '\n');

  // Summary
  if (regressions.length > 0) {
    console.log(`⚠️  ${regressions.length} performance regression(s) detected:\n`);
    for (const reg of regressions) {
      console.log(
        `  - ${reg.name}: ${reg.baseline.toFixed(2)}ms → ${reg.current.toFixed(2)}ms (${reg.change}%)`
      );
    }
    console.log();
  }

  if (improvements.length > 0) {
    console.log(`🚀 ${improvements.length} performance improvement(s) detected:\n`);
    for (const imp of improvements) {
      console.log(
        `  - ${imp.name}: ${imp.baseline.toFixed(2)}ms → ${imp.current.toFixed(2)}ms (${imp.change}%)`
      );
    }
    console.log();
  }

  if (regressions.length === 0 && improvements.length === 0) {
    console.log('✅ No significant performance changes detected.\n');
  }

  // Generate GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    let summary = '## Performance Regression Check\n\n';

    if (regressions.length > 0) {
      summary += '### ⚠️ Regressions\n\n';
      summary += '| Operation | Baseline | Current | Change |\n';
      summary += '|-----------|----------|---------|--------|\n';
      for (const reg of regressions) {
        summary += `| ${reg.name} | ${reg.baseline.toFixed(2)}ms | ${reg.current.toFixed(2)}ms | ${reg.change}% |\n`;
      }
      summary += '\n';
    }

    if (improvements.length > 0) {
      summary += '### 🚀 Improvements\n\n';
      summary += '| Operation | Baseline | Current | Change |\n';
      summary += '|-----------|----------|---------|--------|\n';
      for (const imp of improvements) {
        summary += `| ${imp.name} | ${imp.baseline.toFixed(2)}ms | ${imp.current.toFixed(2)}ms | ${imp.change}% |\n`;
      }
      summary += '\n';
    }

    if (regressions.length === 0 && improvements.length === 0) {
      summary += '✅ No significant performance changes detected.\n';
    }

    await import('node:fs/promises').then(fs =>
      fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
    );
  }

  // Exit with error if regressions detected
  return regressions.length === 0;
}

checkRegression()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error checking performance regression:', err);
    process.exit(1);
  });
