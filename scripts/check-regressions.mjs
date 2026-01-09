#!/usr/bin/env node
/**
 * Check for Performance Regressions Across All Phases
 *
 * Compares current benchmark results with previous baseline across:
 * - Phase 1: Git-Native I/O
 * - Phase 2: Performance Monitoring
 * - Phase 3: RevOps
 * - Phase 4: Pack System
 *
 * Fails if any operation is >10% slower than baseline.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BENCHMARKS_DIR = '.benchmarks';
const REGRESSION_THRESHOLD = 0.10; // 10% slowdown is considered a regression

const PHASES = [
  { id: 1, name: 'Git-Native I/O', file: 'latest-phase1.json', baseline: 'baseline-phase1.json' },
  { id: 2, name: 'Performance Monitoring', file: 'latest-phase2.json', baseline: 'baseline-phase2.json' },
  { id: 3, name: 'RevOps', file: 'latest-phase3.json', baseline: 'baseline-phase3.json' },
  { id: 4, name: 'Pack System', file: 'latest-phase4.json', baseline: 'baseline-phase4.json' },
];

async function loadBenchmark(filename) {
  const path = join(BENCHMARKS_DIR, filename);
  if (!existsSync(path)) {
    return null;
  }
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

async function checkPhaseRegression(phase) {
  // Load current results
  const current = await loadBenchmark(phase.file);
  if (!current) {
    console.log(`⚠️  Phase ${phase.id} (${phase.name}): No current benchmark results found.`);
    return { phase, regressions: [], improvements: [], missing: true };
  }

  // Try to load baseline
  const baseline = await loadBenchmark(phase.baseline);
  if (!baseline) {
    console.log(`ℹ️  Phase ${phase.id} (${phase.name}): No baseline found. Using current as new baseline.`);
    // Save current as baseline
    await writeFile(
      join(BENCHMARKS_DIR, phase.baseline),
      JSON.stringify(current, null, 2)
    );
    return { phase, regressions: [], improvements: [], newBaseline: true };
  }

  const regressions = [];
  const improvements = [];

  for (const [name, currentStats] of Object.entries(current.results)) {
    const baselineStats = baseline.results[name];

    if (!baselineStats) {
      // New operation added
      continue;
    }

    const currentP95 = currentStats.p95;
    const baselineP95 = baselineStats.p95;
    const change = (currentP95 - baselineP95) / baselineP95;
    const changePercent = (change * 100).toFixed(1);

    if (change > REGRESSION_THRESHOLD) {
      regressions.push({
        name,
        current: currentP95,
        baseline: baselineP95,
        change: changePercent,
      });
    } else if (change < -REGRESSION_THRESHOLD) {
      improvements.push({
        name,
        current: currentP95,
        baseline: baselineP95,
        change: changePercent,
      });
    }
  }

  return { phase, current, baseline, regressions, improvements };
}

async function checkAllRegressions() {
  console.log('\n' + '='.repeat(80));
  console.log('Performance Regression Check - All Phases');
  console.log('='.repeat(80) + '\n');
  console.log(`Regression Threshold: ${(REGRESSION_THRESHOLD * 100).toFixed(0)}% slowdown\n`);

  const results = [];
  let totalRegressions = 0;
  let totalImprovements = 0;

  for (const phase of PHASES) {
    const result = await checkPhaseRegression(phase);
    results.push(result);

    if (result.missing) continue;
    if (result.newBaseline) continue;

    totalRegressions += result.regressions.length;
    totalImprovements += result.improvements.length;

    // Print phase summary
    console.log(`\n${'━'.repeat(80)}`);
    console.log(`Phase ${phase.id}: ${phase.name}`);
    console.log('━'.repeat(80));

    if (result.current && result.baseline) {
      console.log(`Current:  ${result.current.timestamp}`);
      console.log(`Baseline: ${result.baseline.timestamp}`);
    }

    if (result.regressions.length > 0) {
      console.log(`\n⚠️  ${result.regressions.length} regression(s) detected:\n`);
      for (const reg of result.regressions) {
        console.log(
          `  - ${reg.name}: ${reg.baseline.toFixed(2)}ms → ${reg.current.toFixed(2)}ms (${reg.change}%)`
        );
      }
    }

    if (result.improvements.length > 0) {
      console.log(`\n🚀 ${result.improvements.length} improvement(s) detected:\n`);
      for (const imp of result.improvements) {
        console.log(
          `  - ${imp.name}: ${imp.baseline.toFixed(2)}ms → ${imp.current.toFixed(2)}ms (${imp.change}%)`
        );
      }
    }

    if (result.regressions.length === 0 && result.improvements.length === 0) {
      console.log('\n✅ No significant performance changes detected.');
    }
  }

  // Overall summary
  console.log('\n' + '='.repeat(80));
  console.log('Overall Summary');
  console.log('='.repeat(80) + '\n');

  console.log(`Total Regressions: ${totalRegressions}`);
  console.log(`Total Improvements: ${totalImprovements}`);

  if (totalRegressions > 0) {
    console.log('\n⚠️  Performance regressions detected across phases!');
  } else {
    console.log('\n✅ No performance regressions detected!');
  }

  // Generate GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    await generateGitHubSummary(results, totalRegressions, totalImprovements);
  }

  // Generate detailed JSON report
  await generateDetailedReport(results);

  return totalRegressions === 0;
}

async function generateGitHubSummary(results, totalRegressions, totalImprovements) {
  let summary = '## Performance Regression Check - All Phases\n\n';
  summary += `**Threshold:** ${(REGRESSION_THRESHOLD * 100).toFixed(0)}% slowdown\n\n`;
  summary += `**Total Regressions:** ${totalRegressions}\n`;
  summary += `**Total Improvements:** ${totalImprovements}\n\n`;

  for (const result of results) {
    if (result.missing || result.newBaseline) continue;

    summary += `### Phase ${result.phase.id}: ${result.phase.name}\n\n`;

    if (result.regressions.length > 0) {
      summary += '#### ⚠️ Regressions\n\n';
      summary += '| Operation | Baseline | Current | Change |\n';
      summary += '|-----------|----------|---------|--------|\n';
      for (const reg of result.regressions) {
        summary += `| ${reg.name} | ${reg.baseline.toFixed(2)}ms | ${reg.current.toFixed(2)}ms | ${reg.change}% |\n`;
      }
      summary += '\n';
    }

    if (result.improvements.length > 0) {
      summary += '#### 🚀 Improvements\n\n';
      summary += '| Operation | Baseline | Current | Change |\n';
      summary += '|-----------|----------|---------|--------|\n';
      for (const imp of result.improvements) {
        summary += `| ${imp.name} | ${imp.baseline.toFixed(2)}ms | ${imp.current.toFixed(2)}ms | ${imp.change}% |\n`;
      }
      summary += '\n';
    }

    if (result.regressions.length === 0 && result.improvements.length === 0) {
      summary += '✅ No significant performance changes detected.\n\n';
    }
  }

  // Overall status
  if (totalRegressions > 0) {
    summary += '\n---\n\n';
    summary += `### ⚠️ Action Required\n\n`;
    summary += `${totalRegressions} performance regression(s) detected across ${results.filter(r => r.regressions?.length > 0).length} phase(s).\n`;
    summary += 'Please investigate and optimize the affected operations.\n';
  } else {
    summary += '\n---\n\n';
    summary += '### ✅ All Clear\n\n';
    summary += 'No performance regressions detected across any phase.\n';
  }

  await import('node:fs/promises').then(fs =>
    fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
  );
}

async function generateDetailedReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'local',
    branch: process.env.GITHUB_REF || 'local',
    threshold: REGRESSION_THRESHOLD,
    phases: results.map(result => ({
      phase: result.phase.id,
      name: result.phase.name,
      regressions: result.regressions || [],
      improvements: result.improvements || [],
      current: result.current ? {
        timestamp: result.current.timestamp,
        commit: result.current.commit,
      } : null,
      baseline: result.baseline ? {
        timestamp: result.baseline.timestamp,
        commit: result.baseline.commit,
      } : null,
    })),
    summary: {
      totalRegressions: results.reduce((sum, r) => sum + (r.regressions?.length || 0), 0),
      totalImprovements: results.reduce((sum, r) => sum + (r.improvements?.length || 0), 0),
      phasesWithRegressions: results.filter(r => r.regressions?.length > 0).length,
    },
  };

  await writeFile(
    join(BENCHMARKS_DIR, `regression-report-${Date.now()}.json`),
    JSON.stringify(report, null, 2)
  );

  // Also save as latest
  await writeFile(
    join(BENCHMARKS_DIR, 'latest-regression-report.json'),
    JSON.stringify(report, null, 2)
  );
}

// Run regression check
checkAllRegressions()
  .then(success => {
    console.log();
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error checking performance regression:', err);
    process.exit(1);
  });
