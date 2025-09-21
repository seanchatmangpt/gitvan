/**
 * Enterprise Context Management System
 * 
 * Provides enterprise context and workspace management for CLI testing.
 * Supports context inheritance, validation, and workspace isolation.
 */

/**
 * Enterprise context interface
 */
export interface EnterpriseContext {
  id: string
  domain?: string
  project?: string
  environment?: string
  region?: string
  compliance?: string
  user?: string
  role?: string
  workspace?: string
  permissions: Permission[]
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Permission interface
 */
export interface Permission {
  resource: string
  actions: string[]
  conditions?: ConditionFunction[]
  metadata?: Record<string, any>
}

/**
 * Condition function interface
 */
export interface ConditionFunction {
  (context: EnterpriseContext): boolean
}

/**
 * Workspace interface
 */
export interface Workspace {
  id: string
  name: string
  description: string
  domains: string[]
  resources: string[]
  permissions: Permission[]
  context: EnterpriseContext
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Context manager interface
 */
export interface ContextManager {
  // Context management
  setContext(context: EnterpriseContext): Promise<void>
  getContext(): Promise<EnterpriseContext | null>
  clearContext(): Promise<void>
  updateContext(updates: Partial<EnterpriseContext>): Promise<void>
  
  // Workspace management
  createWorkspace(name: string, config: WorkspaceConfig): Promise<Workspace>
  getWorkspace(name: string): Promise<Workspace | null>
  listWorkspaces(): Promise<Workspace[]>
  switchWorkspace(name: string): Promise<void>
  deleteWorkspace(name: string): Promise<void>
  
  // Context validation
  validateContext(context: EnterpriseContext): ValidationResult
  validatePermissions(context: EnterpriseContext, resource: string, action: string): ValidationResult
}

/**
 * Workspace configuration interface
 */
export interface WorkspaceConfig {
  name: string
  description: string
  domains: string[]
  resources: string[]
  permissions: Permission[]
  metadata?: Record<string, any>
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Enterprise Context Manager implementation
 */
export class EnterpriseContextManager implements ContextManager {
  private currentContext: EnterpriseContext | null = null
  private workspaces: Map<string, Workspace> = new Map()
  private contextHistory: EnterpriseContext[] = []

  /**
   * Set the current enterprise context
   */
  async setContext(context: EnterpriseContext): Promise<void> {
    // Validate context
    const validation = this.validateContext(context)
    if (!validation.valid) {
      throw new Error(`Invalid context: ${validation.errors.join(', ')}`)
    }
    
    // Store previous context in history
    if (this.currentContext) {
      this.contextHistory.push(this.currentContext)
    }
    
    // Set new context
    this.currentContext = {
      ...context,
      updatedAt: new Date()
    }
  }

  /**
   * Get the current enterprise context
   */
  async getContext(): Promise<EnterpriseContext | null> {
    return this.currentContext
  }

  /**
   * Clear the current context
   */
  async clearContext(): Promise<void> {
    if (this.currentContext) {
      this.contextHistory.push(this.currentContext)
    }
    this.currentContext = null
  }

