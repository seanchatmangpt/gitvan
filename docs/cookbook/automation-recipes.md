# Automation Recipes

This cookbook contains practical automation recipes for common development workflows using GitVan v2's hook system and integrations.

## Recipe 1: Auto-formatting on Commit

### Use Case
Automatically format code before commits to ensure consistent style across the team.

### Configuration
```javascript
// .gitvan/hooks/auto-format.mjs
export default {
  name: 'auto-format',
  triggers: ['pre-commit'],
  action: async ({ git, exec, logger }) => {
    const staged = await git.getStagedFiles();
    const jsFiles = staged.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
    const cssFiles = staged.filter(f => f.endsWith('.css') || f.endsWith('.scss'));

    // Format JavaScript files
    if (jsFiles.length > 0) {
      await exec.run('prettier', ['--write', ...jsFiles]);
      await exec.run('eslint', ['--fix', ...jsFiles]);
      await git.add(jsFiles);
      logger.info(`Formatted ${jsFiles.length} JS files`);
    }

    // Format CSS files
    if (cssFiles.length > 0) {
      await exec.run('prettier', ['--write', ...cssFiles]);
      await git.add(cssFiles);
      logger.info(`Formatted ${cssFiles.length} CSS files`);
    }

    // Check for formatting issues
    const hasIssues = await exec.run('prettier', ['--check', ...staged], {
      exitOnError: false
    });

    if (hasIssues.exitCode !== 0) {
      throw new Error('Some files still have formatting issues');
    }
  }
};
```

### Package Configuration
```json
// package.json
{
  "scripts": {
    "format": "prettier --write .",
    "lint": "eslint --fix src/"
  },
  "devDependencies": {
    "prettier": "^3.0.0",
    "eslint": "^8.0.0"
  }
}
```

### Expected Results
- All staged files automatically formatted
- Consistent code style across commits
- Linting errors fixed automatically
- Commit blocked if formatting fails

---

## Recipe 2: Dependency Updates Automation

### Use Case
Automatically check for and apply dependency updates, with testing and approval workflows.

### Configuration
```javascript
// .gitvan/hooks/dependency-updates.mjs
export default {
  name: 'dependency-updates',
  schedule: '0 9 * * 1', // Every Monday at 9 AM
  action: async ({ git, exec, github, config }) => {
    const updateBranch = 'chore/dependency-updates';

    // Create update branch
    await git.createBranch(updateBranch);
    await git.checkout(updateBranch);

    // Check for updates
    const outdated = await exec.run('npm', ['outdated', '--json'], {
      captureOutput: true,
      exitOnError: false
    });

    if (outdated.exitCode === 0) {
      logger.info('All dependencies are up to date');
      return;
    }

    const updates = JSON.parse(outdated.stdout);
    const safeUpdates = Object.entries(updates)
      .filter(([, info]) => info.wanted !== info.current)
      .filter(([, info]) => !isBreakingChange(info));

    if (safeUpdates.length === 0) {
      logger.info('No safe updates available');
      return;
    }

    // Apply safe updates
    for (const [pkg] of safeUpdates) {
      await exec.run('npm', ['update', pkg]);
    }

    // Run tests
    const testResult = await exec.run('npm', ['test'], {
      exitOnError: false
    });

    if (testResult.exitCode === 0) {
      // Commit and create PR
      await git.add('package*.json');
      await git.commit('chore: update dependencies\n\nUpdated packages:\n' +
        safeUpdates.map(([pkg, info]) =>
          `- ${pkg}: ${info.current} → ${info.wanted}`
        ).join('\n')
      );

      await git.push('origin', updateBranch);

      await github.createPullRequest({
        title: 'chore: automated dependency updates',
        head: updateBranch,
        base: 'main',
        body: generateUpdatePR(safeUpdates)
      });
    } else {
      logger.error('Tests failed after updates, manual review needed');
    }
  }
};

function isBreakingChange(info) {
  const [currentMajor] = info.current.split('.');
  const [wantedMajor] = info.wanted.split('.');
  return currentMajor !== wantedMajor;
}

function generateUpdatePR(updates) {
  return `
## Automated Dependency Updates

This PR contains safe dependency updates that passed all tests.

### Updated Packages
${updates.map(([pkg, info]) =>
  `- **${pkg}**: ${info.current} → ${info.wanted}`
).join('\n')}

### Validation
- ✅ All tests pass
- ✅ No breaking changes detected
- ✅ Security vulnerabilities addressed

Created automatically by GitVan dependency automation.
`;
}
```

### Configuration
```yaml
# .gitvan/config.yaml
dependencies:
  autoUpdate:
    enabled: true
    schedule: '0 9 * * 1'
    createPR: true
    runTests: true
    excludePackages:
      - 'react' # Exclude major updates
      - '@types/node'
```

