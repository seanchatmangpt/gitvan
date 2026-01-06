# CI/CD Integration Plan for Test Coverage Enforcement

**GitVan Project - Test Coverage CI/CD Enhancement**
**Date**: January 6, 2026
**Version**: 1.0
**Status**: Implementation Ready

---

## Executive Summary

GitVan already has a **comprehensive CI/CD infrastructure** using GitHub Actions with multi-node testing, coverage reporting, and metrics tracking. This plan focuses on **enhancing enforcement mechanisms** to ensure test quality and coverage standards are maintained across all pull requests and deployments.

**Key Enhancements**:
1. Strict coverage regression blocking (PR fails if coverage drops)
2. Flakiness detection with automated quarantine
3. Test quality validation (assertion requirements)
4. PR comments with detailed coverage reports
5. Coverage trend visualization and dashboards
6. Test reliability scoring

---

## 1. CURRENT CI/CD STATUS

### ✅ Already Implemented

**GitHub Actions Workflows**:
- **test.yml**: Comprehensive testing pipeline
  - Multi-node matrix testing (Node 18, 20, 22)
  - Test sharding (3 shards for parallel execution)
  - Coverage reporting with Codecov integration
  - Integration and performance benchmarks
  - Test result artifacts with 30-day retention

- **metrics.yml**: Build and test performance tracking
  - Build time and size monitoring
  - Test execution time tracking
  - Code quality metrics
  - Dependency analysis

- **checks.yml**: Quick validation on PRs
- **security.yml**: Security scanning
- **release.yml**: Release automation

**Current Configuration**:
```yaml
# vitest.config.mjs - Current Coverage Thresholds
coverage:
  thresholds:
    global:
      branches: 80
      functions: 80
      lines: 80
      statements: 80
```

