#!/usr/bin/env node
// src/domain-registry.js - Enterprise Domain Registry System

/**
 * Enterprise Domain Registry System
 *
 * Manages business domains as first-class citizens with:
 * - Domain definitions and metadata
 * - Resource and action mappings
 * - Cross-domain relationships
 * - Compliance and governance rules
 */

export class DomainRegistry {
  constructor() {
    this.domains = new Map()
    this.resources = new Map()
    this.actions = new Map()
    this.relationships = new Map()
  }

  // Register a domain
  registerDomain(domain) {
    this.domains.set(domain.name, domain)

    // Register resources
    if (domain.resources) {
      domain.resources.forEach((resource) => {
        this.resources.set(`${domain.name}.${resource.name}`, {
          ...resource,
          domain: domain.name,
        })
      })
    }

    // Register actions
    if (domain.actions) {
      domain.actions.forEach((action) => {
        this.actions.set(`${domain.name}.${action.name}`, {
          ...action,
          domain: domain.name,
        })
      })
    }

    return this
  }

  // Get domain information
  getDomain(name) {
    return this.domains.get(name)
  }

  // Get all domains
  getAllDomains() {
    return Array.from(this.domains.values())
  }

  // Get resources for a domain
  getDomainResources(domainName) {
    return Array.from(this.resources.values()).filter((resource) => resource.domain === domainName)
  }

  // Get actions for a domain
  getDomainActions(domainName) {
    return Array.from(this.actions.values()).filter((action) => action.domain === domainName)
  }

  // Get resource information
  getResource(domainName, resourceName) {
    return this.resources.get(`${domainName}.${resourceName}`)
  }

  // Get action information
  getAction(domainName, actionName) {
    return this.actions.get(`${domainName}.${actionName}`)
  }

  // Validate command structure
  validateCommand(domain, resource, action) {
    const domainInfo = this.getDomain(domain)
    if (!domainInfo) {
      throw new Error(`Unknown domain: ${domain}`)
    }

    const resourceInfo = this.getResource(domain, resource)
    if (!resourceInfo) {
      throw new Error(`Unknown resource ${resource} in domain ${domain}`)
    }

    if (!resourceInfo.actions.includes(action)) {
      throw new Error(`Action ${action} not supported for resource ${resource} in domain ${domain}`)
    }

    return true
  }

  // Get command metadata
  getCommandMetadata(domain, resource, action) {
    const domainInfo = this.getDomain(domain)
    const resourceInfo = this.getResource(domain, resource)

    return {
      domain: domainInfo,
      resource: resourceInfo,
      action: action,
      command: `${domain} ${resource} ${action}`,
      description: `${action} ${resource} in ${domain} domain`,
      category: domainInfo.category || 'general',
      compliance: domainInfo.compliance || [],
      governance: domainInfo.governance || [],
    }
  }
}