### Expected Results
- Weekly dependency update checks
- Automatic PRs for safe updates
- Test validation before merging
- Clear update summaries

---

## Recipe 3: Test Automation Pipeline

### Use Case
Comprehensive test automation that runs different test suites based on file changes and integrates with CI/CD.

### Configuration
```javascript
// .gitvan/hooks/test-automation.mjs
export default {
  name: 'test-automation',
  triggers: ['pre-push', 'pr:created'],
  action: async ({ git, exec, github, context }) => {
    const changedFiles = await git.getChangedFiles();
    const testSuite = determineTestSuite(changedFiles);

    logger.info(`Running test suite: ${testSuite.name}`);

    // Run appropriate tests
    const results = await runTestSuite(testSuite, exec);

    // Generate test report
    const report = generateTestReport(results);

    if (context.trigger === 'pr:created') {
      // Add test results to PR
      await github.addPRComment(context.pr.number, {
        body: `## 🧪 Test Results\n\n${report}`
      });
    }

    // Fail if critical tests fail
    if (results.critical.failed > 0) {
      throw new Error(`${results.critical.failed} critical tests failed`);
    }

    // Store test metrics
    await storeTestMetrics(results);
  }
};

function determineTestSuite(files) {
  const hasBackendChanges = files.some(f => f.includes('src/api/'));
  const hasFrontendChanges = files.some(f => f.includes('src/components/'));
  const hasDBChanges = files.some(f => f.includes('migrations/'));

  if (hasDBChanges) {
    return { name: 'full', tests: ['unit', 'integration', 'e2e'] };
  }
  if (hasBackendChanges && hasFrontendChanges) {
    return { name: 'integration', tests: ['unit', 'integration'] };
  }
  if (hasBackendChanges) {
    return { name: 'backend', tests: ['unit', 'api'] };
  }
  if (hasFrontendChanges) {
    return { name: 'frontend', tests: ['unit', 'component'] };
  }
  return { name: 'unit', tests: ['unit'] };
}

async function runTestSuite(suite, exec) {
  const results = { critical: { passed: 0, failed: 0 }, coverage: 0 };

  for (const testType of suite.tests) {
    const result = await exec.run('npm', ['run', `test:${testType}`], {
      captureOutput: true,
      exitOnError: false
    });

    if (result.exitCode === 0) {
      results.critical.passed++;
    } else {
      results.critical.failed++;
      results.errors = results.errors || [];
      results.errors.push({
        type: testType,
        output: result.stderr
      });
    }
  }

  // Get coverage
  if (suite.tests.includes('unit')) {
    const coverage = await exec.run('npm', ['run', 'test:coverage'], {
      captureOutput: true
    });
    results.coverage = parseCoverage(coverage.stdout);
  }

  return results;
}

function generateTestReport(results) {
  const emoji = results.critical.failed === 0 ? '✅' : '❌';

  return `
${emoji} **Test Summary**

- **Tests Passed**: ${results.critical.passed}
- **Tests Failed**: ${results.critical.failed}
- **Coverage**: ${results.coverage}%

${results.errors ? '## ❌ Failures\n' +
  results.errors.map(e => `**${e.type}**:\n\`\`\`\n${e.output}\n\`\`\``).join('\n\n') : ''}
`;
}
```

### Test Scripts
```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest src/**/*.test.js",
    "test:integration": "vitest tests/integration/",
    "test:e2e": "playwright test",
    "test:api": "newman run api-tests.postman.json",
    "test:component": "vitest src/components/",
    "test:coverage": "vitest --coverage"
  }
}
```

### Expected Results
- Smart test selection based on changes
- Automated test reporting
- PR integration with results
- Coverage tracking and enforcement

---

## Recipe 4: Build and Deployment Pipeline

### Use Case
Automated build and deployment pipeline that handles different environments and deployment strategies.

