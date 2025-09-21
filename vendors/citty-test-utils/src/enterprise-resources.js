/**
 * Enterprise Resource Management Utilities
 * 
 * Provides CRUD operations for test resources, cross-domain operations,
 * and enterprise resource lifecycle management.
 */

import { enterpriseRunner } from './enterprise-runner.js'
import { globalContextManager } from './enterprise-context.js'

/**
 * Resource interface
 */
export interface Resource {
  id: string
  domain: string
  type: string
  attributes: Record<string, any>
  relationships: Relationship[]
  state: ResourceState
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Relationship interface
 */
export interface Relationship {
  type: string
  target: string
  direction: 'inbound' | 'outbound' | 'bidirectional'
  metadata?: Record<string, any>
}

/**
 * Resource state interface
 */
export interface ResourceState {
  current: string
  previous: string
  transitions: StateTransition[]
  metadata?: Record<string, any>
}

/**
 * State transition interface
 */
export interface StateTransition {
  from: string
  to: string
  condition: string
  timestamp: Date
}

/**
 * Deployment configuration interface
 */
export interface DeploymentConfig {
  infra: InfrastructureConfig
  security: SecurityConfig
  monitor: MonitoringConfig
  metadata?: Record<string, any>
}

/**
 * Infrastructure configuration interface
 */
export interface InfrastructureConfig {
  servers: number
  region: string
  type: string
  metadata?: Record<string, any>
}

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  policies: string[]
  users: string[]
  metadata?: Record<string, any>
}

/**
 * Monitoring configuration interface
 */
export interface MonitoringConfig {
  alerts: string[]
  dashboard: string
  metadata?: Record<string, any>
}

/**
 * Deployment result interface
 */
export interface DeploymentResult {
  success: boolean
  resources: Resource[]
  duration: number
  metadata?: Record<string, any>
}

/**
 * Compliance scope interface
 */
export interface ComplianceScope {
  domains: string[]
  resources: string[]
  standards: string[]
  metadata?: Record<string, any>
}

/**
 * Compliance result interface
 */
export interface ComplianceResult {
  success: boolean
  score: number
  violations: ComplianceViolation[]
  duration: number
  metadata?: Record<string, any>
}

/**
 * Compliance violation interface
 */
export interface ComplianceViolation {
  requirement: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  evidence: any[]
  remediation: string[]
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
  (context: any): boolean
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
  context: any
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

/**
 * Enterprise Test Utilities implementation
 */
export class EnterpriseTestUtils {
  private contextManager = globalContextManager
  private resources = new Map<string, Resource>()

  /**
   * Create a resource
   */
  async createResource(domain: string, resource: string, data: any): Promise<Resource> {
    const id = this.generateResourceId(domain, resource)
    
    const resourceObj: Resource = {
      id,
      domain,
      type: resource,
      attributes: data,
      relationships: [],
      state: {
        current: 'created',
        previous: 'none',
        transitions: [{
          from: 'none',
          to: 'created',
          condition: 'create',
          timestamp: new Date()
        }]
      },
      metadata: {
        createdBy: this.contextManager.getCurrentContext().user || 'system',
        createdAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.resources.set(id, resourceObj)
    return resourceObj
  }

  /**
   * List resources
   */
  async listResources(domain: string, resource: string, filter?: any): Promise<Resource[]> {
    const allResources = Array.from(this.resources.values())
    
    return allResources.filter(r => {
      if (r.domain !== domain || r.type !== resource) {
        return false
      }
      
      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          if (r.attributes[key] !== value) {
            return false
          }
        }
      }
      
      return true
    })
  }

  /**
   * Get a resource
   */
  async getResource(domain: string, resource: string, id: string): Promise<Resource> {
    const resourceObj = this.resources.get(id)
    if (!resourceObj) {
      throw new Error(`Resource ${domain}.${resource} ${id} not found`)
    }
    return resourceObj
  }

