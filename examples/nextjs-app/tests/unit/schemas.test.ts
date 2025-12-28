/**
 * Unit Tests - Zod Schemas
 *
 * Comprehensive tests for all Zod schema validation and transformations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GitCommitEventSchema,
  GitPushEventSchema,
  GitPullEventSchema,
  GitEventSchema,
  HookSchema,
  HookTemplateSchema,
  AutomationSchema,
  AnalyticsResultSchema,
  VelocityTrendSchema,
  QualityIssueSchema,
  BottleneckSchema,
  SecurityRiskSchema,
  TechnicalDebtSchema,
  AntiPatternSchema,
  PatternSchema,
  AnomalySchema,
  RecommendationSchema,
  RiskWarningSchema,
  HealthCheckSchema,
  OllamaConfigSchema,
  SystemConfigSchema,
  APIResponseSchema,
  AnalyticsRequestSchema,
  WorkflowGenerationRequestSchema,
  AIAnalysisRequestSchema,
  safeValidate,
  validateAndTransform,
  createAPIResponse,
} from '@/lib/schemas';
import { GIT_EVENT_FIXTURES, HOOK_FIXTURES, ANALYTICS_FIXTURES } from '../fixtures';

// ============================================================================
// Git Event Schema Tests
// ============================================================================

describe('GitCommitEventSchema', () => {
  it('should validate valid commit event', () => {
    const event = GIT_EVENT_FIXTURES.validCommit;
    const result = safeValidate(GitCommitEventSchema, event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('CommitEvent');
      expect(result.data.hash).toHaveLength(40);
    }
  });

  it('should reject commit with short hash', () => {
    const event = { ...GIT_EVENT_FIXTURES.validCommit, hash: 'short' };
    const result = safeValidate(GitCommitEventSchema, event);
    expect(result.success).toBe(false);
  });

  it('should reject commit with long hash', () => {
    const event = { ...GIT_EVENT_FIXTURES.validCommit, hash: 'a'.repeat(50) };
    const result = safeValidate(GitCommitEventSchema, event);
    expect(result.success).toBe(false);
  });

  it('should reject commit with negative additions', () => {
    const event = { ...GIT_EVENT_FIXTURES.validCommit, additions: -5 };
    const result = safeValidate(GitCommitEventSchema, event);
    expect(result.success).toBe(false);
  });

  it('should validate commit with zero deletions', () => {
    const event = { ...GIT_EVENT_FIXTURES.validCommit, deletions: 0 };
    const result = safeValidate(GitCommitEventSchema, event);
    expect(result.success).toBe(true);
  });

  it('should reject commit with invalid timestamp', () => {
    const event = { ...GIT_EVENT_FIXTURES.validCommit, timestamp: 'invalid' };
    const result = safeValidate(GitCommitEventSchema, event);
    expect(result.success).toBe(false);
  });

  it('should validate commit with empty files array', () => {
    const event = { ...GIT_EVENT_FIXTURES.validCommit, files: [] };
    const result = safeValidate(GitCommitEventSchema, event);
    expect(result.success).toBe(true);
  });

  it('should validate large commit with many files', () => {
    const event = GIT_EVENT_FIXTURES.largeCommit;
    const result = safeValidate(GitCommitEventSchema, event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.files.length).toBe(50);
    }
  });
});

describe('GitPushEventSchema', () => {
  it('should validate valid push event', () => {
    const event = GIT_EVENT_FIXTURES.pushEvent;
    const result = safeValidate(GitPushEventSchema, event);
    expect(result.success).toBe(true);
  });

  it('should validate force push event', () => {
    const event = GIT_EVENT_FIXTURES.forcePushEvent;
    const result = safeValidate(GitPushEventSchema, event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.force).toBe(true);
    }
  });

  it('should default force to false', () => {
    const event = {
      type: 'PushEvent',
      timestamp: new Date().toISOString(),
      branch: 'main',
      commits: [],
    };
    const result = safeValidate(GitPushEventSchema, event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.force).toBe(false);
    }
  });
});

describe('GitPullEventSchema', () => {
  it('should validate valid pull event', () => {
    const event = GIT_EVENT_FIXTURES.pullEvent;
    const result = safeValidate(GitPullEventSchema, event);
    expect(result.success).toBe(true);
  });

  it('should reject pull event without source', () => {
    const event = {
      type: 'PullEvent',
      timestamp: new Date().toISOString(),
      target: 'main',
      commits: [],
    };
    const result = safeValidate(GitPullEventSchema, event);
    expect(result.success).toBe(false);
  });
});

describe('GitEventSchema (Union)', () => {
  it('should accept CommitEvent', () => {
    const result = safeValidate(GitEventSchema, GIT_EVENT_FIXTURES.validCommit);
    expect(result.success).toBe(true);
  });

  it('should accept PushEvent', () => {
    const result = safeValidate(GitEventSchema, GIT_EVENT_FIXTURES.pushEvent);
    expect(result.success).toBe(true);
  });

  it('should accept PullEvent', () => {
    const result = safeValidate(GitEventSchema, GIT_EVENT_FIXTURES.pullEvent);
    expect(result.success).toBe(true);
  });

  it('should reject unknown event type', () => {
    const result = safeValidate(GitEventSchema, { type: 'UnknownEvent' });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Hook Schema Tests
// ============================================================================

describe('HookSchema', () => {
  it('should validate valid hook', () => {
    const hook = {
      name: 'test-hook',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'echo "test"',
      ttl: '@prefix gh: <test>',
      priority: 5,
      autoExecute: true,
    };
    const result = safeValidate(HookSchema, hook);
    expect(result.success).toBe(true);
  });

  it('should reject hook with priority < 1', () => {
    const hook = {
      name: 'test-hook',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'echo "test"',
      ttl: '@prefix gh: <test>',
      priority: 0,
      autoExecute: true,
    };
    const result = safeValidate(HookSchema, hook);
    expect(result.success).toBe(false);
  });

  it('should reject hook with priority > 10', () => {
    const hook = {
      name: 'test-hook',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'echo "test"',
      ttl: '@prefix gh: <test>',
      priority: 11,
      autoExecute: true,
    };
    const result = safeValidate(HookSchema, hook);
    expect(result.success).toBe(false);
  });

  it('should accept optional metadata', () => {
    const hook = {
      name: 'test-hook',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'echo "test"',
      ttl: '@prefix gh: <test>',
      priority: 5,
      autoExecute: true,
      metadata: { custom: 'data', nested: { key: 'value' } },
    };
    const result = safeValidate(HookSchema, hook);
    expect(result.success).toBe(true);
  });
});

describe('HookTemplateSchema', () => {
  it('should validate valid hook template', () => {
    const template = {
      name: 'test-template',
      description: 'A test template',
      template: '{{ name }}',
      variables: ['name'],
      conditions: ['hasName'],
    };
    const result = safeValidate(HookTemplateSchema, template);
    expect(result.success).toBe(true);
  });
});

describe('AutomationSchema', () => {
  it('should validate automation with low effort', () => {
    const automation = {
      id: 'test-auto',
      name: 'Test Automation',
      description: 'Automated task',
      priority: 8,
      effort: 'low',
      expectedBenefit: 'Improved efficiency',
    };
    const result = safeValidate(AutomationSchema, automation);
    expect(result.success).toBe(true);
  });

  it('should validate automation with high effort', () => {
    const automation = {
      id: 'complex-auto',
      name: 'Complex Automation',
      description: 'Complex automated task',
      priority: 5,
      effort: 'high',
      expectedBenefit: 'Major improvement',
    };
    const result = safeValidate(AutomationSchema, automation);
    expect(result.success).toBe(true);
  });

  it('should reject invalid effort level', () => {
    const automation = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      priority: 5,
      effort: 'extreme',
      expectedBenefit: 'Test',
    };
    const result = safeValidate(AutomationSchema, automation);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Analytics Schema Tests
// ============================================================================

describe('VelocityTrendSchema', () => {
  it('should validate valid velocity trend', () => {
    const trend = ANALYTICS_FIXTURES.velocity?.[0];
    const result = safeValidate(VelocityTrendSchema, trend);
    expect(result.success).toBe(true);
  });

  it('should reject negative commits per day', () => {
    const trend = {
      period: '2024-W01',
      commitsPerDay: -1,
      featuresPerDay: 0,
      bugsPerDay: 0,
      trend: 'stable',
    };
    const result = safeValidate(VelocityTrendSchema, trend);
    expect(result.success).toBe(false);
  });

  it('should accept all valid trend values', () => {
    for (const trend of ['increasing', 'stable', 'decreasing']) {
      const data = {
        period: '2024-W01',
        commitsPerDay: 5,
        featuresPerDay: 2,
        bugsPerDay: 1,
        trend,
      };
      const result = safeValidate(VelocityTrendSchema, data);
      expect(result.success).toBe(true);
    }
  });
});

describe('QualityIssueSchema', () => {
  it('should validate quality issue with all severities', () => {
    for (const severity of ['low', 'medium', 'high', 'critical']) {
      const issue = {
        type: 'code-smell',
        severity,
        description: 'Test issue',
        affectedFiles: ['test.ts'],
      };
      const result = safeValidate(QualityIssueSchema, issue);
      expect(result.success).toBe(true);
    }
  });

  it('should accept optional author', () => {
    const issue = {
      type: 'code-smell',
      severity: 'medium',
      description: 'Test issue',
      affectedFiles: ['test.ts'],
      author: 'developer@example.com',
    };
    const result = safeValidate(QualityIssueSchema, issue);
    expect(result.success).toBe(true);
  });
});

describe('SecurityRiskSchema', () => {
  it('should validate security risk', () => {
    const risk = ANALYTICS_FIXTURES.security?.[0];
    const result = safeValidate(SecurityRiskSchema, risk);
    expect(result.success).toBe(true);
  });
});

describe('TechnicalDebtSchema', () => {
  it('should validate technical debt', () => {
    const debt = ANALYTICS_FIXTURES.debt?.[0];
    const result = safeValidate(TechnicalDebtSchema, debt);
    expect(result.success).toBe(true);
  });

  it('should reject priority > 10', () => {
    const debt = {
      category: 'Test',
      estimatedDays: 5,
      impact: 'Minor',
      priority: 15,
    };
    const result = safeValidate(TechnicalDebtSchema, debt);
    expect(result.success).toBe(false);
  });
});

describe('AnalyticsResultSchema', () => {
  it('should validate complete analytics result', () => {
    const result = safeValidate(AnalyticsResultSchema, ANALYTICS_FIXTURES);
    expect(result.success).toBe(true);
  });

  it('should accept empty analytics result', () => {
    const result = safeValidate(AnalyticsResultSchema, {});
    expect(result.success).toBe(true);
  });

  it('should accept partial analytics result', () => {
    const result = safeValidate(AnalyticsResultSchema, {
      velocity: ANALYTICS_FIXTURES.velocity,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Pattern Schema Tests
// ============================================================================

describe('AntiPatternSchema', () => {
  it('should validate anti-pattern', () => {
    const antiPattern = {
      type: 'large-commit',
      severity: 'medium',
      description: 'Commits are too large',
      instances: 5,
      suggestion: 'Break into smaller commits',
      impact: 'Reduced code review quality',
    };
    const result = safeValidate(AntiPatternSchema, antiPattern);
    expect(result.success).toBe(true);
  });
});

describe('PatternSchema', () => {
  it('should validate pattern', () => {
    const pattern = {
      name: 'semantic-commits',
      frequency: 100,
      confidence: 95.5,
      context: 'commit messages',
      benefit: 'Consistent history',
    };
    const result = safeValidate(PatternSchema, pattern);
    expect(result.success).toBe(true);
  });

  it('should reject confidence > 100', () => {
    const pattern = {
      name: 'test',
      frequency: 10,
      confidence: 150,
      context: 'test',
      benefit: 'test',
    };
    const result = safeValidate(PatternSchema, pattern);
    expect(result.success).toBe(false);
  });
});

describe('AnomalySchema', () => {
  it('should validate anomaly', () => {
    const anomaly = {
      type: 'spike',
      severity: 'high',
      description: 'Unusual activity detected',
      timestamp: new Date().toISOString(),
      affectedMetric: 'commit-frequency',
      deviation: 3.5,
    };
    const result = safeValidate(AnomalySchema, anomaly);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Health Check Schema Tests
// ============================================================================

describe('HealthCheckSchema', () => {
  it('should validate healthy status', () => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 86400,
      components: { api: 'healthy', db: 'healthy' },
      metrics: {
        eventsPerSecond: 100,
        hookSuccessRate: 99,
        averageLatency: 50,
        activeHooks: 10,
        totalProcessed: 10000,
      },
    };
    const result = safeValidate(HealthCheckSchema, health);
    expect(result.success).toBe(true);
  });

  it('should validate degraded status', () => {
    const health = {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      components: { api: 'degraded' },
      metrics: {
        eventsPerSecond: 10,
        hookSuccessRate: 80,
        averageLatency: 500,
        activeHooks: 5,
        totalProcessed: 1000,
      },
    };
    const result = safeValidate(HealthCheckSchema, health);
    expect(result.success).toBe(true);
  });

  it('should accept optional performance', () => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 86400,
      components: {},
      metrics: {
        eventsPerSecond: 100,
        hookSuccessRate: 99,
        averageLatency: 50,
        activeHooks: 10,
        totalProcessed: 10000,
      },
      performance: {
        memoryUsage: 512,
        cpuUsage: 30,
      },
    };
    const result = safeValidate(HealthCheckSchema, health);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Configuration Schema Tests
// ============================================================================

describe('OllamaConfigSchema', () => {
  it('should validate valid Ollama config', () => {
    const config = {
      baseUrl: 'http://localhost:11434',
      model: 'ministral-3b',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 128,
    };
    const result = safeValidate(OllamaConfigSchema, config);
    expect(result.success).toBe(true);
  });

  it('should reject temperature > 2', () => {
    const config = {
      baseUrl: 'http://localhost:11434',
      model: 'test',
      temperature: 3,
    };
    const result = safeValidate(OllamaConfigSchema, config);
    expect(result.success).toBe(false);
  });

  it('should use default values', () => {
    const config = {
      baseUrl: 'http://localhost:11434',
      model: 'test',
    };
    const result = safeValidate(OllamaConfigSchema, config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.temperature).toBe(0.7);
      expect(result.data.topP).toBe(0.9);
    }
  });
});

// ============================================================================
// API Schema Tests
// ============================================================================

describe('APIResponseSchema', () => {
  it('should validate success response', () => {
    const response = {
      success: true,
      data: { key: 'value' },
      timestamp: new Date().toISOString(),
    };
    const result = safeValidate(APIResponseSchema, response);
    expect(result.success).toBe(true);
  });

  it('should validate error response', () => {
    const response = {
      success: false,
      error: 'Something went wrong',
      timestamp: new Date().toISOString(),
    };
    const result = safeValidate(APIResponseSchema, response);
    expect(result.success).toBe(true);
  });
});

describe('AnalyticsRequestSchema', () => {
  it('should validate analytics request', () => {
    const request = {
      type: 'velocity',
      query: 'last-7-days',
      limit: 100,
    };
    const result = safeValidate(AnalyticsRequestSchema, request);
    expect(result.success).toBe(true);
  });

  it('should reject limit > 1000', () => {
    const request = {
      type: 'all',
      limit: 5000,
    };
    const result = safeValidate(AnalyticsRequestSchema, request);
    expect(result.success).toBe(false);
  });
});

describe('WorkflowGenerationRequestSchema', () => {
  it('should validate generate action', () => {
    const request = {
      action: 'generate',
      patterns: [
        {
          type: 'enforce-pattern',
          trigger: 'CommitEvent',
          condition: 'always',
          action: 'validate',
          params: {},
        },
      ],
    };
    const result = safeValidate(WorkflowGenerationRequestSchema, request);
    expect(result.success).toBe(true);
  });

  it('should validate execute action', () => {
    const request = {
      action: 'execute',
      hooks: [
        {
          name: 'test',
          trigger: 'CommitEvent',
          condition: 'always',
          action: 'test',
          ttl: '@prefix gh: <test>',
          priority: 5,
          autoExecute: true,
        },
      ],
    };
    const result = safeValidate(WorkflowGenerationRequestSchema, request);
    expect(result.success).toBe(true);
  });
});

describe('AIAnalysisRequestSchema', () => {
  it('should validate analyze-code action', () => {
    const request = {
      action: 'analyze-code',
      code: 'const x = 1;',
    };
    const result = safeValidate(AIAnalysisRequestSchema, request);
    expect(result.success).toBe(true);
  });

  it('should validate ask action', () => {
    const request = {
      action: 'ask',
      question: 'How do I improve this code?',
      context: 'React application',
    };
    const result = safeValidate(AIAnalysisRequestSchema, request);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('safeValidate', () => {
  it('should return success with valid data', () => {
    const result = safeValidate(HookSchema, {
      name: 'test',
      trigger: 'CommitEvent',
      condition: 'always',
      action: 'test',
      ttl: '@prefix',
      priority: 5,
      autoExecute: true,
    });
    expect(result.success).toBe(true);
  });

  it('should return error with invalid data', () => {
    const result = safeValidate(HookSchema, { invalid: 'data' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('validateAndTransform', () => {
  it('should return transformed data', () => {
    const data = validateAndTransform(GitPushEventSchema, {
      type: 'PushEvent',
      timestamp: new Date().toISOString(),
      branch: 'main',
      commits: [],
    });
    expect(data.force).toBe(false); // Default applied
  });

  it('should throw on invalid data', () => {
    expect(() => {
      validateAndTransform(HookSchema, { invalid: 'data' });
    }).toThrow();
  });
});

describe('createAPIResponse', () => {
  it('should create success response with data', () => {
    const response = createAPIResponse(true, { key: 'value' });
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ key: 'value' });
    expect(response.timestamp).toBeDefined();
    expect(response.error).toBeUndefined();
  });

  it('should create error response', () => {
    const response = createAPIResponse(false, undefined, 'Error message');
    expect(response.success).toBe(false);
    expect(response.error).toBe('Error message');
    expect(response.timestamp).toBeDefined();
  });

  it('should generate valid ISO timestamp', () => {
    const response = createAPIResponse(true);
    expect(new Date(response.timestamp).getTime()).toBeGreaterThan(0);
  });
});
