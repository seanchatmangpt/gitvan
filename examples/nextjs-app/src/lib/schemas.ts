/**
 * Zod Schemas - Type-safe data validation and transformation
 *
 * Comprehensive schema definitions for all autonomic system data types,
 * enabling type-safe transformations with zod-to-from.
 */

import { z } from 'zod';

// ============================================================================
// Git Events
// ============================================================================

export const GitCommitEventSchema = z.object({
  type: z.literal('CommitEvent'),
  hash: z.string().min(40).max(40),
  author: z.string(),
  message: z.string(),
  timestamp: z.string().datetime(),
  files: z.array(z.string()),
  additions: z.number().int().min(0),
  deletions: z.number().int().min(0),
  branch: z.string(),
});

export const GitPushEventSchema = z.object({
  type: z.literal('PushEvent'),
  timestamp: z.string().datetime(),
  branch: z.string(),
  commits: z.array(z.string()),
  force: z.boolean().default(false),
});

export const GitPullEventSchema = z.object({
  type: z.literal('PullEvent'),
  timestamp: z.string().datetime(),
  source: z.string(),
  target: z.string(),
  commits: z.array(z.string()),
});

export const GitEventSchema = z.union([
  GitCommitEventSchema,
  GitPushEventSchema,
  GitPullEventSchema,
]);

export type GitCommitEvent = z.infer<typeof GitCommitEventSchema>;
export type GitPushEvent = z.infer<typeof GitPushEventSchema>;
export type GitPullEvent = z.infer<typeof GitPullEventSchema>;
export type GitEvent = z.infer<typeof GitEventSchema>;

// ============================================================================
// Analytics Schemas
// ============================================================================

export const VelocityTrendSchema = z.object({
  period: z.string(),
  commitsPerDay: z.number().min(0),
  featuresPerDay: z.number().min(0),
  bugsPerDay: z.number().min(0),
  trend: z.enum(['increasing', 'stable', 'decreasing']),
});

export const QualityIssueSchema = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  affectedFiles: z.array(z.string()),
  author: z.string().optional(),
});

export const BottleneckSchema = z.object({
  component: z.string(),
  latencyMs: z.number().min(0),
  errorRate: z.number().min(0).max(1),
  recommendation: z.string(),
});

export const SecurityRiskSchema = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  file: z.string(),
  pattern: z.string(),
  suggestion: z.string(),
});

export const TechnicalDebtSchema = z.object({
  category: z.string(),
  estimatedDays: z.number().min(0),
  impact: z.string(),
  priority: z.number().int().min(0).max(10),
});

export const AnalyticsResultSchema = z.object({
  velocity: z.array(VelocityTrendSchema).optional(),
  quality: z.array(QualityIssueSchema).optional(),
  performance: z.array(BottleneckSchema).optional(),
  security: z.array(SecurityRiskSchema).optional(),
  debt: z.array(TechnicalDebtSchema).optional(),
});

export type VelocityTrend = z.infer<typeof VelocityTrendSchema>;
export type QualityIssue = z.infer<typeof QualityIssueSchema>;
export type Bottleneck = z.infer<typeof BottleneckSchema>;
export type SecurityRisk = z.infer<typeof SecurityRiskSchema>;
export type TechnicalDebt = z.infer<typeof TechnicalDebtSchema>;
export type AnalyticsResult = z.infer<typeof AnalyticsResultSchema>;

// ============================================================================
// Hook Schemas
// ============================================================================

export const HookSchema = z.object({
  name: z.string(),
  trigger: z.string(),
  condition: z.string(),
  action: z.string(),
  ttl: z.string(),
  priority: z.number().int().min(1).max(10),
  autoExecute: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const HookTemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  template: z.string(),
  variables: z.array(z.string()),
  conditions: z.array(z.string()),
});

export const AutomationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  priority: z.number().int().min(1).max(10),
  effort: z.enum(['low', 'medium', 'high']),
  expectedBenefit: z.string(),
});

export type Hook = z.infer<typeof HookSchema>;
export type HookTemplate = z.infer<typeof HookTemplateSchema>;
export type Automation = z.infer<typeof AutomationSchema>;

// ============================================================================
// Pattern Schemas
// ============================================================================

export const AntiPatternSchema = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  instances: z.number().int().min(0),
  suggestion: z.string(),
  impact: z.string(),
});

export const PatternSchema = z.object({
  name: z.string(),
  frequency: z.number().int().min(0),
  confidence: z.number().min(0).max(100),
  context: z.string(),
  benefit: z.string(),
});

