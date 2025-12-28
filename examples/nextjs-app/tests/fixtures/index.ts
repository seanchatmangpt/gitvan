/**
 * GitVan v4 Test Fixtures
 *
 * Predefined test data for common testing scenarios.
 */

import type { Hook } from '@/lib/workflow-generator';
import type { JTBDJob, JTBDScenario, ExecutionResult } from '@/lib/jtbd-engine';
import type {
  GitEvent,
  Hook as SchemaHook,
  Automation,
  HealthCheck,
  AnalyticsResult,
} from '@/lib/schemas';

// ============================================================================
// Hook Fixtures
// ============================================================================

export const HOOK_FIXTURES = {
  basicHook: {
    name: 'basic-test-hook',
    trigger: 'CommitEvent',
    condition: 'always',
    action: 'echo "Basic hook executed"',
    ttl: `@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .

gh:basic-test-hook a gh:Hook ;
  gh:name "Basic Test Hook" ;
  gh:priority 5 ;
  gh:autoExecute true .`,
    priority: 5,
    autoExecute: true,
  } as Hook,

  enforcePatternHook: {
    name: 'enforce-semantic-commits',
    trigger: 'CommitEvent',
    condition: '^(feat|fix|docs|style|refactor|test|chore):',
    action: 'validate-commit-message',
    ttl: `@prefix gh: <http://example.org/git-hooks#> .

gh:enforce-semantic-commits a gh:Hook ;
  gh:name "Enforce Semantic Commits" ;
  gh:trigger [ a git:CommitEvent ] ;
  gh:condition [ gh:pattern "^(feat|fix|docs):" ] ;
  gh:priority 9 .`,
    priority: 9,
    autoExecute: true,
  } as Hook,

  autoDeployHook: {
    name: 'auto-deploy-production',
    trigger: 'TagEvent',
    condition: '^v\\d+\\.\\d+\\.\\d+$',
    action: 'deploy-to-production',
    ttl: `@prefix gh: <http://example.org/git-hooks#> .

gh:auto-deploy-production a gh:Hook ;
  gh:name "Auto Deploy Production" ;
  gh:trigger [ a git:TagEvent ] ;
  gh:priority 10 .`,
    priority: 10,
    autoExecute: true,
  } as Hook,

  qualityGateHook: {
    name: 'quality-gate-coverage',
    trigger: 'PushEvent',
    condition: 'coverage >= 80%',
    action: 'run-quality-checks',
    ttl: `@prefix gh: <http://example.org/git-hooks#> .

gh:quality-gate-coverage a gh:Hook ;
  gh:name "Quality Gate: Coverage" ;
  gh:priority 8 .`,
    priority: 8,
    autoExecute: true,
  } as Hook,

  selfHealingHook: {
    name: 'self-heal-failures',
    trigger: 'FailureEvent',
    condition: 'any-hook-failure',
    action: 'analyze-and-recover',
    ttl: `@prefix gh: <http://example.org/git-hooks#> .

gh:self-heal-failures a gh:Hook ;
  gh:name "Self Heal Failures" ;
  gh:priority 10 ;
  gh:autoExecute true .`,
    priority: 10,
    autoExecute: true,
  } as Hook,
};

export const HOOK_COLLECTION = Object.values(HOOK_FIXTURES);

// ============================================================================
// JTBD Job Fixtures
// ============================================================================

