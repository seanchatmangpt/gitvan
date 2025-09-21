/**
 * Enterprise Command Registry System
 *
 * Provides dynamic registration and management of domains, resources, and actions
 * Supports enterprise-scale command discovery and validation
 */

/**
 * Command Registry for managing enterprise commands
 */
export class CommandRegistry {
  constructor() {
    this._domains = new Map()
    this._resources = new Map()
    this._actions = new Map()
    this._metadata = new Map()
  }

  /**
   * Register a domain
   */
  registerDomain(domainDefinition) {
    const { name, description, resources = [], actions = [], metadata = {} } = domainDefinition

    if (!name) {
      throw new Error('Domain name is required')
    }

    this._domains.set(name, {
      name,
      description,
      resources: new Set(resources),
      actions: new Set(actions),
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return this
  }

  /**
   * Get domain definition
   */
  getDomain(domainName) {
    return this._domains.get(domainName)
  }

  /**
   * List all domains
   */
  listDomains() {
    return Array.from(this._domains.values())
  }

  /**
   * Register a resource within a domain
   */
  registerResource(domainName, resourceDefinition) {
    const {
      name,
      description,
      actions = [],
      attributes = [],
      relationships = [],
      metadata = {},
    } = resourceDefinition

    if (!domainName || !name) {
      throw new Error('Domain name and resource name are required')
    }

    const domain = this._domains.get(domainName)
    if (!domain) {
      throw new Error(`Domain '${domainName}' not found`)
    }

    const resourceKey = `${domainName}:${name}`
    this._resources.set(resourceKey, {
      domain: domainName,
      name,
      description,
      actions: new Set(actions),
      attributes: new Set(attributes),
      relationships: new Set(relationships),
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Update domain resources
    domain.resources.add(name)
    domain.updatedAt = new Date()

    return this
  }

  /**
   * Get resource definition
   */
  getResource(domainName, resourceName) {
    const resourceKey = `${domainName}:${resourceName}`
    return this._resources.get(resourceKey)
  }

  /**
   * List resources for a domain
   */
  listResources(domainName) {
    return Array.from(this._resources.values()).filter((resource) => resource.domain === domainName)
  }

  /**
   * Register an action for a resource
   */
  registerAction(domainName, resourceName, actionDefinition) {
    const { name, description, args = [], options = [], handler, metadata = {} } = actionDefinition

    if (!domainName || !resourceName || !name) {
      throw new Error('Domain name, resource name, and action name are required')
    }

    const resourceKey = `${domainName}:${resourceName}`
    const resource = this._resources.get(resourceKey)
    if (!resource) {
      throw new Error(`Resource '${resourceName}' not found in domain '${domainName}'`)
    }

    const actionKey = `${domainName}:${resourceName}:${name}`
    this._actions.set(actionKey, {
      domain: domainName,
      resource: resourceName,
      name,
      description,
      args: new Set(args),
      options: new Set(options),
      handler,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Update resource actions
    resource.actions.add(name)
    resource.updatedAt = new Date()

    // Update domain actions
    const domain = this._domains.get(domainName)
    if (domain) {
      domain.actions.add(name)
      domain.updatedAt = new Date()
    }

    return this
  }

  /**
   * Get action definition
   */
  getAction(domainName, resourceName, actionName) {
    const actionKey = `${domainName}:${resourceName}:${actionName}`
    return this._actions.get(actionKey)
  }

  /**
   * List actions for a resource
   */
  listActions(domainName, resourceName) {
    return Array.from(this._actions.values()).filter(
      (action) => action.domain === domainName && action.resource === resourceName
    )
  }

  /**
   * Validate command structure
   */
  validateCommand(domainName, resourceName, actionName) {
    const domain = this.getDomain(domainName)
    if (!domain) {
      return { valid: false, error: `Domain '${domainName}' not found` }
    }

    const resource = this.getResource(domainName, resourceName)
    if (!resource) {
      return {
        valid: false,
        error: `Resource '${resourceName}' not found in domain '${domainName}'`,
      }
    }

    const action = this.getAction(domainName, resourceName, actionName)
    if (!action) {
      return {
        valid: false,
        error: `Action '${actionName}' not found for resource '${resourceName}' in domain '${domainName}'`,
      }
    }

    return { valid: true, domain, resource, action }
  }

  /**
   * Discover commands by pattern
   */
  discoverCommands(pattern) {
    const results = []

    for (const [actionKey, action] of this._actions) {
      const [domain, resource, actionName] = actionKey.split(':')

      if (pattern.domain && !domain.includes(pattern.domain)) continue
      if (pattern.resource && !resource.includes(pattern.resource)) continue
      if (pattern.action && !actionName.includes(pattern.action)) continue

      results.push({
        domain,
        resource,
        action: actionName,
        description: action.description,
        metadata: action.metadata,
      })
    }

    return results
  }

  /**
   * Get command statistics
   */
  getStats() {
    return {
      domains: this._domains.size,
      resources: this._resources.size,
      actions: this._actions.size,
      totalCommands: this._actions.size,
    }
  }

  /**
   * Export registry configuration
   */
  export() {
    return {
      domains: Array.from(this._domains.entries()).map(([name, domain]) => ({
        name,
        description: domain.description,
        resources: Array.from(domain.resources),
        actions: Array.from(domain.actions),
        metadata: domain.metadata,
      })),
      resources: Array.from(this._resources.entries()).map(([key, resource]) => ({
        domain: resource.domain,
        name: resource.name,
        description: resource.description,
        actions: Array.from(resource.actions),
        attributes: Array.from(resource.attributes),
        relationships: Array.from(resource.relationships),
        metadata: resource.metadata,
      })),
      actions: Array.from(this._actions.entries()).map(([key, action]) => ({
        domain: action.domain,
        resource: action.resource,
        name: action.name,
        description: action.description,
        args: Array.from(action.args),
        options: Array.from(action.options),
        metadata: action.metadata,
      })),
    }
  }

  /**
   * Import registry configuration
   */
  import(config) {
    // Clear existing registry
    this._domains.clear()
    this._resources.clear()
    this._actions.clear()

    // Import domains
    if (config.domains) {
      config.domains.forEach((domain) => {
        this.registerDomain(domain)
      })
    }

    // Import resources
    if (config.resources) {
      config.resources.forEach((resource) => {
        this.registerResource(resource.domain, resource)
      })
    }

    // Import actions
    if (config.actions) {
      config.actions.forEach((action) => {
        this.registerAction(action.domain, action.resource, action)
      })
    }

    return this
  }
}

/**
 * Default enterprise domains
 */
export const defaultDomains = {
  infra: {
    name: 'infra',
    description: 'Infrastructure and operations management',
    resources: ['server', 'network', 'storage', 'database', 'load-balancer', 'monitoring'],
    actions: [
      'create',
      'list',
      'show',
      'update',
      'delete',
      'backup',
      'restore',
      'scale',
      'configure',
      'restart',
    ],
    metadata: {
      category: 'infrastructure',
      priority: 'high',
      compliance: ['sox', 'pci-dss'],
    },
  },
  dev: {
    name: 'dev',
    description: 'Development and testing operations',
    resources: ['project', 'app', 'test', 'scenario', 'snapshot', 'deployment', 'pipeline'],
    actions: [
      'create',
      'list',
      'show',
      'update',
      'delete',
      'run',
      'deploy',
      'build',
      'test',
      'schedule',
    ],
    metadata: {
      category: 'development',
      priority: 'medium',
      compliance: ['sox'],
    },
  },
  security: {
    name: 'security',
    description: 'Security and compliance management',
    resources: ['user', 'role', 'policy', 'secret', 'certificate', 'audit', 'compliance'],
    actions: [
      'create',
      'list',
      'show',
      'update',
      'delete',
      'audit',
      'validate',
      'enforce',
      'revoke',
    ],
    metadata: {
      category: 'security',
      priority: 'critical',
      compliance: ['sox', 'gdpr', 'hipaa', 'pci-dss'],
    },
  },
  data: {
    name: 'data',
    description: 'Data management and analytics',
    resources: ['database', 'backup', 'migration', 'analytics', 'report', 'dashboard'],
    actions: [
      'create',
      'list',
      'show',
      'update',
      'delete',
      'backup',
      'restore',
      'migrate',
      'analyze',
      'export',
    ],
    metadata: {
      category: 'data',
      priority: 'high',
      compliance: ['sox', 'gdpr', 'hipaa'],
    },
  },
  monitor: {
    name: 'monitor',
    description: 'Monitoring and observability',
    resources: ['alert', 'dashboard', 'metric', 'log', 'trace', 'incident'],
    actions: ['create', 'list', 'show', 'update', 'delete', 'configure', 'trigger', 'resolve'],
    metadata: {
      category: 'monitoring',
      priority: 'medium',
      compliance: ['sox'],
    },
  },
}

/**
 * Default enterprise resources
 */
export const defaultResources = {
  // Infrastructure resources
  'infra:server': {
    name: 'server',
    description: 'Server instances and compute resources',
    actions: ['create', 'list', 'show', 'update', 'delete', 'restart', 'scale', 'configure'],
    attributes: ['type', 'region', 'size', 'status', 'created'],
    relationships: ['network', 'storage', 'monitoring'],
    metadata: {
      category: 'compute',
      lifecycle: 'managed',
    },
  },
  'infra:network': {
    name: 'network',
    description: 'Network infrastructure and connectivity',
    actions: ['create', 'list', 'show', 'update', 'delete', 'configure'],
    attributes: ['cidr', 'region', 'type', 'status', 'created'],
    relationships: ['server', 'security-group'],
    metadata: {
      category: 'networking',
      lifecycle: 'managed',
    },
  },
  'infra:storage': {
    name: 'storage',
    description: 'Storage systems and data persistence',
    actions: ['create', 'list', 'show', 'update', 'delete', 'backup', 'restore'],
    attributes: ['type', 'size', 'region', 'status', 'created'],
    relationships: ['server', 'backup'],
    metadata: {
      category: 'storage',
      lifecycle: 'managed',
    },
  },

  // Development resources
  'dev:project': {
    name: 'project',
    description: 'Development projects and applications',
    actions: ['create', 'list', 'show', 'update', 'delete', 'deploy'],
    attributes: ['name', 'type', 'status', 'created', 'updated'],
    relationships: ['app', 'test', 'deployment'],
    metadata: {
      category: 'project',
      lifecycle: 'development',
    },
  },
  'dev:app': {
    name: 'app',
    description: 'Application instances and services',
    actions: ['create', 'list', 'show', 'update', 'delete', 'deploy', 'build'],
    attributes: ['name', 'version', 'status', 'created', 'updated'],
    relationships: ['project', 'deployment', 'monitoring'],
    metadata: {
      category: 'application',
      lifecycle: 'development',
    },
  },
  'dev:test': {
    name: 'test',
    description: 'Test suites and validation',
    actions: ['create', 'list', 'show', 'update', 'delete', 'run', 'schedule'],
    attributes: ['name', 'type', 'status', 'duration', 'results'],
    relationships: ['project', 'scenario'],
    metadata: {
      category: 'testing',
      lifecycle: 'development',
    },
  },

  // Security resources
  'security:user': {
    name: 'user',
    description: 'User accounts and authentication',
    actions: ['create', 'list', 'show', 'update', 'delete', 'audit'],
    attributes: ['name', 'email', 'role', 'status', 'created', 'last-login'],
    relationships: ['role', 'policy'],
    metadata: {
      category: 'identity',
      lifecycle: 'managed',
    },
  },
  'security:role': {
    name: 'role',
    description: 'Role definitions and permissions',
    actions: ['create', 'list', 'show', 'update', 'delete'],
    attributes: ['name', 'permissions', 'status', 'created'],
    relationships: ['user', 'policy'],
    metadata: {
      category: 'authorization',
      lifecycle: 'managed',
    },
  },
  'security:policy': {
    name: 'policy',
    description: 'Security policies and rules',
    actions: ['create', 'list', 'show', 'update', 'delete', 'validate'],
    attributes: ['name', 'type', 'status', 'created', 'updated'],
    relationships: ['user', 'role'],
    metadata: {
      category: 'policy',
      lifecycle: 'managed',
    },
  },
}

/**
 * Create a pre-configured enterprise registry
 */
export function createEnterpriseRegistry() {
  const registry = new CommandRegistry()

  // Register default domains
  Object.values(defaultDomains).forEach((domain) => {
    registry.registerDomain(domain)
  })

  // Register default resources
  Object.entries(defaultResources).forEach(([key, resource]) => {
    const [domain, resourceName] = key.split(':')
    registry.registerResource(domain, resource)
  })

  return registry
}

/**
 * Global registry instance
 */
export const globalRegistry = createEnterpriseRegistry()

export default CommandRegistry