export const AnomalySchema = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  timestamp: z.string().datetime(),
  affectedMetric: z.string(),
  deviation: z.number(),
});

export type AntiPattern = z.infer<typeof AntiPatternSchema>;
export type Pattern = z.infer<typeof PatternSchema>;
export type Anomaly = z.infer<typeof AnomalySchema>;

// ============================================================================
// Recommendation Schemas
// ============================================================================

export const RecommendationSchema = z.object({
  hookType: z.string(),
  reason: z.string(),
  priority: z.number().int().min(1).max(10),
  estimatedBenefit: z.string(),
  action: z.string().optional(),
});

export const RiskWarningSchema = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  suggestion: z.string(),
});

export const LearningOpportunitySchema = z.object({
  topic: z.string(),
  description: z.string(),
  resources: z.array(z.string()).optional(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
export type RiskWarning = z.infer<typeof RiskWarningSchema>;
export type LearningOpportunity = z.infer<typeof LearningOpportunitySchema>;

// ============================================================================
// API Request/Response Schemas
// ============================================================================

export const AnalyticsRequestSchema = z.object({
  type: z.enum(['all', 'velocity', 'quality', 'performance', 'security', 'debt']).optional(),
  query: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const WorkflowGenerationRequestSchema = z.object({
  action: z.enum(['generate', 'execute', 'automation']),
  patterns: z.array(z.object({
    type: z.string(),
    trigger: z.string(),
    condition: z.string(),
    action: z.string(),
    params: z.record(z.string(), z.unknown()),
  })).optional(),
  hooks: z.array(HookSchema).optional(),
});

export const AIAnalysisRequestSchema = z.object({
  action: z.enum([
    'analyze-code',
    'generate-message',
    'explain-changes',
    'suggest-optimizations',
    'ask',
    'security-analysis',
  ]),
  code: z.string().optional(),
  diff: z.string().optional(),
  commit: z.object({
    hash: z.string(),
    author: z.string(),
    message: z.string(),
    timestamp: z.string(),
    files: z.array(z.string()),
    additions: z.number(),
    deletions: z.number(),
  }).optional(),
  question: z.string().optional(),
  context: z.string().optional(),
});

export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type AnalyticsRequest = z.infer<typeof AnalyticsRequestSchema>;
export type WorkflowGenerationRequest = z.infer<typeof WorkflowGenerationRequestSchema>;
export type AIAnalysisRequest = z.infer<typeof AIAnalysisRequestSchema>;
export type APIResponse = z.infer<typeof APIResponseSchema>;

// ============================================================================
// Health Check Schemas
// ============================================================================

export const ComponentStatusSchema = z.enum(['healthy', 'degraded', 'critical']);

export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'critical']),
  timestamp: z.string().datetime(),
  uptime: z.number(),
  components: z.record(z.string(), ComponentStatusSchema),
  metrics: z.object({
    eventsPerSecond: z.number().min(0),
    hookSuccessRate: z.number().min(0).max(100),
    averageLatency: z.number().min(0),
    activeHooks: z.number().int().min(0),
    totalProcessed: z.number().int().min(0),
  }),
  performance: z.object({
    memoryUsage: z.number().min(0),
    cpuUsage: z.number().min(0).max(100),
  }).optional(),
});

export type ComponentStatus = z.infer<typeof ComponentStatusSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

// ============================================================================
// Configuration Schemas
// ============================================================================

export const OllamaConfigSchema = z.object({
  baseUrl: z.string().url(),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(0.9),
  topK: z.number().int().min(1).default(40),
  numPredict: z.number().int().min(1).default(128),
});

export const SystemConfigSchema = z.object({
  ollama: OllamaConfigSchema,
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().int().min(60).default(3600),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'text']).default('text'),
  }),
});

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;
export type SystemConfig = z.infer<typeof SystemConfigSchema>;

// ============================================================================
// Transformation Helpers
// ============================================================================

/**
 * Validates and transforms data using Zod schema
 */
export function validateAndTransform<T>(schema: z.ZodSchema, data: unknown): T {
  return schema.parse(data) as T;
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidate<T>(
  schema: z.ZodSchema,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as T };
  }
  return { success: false, error: result.error };
}

/**
 * Create API response with type safety
 */
export function createAPIResponse<T>(
  success: boolean,
  data?: T,
  error?: string
): APIResponse {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}

export default {
  GitEventSchema,
  AnalyticsResultSchema,
  HookSchema,
  AntiPatternSchema,
  RecommendationSchema,
  HealthCheckSchema,
  APIResponseSchema,
};