### Configuration
```javascript
// .gitvan/hooks/build-deploy.mjs
export default {
  name: 'build-deploy',
  triggers: ['tag:created', 'branch:main:pushed'],
  action: async ({ git, exec, config, context, logger }) => {
    const environment = determineEnvironment(context);
    const buildConfig = config.get(`build.${environment}`);

    logger.info(`Building for environment: ${environment}`);

    // Pre-build validation
    await validateEnvironment(environment, exec);

    // Build application
    const buildResult = await buildApplication(buildConfig, exec);

    if (buildResult.success) {
      // Deploy based on environment
      await deployApplication(environment, buildConfig, exec);

      // Run post-deployment tests
      await runDeploymentTests(environment, exec);

      // Notify team
      await notifyDeployment(environment, buildResult);
    } else {
      throw new Error(`Build failed: ${buildResult.error}`);
    }
  }
};

function determineEnvironment(context) {
  if (context.trigger === 'tag:created') {
    const tag = context.tag;
    if (tag.includes('beta')) return 'staging';
    if (tag.match(/^v\d+\.\d+\.\d+$/)) return 'production';
  }
  if (context.branch === 'main') return 'development';
  return 'feature';
}

async function validateEnvironment(env, exec) {
  // Check required environment variables
  const requiredVars = {
    development: ['NODE_ENV', 'DATABASE_URL'],
    staging: ['NODE_ENV', 'DATABASE_URL', 'API_KEY'],
    production: ['NODE_ENV', 'DATABASE_URL', 'API_KEY', 'SENTRY_DSN']
  };

  for (const varName of requiredVars[env] || []) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  // Run pre-deployment checks
  await exec.run('npm', ['run', 'check:health']);
}

async function buildApplication(config, exec) {
  try {
    // Install dependencies
    await exec.run('npm', ['ci']);

    // Run build
    const buildCmd = config.buildCommand || 'npm run build';
    await exec.run('sh', ['-c', buildCmd]);

    // Optimize build
    if (config.optimize) {
      await exec.run('npm', ['run', 'optimize']);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deployApplication(env, config, exec) {
  const deploymentStrategy = config.strategy || 'rolling';

  switch (deploymentStrategy) {
    case 'blue-green':
      await blueGreenDeploy(env, config, exec);
      break;
    case 'canary':
      await canaryDeploy(env, config, exec);
      break;
    default:
      await rollingDeploy(env, config, exec);
  }
}

async function rollingDeploy(env, config, exec) {
  // Example Docker deployment
  await exec.run('docker', ['build', '-t', `app:${env}`, '.']);
  await exec.run('docker', ['tag', `app:${env}`, `registry.com/app:${env}`]);
  await exec.run('docker', ['push', `registry.com/app:${env}`]);

  // Update deployment
  await exec.run('kubectl', ['set', 'image',
    `deployment/app-${env}`, `app=registry.com/app:${env}`]);
  await exec.run('kubectl', ['rollout', 'status', `deployment/app-${env}`]);
}
```

### Build Configuration
```yaml
# .gitvan/config.yaml
build:
  development:
    buildCommand: 'npm run build:dev'
    optimize: false
    strategy: 'rolling'
  staging:
    buildCommand: 'npm run build:staging'
    optimize: true
    strategy: 'blue-green'
  production:
    buildCommand: 'npm run build:prod'
    optimize: true
    strategy: 'canary'
    healthCheck: true
```

### Expected Results
- Environment-specific builds
- Automated deployment strategies
- Health check validation
- Rollback capabilities

---

## Recipe 5: Documentation Generation

### Use Case
Automatically generate and update documentation from code comments, README files, and API schemas.

### Configuration
```javascript
// .gitvan/hooks/docs-generation.mjs
export default {
  name: 'docs-generation',
  triggers: ['post-commit', 'pr:merged'],
  action: async ({ git, exec, github, logger }) => {
    const changedFiles = await git.getChangedFiles();
    const needsDocUpdate = changedFiles.some(f =>
      f.includes('src/') || f.includes('api/') || f.includes('README')
    );

    if (!needsDocUpdate) {
      logger.info('No documentation updates needed');
      return;
    }

    // Generate API documentation
    await generateAPIReferenece(exec);

    // Update README sections
    await updateREADME(git, exec);

    // Generate type definitions
    await generateTypeDefinitions(exec);

    // Create documentation commit
    const hasChanges = await git.hasUncommittedChanges();
    if (hasChanges) {
      await git.add(['docs/', 'README.md', '*.d.ts']);
      await git.commit('docs: auto-update documentation');

      logger.info('Documentation updated automatically');
    }
  }
};

async function generateAPIReferenece(exec) {
  // Generate OpenAPI spec from code
  await exec.run('swagger-jsdoc', [
    '-d', 'api/swagger.config.js',
    'src/api/**/*.js',
    '-o', 'docs/api.yaml'
  ]);

  // Generate HTML documentation
  await exec.run('redoc-cli', [
    'build', 'docs/api.yaml',
    '--output', 'docs/api.html'
  ]);
}

async function updateREADME(git, exec) {
  // Extract code examples from tests
  const examples = await extractCodeExamples();

  // Update README with fresh examples
  const readme = await git.readFile('README.md');
  const updatedReadme = updateReadmeSection(readme, 'Examples', examples);

  await git.writeFile('README.md', updatedReadme);
}

async function generateTypeDefinitions(exec) {
  // Generate TypeScript definitions
  await exec.run('tsc', ['--declaration', '--emitDeclarationOnly']);

  // Generate documentation from types
  await exec.run('typedoc', [
    'src/index.ts',
    '--out', 'docs/types/',
    '--theme', 'minimal'
  ]);
}
```

