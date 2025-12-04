import { test, expect } from '@playwright/test';

/**
 * JTBD Scenario: Team Collaboration & Code Review Workflow
 *
 * JOB: Streamline code reviews and ensure team alignment
 * FUNCTIONAL: Automatically flag code quality issues and patterns
 * EMOTIONAL: Feel confident that team follows best practices
 * SOCIAL: Enable asynchronous collaboration across time zones
 *
 * SCENARIO: Developer submits workflow for review, team gets AI insights
 */

test.describe('JTBD: Team Collaboration & Code Review', () => {
  test('should provide AI-powered code review suggestions', async ({
    page,
  }) => {
    // Step 1: Navigate to code review interface
    await page.goto('/studio/review');
    await expect(page.locator('h1')).toContainText('Code Review');

    // Step 2: Submit code for review
    await page.click('[data-testid="submit-for-review-button"]');
    const codeSnippet = `
      async function fetchData(url) {
        const response = await fetch(url);
        const data = response.json();
        return data;
      }
    `;
    await page.fill('[data-testid="code-input"]', codeSnippet);

    // Step 3: Request AI analysis
    await page.click('[data-testid="analyze-for-review-button"]');

    // Step 4: Verify code issues are identified
    await page.waitForSelector('[data-testid="code-issue-item"]');
    const issues = await page.locator('[data-testid="code-issue-item"]').count();
    expect(issues).toBeGreaterThan(0);

    // Step 5: Check for specific issues (e.g., error handling)
    const issueText = await page.textContent('[data-testid="code-issue-item"]');
    expect(issueText).toMatch(/error|exception|handling/i);

    // Step 6: Verify suggested fixes are provided
    await expect(
      page.locator('[data-testid="suggested-fix"]')
    ).toBeVisible();
  });

  test('should enforce team coding standards with custom hooks', async ({
    page,
  }) => {
    // Step 1: Navigate to team standards
    await page.goto('/studio/standards');

    // Step 2: View active standards
    await expect(
      page.locator('[data-testid="active-standards"]')
    ).toBeVisible();

    // Step 3: Enable specific standards
    const standardsCheckboxes = await page
      .locator('[data-testid="standard-checkbox"]')
      .count();
    expect(standardsCheckboxes).toBeGreaterThan(0);

    // Step 4: Verify standards definitions are shown
    await page.click('[data-testid="standard-details-button"]');
    await expect(
      page.locator('[data-testid="standard-definition"]')
    ).toBeVisible();

    // Step 5: Test standards against code
    await page.click('[data-testid="test-standards-button"]');
    await page.fill('[data-testid="test-code-input"]', 'let x = 5;');

    // Step 6: Verify compliance feedback
    await expect(
      page.locator('[data-testid="compliance-result"]')
    ).toBeVisible();
  });

  test('should track team collaboration metrics', async ({ page }) => {
    // Step 1: Navigate to team metrics
    await page.goto('/studio/team-metrics');

    // Step 2: Verify team dashboard loads
    await expect(
      page.locator('[data-testid="team-dashboard"]')
    ).toBeVisible();

    // Step 3: Check review metrics
    await expect(
      page.locator('[data-testid="reviews-per-day"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="average-review-time"]')
    ).toBeVisible();

    // Step 4: Verify team member activity
    await expect(
      page.locator('[data-testid="team-member-activity"]')
    ).toBeVisible();
    const teamMembers = await page.locator('[data-testid="team-member"]').count();
    expect(teamMembers).toBeGreaterThan(0);

    // Step 5: Check collaboration patterns
    await expect(
      page.locator('[data-testid="collaboration-chart"]')
    ).toBeVisible();
  });

  test('should enable asynchronous code discussions', async ({ page }) => {
    // Step 1: Navigate to code discussion interface
    await page.goto('/studio/discussions');

    // Step 2: Create new discussion
    await page.click('[data-testid="new-discussion-button"]');
    await page.fill('[data-testid="discussion-title"]', 'Optimize database query');
    await page.fill(
      '[data-testid="discussion-code"]',
      'SELECT * FROM users WHERE active = 1;'
    );

    // Step 3: Add discussion points
    await page.click('[data-testid="add-point-button"]');
    await page.fill(
      '[data-testid="discussion-point-input"]',
      'Missing index on active column'
    );

    // Step 4: Submit discussion
    await page.click('[data-testid="submit-discussion-button"]');

    // Step 5: Verify discussion is created
    await expect(
      page.locator('[data-testid="discussion-item"]')
    ).toContainText('Optimize database query');

    // Step 6: Verify AI analysis is added
    await expect(
      page.locator('[data-testid="ai-analysis"]')
    ).toBeVisible();
  });
});