  /**
   * Update a resource
   */
  async updateResource(domain: string, resource: string, id: string, data: any): Promise<Resource> {
    const resourceObj = this.resources.get(id)
    if (!resourceObj) {
      throw new Error(`Resource ${domain}.${resource} ${id} not found`)
    }

    const previousState = resourceObj.state.current
    resourceObj.attributes = { ...resourceObj.attributes, ...data }
    resourceObj.state.previous = previousState
    resourceObj.state.current = 'updated'
    resourceObj.state.transitions.push({
      from: previousState,
      to: 'updated',
      condition: 'update',
      timestamp: new Date()
    })
    resourceObj.updatedAt = new Date()

    this.resources.set(id, resourceObj)
    return resourceObj
  }

  /**
   * Delete a resource
   */
  async deleteResource(domain: string, resource: string, id: string): Promise<void> {
    const resourceObj = this.resources.get(id)
    if (!resourceObj) {
      throw new Error(`Resource ${domain}.${resource} ${id} not found`)
    }

    this.resources.delete(id)
  }

  /**
   * Deploy application with cross-domain resources
   */
  async deployApplication(app: string, config: DeploymentConfig): Promise<DeploymentResult> {
    const startTime = Date.now()
    const resources: Resource[] = []

    try {
      // Create infrastructure resources
      if (config.infra) {
        for (let i = 0; i < config.infra.servers; i++) {
          const server = await this.createResource('infra', 'server', {
            name: `${app}-server-${i + 1}`,
            type: config.infra.type,
            region: config.infra.region
          })
          resources.push(server)
        }
      }

      // Create security resources
      if (config.security) {
        for (const user of config.security.users) {
          const userResource = await this.createResource('security', 'user', {
            name: user,
            role: 'developer'
          })
          resources.push(userResource)
        }

        for (const policy of config.security.policies) {
          const policyResource = await this.createResource('security', 'policy', {
            name: policy,
            type: 'rbac'
          })
          resources.push(policyResource)
        }
      }

      // Create monitoring resources
      if (config.monitor) {
        for (const alert of config.monitor.alerts) {
          const alertResource = await this.createResource('monitor', 'alert', {
            name: alert,
            type: 'metric'
          })
          resources.push(alertResource)
        }
      }

      return {
        success: true,
        resources,
        duration: Date.now() - startTime,
        metadata: {
          app,
          config
        }
      }

    } catch (error) {
      return {
        success: false,
        resources,
        duration: Date.now() - startTime,
        metadata: {
          app,
          config,
          error: (error as Error).message
        }
      }
    }
  }

  /**
   * Validate compliance
   */
  async validateCompliance(standard: string, scope: ComplianceScope): Promise<ComplianceResult> {
    const startTime = Date.now()
    const violations: ComplianceViolation[] = []

    try {
      // Validate each domain
      for (const domain of scope.domains) {
        try {
          const result = await enterpriseRunner.executeDomain(
            domain,
            'compliance',
            'validate',
            ['--standard', standard],
            {}
          )

          if (result.exitCode !== 0) {
            violations.push({
              requirement: `${domain}-validation`,
              description: `Compliance validation failed for domain ${domain}`,
              severity: 'high',
              evidence: [result.stderr],
              remediation: [`Fix compliance issues in domain ${domain}`]
            })
          }
        } catch (error) {
          violations.push({
            requirement: `${domain}-validation`,
            description: `Compliance validation error for domain ${domain}`,
            severity: 'critical',
            evidence: [(error as Error).message],
            remediation: [`Resolve compliance validation error in domain ${domain}`]
          })
        }
      }

      const score = Math.max(0, 100 - (violations.length * 10))
      const success = violations.length === 0

      return {
        success,
        score,
        violations,
        duration: Date.now() - startTime,
        metadata: {
          standard,
          scope
        }
      }

    } catch (error) {
      return {
        success: false,
        score: 0,
        violations: [{
          requirement: 'compliance-execution',
          description: 'Compliance validation execution failed',
          severity: 'critical',
          evidence: [(error as Error).message],
          remediation: ['Resolve compliance validation execution error']
        }],
        duration: Date.now() - startTime,
        metadata: {
          standard,
          scope,
          error: (error as Error).message
        }
      }
    }
  }

