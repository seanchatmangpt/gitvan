/**
 * Validation Report Generator
 * Generates comprehensive validation reports for OpenTelemetry instrumentation
 */

import { getTelemetry } from '../index.mjs';

/**
 * Generate validation report
 */
export async function generateValidationReport(telemetry, testResults) {
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      serviceName: telemetry.config.serviceName,
      serviceVersion: telemetry.config.serviceVersion,
      environment: telemetry.config.environment,
    },
    summary: {
      totalTests: testResults.length,
      passedTests: testResults.filter(t => t.status === 'passed').length,
      failedTests: testResults.filter(t => t.status === 'failed').length,
      totalSpans: telemetry.spans.length,
      totalMetrics: telemetry.metrics.length,
    },
    capabilities: {
      cliCommands: analyzeCLICommands(telemetry.spans),
      hooks: analyzeHooks(telemetry.spans),
      workflows: analyzeWorkflows(telemetry.spans),
      gitOperations: analyzeGitOperations(telemetry.spans),
    },
    performance: {
      avgCommandDuration: calculateAvgDuration(telemetry.spans, 'command'),
      avgHookDuration: calculateAvgDuration(telemetry.spans, 'hook'),
      avgWorkflowDuration: calculateAvgDuration(telemetry.spans, 'workflow'),
      avgGitOperationDuration: calculateAvgDuration(telemetry.spans, 'git'),
    },
    coverage: {
      readmeCapabilities: validateReadmeCapabilities(telemetry.spans),
      instrumentationCoverage: calculateInstrumentationCoverage(telemetry.spans),
    },
    testResults: testResults.map(result => ({
      name: result.name,
      status: result.status,
      duration: result.duration,
      error: result.error,
    })),
    recommendations: generateRecommendations(telemetry, testResults),
  };

  return report;
}

/**
 * Analyze CLI commands from spans
 */
function analyzeCLICommands(spans) {
  const commandSpans = spans.filter(s => s.name.startsWith('command.'));

  return {
    total: commandSpans.length,
    successful: commandSpans.filter(s => s.attributes['command.success'] !== false).length,
    failed: commandSpans.filter(s => s.attributes['command.success'] === false).length,
    commands: [...new Set(commandSpans.map(s => s.attributes['command.name']))],
    avgDuration: calculateAvgDuration(commandSpans),
  };
}

/**
 * Analyze hooks from spans
 */
function analyzeHooks(spans) {
  const hookSpans = spans.filter(s => s.name.startsWith('hook.'));

  return {
    total: hookSpans.length,
    successful: hookSpans.filter(s => s.attributes['hook.success'] !== false).length,
    failed: hookSpans.filter(s => s.attributes['hook.success'] === false).length,
    hooks: [...new Set(hookSpans.map(s => s.attributes['hook.name']))],
    avgDuration: calculateAvgDuration(hookSpans),
  };
}

/**
 * Analyze workflows from spans
 */
function analyzeWorkflows(spans) {
  const workflowSpans = spans.filter(s => s.name.startsWith('workflow.'));

  return {
    total: workflowSpans.length,
    successful: workflowSpans.filter(s => s.attributes['workflow.success'] !== false).length,
    failed: workflowSpans.filter(s => s.attributes['workflow.success'] === false).length,
    workflows: [...new Set(workflowSpans.map(s => s.attributes['workflow.name']))],
    avgDuration: calculateAvgDuration(workflowSpans),
    avgSteps: workflowSpans.reduce((sum, s) => sum + (s.attributes['workflow.steps'] || 0), 0) / workflowSpans.length || 0,
  };
}

/**
 * Analyze git operations from spans
 */
function analyzeGitOperations(spans) {
  const gitSpans = spans.filter(s => s.name.startsWith('git.'));

  return {
    total: gitSpans.length,
    successful: gitSpans.filter(s => s.attributes['git.success'] !== false).length,
    failed: gitSpans.filter(s => s.attributes['git.success'] === false).length,
    operations: [...new Set(gitSpans.map(s => s.attributes['git.operation']))],
    avgDuration: calculateAvgDuration(gitSpans),
  };
}

/**
 * Calculate average duration
 */
