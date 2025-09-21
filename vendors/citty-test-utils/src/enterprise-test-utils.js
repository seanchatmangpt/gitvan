#!/usr/bin/env node
// src/enterprise-test-utils.js - Enterprise Test Utilities

import { testUtils } from './scenario-dsl.js'
import { createEnterpriseRunner, createEnterpriseContext } from './enterprise-runner.js'
import { domainRegistry } from './domain-registry.js'

/**
 * Enterprise Test Utilities
 *
 * Provides enterprise-specific test utilities including:
 * - Resource CRUD operations
 * - Cross-domain operations
 * - Context management
 * - Workspace management
 */

export class EnterpriseTestUtils {
  constructor(options = {}) {
    this.runner = createEnterpriseRunner(options)
    this.context = createEnterpriseContext()
    this.resources = new Map()
    this.workspaces = new Map()
  }

  // Resource CRUD operations
  async createResource(domain, resource, data) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'create')

    if (!metadata) {
      throw new Error(`Unknown resource ${resource} in domain ${domain}`)
    }

    const args = ['--name', data.name]
    if (data.type) args.push('--type', data.type)
    if (data.config) args.push('--config', JSON.stringify(data.config))
    if (data.tags) args.push('--tags', data.tags.join(','))

    const result = await this.runner.executeDomain(domain, resource, 'create', args, {
      context: this.context.getContext(),
    })

    if (result.result.exitCode !== 0) {
      throw new Error(`Failed to create resource ${resource}: ${result.result.stderr}`)
    }

    // Store resource reference
    const resourceKey = `${domain}.${resource}.${data.name}`
    this.resources.set(resourceKey, {
      domain,
      resource,
      name: data.name,
      data,
      created: new Date(),
    })

    return {
      domain,
      resource,
      name: data.name,
      data,
      created: new Date(),
    }
  }

  async listResources(domain, resource, filter = {}) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'list')

    if (!metadata) {
      throw new Error(`Unknown resource ${resource} in domain ${domain}`)
    }

    const args = []
    if (filter.name) args.push('--name', filter.name)
    if (filter.type) args.push('--type', filter.type)
    if (filter.status) args.push('--status', filter.status)
    if (filter.format) args.push('--format', filter.format)

    const result = await this.runner.executeDomain(domain, resource, 'list', args, {
      context: this.context.getContext(),
    })

    if (result.result.exitCode !== 0) {
      throw new Error(`Failed to list resources ${resource}: ${result.result.stderr}`)
    }

    return {
      domain,
      resource,
      resources: this.parseResourceList(result.result.stdout),
      count: this.parseResourceCount(result.result.stdout),
    }
  }

  async getResource(domain, resource, id) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'show')

    if (!metadata) {
      throw new Error(`Unknown resource ${resource} in domain ${domain}`)
    }

    const result = await this.runner.executeDomain(domain, resource, 'show', [id], {
      context: this.context.getContext(),
    })

    if (result.result.exitCode !== 0) {
      throw new Error(`Failed to get resource ${resource} ${id}: ${result.result.stderr}`)
    }

    return {
      domain,
      resource,
      id,
      data: this.parseResourceDetails(result.result.stdout),
      metadata,
    }
  }

  async updateResource(domain, resource, id, data) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'update')

    if (!metadata) {
      throw new Error(`Unknown resource ${resource} in domain ${domain}`)
    }

    const args = [id]
    if (data.config) args.push('--config', JSON.stringify(data.config))
    if (data.tags) args.push('--tags', data.tags.join(','))
    if (data.status) args.push('--status', data.status)

    const result = await this.runner.executeDomain(domain, resource, 'update', args, {
      context: this.context.getContext(),
    })

    if (result.result.exitCode !== 0) {
      throw new Error(`Failed to update resource ${resource} ${id}: ${result.result.stderr}`)
    }

    // Update stored resource reference
    const resourceKey = `${domain}.${resource}.${id}`
    if (this.resources.has(resourceKey)) {
      const existingResource = this.resources.get(resourceKey)
      existingResource.data = { ...existingResource.data, ...data }
      existingResource.updated = new Date()
      this.resources.set(resourceKey, existingResource)
    }

    return {
      domain,
      resource,
      id,
      data,
      updated: new Date(),
    }
  }

  async deleteResource(domain, resource, id) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'delete')

    if (!metadata) {
      throw new Error(`Unknown resource ${resource} in domain ${domain}`)
    }

    const args = [id]
    if (metadata.resource.actions.includes('force')) {
      args.push('--force')
    }

    const result = await this.runner.executeDomain(domain, resource, 'delete', args, {
      context: this.context.getContext(),
    })

    if (result.result.exitCode !== 0) {
      throw new Error(`Failed to delete resource ${resource} ${id}: ${result.result.stderr}`)
    }

    // Remove stored resource reference
    const resourceKey = `${domain}.${resource}.${id}`
    this.resources.delete(resourceKey)

    return {
      domain,
      resource,
      id,
      deleted: new Date(),
    }
  }

  // Cross-domain operations
  async deployApplication(app, config) {
    const deploymentConfig = {
      app,
      environment: config.environment || 'production',
      region: config.region || 'us-east-1',
      ...config,
    }

    // Create infrastructure
    const server = await this.createResource('infra', 'server', {
      name: `${app}-server`,
      type: 'web',
      config: deploymentConfig,
    })

    // Deploy application
    const result = await this.runner.executeDomain('dev', 'app', 'deploy', [app], {
      context: {
        ...this.context.getContext(),
        server: server.name,
        environment: deploymentConfig.environment,
      },
    })

    if (result.result.exitCode !== 0) {
      throw new Error(`Failed to deploy application ${app}: ${result.result.stderr}`)
    }

    return {
      app,
      server: server.name,
      environment: deploymentConfig.environment,
      region: deploymentConfig.region,
      deployed: new Date(),
    }
  }

  async validateCompliance(standard, scope) {
    const complianceConfig = {
      standard,
      scope: scope || 'all',
      format: 'json',
    }

    const result = await this.runner.executeDomain(
      'security',
      'policy',
      'validate',
      [
        '--compliance',
        standard,
        '--scope',
        complianceConfig.scope,
        '--format',
        complianceConfig.format,
      ],
      {
        context: this.context.getContext(),
      }
    )

    if (result.result.exitCode !== 0) {
      throw new Error(`Failed to validate compliance ${standard}: ${result.result.stderr}`)
    }

    return {
      standard,
      scope: complianceConfig.scope,
      result: this.parseComplianceResult(result.result.stdout),
      validated: new Date(),
    }
  }

  // Context management
  setContext(context) {
    this.context.setContext(context)
    return this
  }

  getContext() {
    return this.context.getContext()
  }

  clearContext() {
    this.context.clearContext()
    return this
  }

  // Workspace management
  async createWorkspace(name, config) {
    const workspaceConfig = {
      name,
      domain: config.domain || 'dev',
      project: config.project || name,
      environment: config.environment || 'development',
      ...config,
    }

    // Create workspace context
    this.context.setContext({
      workspace: name,
      project: workspaceConfig.project,
      domain: workspaceConfig.domain,
      environment: workspaceConfig.environment,
    })

    // Create project if specified
    if (workspaceConfig.createProject) {
      await this.createResource('dev', 'project', {
        name: workspaceConfig.project,
        type: workspaceConfig.projectType || 'application',
      })
    }

    // Store workspace
    this.workspaces.set(name, {
      name,
      config: workspaceConfig,
      created: new Date(),
      context: this.context.getContext(),
    })

    return {
      name,
      config: workspaceConfig,
      created: new Date(),
    }
  }

  async switchWorkspace(name) {
    const workspace = this.workspaces.get(name)

    if (!workspace) {
      throw new Error(`Workspace ${name} not found`)
    }

    this.context.setContext(workspace.context)

    return workspace
  }

  async listWorkspaces() {
    return Array.from(this.workspaces.values())
  }

  async deleteWorkspace(name) {
    const workspace = this.workspaces.get(name)

    if (!workspace) {
      throw new Error(`Workspace ${name} not found`)
    }

    // Clean up workspace resources
    if (workspace.config.cleanupOnDelete) {
      await this.cleanupWorkspaceResources(name)
    }

    this.workspaces.delete(name)

    return {
      name,
      deleted: new Date(),
    }
  }

  // Resource cleanup
  async cleanupWorkspaceResources(workspaceName) {
    const workspace = this.workspaces.get(workspaceName)

    if (!workspace) {
      throw new Error(`Workspace ${workspaceName} not found`)
    }

    const resourcesToCleanup = Array.from(this.resources.values()).filter(
      (resource) => resource.data.workspace === workspaceName
    )

    for (const resource of resourcesToCleanup) {
      try {
        await this.deleteResource(resource.domain, resource.resource, resource.name)
      } catch (error) {
        console.warn(
          `Failed to cleanup resource ${resource.resource} ${resource.name}: ${error.message}`
        )
      }
    }

    return {
      workspace: workspaceName,
      cleanedUp: resourcesToCleanup.length,
      resources: resourcesToCleanup,
    }
  }

  // Utility methods
  parseResourceList(output) {
    // Simple parsing - in real implementation, this would be more sophisticated
    const lines = output.split('\n').filter((line) => line.trim())
    return lines.map((line) => {
      const parts = line.split(/\s+/)
      return {
        id: parts[0],
        name: parts[1],
        status: parts[2],
        created: parts[3],
      }
    })
  }

  parseResourceCount(output) {
    const countMatch = output.match(/(\d+)\s+(?:items|resources|count)/i)
    return countMatch ? parseInt(countMatch[1]) : 0
  }

  parseResourceDetails(output) {
    // Simple parsing - in real implementation, this would be more sophisticated
    const details = {}
    const lines = output.split('\n').filter((line) => line.trim())

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        details[key.trim()] = valueParts.join(':').trim()
      }
    }

    return details
  }

  parseComplianceResult(output) {
    try {
      return JSON.parse(output)
    } catch (error) {
      // Fallback to simple parsing
      return {
        standard: 'unknown',
        status: output.includes('passed') ? 'passed' : 'failed',
        details: output,
      }
    }
  }

  // Resource tracking
  getResourceReferences() {
    return Array.from(this.resources.values())
  }

  getResourceReference(domain, resource, name) {
    const key = `${domain}.${resource}.${name}`
    return this.resources.get(key)
  }

  // Cleanup all resources
  async cleanupAllResources() {
    const resources = Array.from(this.resources.values())

    for (const resource of resources) {
      try {
        await this.deleteResource(resource.domain, resource.resource, resource.name)
      } catch (error) {
        console.warn(
          `Failed to cleanup resource ${resource.resource} ${resource.name}: ${error.message}`
        )
      }
    }

    return {
      cleanedUp: resources.length,
      resources,
    }
  }
}

// Convenience functions
export function createEnterpriseTestUtils(options) {
  return new EnterpriseTestUtils(options)
}

// Export all classes and functions
export default {
  EnterpriseTestUtils,
  createEnterpriseTestUtils,
}