  /**
   * Set enterprise context
   */
  async setContext(context: any): Promise<void> {
    this.contextManager.setContext(context)
  }

  /**
   * Get current context
   */
  async getContext(): Promise<any> {
    return this.contextManager.getCurrentContext()
  }

  /**
   * Clear context
   */
  async clearContext(): Promise<void> {
    this.contextManager.clearContext()
  }

  /**
   * Create workspace
   */
  async createWorkspace(name: string, config: WorkspaceConfig): Promise<Workspace> {
    return this.contextManager.createWorkspace(name, config)
  }

  /**
   * Switch workspace
   */
  async switchWorkspace(name: string): Promise<void> {
    this.contextManager.switchWorkspace(name)
  }

  /**
   * List workspaces
   */
  async listWorkspaces(): Promise<Workspace[]> {
    return this.contextManager.listWorkspaces()
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(name: string): Promise<void> {
    this.contextManager.deleteWorkspace(name)
  }

  /**
   * Generate resource ID
   */
  private generateResourceId(domain: string, resource: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${domain}-${resource}-${timestamp}-${random}`
  }

  /**
   * Get all resources
   */
  getAllResources(): Resource[] {
    return Array.from(this.resources.values())
  }

  /**
   * Clear all resources
   */
  clearAllResources(): void {
    this.resources.clear()
  }

  /**
   * Export resources
   */
  exportResources(): Record<string, Resource> {
    return Object.fromEntries(this.resources)
  }

  /**
   * Import resources
   */
  importResources(resources: Record<string, Resource>): void {
    this.resources.clear()
    for (const [id, resource] of Object.entries(resources)) {
      this.resources.set(id, resource)
    }
  }
}

/**
 * Global enterprise test utilities instance
 */
export const enterpriseTestUtils = new EnterpriseTestUtils()

/**
 * Convenience functions for enterprise test utilities
 */
export const testUtils = {
  /**
   * Resource CRUD operations
   */
  createResource: (domain: string, resource: string, data: any) => 
    enterpriseTestUtils.createResource(domain, resource, data),
  
  listResources: (domain: string, resource: string, filter?: any) => 
    enterpriseTestUtils.listResources(domain, resource, filter),
  
  getResource: (domain: string, resource: string, id: string) => 
    enterpriseTestUtils.getResource(domain, resource, id),
  
  updateResource: (domain: string, resource: string, id: string, data: any) => 
    enterpriseTestUtils.updateResource(domain, resource, id, data),
  
  deleteResource: (domain: string, resource: string, id: string) => 
    enterpriseTestUtils.deleteResource(domain, resource, id),

  /**
   * Cross-domain operations
   */
  deployApplication: (app: string, config: DeploymentConfig) => 
    enterpriseTestUtils.deployApplication(app, config),
  
  validateCompliance: (standard: string, scope: ComplianceScope) => 
    enterpriseTestUtils.validateCompliance(standard, scope),

  /**
   * Context management
   */
  setContext: (context: any) => enterpriseTestUtils.setContext(context),
  getContext: () => enterpriseTestUtils.getContext(),
  clearContext: () => enterpriseTestUtils.clearContext(),

  /**
   * Workspace management
   */
  createWorkspace: (name: string, config: WorkspaceConfig) => 
    enterpriseTestUtils.createWorkspace(name, config),
  
  switchWorkspace: (name: string) => enterpriseTestUtils.switchWorkspace(name),
  listWorkspaces: () => enterpriseTestUtils.listWorkspaces(),
  deleteWorkspace: (name: string) => enterpriseTestUtils.deleteWorkspace(name)
}

export default {
  EnterpriseTestUtils,
  enterpriseTestUtils,
  testUtils
}