### Documentation Tools Configuration
```json
// package.json
{
  "scripts": {
    "docs:api": "swagger-jsdoc -d api/swagger.config.js src/api/**/*.js -o docs/api.yaml",
    "docs:types": "typedoc src/index.ts --out docs/types/",
    "docs:build": "npm run docs:api && npm run docs:types",
    "docs:serve": "http-server docs/ -p 8080"
  },
  "devDependencies": {
    "swagger-jsdoc": "^6.0.0",
    "redoc-cli": "^0.13.0",
    "typedoc": "^0.24.0"
  }
}
```

### Expected Results
- Up-to-date API documentation
- Fresh code examples in README
- Type definitions and documentation
- Automated documentation commits

---

## Recipe 6: Performance Monitoring

### Use Case
Automatically monitor and report on performance metrics, creating issues when thresholds are exceeded.

### Configuration
```javascript
// .gitvan/hooks/performance-monitor.mjs
export default {
  name: 'performance-monitor',
  triggers: ['post-deploy', 'schedule:daily'],
  action: async ({ exec, github, config, logger }) => {
    const metrics = await collectPerformanceMetrics(exec);
    const thresholds = config.get('performance.thresholds');

    // Check thresholds
    const violations = checkThresholds(metrics, thresholds);

    if (violations.length > 0) {
      // Create performance issue
      await github.createIssue({
        title: '🚨 Performance Threshold Violation',
        body: generatePerformanceReport(metrics, violations),
        labels: ['performance', 'urgent']
      });

      logger.warn(`Performance violations detected: ${violations.length}`);
    }

    // Store metrics for trending
    await storeMetrics(metrics);
  }
};

async function collectPerformanceMetrics(exec) {
  const metrics = {};

  // Lighthouse audit
  const lighthouse = await exec.run('lighthouse', [
    'https://app.example.com',
    '--output=json',
    '--quiet'
  ], { captureOutput: true });

  if (lighthouse.exitCode === 0) {
    const report = JSON.parse(lighthouse.stdout);
    metrics.lighthouse = {
      performance: report.lhr.categories.performance.score * 100,
      accessibility: report.lhr.categories.accessibility.score * 100,
      bestPractices: report.lhr.categories['best-practices'].score * 100,
      seo: report.lhr.categories.seo.score * 100
    };
  }

  // Bundle size analysis
  const bundleSize = await exec.run('bundlesize', [], {
    captureOutput: true,
    exitOnError: false
  });

  if (bundleSize.exitCode === 0) {
    metrics.bundleSize = parseBundleSize(bundleSize.stdout);
  }

  // Load testing
  const loadTest = await exec.run('artillery', [
    'run', 'performance/load-test.yml'
  ], { captureOutput: true });

  if (loadTest.exitCode === 0) {
    metrics.loadTest = parseLoadTestResults(loadTest.stdout);
  }

  return metrics;
}

function checkThresholds(metrics, thresholds) {
  const violations = [];

  if (metrics.lighthouse.performance < thresholds.lighthouse.performance) {
    violations.push({
      metric: 'Lighthouse Performance',
      value: metrics.lighthouse.performance,
      threshold: thresholds.lighthouse.performance
    });
  }

  if (metrics.bundleSize > thresholds.bundleSize) {
    violations.push({
      metric: 'Bundle Size',
      value: metrics.bundleSize,
      threshold: thresholds.bundleSize
    });
  }

  return violations;
}
```

### Performance Configuration
```yaml
# .gitvan/config.yaml
performance:
  thresholds:
    lighthouse:
      performance: 90
      accessibility: 95
      bestPractices: 90
      seo: 90
    bundleSize: 500000 # 500KB
    loadTest:
      averageResponseTime: 200
      errorRate: 0.01
```

### Expected Results
- Automated performance monitoring
- Threshold violation alerts
- Performance trend tracking
- Actionable improvement suggestions

## Best Practices for Automation

1. **Idempotency**: Make hooks safe to run multiple times
2. **Error Handling**: Always include proper error handling and rollback
3. **Monitoring**: Log automation activities for debugging
4. **Testing**: Test automation scripts in staging first
5. **Documentation**: Document automation behavior and configuration
6. **Security**: Never expose secrets in automation scripts

## Common Troubleshooting

### Hook Failures
```bash
# Check hook logs
gitvan hook logs auto-format --last 5

# Test hook in isolation
gitvan hook test auto-format --dry-run

# Disable problematic hook temporarily
gitvan hook disable auto-format
```

### Performance Issues
- Use `exec.run` with timeouts for long-running commands
- Implement parallel processing for independent tasks
- Cache expensive operations when possible
- Monitor hook execution times

### Environment Issues
- Validate required tools are installed
- Check environment variables and permissions
- Use consistent Node.js versions across environments
- Test automation in different environments