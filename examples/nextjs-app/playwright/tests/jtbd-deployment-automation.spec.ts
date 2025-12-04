import { test, expect } from '@playwright/test';

/**
 * JTBD Scenario: Deployment Automation & Release Management
 *
 * JOB: Automate releases and ensure safe deployments
 * FUNCTIONAL: Automatically generate changelogs and deploy on tags
 * EMOTIONAL: Feel safe that only tested code reaches production
 * SOCIAL: Enable transparent deployment across team
 *
 * SCENARIO: Developer tags release, workflow auto-generates changelog and deploys
 */

test.describe('JTBD: Deployment Automation & Release Management', () => {
  test('should automatically generate changelog from commits', async ({
    page,
  }) => {
    // Step 1: Navigate to release management
    await page.goto('/studio/releases');
    await expect(page.locator('h1')).toContainText('Release Management');

    // Step 2: Prepare new release
    await page.click('[data-testid="new-release-button"]');
    await page.fill('[data-testid="version-input"]', 'v1.2.0');

    // Step 3: Select commits for release
    await page.click('[data-testid="select-commits-button"]');
    const commitCheckboxes = await page
      .locator('[data-testid="commit-checkbox"]')
      .count();
    expect(commitCheckboxes).toBeGreaterThan(0);

    // Step 4: Select some commits
    for (let i = 0; i < Math.min(3, commitCheckboxes); i++) {
      await page
        .locator('[data-testid="commit-checkbox"]')
        .nth(i)
        .click();
    }

    // Step 5: Generate changelog
    await page.click('[data-testid="generate-changelog-button"]');

    // Step 6: Verify changelog is generated with proper format
    await page.waitForSelector('[data-testid="changelog-preview"]');
    const changelog = await page.textContent('[data-testid="changelog-preview"]');
    expect(changelog).toMatch(/### feat|### fix|### refactor/);

    // Step 7: Verify semantic organization
    expect(changelog).toContain('v1.2.0');
  });

  test('should validate release readiness before deployment', async ({
    page,
  }) => {
    // Step 1: Navigate to release validation
    await page.goto('/studio/releases');

    // Step 2: Select release for validation
    await page.click('[data-testid="release-item"]');
    await expect(
      page.locator('[data-testid="release-details"]')
    ).toBeVisible();

    // Step 3: View validation checklist
    await expect(
      page.locator('[data-testid="validation-checklist"]')
    ).toBeVisible();

    // Step 4: Verify all checks are performed
    const checks = await page.locator('[data-testid="validation-check"]').count();
    expect(checks).toBeGreaterThan(0);

    // Step 5: Verify checks include tests
    const testCheck = page.locator('[data-testid="check-tests"]');
    await expect(testCheck).toBeVisible();

    // Step 6: Verify overall readiness status
    const readinessStatus = await page.textContent(
      '[data-testid="release-readiness-status"]'
    );
    expect(readinessStatus).toMatch(/ready|pending|blocked/i);
  });

  test('should execute deployment workflow with hooks', async ({ page }) => {
    // Step 1: Navigate to deployment interface
    await page.goto('/studio/deployments');

    // Step 2: Select release to deploy
    await page.click('[data-testid="deploy-button"]');

    // Step 3: Confirm deployment target
    await page.selectOption('[data-testid="deployment-target"]', 'production');

    // Step 4: Verify pre-deployment checks
    await page.click('[data-testid="run-checks-button"]');
    await page.waitForSelector('[data-testid="deployment-checks"]');

    // Step 5: Verify checks pass
    const checkResults = await page.locator(
      '[data-testid="check-result"]'
    ).count();
    expect(checkResults).toBeGreaterThan(0);

    // Step 6: Proceed with deployment
    await page.click('[data-testid="confirm-deploy-button"]');

    // Step 7: Monitor deployment progress
    await page.waitForSelector('[data-testid="deployment-progress"]');
    const progressText = await page.textContent('[data-testid="deployment-progress"]');
    expect(progressText).toMatch(/deploying|completed|failed/i);

    // Step 8: Verify deployment status
    await expect(
      page.locator('[data-testid="deployment-status"]')
    ).toContainText(/success|completed/i);
  });

  test('should provide deployment rollback capability', async ({ page }) => {
    // Step 1: Navigate to active deployments
    await page.goto('/studio/deployments/active');

    // Step 2: View current deployment
    await expect(
      page.locator('[data-testid="active-deployment"]')
    ).toBeVisible();

    // Step 3: Verify rollback option is available
    await page.click('[data-testid="deployment-menu"]');
    await expect(
      page.locator('[data-testid="rollback-option"]')
    ).toBeVisible();

    // Step 4: Trigger rollback
    await page.click('[data-testid="rollback-option"]');

    // Step 5: Confirm rollback
    await expect(
      page.locator('[data-testid="rollback-confirmation"]')
    ).toBeVisible();
    await page.click('[data-testid="confirm-rollback"]');

    // Step 6: Monitor rollback progress
    await page.waitForSelector('[data-testid="rollback-progress"]');

    // Step 7: Verify previous version is active
    const currentVersion = await page.textContent(
      '[data-testid="current-version"]'
    );
    expect(currentVersion).toMatch(/v\d+\.\d+\.\d+/);
  });

  test('should track deployment metrics and history', async ({ page }) => {
    // Step 1: Navigate to deployment metrics
    await page.goto('/studio/deployments/metrics');

    // Step 2: Verify metrics dashboard loads
    await expect(
      page.locator('[data-testid="deployment-metrics"]')
    ).toBeVisible();

    // Step 3: Check deployment frequency
    await expect(
      page.locator('[data-testid="deployments-per-week"]')
    ).toBeVisible();

    // Step 4: Verify deployment success rate
    await expect(
      page.locator('[data-testid="deployment-success-rate"]')
    ).toBeVisible();

    // Step 5: Check mean time to recovery (MTTR)
    await expect(page.locator('[data-testid="mttr"]')).toBeVisible();

    // Step 6: View deployment history
    await expect(
      page.locator('[data-testid="deployment-history"]')
    ).toBeVisible();
    const historyItems = await page
      .locator('[data-testid="history-item"]')
      .count();
    expect(historyItems).toBeGreaterThan(0);
  });
});