function calculateAvgDuration(spans, prefix = null) {
  const filteredSpans = prefix
    ? spans.filter(s => s.name.startsWith(prefix + '.'))
    : spans;

  if (filteredSpans.length === 0) return 0;

  const durations = filteredSpans.map(s => {
    const duration = s.attributes[`${prefix}.duration`] ||
                    s.attributes['command.duration'] ||
                    s.attributes['hook.duration'] ||
                    s.attributes['workflow.duration'] ||
                    s.attributes['git.duration'] || 0;
    return duration;
  });

  return durations.reduce((sum, d) => sum + d, 0) / durations.length;
}

/**
 * Validate README capabilities
 */
function validateReadmeCapabilities(spans) {
  const requiredCapabilities = {
    cliCommands: ['hooks list', 'hooks evaluate', 'workflow list', 'workflow run'],
    hooks: ['pre-task', 'post-task', 'post-edit'],
    workflows: ['data-processing', 'ci-cd'],
    gitOperations: ['status', 'add', 'commit', 'push'],
  };

  const coverage = {};

  for (const [category, capabilities] of Object.entries(requiredCapabilities)) {
    const categorySpans = spans.filter(s => {
      if (category === 'cliCommands') return s.name.startsWith('command.');
      if (category === 'hooks') return s.name.startsWith('hook.');
      if (category === 'workflows') return s.name.startsWith('workflow.');
      if (category === 'gitOperations') return s.name.startsWith('git.');
      return false;
    });

    coverage[category] = {
      required: capabilities.length,
      covered: categorySpans.length,
      percentage: (categorySpans.length / capabilities.length) * 100,
      missing: capabilities.filter(cap =>
        !categorySpans.some(s =>
          s.name.includes(cap) ||
          s.attributes[`${category.slice(0, -1)}.name`] === cap
        )
      ),
    };
  }

  return coverage;
}

/**
 * Calculate instrumentation coverage
 */