export const JTBD_JOB_FIXTURES: Record<string, JTBDJob> = {
  developerProductivity: {
    id: 'developer-productivity',
    title: 'Improve Developer Productivity',
    description: 'Help developers ship code faster with fewer errors',
    jobType: 'functional',
    context: 'daily development workflow',
    outcomes: [
      {
        name: 'Faster Commits',
        description: 'Reduce time from code change to commit',
        priority: 'must-have',
      },
      {
        name: 'Fewer Errors',
        description: 'Catch issues before they reach production',
        priority: 'must-have',
      },
    ],
    metrics: [
      { metric: 'commits-per-day', baseline: 5, target: 10, unit: 'commits' },
      { metric: 'error-rate', baseline: 10, target: 2, unit: '%' },
    ],
  },

  teamCollaboration: {
    id: 'team-collaboration',
    title: 'Enhance Team Collaboration',
    description: 'Improve how team members work together on code',
    jobType: 'social',
    context: 'team coordination',
    outcomes: [
      {
        name: 'Better Code Reviews',
        description: 'More thorough and helpful reviews',
        priority: 'should-have',
      },
    ],
    metrics: [
      { metric: 'review-coverage', baseline: 60, target: 100, unit: '%' },
      { metric: 'review-time', baseline: 24, target: 4, unit: 'hours' },
    ],
  },

  deploymentConfidence: {
    id: 'deployment-confidence',
    title: 'Build Deployment Confidence',
    description: 'Feel confident when deploying to production',
    jobType: 'emotional',
    context: 'release process',
    outcomes: [
      {
        name: 'Safe Deployments',
        description: 'Deployments that rarely cause issues',
        priority: 'must-have',
      },
    ],
    metrics: [
      { metric: 'deployment-success-rate', baseline: 90, target: 99, unit: '%' },
      { metric: 'rollback-rate', baseline: 5, target: 0.5, unit: '%' },
    ],
  },
};

export const JTBD_JOB_COLLECTION = Object.values(JTBD_JOB_FIXTURES);

// ============================================================================
// JTBD Scenario Fixtures
// ============================================================================

export const JTBD_SCENARIO_FIXTURES: Record<string, JTBDScenario> = {
  semanticCommitFlow: {
    id: 'semantic-commit-flow',
    name: 'Semantic Commit Workflow',
    description: 'Validate and enforce semantic commit messages',
    jobs: ['developer-productivity'],
    steps: [
      {
        order: 1,
        action: 'Developer writes commit message',
        expectedOutcome: 'Message follows semantic format',
        assertion: 'message.match(/^(feat|fix|docs):/)',
      },
      {
        order: 2,
        action: 'Pre-commit hook validates message',
        expectedOutcome: 'Validation passes',
        assertion: 'validation.success === true',
      },
      {
        order: 3,
        action: 'Commit is created',
        expectedOutcome: 'Commit appears in history',
        assertion: 'git.log.includes(commit.hash)',
      },
    ],
    successCriteria: ['All steps pass', 'Commit message valid'],
    estimatedDuration: 5000,
  },

  codeReviewFlow: {
    id: 'code-review-flow',
    name: 'Code Review Workflow',
    description: 'Ensure thorough code reviews',
    jobs: ['team-collaboration'],
    steps: [
      {
        order: 1,
        action: 'Developer opens pull request',
        expectedOutcome: 'PR is created with description',
        assertion: 'pr.description.length > 50',
      },
      {
        order: 2,
        action: 'Automated checks run',
        expectedOutcome: 'All checks pass',
        assertion: 'checks.every(c => c.status === "passed")',
      },
      {
        order: 3,
        action: 'Reviewer provides feedback',
        expectedOutcome: 'Meaningful review comments',
        assertion: 'review.comments.length > 0',
      },
      {
        order: 4,
        action: 'PR is approved and merged',
        expectedOutcome: 'PR merged successfully',
        assertion: 'pr.state === "merged"',
      },
    ],
    successCriteria: ['All checks pass', 'At least one approval', 'No blocking comments'],
    estimatedDuration: 30000,
  },

  deploymentFlow: {
    id: 'deployment-flow',
    name: 'Deployment Workflow',
    description: 'Safe and reliable deployments',
    jobs: ['deployment-confidence'],
    steps: [
      {
        order: 1,
        action: 'Create release tag',
        expectedOutcome: 'Tag follows semver',
        assertion: 'tag.match(/^v\\d+\\.\\d+\\.\\d+$/)',
      },
      {
        order: 2,
        action: 'Run pre-deployment checks',
        expectedOutcome: 'All checks pass',
        assertion: 'preDeployChecks.success === true',
      },
      {
        order: 3,
        action: 'Deploy to staging',
        expectedOutcome: 'Staging deployment successful',
        assertion: 'staging.status === "healthy"',
      },
      {
        order: 4,
        action: 'Run smoke tests',
        expectedOutcome: 'Smoke tests pass',
        assertion: 'smokeTests.passed === smokeTests.total',
      },
      {
        order: 5,
        action: 'Deploy to production',
        expectedOutcome: 'Production deployment successful',
        assertion: 'production.status === "healthy"',
      },
    ],
    successCriteria: ['All environments healthy', 'No errors in logs', 'Metrics within bounds'],
    estimatedDuration: 120000,
  },
};

