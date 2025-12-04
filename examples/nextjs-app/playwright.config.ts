import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for GitVan Studio E2E Tests
 *
 * Tests JTBD scenarios (Jobs to Be Done) with Playwright:
 * - Developer workflows (semantic commits, pattern detection)
 * - Team coordination (collaborative workflows, approvals)
 * - Deployment automation (release management, CI/CD)
 */
export default defineConfig({
  testDir: './playwright/tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright/report' }],
    ['json', { outputFile: 'playwright/results.json' }],
    ['junit', { outputFile: 'playwright/results.xml' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