**Triggers**:
- Push to main, develop, claude/** branches
- Pull requests to main, develop
- Scheduled nightly runs (2 AM UTC)
- Manual workflow dispatch

### ⚠️ Gaps Identified

**What's Missing**:
1. **Coverage regression blocking**: Tests can pass even if coverage decreases
2. **Flakiness detection**: No automated detection of intermittent failures
3. **Test quality checks**: No validation that tests have assertions
4. **PR coverage comments**: No automated feedback on coverage changes
5. **Coverage trends**: No historical tracking or visualization
6. **Test reliability metrics**: No flakiness scoring or quarantine system

**Current Behavior**:
- Coverage report is generated but **not enforced** on PRs
- Failed tests block merges, but coverage drops don't
- No detection of flaky tests (pass sometimes, fail sometimes)
- No validation of test quality (empty tests can pass)

---

## 2. RECOMMENDED CI/CD ADDITIONS

### Priority 1: Coverage Enforcement (Critical)

**Goal**: Block PRs if coverage drops below threshold or regresses

**Implementation**:
```yaml
- name: Check coverage regression
  run: |
    # Compare current coverage to base branch
    # Fail if coverage drops by more than 0.5%
    node scripts/check-coverage-regression.js
```

**Requirements**:
- Must run on every PR
- Compare against base branch (main/develop)
- Allow configurable tolerance (default: 0.5% drop)
- Provide clear failure messages with affected files

### Priority 2: Flakiness Detection (High)

**Goal**: Detect and quarantine flaky tests automatically

**Implementation**:
```yaml
- name: Run flakiness detection
  run: |
    # Run tests 5 times to detect flakiness
    npm test -- --reporter=json --run 5
    node scripts/detect-flaky-tests.js
```

**Requirements**:
- Run tests multiple times (configurable, default: 5)
- Calculate flakiness percentage per test
- Fail if flakiness > 1%
- Generate flaky test report
- Auto-quarantine tests with >2% flakiness

### Priority 3: Test Quality Validation (High)

**Goal**: Ensure all tests have meaningful assertions

**Implementation**:
```yaml
- name: Validate test quality
  run: |
    # Analyze test files for assertions
    node scripts/validate-test-quality.js
```

**Requirements**:
- Scan all test files for expect() calls
- Fail if tests have no assertions
- Check for test.skip() abuse (max 5% skipped)
- Validate test descriptions are meaningful

### Priority 4: PR Coverage Comments (Medium)

**Goal**: Provide detailed coverage feedback on PRs

**Implementation**:
```yaml
- name: Comment PR with coverage
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json'));
      // Post formatted comment to PR
```

**Requirements**:
- Show coverage delta (before vs after)
- Highlight files with coverage drops
- Show module-level coverage breakdown
- Update existing comment (don't spam)
- Include coverage badge

### Priority 5: Coverage Trend Tracking (Medium)

**Goal**: Track and visualize coverage trends over time

**Implementation**:
- Store coverage data in GitHub Pages
- Generate trend charts
- Alert on sustained coverage decline

### Priority 6: Test Reliability Metrics (Low)

**Goal**: Track test stability and reliability

**Implementation**:
- Measure test execution time consistency
- Track historical pass/fail rates
- Generate reliability scores
- Alert on degrading reliability

---

## 3. ENHANCED GITHUB ACTIONS WORKFLOW

### New Workflow: coverage-enforcement.yml

```yaml
name: Coverage Enforcement

on:
  pull_request:
    branches: [main, develop]

permissions:
  contents: read
  pull-requests: write
  checks: write

env:
  TZ: UTC
  LANG: C

jobs:
  # ==========================================================================
  # Coverage Regression Check
  # ==========================================================================
  coverage-regression:
    name: Coverage Regression Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for comparison

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage (PR branch)
        run: npm test -- --coverage --reporter=json
        env:
          CI: true
          NODE_ENV: test

      - name: Save PR coverage
        run: |
          cp coverage/coverage-summary.json coverage-pr.json

      - name: Checkout base branch
        run: |
          git fetch origin ${{ github.base_ref }}
          git checkout origin/${{ github.base_ref }}

      - name: Install dependencies (base)
        run: npm ci

      - name: Run tests with coverage (base branch)
        run: npm test -- --coverage --reporter=json || true
        env:
          CI: true
          NODE_ENV: test

      - name: Save base coverage
        run: |
          cp coverage/coverage-summary.json coverage-base.json

      - name: Compare coverage and enforce
        id: coverage-check
        run: |
          node << 'EOF'
          const fs = require('fs');

          const prCoverage = JSON.parse(fs.readFileSync('coverage-pr.json', 'utf8'));
          const baseCoverage = JSON.parse(fs.readFileSync('coverage-base.json', 'utf8'));

          const pr = prCoverage.total;
          const base = baseCoverage.total;

          const TOLERANCE = 0.5; // 0.5% tolerance

          let failed = false;
          let report = '## Coverage Regression Check\n\n';
          report += '| Metric | Base | PR | Delta |\n';
          report += '|--------|------|----|-------|\n';

          ['lines', 'statements', 'functions', 'branches'].forEach(metric => {
            const baseValue = base[metric].pct;
            const prValue = pr[metric].pct;
            const delta = prValue - baseValue;
            const icon = delta < -TOLERANCE ? '❌' : delta < 0 ? '⚠️' : '✅';

            report += `| ${metric} | ${baseValue}% | ${prValue}% | ${icon} ${delta > 0 ? '+' : ''}${delta.toFixed(2)}% |\n`;

            if (delta < -TOLERANCE) {
              failed = true;
              report += `\n**ERROR**: ${metric} coverage decreased by ${Math.abs(delta).toFixed(2)}% (threshold: ${TOLERANCE}%)\n`;
            }
          });

          report += '\n### Coverage Thresholds\n';
          report += `- Minimum: 80% (all metrics)\n`;
          report += `- Regression tolerance: ${TOLERANCE}%\n`;

          if (failed) {
            report += '\n❌ **Coverage regression detected! PR cannot be merged.**\n';
            console.log(report);
            process.exit(1);
          } else {
            report += '\n✅ **Coverage check passed!**\n';
            console.log(report);
          }

          fs.writeFileSync('coverage-report.md', report);
          EOF

      - name: Upload coverage comparison
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-comparison
          path: |
            coverage-pr.json
            coverage-base.json
            coverage-report.md
          retention-days: 30

      - name: Comment PR with coverage report
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('coverage-report.md', 'utf8');

            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const botComment = comments.find(comment =>
              comment.user.type === 'Bot' &&
              comment.body.includes('Coverage Regression Check')
            );

            const commentBody = `${report}\n\n---\n*Generated by GitVan Coverage Enforcement*`;

            if (botComment) {
              // Update existing comment
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: commentBody,
              });
            } else {
              // Create new comment
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: commentBody,
              });
            }

  # ==========================================================================
  # Flakiness Detection
  # ==========================================================================
  flakiness-detection:
    name: Flakiness Detection
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests multiple times
        id: flakiness
        run: |
          node << 'EOF'
          const { execSync } = require('child_process');
          const fs = require('fs');

          const RUNS = 5;
          const MAX_FLAKINESS = 1.0; // 1% max flakiness

          console.log(`Running tests ${RUNS} times to detect flakiness...`);

          const results = [];

          for (let i = 1; i <= RUNS; i++) {
            console.log(`\nRun ${i}/${RUNS}:`);
            try {
              execSync('npm test -- --reporter=json --outputFile=run-' + i + '.json', {
                stdio: 'inherit',
                env: { ...process.env, CI: 'true' }
              });
              results.push({ run: i, success: true });
            } catch (error) {
              results.push({ run: i, success: false });
            }
          }

          // Analyze results
          const testStats = new Map();

          for (let i = 1; i <= RUNS; i++) {
            try {
              const result = JSON.parse(fs.readFileSync(`run-${i}.json`, 'utf8'));

              if (result.testResults) {
                result.testResults.forEach(file => {
                  file.assertionResults?.forEach(test => {
                    const testName = `${file.name}::${test.title}`;
                    if (!testStats.has(testName)) {
                      testStats.set(testName, { passed: 0, failed: 0 });
                    }
                    const stats = testStats.get(testName);
                    if (test.status === 'passed') {
                      stats.passed++;
                    } else {
                      stats.failed++;
                    }
                  });
                });
              }
            } catch (error) {
              console.error(`Failed to parse run-${i}.json:`, error.message);
            }
          }

          // Identify flaky tests
          const flakyTests = [];
          testStats.forEach((stats, testName) => {
            const total = stats.passed + stats.failed;
            if (total > 0 && stats.failed > 0 && stats.passed > 0) {
              const flakiness = (stats.failed / total) * 100;
              flakyTests.push({
                name: testName,
                flakiness: flakiness.toFixed(2),
                passed: stats.passed,
                failed: stats.failed,
              });
            }
          });

          // Generate report
          let report = '## Flakiness Detection Report\n\n';
          report += `**Test runs**: ${RUNS}\n`;
          report += `**Max allowed flakiness**: ${MAX_FLAKINESS}%\n\n`;

          if (flakyTests.length === 0) {
            report += '✅ **No flaky tests detected!**\n';
          } else {
            report += `⚠️ **${flakyTests.length} flaky test(s) detected:**\n\n`;
            report += '| Test | Flakiness | Passed | Failed |\n';
            report += '|------|-----------|--------|--------|\n';

            let criticalFlaky = false;
            flakyTests.forEach(test => {
              const icon = test.flakiness > MAX_FLAKINESS ? '❌' : '⚠️';
              report += `| ${icon} ${test.name} | ${test.flakiness}% | ${test.passed} | ${test.failed} |\n`;
              if (test.flakiness > MAX_FLAKINESS) {
                criticalFlaky = true;
              }
            });

            if (criticalFlaky) {
              report += '\n❌ **Tests exceed flakiness threshold! PR cannot be merged.**\n';
              console.log(report);
              fs.writeFileSync('flakiness-report.md', report);
              process.exit(1);
            }
          }

          console.log(report);
          fs.writeFileSync('flakiness-report.md', report);
          EOF

      - name: Upload flakiness report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: flakiness-report
          path: |
            flakiness-report.md
            run-*.json
          retention-days: 30

      - name: Comment PR with flakiness report
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('flakiness-report.md', 'utf8');

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `${report}\n\n---\n*Generated by GitVan Flakiness Detection*`,
            });

  # ==========================================================================
  # Test Quality Validation
  # ==========================================================================
  test-quality:
    name: Test Quality Validation
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Validate test quality
        run: |
          node << 'EOF'
          const fs = require('fs');
          const path = require('path');
          const { execSync } = require('child_process');

          const MAX_SKIPPED_PERCENT = 5;

          // Find all test files
          const testFiles = execSync('find tests -name "*.test.mjs" -o -name "*.spec.mjs"')
            .toString()
            .trim()
            .split('\n')
            .filter(f => f);

          let report = '## Test Quality Validation\n\n';
          let issues = [];

          // Check for tests without assertions
          console.log('Checking for tests without assertions...');
          testFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');

            // Count test blocks
            const testBlocks = (content.match(/\b(it|test)\s*\(/g) || []).length;

            // Count assertions
            const assertions = (content.match(/\bexpect\s*\(/g) || []).length;

            if (testBlocks > 0 && assertions === 0) {
              issues.push({
                file,
                type: 'no-assertions',
                message: `${testBlocks} test(s) with no assertions`,
              });
            }

            // Check for excessive test.skip
            const skipped = (content.match(/\b(it|test)\.skip\s*\(/g) || []).length;
            if (testBlocks > 0) {
              const skipPercent = (skipped / testBlocks) * 100;
              if (skipPercent > MAX_SKIPPED_PERCENT) {
                issues.push({
                  file,
                  type: 'excessive-skipped',
                  message: `${skipPercent.toFixed(1)}% tests skipped (${skipped}/${testBlocks})`,
                });
              }
            }
          });

          report += `**Total test files**: ${testFiles.length}\n\n`;

          if (issues.length === 0) {
            report += '✅ **All tests meet quality standards!**\n';
          } else {
            report += `❌ **${issues.length} quality issue(s) detected:**\n\n`;
            issues.forEach(issue => {
              report += `- \`${issue.file}\`: ${issue.message}\n`;
            });
            report += '\n**PR cannot be merged until test quality issues are resolved.**\n';
            console.log(report);
            fs.writeFileSync('test-quality-report.md', report);
            process.exit(1);
          }

          console.log(report);
          fs.writeFileSync('test-quality-report.md', report);
          EOF

      - name: Upload test quality report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-quality-report
          path: test-quality-report.md
          retention-days: 30

      - name: Comment PR with test quality report
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('test-quality-report.md', 'utf8');

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `${report}\n\n---\n*Generated by GitVan Test Quality Validation*`,
            });

  # ==========================================================================
  # Summary
  # ==========================================================================
  enforcement-summary:
    name: Enforcement Summary
    runs-on: ubuntu-latest
    needs: [coverage-regression, flakiness-detection, test-quality]
    if: always()
    steps:
      - name: Check all enforcement results
        run: |
          echo "## Test Coverage Enforcement Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- Coverage Regression: ${{ needs.coverage-regression.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Flakiness Detection: ${{ needs.flakiness-detection.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Test Quality: ${{ needs.test-quality.result }}" >> $GITHUB_STEP_SUMMARY

          if [[ "${{ needs.coverage-regression.result }}" == "failure" ]] ||
             [[ "${{ needs.flakiness-detection.result }}" == "failure" ]] ||
             [[ "${{ needs.test-quality.result }}" == "failure" ]]; then
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "❌ **Enforcement checks failed! PR cannot be merged.**" >> $GITHUB_STEP_SUMMARY
            exit 1
          fi

          echo "" >> $GITHUB_STEP_SUMMARY
          echo "✅ **All enforcement checks passed!**" >> $GITHUB_STEP_SUMMARY
```

### Update Existing test.yml

Add enforcement dependency:

```yaml
# Add to test.yml after test-summary job
  merge-gate:
    name: Merge Gate
    runs-on: ubuntu-latest
    needs: [test-summary]
    if: github.event_name == 'pull_request'
    steps:
      - name: Require coverage enforcement
        run: |
          echo "✅ All tests passed - ready for coverage enforcement checks"
          echo "Coverage enforcement workflow will validate:"
          echo "  - Coverage regression"
          echo "  - Flakiness detection"
          echo "  - Test quality"
```

---

## 4. COVERAGE REPORT GENERATION

### Storage Strategy

**Primary Storage**: GitHub Actions Artifacts
- Coverage reports: 30-day retention
- Historical trends: 90-day retention
- Raw coverage data: JSON format

**Secondary Storage**: GitHub Pages (Optional)
- Public coverage dashboard
- Historical trend charts
- Module-level drill-down

### Implementation

```yaml
# Add to coverage job in test.yml
- name: Store coverage history
  run: |
    mkdir -p coverage-history
    DATE=$(date +%Y-%m-%d)
    COMMIT=${{ github.sha }}

    # Save coverage snapshot
    cat coverage/coverage-summary.json | jq ". + {date: \"$DATE\", commit: \"$COMMIT\"}" \
      > coverage-history/$DATE-$COMMIT.json

- name: Upload to GitHub Pages
  if: github.ref == 'refs/heads/main'
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./coverage
    destination_dir: coverage/${{ github.sha }}
```

### Coverage Trend Dashboard

Create `scripts/generate-coverage-dashboard.js`:

```javascript
// Generates HTML dashboard from coverage history
const fs = require('fs');
const path = require('path');

const historyDir = 'coverage-history';
const files = fs.readdirSync(historyDir).sort();

const trends = files.map(file => {
  const data = JSON.parse(fs.readFileSync(path.join(historyDir, file)));
  return {
    date: data.date,
    commit: data.commit.substring(0, 7),
    lines: data.total.lines.pct,
    statements: data.total.statements.pct,
    functions: data.total.functions.pct,
    branches: data.total.branches.pct,
  };
});

// Generate Chart.js HTML
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>GitVan Coverage Trends</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>GitVan Test Coverage Trends</h1>
  <canvas id="coverageChart"></canvas>
  <script>
    const ctx = document.getElementById('coverageChart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(trends.map(t => t.date))},
        datasets: [
          {
            label: 'Lines',
            data: ${JSON.stringify(trends.map(t => t.lines))},
            borderColor: 'rgb(75, 192, 192)',
          },
          {
            label: 'Branches',
            data: ${JSON.stringify(trends.map(t => t.branches))},
            borderColor: 'rgb(255, 99, 132)',
          },
          {
            label: 'Functions',
            data: ${JSON.stringify(trends.map(t => t.functions))},
            borderColor: 'rgb(54, 162, 235)',
          },
          {
            label: 'Statements',
            data: ${JSON.stringify(trends.map(t => t.statements))},
            borderColor: 'rgb(255, 205, 86)',
          },
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false,
            min: 70,
            max: 100,
          }
        }
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync('coverage-dashboard.html', html);
console.log('Coverage dashboard generated: coverage-dashboard.html');
```

### Coverage Debt Tracking

Track modules below 80% coverage:

```yaml
- name: Identify coverage debt
  run: |
    node << 'EOF'
    const fs = require('fs');
    const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json'));

    const debt = [];
    Object.entries(coverage).forEach(([file, metrics]) => {
      if (file === 'total') return;

      const minCoverage = Math.min(
        metrics.lines.pct,
        metrics.statements.pct,
        metrics.functions.pct,
        metrics.branches.pct
      );

      if (minCoverage < 80) {
        debt.push({ file, coverage: minCoverage.toFixed(2) });
      }
    });

    debt.sort((a, b) => a.coverage - b.coverage);

    console.log('## Coverage Debt\n');
    console.log(`${debt.length} files below 80% coverage:\n`);
    debt.slice(0, 20).forEach(item => {
      console.log(`- ${item.file}: ${item.coverage}%`);
    });

    fs.writeFileSync('coverage-debt.json', JSON.stringify(debt, null, 2));
    EOF
```

---

## 5. FLAKINESS DETECTION

### Detection Strategy

**Multi-Run Testing**:
1. Run tests 5 times in CI
2. Track pass/fail for each test
3. Calculate flakiness percentage
4. Quarantine tests with >1% flakiness

### Quarantine System

Create `.github/quarantine/flaky-tests.json`:

```json
{
  "quarantined": [
    {
      "test": "tests/git-lifecycle/GitEventCapture.test.mjs::should handle concurrent events",
      "flakiness": 20.5,
      "quarantinedAt": "2026-01-06T10:30:00Z",
      "reason": "Intermittent race condition",
      "issue": "https://github.com/user/gitvan/issues/123"
    }
  ]
}
```

### Auto-Skip Quarantined Tests

Update test setup:

```javascript
// tests/setup.mjs
import { beforeEach } from 'vitest';
import fs from 'fs';

const quarantined = JSON.parse(
  fs.readFileSync('.github/quarantine/flaky-tests.json', 'utf8')
).quarantined;

beforeEach((context) => {
  const testPath = `${context.suite.file}::${context.task.name}`;
  const isQuarantined = quarantined.some(q => q.test === testPath);

  if (isQuarantined && process.env.CI) {
    context.skip('Test quarantined due to flakiness');
  }
});
```

### Flakiness Report

```yaml
- name: Generate flakiness report
  run: |
    echo "## Flaky Test Report" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY

    if [ -f .github/quarantine/flaky-tests.json ]; then
      QUARANTINED=$(cat .github/quarantine/flaky-tests.json | jq '.quarantined | length')
      echo "**Quarantined tests**: $QUARANTINED" >> $GITHUB_STEP_SUMMARY

      if [ "$QUARANTINED" -gt 0 ]; then
        echo "" >> $GITHUB_STEP_SUMMARY
        echo "⚠️ **Action required**: Review and fix quarantined tests" >> $GITHUB_STEP_SUMMARY
      fi
    fi
```

---

## 6. MERGE REQUIREMENTS

### Branch Protection Rules

Configure in GitHub Settings → Branches → Branch protection rules:

**For `main` branch**:

```yaml
Required status checks:
  ✓ Coverage Regression Check
  ✓ Flakiness Detection
  ✓ Test Quality Validation
  ✓ Test (Node 18)
  ✓ Test (Node 20)
  ✓ Test (Node 22)
  ✓ Build Project
  ✓ Lint Code

Require branches to be up to date: ✓

Require pull request reviews:
  - Required approving reviews: 1
  - Dismiss stale reviews: ✓
  - Require review from Code Owners: ✓

Require status checks to pass before merging: ✓
Require conversation resolution before merging: ✓
Require signed commits: ✓
Require linear history: ✓

Include administrators: ✓
Allow force pushes: ✗
Allow deletions: ✗
```

**For `develop` branch**:
- Same as main but with relaxed review requirements
- Allow force pushes for feature branches

### CODEOWNERS

Create `.github/CODEOWNERS`:

```
# Global owners
*                           @team-leads

# CI/CD workflows
/.github/workflows/         @devops-team
/scripts/ci/                @devops-team

# Test infrastructure
/tests/                     @qa-team
/vitest*.config.*           @qa-team

# Coverage enforcement
/.github/workflows/coverage-enforcement.yml  @qa-team @devops-team
/scripts/check-coverage-regression.js        @qa-team
/scripts/detect-flaky-tests.js               @qa-team
```

### Merge Checklist

**Automated Checks (Required)**:
- ✅ All tests passing (100% success rate)
- ✅ Coverage ≥80% (all metrics)
- ✅ No coverage regression (within 0.5% tolerance)
- ✅ Flakiness ≤1% (all tests)
- ✅ All tests have assertions
- ✅ Skipped tests ≤5%
- ✅ Build successful
- ✅ Linting passed
- ✅ Security scan clean

**Manual Checks (Required)**:
- ✅ Code review approved
- ✅ All conversations resolved
- ✅ Documentation updated (if needed)
- ✅ Changelog updated (for features/fixes)
- ✅ Breaking changes documented

---

## 7. REPORTING & VISIBILITY

### Dashboard Components

**1. Coverage Dashboard** (GitHub Pages)
- Real-time coverage metrics
- Historical trend charts
- Module-level drill-down
- Coverage debt tracking

**2. Test Reliability Dashboard**
- Test pass/fail rates (last 30 days)
- Flakiness scores by module
- Quarantined test list
- Mean time to fix flaky tests

**3. PR Quality Dashboard**
- Average PR coverage delta
- Test additions per PR
- Test quality scores
- Coverage debt reduction rate

### Slack/Discord Notifications

```yaml
# Add to workflows for real-time alerts
- name: Notify team on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: |
      ❌ Coverage enforcement failed on PR #${{ github.event.number }}
      Branch: ${{ github.head_ref }}
      Author: ${{ github.actor }}
      Details: ${{ github.event.pull_request.html_url }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Weekly Coverage Report

```yaml
# .github/workflows/weekly-report.yml
name: Weekly Coverage Report

on:
  schedule:
    - cron: '0 10 * * MON'  # Every Monday at 10 AM UTC

jobs:
  weekly-report:
    runs-on: ubuntu-latest
    steps:
      - name: Generate weekly report
        run: |
          # Aggregate last week's coverage data
          # Generate trends and insights
          # Email to team
```

### Metrics to Track

**Coverage Metrics**:
- Overall coverage percentage (lines, branches, functions, statements)
- Coverage by module/directory
- Coverage trend (last 7/30/90 days)
- Coverage debt (files below threshold)

**Test Quality Metrics**:
- Total test count
- Test/code ratio
- Tests without assertions
- Skipped test percentage
- Average assertions per test

**Reliability Metrics**:
- Flakiness rate (overall and per test)
- Quarantined test count
- Test execution time (p50, p95, p99)
- Test failure rate

**Velocity Metrics**:
- PRs blocked by coverage
- PRs blocked by flakiness
- Average time to fix flaky tests
- Coverage improvement rate

### Bug Prevention Correlation

Track relationship between coverage and bugs:

```javascript
// scripts/coverage-bug-correlation.js
// Analyze:
// 1. Files with low coverage that had bugs
// 2. Files with high coverage that had bugs
// 3. Calculate correlation coefficient
// 4. Generate insights report
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create `coverage-enforcement.yml` workflow
- [ ] Implement coverage regression check
- [ ] Add PR commenting for coverage
- [ ] Test on sample PRs
- [ ] Document new workflow

### Phase 2: Quality Gates (Week 2)
- [ ] Implement flakiness detection
- [ ] Create quarantine system
- [ ] Implement test quality validation
- [ ] Add assertion checking
- [ ] Update branch protection rules

### Phase 3: Dashboards (Week 3)
- [ ] Set up GitHub Pages
- [ ] Generate coverage trend charts
- [ ] Create test reliability dashboard
- [ ] Implement coverage debt tracking
- [ ] Add historical data storage

### Phase 4: Integrations (Week 4)
- [ ] Configure Slack/Discord notifications
- [ ] Set up weekly reports
- [ ] Implement bug correlation tracking
- [ ] Create team documentation
- [ ] Train team on new processes

### Phase 5: Optimization (Ongoing)
- [ ] Monitor enforcement effectiveness
- [ ] Tune flakiness thresholds
- [ ] Optimize test execution time
- [ ] Refine coverage targets by module
- [ ] Continuous improvement based on feedback

---

## Rollout Strategy

### Stage 1: Soft Enforcement (Week 1-2)
- Enable workflows but don't block merges
- Generate reports and comments
- Collect baseline metrics
- Educate team

### Stage 2: Warning Mode (Week 3-4)
- Block merges but allow overrides
- Require explanation for overrides
- Track override reasons
- Adjust thresholds

### Stage 3: Full Enforcement (Week 5+)
- Full enforcement with no overrides
- Monitor team adaptation
- Provide support and tooling
- Celebrate successes

---

## Success Metrics

**Target Outcomes (6 months)**:
- Coverage maintained at ≥80% (all metrics)
- Zero coverage regressions merged
- Flaky test rate <0.5%
- Test quality score ≥95%
- Bug escape rate reduced by 40%
- Developer confidence in test suite ≥90%

**Leading Indicators**:
- PR cycle time (should not increase)
- Developer satisfaction with CI/CD
- False positive rate in enforcement
- Time to resolve blocked PRs

---

## Appendix

### Additional Scripts

**scripts/check-coverage-regression.js**
```javascript
#!/usr/bin/env node
// Compares coverage between branches
// Fails if regression exceeds threshold
// Generates detailed report
```

**scripts/detect-flaky-tests.js**
```javascript
#!/usr/bin/env node
// Analyzes multiple test runs
// Identifies flaky tests
// Updates quarantine list
```

**scripts/validate-test-quality.js**
```javascript
#!/usr/bin/env node
// Scans test files
// Validates assertions present
// Checks for test.skip abuse
```

### Configuration Files

**vitest.config.mjs updates**:
```javascript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: { branches: 80, functions: 80, lines: 80, statements: 80 },
        // Per-module overrides
        './src/core/': { branches: 90, functions: 90, lines: 90, statements: 90 },
        './src/experimental/': { branches: 60, functions: 60, lines: 60, statements: 60 },
      },
    },
  },
});
```

---

**Document Version**: 1.0
**Last Updated**: January 6, 2026
**Next Review**: February 6, 2026
**Owner**: QA & DevOps Teams