  /**
   * Update the current context
   */
  async updateContext(updates: Partial<EnterpriseContext>): Promise<void> {
    if (!this.currentContext) {
      throw new Error('No current context to update')
    }
    
    const updatedContext = {
      ...this.currentContext,
      ...updates,
      updatedAt: new Date()
    }
    
    // Validate updated context
    const validation = this.validateContext(updatedContext)
    if (!validation.valid) {
      throw new Error(`Invalid context update: ${validation.errors.join(', ')}`)
    }
    
    this.currentContext = updatedContext
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(name: string, config: WorkspaceConfig): Promise<Workspace> {
    if (this.workspaces.has(name)) {
      throw new Error(`Workspace '${name}' already exists`)
    }
    
    const workspace: Workspace = {
      id: this.generateId(),
      name,
      description: config.description,
      domains: config.domains,
      resources: config.resources,
      permissions: config.permissions,
      context: {
        id: this.generateId(),
        workspace: name,
        permissions: config.permissions,
        metadata: config.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      metadata: config.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.workspaces.set(name, workspace)
    return workspace
  }

  /**
   * Get a workspace by name
   */
  async getWorkspace(name: string): Promise<Workspace | null> {
    return this.workspaces.get(name) || null
  }

  /**
   * List all workspaces
   */
  async listWorkspaces(): Promise<Workspace[]> {
    return Array.from(this.workspaces.values())
  }

  /**
   * Switch to a workspace
   */
  async switchWorkspace(name: string): Promise<void> {
    const workspace = this.workspaces.get(name)
    if (!workspace) {
      throw new Error(`Workspace '${name}' not found`)
    }
    
    // Set workspace context
    await this.setContext(workspace.context)
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(name: string): Promise<void> {
    if (!this.workspaces.has(name)) {
      throw new Error(`Workspace '${name}' not found`)
    }
    
    // Don't allow deletion of current workspace
    if (this.currentContext?.workspace === name) {
      throw new Error('Cannot delete current workspace')
    }
    
    this.workspaces.delete(name)
  }

  /**
   * Validate enterprise context
   */
  validateContext(context: EnterpriseContext): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Required fields
    if (!context.id) {
      errors.push('Context ID is required')
    }
    
    if (!context.permissions || context.permissions.length === 0) {
      warnings.push('No permissions defined')
    }
    
    // Validate permissions
    for (const permission of context.permissions || []) {
      if (!permission.resource) {
        errors.push('Permission resource is required')
      }
      if (!permission.actions || permission.actions.length === 0) {
        errors.push('Permission actions are required')
      }
    }
    
    // Validate metadata
    if (context.metadata && typeof context.metadata !== 'object') {
      errors.push('Context metadata must be an object')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate permissions for a specific resource and action
   */
  validatePermissions(context: EnterpriseContext, resource: string, action: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check if user has permission for this resource
    const resourcePermission = context.permissions.find(p => p.resource === resource)
    if (!resourcePermission) {
      errors.push(`No permission for resource '${resource}'`)
      return { valid: false, errors, warnings }
    }
    
    // Check if user has permission for this action
    if (!resourcePermission.actions.includes(action)) {
      errors.push(`No permission for action '${action}' on resource '${resource}'`)
      return { valid: false, errors, warnings }
    }
    
    // Check conditions
    if (resourcePermission.conditions) {
      for (const condition of resourcePermission.conditions) {
        if (!condition(context)) {
          errors.push(`Permission condition failed for resource '${resource}' action '${action}'`)
          return { valid: false, errors, warnings }
        }
      }
    }
    
    return {
      valid: true,
      errors,
      warnings
    }
  }

  /**
   * Get context history
   */
  getContextHistory(): EnterpriseContext[] {
    return [...this.contextHistory]
  }

  /**
   * Clear context history
   */
  clearContextHistory(): void {
    this.contextHistory = []
  }

  /**
   * Export context to environment variables
   */
  exportContextToEnvVars(context: EnterpriseContext): Record<string, string> {
    const envVars: Record<string, string> = {}
    
    if (context.domain) envVars.ENTERPRISE_DOMAIN = context.domain
    if (context.project) envVars.ENTERPRISE_PROJECT = context.project
    if (context.environment) envVars.ENTERPRISE_ENVIRONMENT = context.environment
    if (context.region) envVars.ENTERPRISE_REGION = context.region
    if (context.compliance) envVars.ENTERPRISE_COMPLIANCE = context.compliance
    if (context.user) envVars.ENTERPRISE_USER = context.user
    if (context.role) envVars.ENTERPRISE_ROLE = context.role
    if (context.workspace) envVars.ENTERPRISE_WORKSPACE = context.workspace
    
    // Add permissions as JSON
    if (context.permissions && context.permissions.length > 0) {
      envVars.ENTERPRISE_PERMISSIONS = JSON.stringify(context.permissions)
    }
    
    // Add metadata as JSON
    if (context.metadata && Object.keys(context.metadata).length > 0) {
      envVars.ENTERPRISE_METADATA = JSON.stringify(context.metadata)
    }
    
    return envVars
  }

  /**
   * Import context from environment variables
   */
  importContextFromEnvVars(envVars: Record<string, string>): EnterpriseContext {
    const context: EnterpriseContext = {
      id: this.generateId(),
      permissions: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    if (envVars.ENTERPRISE_DOMAIN) context.domain = envVars.ENTERPRISE_DOMAIN
    if (envVars.ENTERPRISE_PROJECT) context.project = envVars.ENTERPRISE_PROJECT
    if (envVars.ENTERPRISE_ENVIRONMENT) context.environment = envVars.ENTERPRISE_ENVIRONMENT
    if (envVars.ENTERPRISE_REGION) context.region = envVars.ENTERPRISE_REGION
    if (envVars.ENTERPRISE_COMPLIANCE) context.compliance = envVars.ENTERPRISE_COMPLIANCE
    if (envVars.ENTERPRISE_USER) context.user = envVars.ENTERPRISE_USER
    if (envVars.ENTERPRISE_ROLE) context.role = envVars.ENTERPRISE_ROLE
    if (envVars.ENTERPRISE_WORKSPACE) context.workspace = envVars.ENTERPRISE_WORKSPACE
    
    // Parse permissions
    if (envVars.ENTERPRISE_PERMISSIONS) {
      try {
        context.permissions = JSON.parse(envVars.ENTERPRISE_PERMISSIONS)
      } catch (error) {
        console.warn('Failed to parse enterprise permissions from environment')
      }
    }
    
    // Parse metadata
    if (envVars.ENTERPRISE_METADATA) {
      try {
        context.metadata = JSON.parse(envVars.ENTERPRISE_METADATA)
      } catch (error) {
        console.warn('Failed to parse enterprise metadata from environment')
      }
    }
    
    return context
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Pre-built enterprise contexts
 */
export const EnterpriseContexts = {
  /**
   * Production context
   */
  production: {
    id: 'prod-context',
    environment: 'production',
    region: 'us-east-1',
    compliance: 'sox',
    user: 'admin',
    role: 'admin',
    permissions: [
      { resource: 'server', actions: ['create', 'list', 'show', 'update', 'delete'] },
      { resource: 'user', actions: ['create', 'list', 'show', 'update', 'delete'] },
      { resource: 'project', actions: ['create', 'list', 'show', 'update', 'delete'] }
    ],
    metadata: {
      tier: 'production',
      criticality: 'high',
      backup: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  /**
   * Staging context
   */
  staging: {
    id: 'staging-context',
    environment: 'staging',
    region: 'us-west-2',
    compliance: 'sox',
    user: 'developer',
    role: 'developer',
    permissions: [
      { resource: 'server', actions: ['create', 'list', 'show', 'update'] },
      { resource: 'project', actions: ['create', 'list', 'show', 'update', 'deploy'] }
    ],
    metadata: {
      tier: 'staging',
      criticality: 'medium',
      backup: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },

  /**
   * Development context
   */
  development: {
    id: 'dev-context',
    environment: 'development',
    region: 'us-central-1',
    compliance: 'basic',
    user: 'developer',
    role: 'developer',
    permissions: [
      { resource: 'server', actions: ['create', 'list', 'show', 'update', 'delete'] },
      { resource: 'project', actions: ['create', 'list', 'show', 'update', 'delete', 'deploy'] },
      { resource: 'test', actions: ['create', 'list', 'show', 'run'] }
    ],
    metadata: {
      tier: 'development',
      criticality: 'low',
      backup: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Pre-built workspace configurations
 */
export const EnterpriseWorkspaces = {
  /**
   * Enterprise production workspace
   */
  enterpriseProd: {
    name: 'enterprise-prod',
    description: 'Enterprise production environment',
    domains: ['infra', 'security', 'monitor', 'data'],
    resources: ['server', 'user', 'alert', 'database'],
    permissions: [
      { resource: 'server', actions: ['create', 'list', 'show', 'update', 'delete'] },
      { resource: 'user', actions: ['create', 'list', 'show', 'update', 'delete', 'audit'] },
      { resource: 'alert', actions: ['create', 'list', 'show', 'update', 'delete'] },
      { resource: 'database', actions: ['create', 'list', 'show', 'update', 'delete', 'backup'] }
    ],
    metadata: {
      tier: 'production',
      criticality: 'high',
      compliance: 'sox'
    }
  },

  /**
   * Enterprise staging workspace
   */
  enterpriseStaging: {
    name: 'enterprise-staging',
    description: 'Enterprise staging environment',
    domains: ['infra', 'dev', 'security'],
    resources: ['server', 'project', 'user'],
    permissions: [
      { resource: 'server', actions: ['create', 'list', 'show', 'update'] },
      { resource: 'project', actions: ['create', 'list', 'show', 'update', 'deploy'] },
      { resource: 'user', actions: ['create', 'list', 'show', 'update'] }
    ],
    metadata: {
      tier: 'staging',
      criticality: 'medium',
      compliance: 'sox'
    }
  },

  /**
   * Enterprise development workspace
   */
  enterpriseDev: {
    name: 'enterprise-dev',
    description: 'Enterprise development environment',
    domains: ['dev', 'infra', 'security'],
    resources: ['project', 'server', 'user', 'test'],
    permissions: [
      { resource: 'project', actions: ['create', 'list', 'show', 'update', 'delete', 'deploy'] },
      { resource: 'server', actions: ['create', 'list', 'show', 'update', 'delete'] },
      { resource: 'user', actions: ['create', 'list', 'show', 'update', 'delete'] },
      { resource: 'test', actions: ['create', 'list', 'show', 'run', 'delete'] }
    ],
    metadata: {
      tier: 'development',
      criticality: 'low',
      compliance: 'basic'
    }
  }
}

/**
 * Global context manager instance
 */
export const contextManager = new EnterpriseContextManager()

/**
 * Initialize context manager with enterprise contexts and workspaces
 */
export function initializeEnterpriseContext(): void {
  // Create enterprise workspaces
  for (const [name, config] of Object.entries(EnterpriseWorkspaces)) {
    contextManager.createWorkspace(config.name, config)
  }
}

export default {
  EnterpriseContextManager,
  contextManager,
  EnterpriseContexts,
  EnterpriseWorkspaces,
  initializeEnterpriseContext
}