function calculateInstrumentationCoverage(spans) {
  const spanTypes = [...new Set(spans.map(s => s.name.split('.')[0]))];

  const expectedTypes = ['command', 'hook', 'workflow', 'git'];
  const coveredTypes = spanTypes.filter(t => expectedTypes.includes(t));

  return {
    total: expectedTypes.length,
    covered: coveredTypes.length,
    percentage: (coveredTypes.length / expectedTypes.length) * 100,
    types: coveredTypes,
    missing: expectedTypes.filter(t => !coveredTypes.includes(t)),
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(telemetry, testResults) {
  const recommendations = [];

  // Check test pass rate
  const passRate = testResults.filter(t => t.status === 'passed').length / testResults.length;
  if (passRate < 1.0) {
    recommendations.push({
      type: 'quality',
      severity: 'high',
      message: `Test pass rate is ${(passRate * 100).toFixed(1)}%. Aim for 100% pass rate.`,
    });
  }

  // Check span coverage
  const spanCoverage = calculateInstrumentationCoverage(telemetry.spans);
  if (spanCoverage.percentage < 100) {
    recommendations.push({
      type: 'coverage',
      severity: 'medium',
      message: `Instrumentation coverage is ${spanCoverage.percentage.toFixed(1)}%. Missing: ${spanCoverage.missing.join(', ')}`,
    });
  }

  // Check performance
  const avgDuration = calculateAvgDuration(telemetry.spans);
  if (avgDuration > 100) {
    recommendations.push({
      type: 'performance',
      severity: 'low',
      message: `Average operation duration is ${avgDuration.toFixed(2)}ms. Consider optimization.`,
    });
  }

  // Check error rate
  const errorSpans = telemetry.spans.filter(s =>
    s.attributes['command.success'] === false ||
    s.attributes['hook.success'] === false ||
    s.attributes['workflow.success'] === false ||
    s.attributes['git.success'] === false
  );
  const errorRate = errorSpans.length / telemetry.spans.length;
  if (errorRate > 0.05) {
    recommendations.push({
      type: 'reliability',
      severity: 'high',
      message: `Error rate is ${(errorRate * 100).toFixed(1)}%. Investigate failing operations.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      severity: 'info',
      message: 'All validation checks passed! OpenTelemetry instrumentation is working correctly.',
    });
  }

  return recommendations;
}

/**
 * Format report as Markdown
 */
export function formatReportAsMarkdown(report) {
  return `# GitVan OpenTelemetry Validation Report

**Generated:** ${report.metadata.generatedAt}
**Service:** ${report.metadata.serviceName} v${report.metadata.serviceVersion}
**Environment:** ${report.metadata.environment}

## Summary

- **Total Tests:** ${report.summary.totalTests}
- **Passed Tests:** ${report.summary.passedTests} ✅
- **Failed Tests:** ${report.summary.failedTests} ${report.summary.failedTests > 0 ? '❌' : ''}
- **Total Spans:** ${report.summary.totalSpans}
- **Total Metrics:** ${report.summary.totalMetrics}

**Pass Rate:** ${((report.summary.passedTests / report.summary.totalTests) * 100).toFixed(1)}%

## Capabilities Coverage

### CLI Commands
- **Total:** ${report.capabilities.cliCommands.total}
- **Successful:** ${report.capabilities.cliCommands.successful}
- **Failed:** ${report.capabilities.cliCommands.failed}
- **Average Duration:** ${report.capabilities.cliCommands.avgDuration.toFixed(2)}ms
- **Commands:** ${report.capabilities.cliCommands.commands.join(', ')}

### Hooks
- **Total:** ${report.capabilities.hooks.total}
- **Successful:** ${report.capabilities.hooks.successful}
- **Failed:** ${report.capabilities.hooks.failed}
- **Average Duration:** ${report.capabilities.hooks.avgDuration.toFixed(2)}ms
- **Hooks:** ${report.capabilities.hooks.hooks.join(', ')}

### Workflows
- **Total:** ${report.capabilities.workflows.total}
- **Successful:** ${report.capabilities.workflows.successful}
- **Failed:** ${report.capabilities.workflows.failed}
- **Average Duration:** ${report.capabilities.workflows.avgDuration.toFixed(2)}ms
- **Average Steps:** ${report.capabilities.workflows.avgSteps.toFixed(1)}
- **Workflows:** ${report.capabilities.workflows.workflows.join(', ')}

### Git Operations
- **Total:** ${report.capabilities.gitOperations.total}
- **Successful:** ${report.capabilities.gitOperations.successful}
- **Failed:** ${report.capabilities.gitOperations.failed}
- **Average Duration:** ${report.capabilities.gitOperations.avgDuration.toFixed(2)}ms
- **Operations:** ${report.capabilities.gitOperations.operations.join(', ')}

## Performance

| Category | Average Duration (ms) |
|----------|----------------------|
| Commands | ${report.performance.avgCommandDuration.toFixed(2)} |
| Hooks | ${report.performance.avgHookDuration.toFixed(2)} |
| Workflows | ${report.performance.avgWorkflowDuration.toFixed(2)} |
| Git Operations | ${report.performance.avgGitOperationDuration.toFixed(2)} |

## Coverage Analysis

### README Capabilities
${Object.entries(report.coverage.readmeCapabilities).map(([category, data]) => `
#### ${category}
- **Required:** ${data.required}
- **Covered:** ${data.covered}
- **Coverage:** ${data.percentage.toFixed(1)}%
${data.missing.length > 0 ? `- **Missing:** ${data.missing.join(', ')}` : ''}
`).join('\n')}

### Instrumentation Coverage
- **Total Types:** ${report.coverage.instrumentationCoverage.total}
- **Covered Types:** ${report.coverage.instrumentationCoverage.covered}
- **Coverage:** ${report.coverage.instrumentationCoverage.percentage.toFixed(1)}%
- **Types:** ${report.coverage.instrumentationCoverage.types.join(', ')}
${report.coverage.instrumentationCoverage.missing.length > 0 ? `- **Missing:** ${report.coverage.instrumentationCoverage.missing.join(', ')}` : ''}

## Test Results

${report.testResults.map(test => `
### ${test.name}
- **Status:** ${test.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
- **Duration:** ${test.duration}ms
${test.error ? `- **Error:** ${test.error}` : ''}
`).join('\n')}

## Recommendations

${report.recommendations.map(rec => `
### ${rec.severity.toUpperCase()}: ${rec.type}
${rec.message}
`).join('\n')}

---

**Report generated by GitVan OpenTelemetry Validation System**
`;
}

export default {
  generateValidationReport,
  formatReportAsMarkdown,
};
