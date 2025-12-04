import { test, expect } from '@playwright/test';

/**
 * JTBD Scenario: Developer Semantic Commit Workflow
 *
 * JOB: Make committing faster and ensuring code quality
 * FUNCTIONAL: Automatically suggest semantic commit messages
 * EMOTIONAL: Feel confident that commits follow standards
 * SOCIAL: Team can easily understand commit history
 *
 * SCENARIO: Developer writes code, gets AI suggestions, commits with hooks validation
 */

test.describe('JTBD: Developer Semantic Commit Workflow', () => {
  test('should suggest semantic commit message from diff', async ({
    page,
  }) => {
    // Step 1: Navigate to Studio
    await page.goto('/studio/workflows');
    await expect(page.locator('h1')).toContainText('GitVan Studio');

    // Step 2: Open code editor with a diff
    await page.click('[data-testid="new-workflow-button"]');
    await page.waitForSelector('[data-testid="monaco-editor"]');

    // Step 3: Input sample diff
    const diffContent = `
      diff --git a/src/components/Button.tsx b/src/components/Button.tsx
      --- a/src/components/Button.tsx
      +++ b/src/components/Button.tsx
      @@ -1,3 +1,5 @@
       export function Button() {
      +  // Added loading state
      +  const [loading, setLoading] = useState(false);
         return <button>Click me</button>;
    `;

    await page.fill('[data-testid="monaco-editor"]', diffContent);

    // Step 4: Request AI suggestion
    await page.click('[data-testid="suggest-commit-message-button"]');

    // Step 5: Verify semantic commit message suggestion
    await page.waitForSelector('[data-testid="commit-message-suggestion"]');
    const suggestion = await page.textContent(
      '[data-testid="commit-message-suggestion"]'
    );
    expect(suggestion).toMatch(/^(feat|fix|refactor|docs|style|test|chore):/);

    // Step 6: Apply suggestion and validate
    await page.click('[data-testid="apply-suggestion-button"]');
    const appliedMessage = await page.inputValue(
      '[data-testid="commit-message-input"]'
    );
    expect(appliedMessage).toMatch(/^(feat|fix|refactor|docs|style|test|chore):/);

    // Step 7: Verify hook validation passes
    await expect(
      page.locator('[data-testid="hook-validation-status"]')
    ).toContainText('✓ Validation Passed');
  });

  test('should enforce commit message patterns with hooks', async ({
    page,
  }) => {
    // Step 1: Navigate to hooks configuration
    await page.goto('/studio/hooks');

    // Step 2: View enforce-commit-message hook
    await page.click('[data-testid="hook-enforce-commit"]');
    await expect(
      page.locator('[data-testid="hook-definition"]')
    ).toContainText('Enforce Commit Message');

    // Step 3: See hook specification in editor
    await expect(
      page.locator('[data-testid="monaco-editor"]')
    ).toContainText('semantic');

    // Step 4: Test hook against invalid commit
    await page.click('[data-testid="test-hook-button"]');
    await page.fill('[data-testid="test-commit-input"]', 'bad commit message');

    // Step 5: Verify rejection
    await expect(
      page.locator('[data-testid="hook-test-result"]')
    ).toContainText('✗ Validation Failed');
  });

  test('should integrate with AI engine for quality analysis', async ({
    page,
  }) => {
    // Step 1: Navigate to code analysis
    await page.goto('/studio/analyze');

    // Step 2: Upload or paste code
    const sampleCode = `
      function calculateTotal(items) {
        let total = 0;
        for (let i = 0; i < items.length; i++) {
          total += items[i].price;
        }
        return total;
      }
    `;
    await page.fill('[data-testid="code-input"]', sampleCode);

    // Step 3: Request analysis
    await page.click('[data-testid="analyze-button"]');

    // Step 4: Verify AI suggestions appear
    await page.waitForSelector('[data-testid="analysis-result"]');
    const analysis = await page.textContent('[data-testid="analysis-result"]');
    expect(analysis).toContain('complexity');
    expect(analysis).toContain('maintainability');

    // Step 5: Check for optimization suggestions
    await expect(
      page.locator('[data-testid="suggestions-list"]')
    ).toBeVisible();
    const suggestionCount = await page.locator(
      '[data-testid="suggestion-item"]'
    ).count();
    expect(suggestionCount).toBeGreaterThan(0);
  });

  test('should track developer workflow metrics', async ({ page }) => {
    // Step 1: Navigate to metrics dashboard
    await page.goto('/studio/metrics');

    // Step 2: Verify dashboard is loaded
    await expect(page.locator('[data-testid="metrics-dashboard"]')).toBeVisible();

    // Step 3: Check key metrics are displayed
    await expect(
      page.locator('[data-testid="commits-per-day"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="hook-success-rate"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="pattern-compliance"]')
    ).toBeVisible();

    // Step 4: Verify metrics have actual values
    const commitsValue = await page.textContent(
      '[data-testid="commits-per-day-value"]'
    );
    expect(parseFloat(commitsValue || '0')).toBeGreaterThanOrEqual(0);

    // Step 5: Check for trend visualization
    await expect(page.locator('[data-testid="metrics-chart"]')).toBeVisible();
  });
});
