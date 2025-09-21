/**
 * Enterprise Resource Management Utilities
 *
 * Provides CRUD operations for test resources, cross-domain operations,
 * and enterprise resource lifecycle management.
 */

import { enterpriseRunner } from './enterprise-runner.js'
import { globalContextManager } from './enterprise-context.js'

/**
 * Enterprise Test Utilities implementation
 */
export class EnterpriseTestUtils {
  constructor() {
    this.contextManager = globalContextManager
    this.resources = new Map()
  }

  /**
   * Create a resource
   */
  async createResource(domain, resource, data) {
    const id = this.generateResourceId(domain, resource)

    const resourceObj = {
      id,
      domain,
      type: resource,
      attributes: data,
      relationships: [],
      state: {
        current: 'created',
        previous: 'none',
        transitions: [
          {
            from: 'none',
            to: 'created',
            condition: 'create',
            timestamp: new Date(),
          },
        ],
      },
      metadata: {
        createdBy: this.contextManager.getCurrentContext().user || 'system',
        createdAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.resources.set(id, resourceObj)
    return resourceObj
  }

  /**
   * List resources
   */
  async listResources(domain, resource, filter) {
    const allResources = Array.from(this.resources.values())

    return allResources.filter((r) => {
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
  async getResource(domain, resource, id) {
    const resourceObj = this.resources.get(id)
    if (!resourceObj) {
      throw new Error(`Resource ${domain}.${resource} ${id} not found`)
    }
    return resourceObj
  }

  /**
   * Update a resource
   */
  async updateResource(domain, resource, id, data) {
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
      timestamp: new Date(),
    })
    resourceObj.updatedAt = new Date()

    this.resources.set(id, resourceObj)
    return resourceObj
  }

  /**
   * Delete a resource
   */
  async deleteResource(domain, resource, id) {
    const resourceObj = this.resources.get(id)
    if (!resourceObj) {
      throw new Error(`Resource ${domain}.${resource} ${id} not found`)
    }

    this.resources.delete(id)
  }

  /**
   * Deploy application with cross-domain resources
   */
  async deployApplication(app, config) {
    const startTime = Date.now()
    const resources = []

    try {
      // Create infrastructure resources
      if (config.infra) {
        for (let i = 0; i < config.infra.servers; i++) {
          const server = await this.createResource('infra', 'server', {
            name: `${app}-server-${i + 1}`,
            type: config.infra.type,
            region: config.infra.region,
          })
          resources.push(server)
        }
      }

      // Create security resources
      if (config.security) {
        for (const user of config.security.users) {
          const userResource = await this.createResource('security', 'user', {
            name: user,
            role: 'developer',
          })
          resources.push(userResource)
        }

        for (const policy of config.security.policies) {
          const policyResource = await this.createResource('security', 'policy', {
            name: policy,
            type: 'rbac',
          })
          resources.push(policyResource)
        }
      }

      // Create monitoring resources
      if (config.monitor) {
        for (const alert of config.monitor.alerts) {
          const alertResource = await this.createResource('monitor', 'alert', {
            name: alert,
            type: 'metric',
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
          config,
        },
      }
    } catch (error) {
      return {
        success: false,
        resources,
        duration: Date.now() - startTime,
        metadata: {
          app,
          config,
          error: error.message,
        },
      }
    }
  }

  /**
   * Validate compliance
   */
  async validateCompliance(standard, scope) {
    const startTime = Date.now()
    const violations = []

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
              remediation: [`Fix compliance issues in domain ${domain}`],
            })
          }
        } catch (error) {
          violations.push({
            requirement: `${domain}-validation`,
            description: `Compliance validation error for domain ${domain}`,
            severity: 'critical',
            evidence: [error.message],
            remediation: [`Resolve compliance validation error in domain ${domain}`],
          })
        }
      }

      const score = Math.max(0, 100 - violations.length * 10)
      const success = violations.length === 0

      return {
        success,
        score,
        violations,
        duration: Date.now() - startTime,
        metadata: {
          standard,
          scope,
        },
      }
    } catch (error) {
      return {
        success: false,
        score: 0,
        violations: [
          {
            requirement: 'compliance-execution',
            description: 'Compliance validation execution failed',
            severity: 'critical',
            evidence: [error.message],
            remediation: ['Resolve compliance validation execution error'],
          },
        ],
        duration: Date.now() - startTime,
        metadata: {
          standard,
          scope,
          error: error.message,
        },
      }
    }
  }

  /**
   * Set enterprise context
   */
  async setContext(context) {
    this.contextManager.setContext(context)
  }

  /**
   * Get current context
   */
  async getContext() {
    return this.contextManager.getCurrentContext()
  }

  /**
   * Clear context
   */
  async clearContext() {
    this.contextManager.clearContext()
  }

  /**
   * Create workspace
   */
  async createWorkspace(name, config) {
    return this.contextManager.createWorkspace(name, config)
  }

  /**
   * Switch workspace
   */
  async switchWorkspace(name) {
    this.contextManager.switchWorkspace(name)
  }

  /**
   * List workspaces
   */
  async listWorkspaces() {
    return this.contextManager.listWorkspaces()
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(name) {
    this.contextManager.deleteWorkspace(name)
  }

  /**
   * Generate resource ID
   */
  generateResourceId(domain, resource) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${domain}-${resource}-${timestamp}-${random}`
  }

  /**
   * Get all resources
   */
  getAllResources() {
    return Array.from(this.resources.values())
  }

  /**
   * Clear all resources
   */
  clearAllResources() {
    this.resources.clear()
  }

  /**
   * Export resources
   */
  exportResources() {
    return Object.fromEntries(this.resources)
  }

  /**
   * Import resources
   */
  importResources(resources) {
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
  createResource: (domain, resource, data) =>
    enterpriseTestUtils.createResource(domain, resource, data),

  listResources: (domain, resource, filter) =>
    enterpriseTestUtils.listResources(domain, resource, filter),

  getResource: (domain, resource, id) => enterpriseTestUtils.getResource(domain, resource, id),

  updateResource: (domain, resource, id, data) =>
    enterpriseTestUtils.updateResource(domain, resource, id, data),

  deleteResource: (domain, resource, id) =>
    enterpriseTestUtils.deleteResource(domain, resource, id),

  /**
   * Cross-domain operations
   */
  deployApplication: (app, config) => enterpriseTestUtils.deployApplication(app, config),

  validateCompliance: (standard, scope) => enterpriseTestUtils.validateCompliance(standard, scope),

  /**
   * Context management
   */
  setContext: (context) => enterpriseTestUtils.setContext(context),
  getContext: () => enterpriseTestUtils.getContext(),
  clearContext: () => enterpriseTestUtils.clearContext(),

  /**
   * Workspace management
   */
  createWorkspace: (name, config) => enterpriseTestUtils.createWorkspace(name, config),

  switchWorkspace: (name) => enterpriseTestUtils.switchWorkspace(name),
  listWorkspaces: () => enterpriseTestUtils.listWorkspaces(),
  deleteWorkspace: (name) => enterpriseTestUtils.deleteWorkspace(name),
}

export default {
  EnterpriseTestUtils,
  enterpriseTestUtils,
  testUtils,
}