export const JTBD_SCENARIO_COLLECTION = Object.values(JTBD_SCENARIO_FIXTURES);

// ============================================================================
// Git Event Fixtures
// ============================================================================

export const GIT_EVENT_FIXTURES = {
  validCommit: {
    type: 'CommitEvent' as const,
    hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    author: 'developer@example.com',
    message: 'feat: add new feature',
    timestamp: '2024-01-15T10:30:00.000Z',
    files: ['src/feature.ts', 'src/feature.test.ts'],
    additions: 150,
    deletions: 20,
    branch: 'main',
  },

  largeCommit: {
    type: 'CommitEvent' as const,
    hash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    author: 'developer@example.com',
    message: 'refactor: major refactoring',
    timestamp: '2024-01-15T11:30:00.000Z',
    files: Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`),
    additions: 2000,
    deletions: 1500,
    branch: 'feature/refactor',
  },

  fixCommit: {
    type: 'CommitEvent' as const,
    hash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    author: 'developer@example.com',
    message: 'fix: resolve critical bug',
    timestamp: '2024-01-15T12:00:00.000Z',
    files: ['src/buggy-file.ts'],
    additions: 5,
    deletions: 3,
    branch: 'hotfix/critical-bug',
  },

  pushEvent: {
    type: 'PushEvent' as const,
    timestamp: '2024-01-15T13:00:00.000Z',
    branch: 'main',
    commits: [
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    ],
    force: false,
  },

  forcePushEvent: {
    type: 'PushEvent' as const,
    timestamp: '2024-01-15T14:00:00.000Z',
    branch: 'feature/dangerous',
    commits: ['d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5'],
    force: true,
  },

  pullEvent: {
    type: 'PullEvent' as const,
    timestamp: '2024-01-15T15:00:00.000Z',
    source: 'origin/main',
    target: 'main',
    commits: ['e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6'],
  },
};

// ============================================================================
// Analytics Fixtures
// ============================================================================

export const ANALYTICS_FIXTURES: AnalyticsResult = {
  velocity: [
    {
      period: '2024-W02',
      commitsPerDay: 12.5,
      featuresPerDay: 3.2,
      bugsPerDay: 1.5,
      trend: 'increasing',
    },
    {
      period: '2024-W03',
      commitsPerDay: 15.0,
      featuresPerDay: 4.0,
      bugsPerDay: 1.0,
      trend: 'stable',
    },
  ],
  quality: [
    {
      type: 'code-smell',
      severity: 'medium',
      description: 'Complex function detected',
      affectedFiles: ['src/complex.ts'],
    },
  ],
  performance: [
    {
      component: 'API Gateway',
      latencyMs: 150,
      errorRate: 0.01,
      recommendation: 'Consider caching',
    },
  ],
  security: [
    {
      type: 'dependency',
      severity: 'high',
      file: 'package.json',
      pattern: 'outdated-package@1.0.0',
      suggestion: 'Update to latest version',
    },
  ],
  debt: [
    {
      category: 'Documentation',
      estimatedDays: 5,
      impact: 'Onboarding time',
      priority: 7,
    },
  ],
};

// ============================================================================
// Health Check Fixtures
// ============================================================================

export const HEALTH_CHECK_FIXTURES: Record<string, HealthCheck> = {
  healthy: {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: 86400,
    components: {
      database: 'healthy',
      cache: 'healthy',
      api: 'healthy',
    },
    metrics: {
      eventsPerSecond: 100,
      hookSuccessRate: 99.5,
      averageLatency: 50,
      activeHooks: 25,
      totalProcessed: 100000,
    },
    performance: {
      memoryUsage: 512,
      cpuUsage: 35,
    },
  },

  degraded: {
    status: 'degraded',
    timestamp: new Date().toISOString(),
    uptime: 3600,
    components: {
      database: 'healthy',
      cache: 'degraded',
      api: 'healthy',
    },
    metrics: {
      eventsPerSecond: 50,
      hookSuccessRate: 85,
      averageLatency: 200,
      activeHooks: 25,
      totalProcessed: 50000,
    },
    performance: {
      memoryUsage: 1024,
      cpuUsage: 70,
    },
  },

  critical: {
    status: 'critical',
    timestamp: new Date().toISOString(),
    uptime: 300,
    components: {
      database: 'critical',
      cache: 'degraded',
      api: 'degraded',
    },
    metrics: {
      eventsPerSecond: 5,
      hookSuccessRate: 50,
      averageLatency: 2000,
      activeHooks: 5,
      totalProcessed: 1000,
    },
    performance: {
      memoryUsage: 2048,
      cpuUsage: 95,
    },
  },
};

// ============================================================================
// Automation Fixtures
// ============================================================================

export const AUTOMATION_FIXTURES: Automation[] = [
  {
    id: 'enforce-commits',
    name: 'Enforce Semantic Commits',
    description: 'Require commits to follow semantic format',
    priority: 9,
    effort: 'low',
    expectedBenefit: 'Consistent commit history',
  },
  {
    id: 'auto-deploy',
    name: 'Auto-Deploy Releases',
    description: 'Automatically deploy on version tags',
    priority: 8,
    effort: 'medium',
    expectedBenefit: 'Faster releases',
  },
  {
    id: 'quality-gates',
    name: 'Quality Gates',
    description: 'Enforce code quality thresholds',
    priority: 7,
    effort: 'medium',
    expectedBenefit: 'Higher code quality',
  },
];

// ============================================================================
// TTL Template Fixtures
// ============================================================================

export const TTL_TEMPLATE_FIXTURES = {
  basicHook: `@prefix gh: <http://example.org/git-hooks#> .
@prefix git: <http://example.org/git#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gh:{{ name | slug }} a gh:Hook ;
  gh:name "{{ name }}" ;
  gh:description "{{ description }}" ;
  gh:priority {{ priority }} ;
  gh:autoExecute {{ autoExecute | lower }} .`,

  compositeHook: `@prefix gh: <http://example.org/git-hooks#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gh:{{ name | slug }} a gh:Hook ;
  gh:name "{{ name }}" ;
  gh:action [
    a gh:CompositeAction ;
    gh:steps [
      rdf:_1 [ a gh:Step1 ] ;
      rdf:_2 [ a gh:Step2 ]
    ]
  ] .`,
};

// ============================================================================
// Error Fixtures
// ============================================================================

export const ERROR_FIXTURES = {
  validationError: {
    type: 'ValidationError',
    message: 'Invalid input data',
    details: { field: 'name', reason: 'required' },
  },
  executionError: {
    type: 'ExecutionError',
    message: 'Hook execution failed',
    details: { hookName: 'test-hook', exitCode: 1 },
  },
  networkError: {
    type: 'NetworkError',
    message: 'Connection refused',
    details: { host: 'localhost', port: 11434 },
  },
  timeoutError: {
    type: 'TimeoutError',
    message: 'Operation timed out',
    details: { timeout: 5000, elapsed: 5001 },
  },
};

// ============================================================================
// Export All Fixtures
// ============================================================================

export default {
  hooks: HOOK_FIXTURES,
  hookCollection: HOOK_COLLECTION,
  jtbdJobs: JTBD_JOB_FIXTURES,
  jtbdJobCollection: JTBD_JOB_COLLECTION,
  jtbdScenarios: JTBD_SCENARIO_FIXTURES,
  jtbdScenarioCollection: JTBD_SCENARIO_COLLECTION,
  gitEvents: GIT_EVENT_FIXTURES,
  analytics: ANALYTICS_FIXTURES,
  healthChecks: HEALTH_CHECK_FIXTURES,
  automations: AUTOMATION_FIXTURES,
  ttlTemplates: TTL_TEMPLATE_FIXTURES,
  errors: ERROR_FIXTURES,
};
