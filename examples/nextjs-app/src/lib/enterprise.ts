/**
 * Enterprise Features Module
 *
 * Provides RBAC, audit logging, webhooks, rate limiting, and team collaboration.
 * Designed for production multi-tenant deployments with compliance requirements.
 */

import { z } from 'zod';

/**
 * Role-Based Access Control (RBAC)
 */
export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
}

export const PermissionSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(Role),
  action: z.enum(['create', 'read', 'update', 'delete', 'execute', 'admin']),
  resource: z.enum(['workflows', 'hooks', 'scenarios', 'automation', 'users', 'audit']),
  allowed: z.boolean(),
});

export type Permission = z.infer<typeof PermissionSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(Role),
  teamId: z.string().uuid(),
  createdAt: z.date(),
  lastLogin: z.date().optional(),
  isActive: z.boolean(),
});

export type User = z.infer<typeof UserSchema>;

// Default RBAC permissions
export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    {
      id: 'admin-full',
      role: Role.ADMIN,
      action: 'admin',
      resource: 'users',
      allowed: true,
    },
    {
      id: 'admin-all',
      role: Role.ADMIN,
      action: 'create',
      resource: 'workflows',
      allowed: true,
    },
  ],
  [Role.MANAGER]: [
    {
      id: 'manager-create',
      role: Role.MANAGER,
      action: 'create',
      resource: 'workflows',
      allowed: true,
    },
    {
      id: 'manager-execute',
      role: Role.MANAGER,
      action: 'execute',
      resource: 'automation',
      allowed: true,
    },
  ],
  [Role.DEVELOPER]: [
    {
      id: 'dev-create',
      role: Role.DEVELOPER,
      action: 'create',
      resource: 'scenarios',
      allowed: true,
    },
    {
      id: 'dev-read',
      role: Role.DEVELOPER,
      action: 'read',
      resource: 'workflows',
      allowed: true,
    },
  ],
  [Role.VIEWER]: [
    {
      id: 'viewer-read',
      role: Role.VIEWER,
      action: 'read',
      resource: 'workflows',
      allowed: true,
    },
  ],
};

/**
 * Audit Logging for compliance
 */
export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  userId: z.string().uuid(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string(),
  changes: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  status: z.enum(['success', 'failure']),
  errorMessage: z.string().optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

/**
 * Webhook support for external integrations
 */
export const WebhookSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  name: z.string(),
  url: z.string().url(),
  events: z.array(z.enum([
    'workflow.created',
    'workflow.executed',
    'scenario.completed',
    'hook.triggered',
    'automation.failed',
  ])),
  isActive: z.boolean(),
  secret: z.string().optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10),
    retryDelay: z.number(),
  }).optional(),
  createdAt: z.date(),
  lastTriggered: z.date().optional(),
});

export type Webhook = z.infer<typeof WebhookSchema>;

/**
 * Rate limiting and quota management
 */
export const QuotaSchema = z.object({
  teamId: z.string().uuid(),
  workflowExecutions: z.object({
    limit: z.number(),
    used: z.number(),
    resetAt: z.date(),
  }),
  apiRequests: z.object({
    limit: z.number(),
    used: z.number(),
    resetAt: z.date(),
  }),
  storageGB: z.object({
    limit: z.number(),
    used: z.number(),
  }),
  maxTeamSize: z.number(),
  currentTeamSize: z.number(),
});

export type Quota = z.infer<typeof QuotaSchema>;

/**
 * API Key authentication
 */
export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  permissions: z.array(z.enum(['read', 'write', 'execute', 'admin'])),
  isActive: z.boolean(),
  lastUsed: z.date().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

/**
 * Team collaboration features
 */
export const CommentSchema = z.object({
  id: z.string().uuid(),
  resourceId: z.string(),
  resourceType: z.enum(['workflow', 'scenario', 'hook']),
  userId: z.string().uuid(),
  userName: z.string(),
  content: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  mentions: z.array(z.string()).optional(),
  reactions: z.record(z.number()).optional(),
});

export type Comment = z.infer<typeof CommentSchema>;

export const SharedResourceSchema = z.object({
  id: z.string().uuid(),
  resourceId: z.string(),
  resourceType: z.enum(['workflow', 'scenario', 'hook']),
  sharedBy: z.string().uuid(),
  sharedWith: z.array(z.object({
    userId: z.string().uuid(),
    role: z.enum(['viewer', 'editor', 'owner']),
  })),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
});

export type SharedResource = z.infer<typeof SharedResourceSchema>;

/**
 * Scheduled execution and cron support
 */
export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string(),
  cron: z.string(), // Cron expression
  timezone: z.string().optional(),
  isActive: z.boolean(),
  lastExecution: z.date().optional(),
  nextExecution: z.date(),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
});

export type Schedule = z.infer<typeof ScheduleSchema>;

/**
 * Enterprise service factory
 */
export class EnterpriseService {
  /**
   * Check if user has permission for action
   */
  static hasPermission(user: User, action: string, resource: string): boolean {
    const rolePermissions = DEFAULT_PERMISSIONS[user.role] || [];
    return rolePermissions.some(
      (p) => p.action === action && p.resource === resource && p.allowed
    );
  }

  /**
   * Log audit event
   */
  static createAuditEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    status: 'success' | 'failure',
    errorMessage?: string
  ): AuditEvent {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId,
      action,
      resource,
      resourceId,
      status,
      errorMessage,
    };
  }

  /**
   * Check if team has quota available
   */
  static isQuotaAvailable(quota: Quota, resource: 'workflows' | 'api'): boolean {
    if (resource === 'workflows') {
      return quota.workflowExecutions.used < quota.workflowExecutions.limit;
    }
    return quota.apiRequests.used < quota.apiRequests.limit;
  }

  /**
   * Generate API key
   */
  static generateApiKey(teamId: string, userId: string, name: string): string {
    const prefix = 'gvk_';
    const randomPart = crypto.randomUUID().replace(/-/g, '');
    return `${prefix}${randomPart}`;
  }

  /**
   * Validate API key format
   */
  static isValidApiKey(key: string): boolean {
    return /^gvk_[a-f0-9]{32}$/.test(key);
  }
}