// Pre-defined domain configurations
export const domainConfigs = {
  infra: {
    name: 'infra',
    displayName: 'Infrastructure',
    description: 'Infrastructure and operations management',
    category: 'operations',
    compliance: ['SOC2', 'ISO27001'],
    governance: ['RBAC', 'Audit'],
    resources: [
      {
        name: 'server',
        displayName: 'Server',
        description: 'Compute server instances',
        actions: ['create', 'list', 'show', 'update', 'delete', 'restart', 'scale'],
        attributes: ['type', 'region', 'size', 'status', 'created'],
        relationships: ['network', 'storage', 'monitoring'],
      },
      {
        name: 'network',
        displayName: 'Network',
        description: 'Network infrastructure',
        actions: ['create', 'list', 'show', 'update', 'delete', 'configure'],
        attributes: ['cidr', 'region', 'status', 'created'],
        relationships: ['server', 'security'],
      },
      {
        name: 'storage',
        displayName: 'Storage',
        description: 'Storage systems and volumes',
        actions: ['create', 'list', 'show', 'update', 'delete', 'backup', 'restore'],
        attributes: ['type', 'size', 'region', 'status', 'created'],
        relationships: ['server', 'backup'],
      },
      {
        name: 'database',
        displayName: 'Database',
        description: 'Database instances and clusters',
        actions: ['create', 'list', 'show', 'update', 'delete', 'backup', 'restore'],
        attributes: ['type', 'version', 'size', 'region', 'status', 'created'],
        relationships: ['server', 'storage', 'backup'],
      },
    ],
    actions: [
      {
        name: 'create',
        description: 'Create new resource',
        category: 'CRUD',
        requires: ['name', 'type'],
        optional: ['region', 'size', 'config'],
      },
      {
        name: 'list',
        description: 'List resources',
        category: 'CRUD',
        requires: [],
        optional: ['filter', 'format'],
      },
      {
        name: 'show',
        description: 'Show resource details',
        category: 'CRUD',
        requires: ['id'],
        optional: ['format'],
      },
      {
        name: 'update',
        description: 'Update resource',
        category: 'CRUD',
        requires: ['id'],
        optional: ['config', 'tags'],
      },
      {
        name: 'delete',
        description: 'Delete resource',
        category: 'CRUD',
        requires: ['id'],
        optional: ['force'],
      },
      {
        name: 'backup',
        description: 'Backup resource',
        category: 'Operations',
        requires: ['id'],
        optional: ['schedule', 'retention'],
      },
      {
        name: 'restore',
        description: 'Restore resource',
        category: 'Operations',
        requires: ['id', 'backup'],
        optional: ['target'],
      },
    ],
  },

  dev: {
    name: 'dev',
    displayName: 'Development',
    description: 'Development and testing operations',
    category: 'development',
    compliance: ['SOC2'],
    governance: ['RBAC'],
    resources: [
      {
        name: 'project',
        displayName: 'Project',
        description: 'Development projects',
        actions: ['create', 'list', 'show', 'update', 'delete', 'deploy'],
        attributes: ['name', 'type', 'status', 'created', 'updated'],
        relationships: ['app', 'test', 'scenario'],
      },
      {
        name: 'app',
        displayName: 'Application',
        description: 'Application instances',
        actions: ['create', 'list', 'show', 'update', 'delete', 'deploy', 'run'],
        attributes: ['name', 'version', 'status', 'created', 'updated'],
        relationships: ['project', 'test'],
      },
      {
        name: 'test',
        displayName: 'Test',
        description: 'Test suites and cases',
        actions: ['create', 'list', 'show', 'update', 'delete', 'run', 'schedule'],
        attributes: ['name', 'type', 'status', 'duration', 'results'],
        relationships: ['project', 'scenario', 'snapshot'],
      },
      {
        name: 'scenario',
        displayName: 'Scenario',
        description: 'Test scenarios',
        actions: ['create', 'list', 'show', 'update', 'delete', 'run'],
        attributes: ['name', 'type', 'status', 'steps', 'created'],
        relationships: ['test', 'snapshot'],
      },
      {
        name: 'snapshot',
        displayName: 'Snapshot',
        description: 'Test snapshots',
        actions: ['create', 'list', 'show', 'update', 'delete', 'compare'],
        attributes: ['name', 'type', 'status', 'created', 'size'],
        relationships: ['test', 'scenario'],
      },
    ],
    actions: [
      {
        name: 'create',
        description: 'Create new resource',
        category: 'CRUD',
        requires: ['name'],
        optional: ['type', 'config'],
      },
      {
        name: 'list',
        description: 'List resources',
        category: 'CRUD',
        requires: [],
        optional: ['filter', 'format'],
      },
      {
        name: 'show',
        description: 'Show resource details',
        category: 'CRUD',
        requires: ['id'],
        optional: ['format'],
      },
      {
        name: 'update',
        description: 'Update resource',
        category: 'CRUD',
        requires: ['id'],
        optional: ['config', 'tags'],
      },
      {
        name: 'delete',
        description: 'Delete resource',
        category: 'CRUD',
        requires: ['id'],
        optional: ['force'],
      },
      {
        name: 'run',
        description: 'Run resource',
        category: 'Operations',
        requires: ['id'],
        optional: ['config', 'environment'],
      },
      {
        name: 'deploy',
        description: 'Deploy resource',
        category: 'Operations',
        requires: ['id'],
        optional: ['environment', 'config'],
      },
      {
        name: 'schedule',
        description: 'Schedule resource',
        category: 'Operations',
        requires: ['id', 'schedule'],
        optional: ['config'],
      },
    ],
  },

  security: {
    name: 'security',
    displayName: 'Security',
    description: 'Security and compliance management',
    category: 'security',
    compliance: ['SOC2', 'ISO27001', 'GDPR'],
    governance: ['RBAC', 'Audit', 'Policy'],
    resources: [
      {
        name: 'user',
        displayName: 'User',
        description: 'User accounts and identities',
        actions: ['create', 'list', 'show', 'update', 'delete', 'audit'],
        attributes: ['name', 'email', 'status', 'created', 'lastLogin'],
        relationships: ['role', 'policy'],
      },
      {
        name: 'role',
        displayName: 'Role',
        description: 'User roles and permissions',
        actions: ['create', 'list', 'show', 'update', 'delete', 'audit'],
        attributes: ['name', 'permissions', 'status', 'created'],
        relationships: ['user', 'policy'],
      },
      {
        name: 'policy',
        displayName: 'Policy',
        description: 'Security policies and rules',
        actions: ['create', 'list', 'show', 'update', 'delete', 'validate'],
        attributes: ['name', 'type', 'status', 'created', 'updated'],
        relationships: ['user', 'role'],
      },
      {
        name: 'secret',
        displayName: 'Secret',
        description: 'Secrets and credentials',
        actions: ['create', 'list', 'show', 'update', 'delete', 'rotate'],
        attributes: ['name', 'type', 'status', 'created', 'expires'],
        relationships: ['user', 'policy'],
      },
      {
        name: 'certificate',
        displayName: 'Certificate',
        description: 'SSL/TLS certificates',
        actions: ['create', 'list', 'show', 'update', 'delete', 'validate'],
        attributes: ['name', 'type', 'status', 'created', 'expires'],
        relationships: ['secret', 'policy'],
      },
    ],
    actions: [
      {
        name: 'create',
        description: 'Create new resource',
        category: 'CRUD',
        requires: ['name'],
        optional: ['type', 'config'],
      },
      {
        name: 'list',
        description: 'List resources',
        category: 'CRUD',
        requires: [],
        optional: ['filter', 'format'],
      },
      {
        name: 'show',
        description: 'Show resource details',
        category: 'CRUD',
        requires: ['id'],
        optional: ['format'],
      },
      {
        name: 'update',
        description: 'Update resource',
        category: 'CRUD',
        requires: ['id'],
        optional: ['config', 'tags'],
      },
      {
        name: 'delete',
        description: 'Delete resource',
        category: 'CRUD',
        requires: ['id'],
        optional: ['force'],
      },
      {
        name: 'audit',
        description: 'Audit resource',
        category: 'Security',
        requires: ['id'],
        optional: ['scope', 'format'],
      },
      {
        name: 'validate',
        description: 'Validate resource',
        category: 'Security',
        requires: ['id'],
        optional: ['rules', 'format'],
      },
      {
        name: 'rotate',
        description: 'Rotate resource',
        category: 'Security',
        requires: ['id'],
        optional: ['schedule'],
      },
    ],
  },
}

// Initialize registry with pre-defined domains
export function createDomainRegistry() {
  const registry = new DomainRegistry()

  // Register all pre-defined domains
  Object.values(domainConfigs).forEach((domain) => {
    registry.registerDomain(domain)
  })

  return registry
}

// Export singleton instance
export const domainRegistry = createDomainRegistry()

export default domainRegistry
