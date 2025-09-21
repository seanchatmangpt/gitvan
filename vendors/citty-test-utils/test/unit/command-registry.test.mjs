/**
 * Enterprise Command Registry System Tests
 *
 * Tests the dynamic registration and management of domains, resources, and actions
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  CommandRegistry,
  createEnterpriseRegistry,
  globalRegistry,
  defaultDomains,
  defaultResources,
} from '../../src/command-registry.js'

describe('Enterprise Command Registry System', () => {
  let registry

  beforeEach(() => {
    registry = new CommandRegistry()
  })

  describe('CommandRegistry', () => {
    it('should create a new registry instance', () => {
      expect(registry).toBeInstanceOf(CommandRegistry)
      expect(registry._domains).toBeInstanceOf(Map)
      expect(registry._resources).toBeInstanceOf(Map)
      expect(registry._actions).toBeInstanceOf(Map)
    })

    describe('Domain Management', () => {
      it('should register a domain', () => {
        const domainDef = {
          name: 'infra',
          description: 'Infrastructure management',
          resources: ['server', 'network'],
          actions: ['create', 'list', 'show'],
        }

        registry.registerDomain(domainDef)
        const domain = registry.getDomain('infra')

        expect(domain).toBeDefined()
        expect(domain.name).toBe('infra')
        expect(domain.description).toBe('Infrastructure management')
        expect(domain.resources).toBeInstanceOf(Set)
        expect(domain.resources.has('server')).toBe(true)
        expect(domain.resources.has('network')).toBe(true)
        expect(domain.actions).toBeInstanceOf(Set)
        expect(domain.actions.has('create')).toBe(true)
        expect(domain.createdAt).toBeInstanceOf(Date)
      })

      it('should throw error when registering domain without name', () => {
        expect(() => {
          registry.registerDomain({ description: 'Test domain' })
        }).toThrow('Domain name is required')
      })

      it('should get domain by name', () => {
        registry.registerDomain({
          name: 'dev',
          description: 'Development operations',
        })

        const domain = registry.getDomain('dev')
        expect(domain.name).toBe('dev')
        expect(domain.description).toBe('Development operations')
      })

      it('should return undefined for non-existent domain', () => {
        const domain = registry.getDomain('non-existent')
        expect(domain).toBeUndefined()
      })

      it('should list all domains', () => {
        registry.registerDomain({ name: 'infra', description: 'Infrastructure' })
        registry.registerDomain({ name: 'dev', description: 'Development' })

        const domains = registry.listDomains()
        expect(domains).toHaveLength(2)
        expect(domains.map((d) => d.name)).toContain('infra')
        expect(domains.map((d) => d.name)).toContain('dev')
      })
    })

    describe('Resource Management', () => {
      beforeEach(() => {
        registry.registerDomain({
          name: 'infra',
          description: 'Infrastructure management',
        })
      })

      it('should register a resource within a domain', () => {
        const resourceDef = {
          name: 'server',
          description: 'Server instances',
          actions: ['create', 'list', 'show'],
          attributes: ['type', 'region', 'size'],
          relationships: ['network', 'storage'],
        }

        registry.registerResource('infra', resourceDef)
        const resource = registry.getResource('infra', 'server')

        expect(resource).toBeDefined()
        expect(resource.domain).toBe('infra')
        expect(resource.name).toBe('server')
        expect(resource.description).toBe('Server instances')
        expect(resource.actions).toBeInstanceOf(Set)
        expect(resource.actions.has('create')).toBe(true)
        expect(resource.attributes).toBeInstanceOf(Set)
        expect(resource.attributes.has('type')).toBe(true)
        expect(resource.relationships).toBeInstanceOf(Set)
        expect(resource.relationships.has('network')).toBe(true)
      })

      it('should throw error when registering resource without domain', () => {
        expect(() => {
          registry.registerResource(null, { name: 'server' })
        }).toThrow('Domain name and resource name are required')
      })

      it('should throw error when registering resource in non-existent domain', () => {
        expect(() => {
          registry.registerResource('non-existent', { name: 'server' })
        }).toThrow("Domain 'non-existent' not found")
      })

      it('should update domain resources when registering resource', () => {
        registry.registerResource('infra', { name: 'server' })
        const domain = registry.getDomain('infra')

        expect(domain.resources.has('server')).toBe(true)
      })

      it('should get resource by domain and name', () => {
        registry.registerResource('infra', {
          name: 'server',
          description: 'Server instances',
        })

        const resource = registry.getResource('infra', 'server')
        expect(resource.name).toBe('server')
        expect(resource.domain).toBe('infra')
      })

      it('should return undefined for non-existent resource', () => {
        const resource = registry.getResource('infra', 'non-existent')
        expect(resource).toBeUndefined()
      })

      it('should list resources for a domain', () => {
        registry.registerResource('infra', { name: 'server' })
        registry.registerResource('infra', { name: 'network' })

        const resources = registry.listResources('infra')
        expect(resources).toHaveLength(2)
        expect(resources.map((r) => r.name)).toContain('server')
        expect(resources.map((r) => r.name)).toContain('network')
      })
    })

    describe('Action Management', () => {
      beforeEach(() => {
        registry.registerDomain({
          name: 'infra',
          description: 'Infrastructure management',
        })
        registry.registerResource('infra', {
          name: 'server',
          description: 'Server instances',
        })
      })

      it('should register an action for a resource', () => {
        const actionDef = {
          name: 'create',
          description: 'Create a new server',
          args: ['--type', '--region'],
          options: ['--verbose', '--dry-run'],
          handler: () => {},
          metadata: { category: 'crud' },
        }

        registry.registerAction('infra', 'server', actionDef)
        const action = registry.getAction('infra', 'server', 'create')

        expect(action).toBeDefined()
        expect(action.domain).toBe('infra')
        expect(action.resource).toBe('server')
        expect(action.name).toBe('create')
        expect(action.description).toBe('Create a new server')
        expect(action.args).toBeInstanceOf(Set)
        expect(action.args.has('--type')).toBe(true)
        expect(action.options).toBeInstanceOf(Set)
        expect(action.options.has('--verbose')).toBe(true)
        expect(action.handler).toBeInstanceOf(Function)
        expect(action.metadata).toEqual({ category: 'crud' })
      })

      it('should throw error when registering action without required fields', () => {
        expect(() => {
          registry.registerAction('infra', 'server', { description: 'Test action' })
        }).toThrow('Domain name, resource name, and action name are required')
      })

      it('should throw error when registering action for non-existent resource', () => {
        expect(() => {
          registry.registerAction('infra', 'non-existent', { name: 'create' })
        }).toThrow("Resource 'non-existent' not found in domain 'infra'")
      })

      it('should update resource actions when registering action', () => {
        registry.registerAction('infra', 'server', { name: 'create' })
        const resource = registry.getResource('infra', 'server')

        expect(resource.actions.has('create')).toBe(true)
      })

      it('should update domain actions when registering action', () => {
        registry.registerAction('infra', 'server', { name: 'create' })
        const domain = registry.getDomain('infra')

        expect(domain.actions.has('create')).toBe(true)
      })

      it('should get action by domain, resource, and name', () => {
        registry.registerAction('infra', 'server', {
          name: 'create',
          description: 'Create server',
        })

        const action = registry.getAction('infra', 'server', 'create')
        expect(action.name).toBe('create')
        expect(action.domain).toBe('infra')
        expect(action.resource).toBe('server')
      })

      it('should return undefined for non-existent action', () => {
        const action = registry.getAction('infra', 'server', 'non-existent')
        expect(action).toBeUndefined()
      })

      it('should list actions for a resource', () => {
        registry.registerAction('infra', 'server', { name: 'create' })
        registry.registerAction('infra', 'server', { name: 'list' })

        const actions = registry.listActions('infra', 'server')
        expect(actions).toHaveLength(2)
        expect(actions.map((a) => a.name)).toContain('create')
        expect(actions.map((a) => a.name)).toContain('list')
      })
    })

    describe('Command Validation', () => {
      beforeEach(() => {
        registry.registerDomain({
          name: 'infra',
          description: 'Infrastructure management',
        })
        registry.registerResource('infra', {
          name: 'server',
          description: 'Server instances',
        })
        registry.registerAction('infra', 'server', {
          name: 'create',
          description: 'Create server',
        })
      })

      it('should validate valid command', () => {
        const result = registry.validateCommand('infra', 'server', 'create')

        expect(result.valid).toBe(true)
        expect(result.domain).toBeDefined()
        expect(result.resource).toBeDefined()
        expect(result.action).toBeDefined()
      })

      it('should reject invalid domain', () => {
        const result = registry.validateCommand('non-existent', 'server', 'create')

        expect(result.valid).toBe(false)
        expect(result.error).toBe("Domain 'non-existent' not found")
      })

      it('should reject invalid resource', () => {
        const result = registry.validateCommand('infra', 'non-existent', 'create')

        expect(result.valid).toBe(false)
        expect(result.error).toBe("Resource 'non-existent' not found in domain 'infra'")
      })

      it('should reject invalid action', () => {
        const result = registry.validateCommand('infra', 'server', 'non-existent')

        expect(result.valid).toBe(false)
        expect(result.error).toBe(
          "Action 'non-existent' not found for resource 'server' in domain 'infra'"
        )
      })
    })

    describe('Command Discovery', () => {
      beforeEach(() => {
        registry.registerDomain({ name: 'infra', description: 'Infrastructure' })
        registry.registerResource('infra', { name: 'server' })
        registry.registerResource('infra', { name: 'network' })
        registry.registerAction('infra', 'server', { name: 'create' })
        registry.registerAction('infra', 'server', { name: 'list' })
        registry.registerAction('infra', 'network', { name: 'create' })
      })

      it('should discover commands by domain pattern', () => {
        const results = registry.discoverCommands({ domain: 'infra' })

        expect(results).toHaveLength(3)
        expect(results.every((r) => r.domain === 'infra')).toBe(true)
      })

      it('should discover commands by resource pattern', () => {
        const results = registry.discoverCommands({ resource: 'server' })

        expect(results).toHaveLength(2)
        expect(results.every((r) => r.resource === 'server')).toBe(true)
      })

      it('should discover commands by action pattern', () => {
        const results = registry.discoverCommands({ action: 'create' })

        expect(results).toHaveLength(2)
        expect(results.every((r) => r.action === 'create')).toBe(true)
      })

      it('should discover commands by multiple patterns', () => {
        const results = registry.discoverCommands({
          domain: 'infra',
          action: 'create',
        })

        expect(results).toHaveLength(2)
        expect(results.every((r) => r.domain === 'infra' && r.action === 'create')).toBe(true)
      })
    })

    describe('Statistics', () => {
      it('should provide registry statistics', () => {
        registry.registerDomain({ name: 'infra' })
        registry.registerResource('infra', { name: 'server' })
        registry.registerAction('infra', 'server', { name: 'create' })

        const stats = registry.getStats()
        expect(stats.domains).toBe(1)
        expect(stats.resources).toBe(1)
        expect(stats.actions).toBe(1)
        expect(stats.totalCommands).toBe(1)
      })
    })

    describe('Export/Import', () => {
      it('should export registry configuration', () => {
        registry.registerDomain({
          name: 'infra',
          description: 'Infrastructure',
          resources: ['server'],
          actions: ['create'],
        })
        registry.registerResource('infra', {
          name: 'server',
          description: 'Server instances',
          actions: ['create'],
          attributes: ['type'],
          relationships: ['network'],
        })
        registry.registerAction('infra', 'server', {
          name: 'create',
          description: 'Create server',
          args: ['--type'],
          options: ['--verbose'],
        })

        const exported = registry.export()
        expect(exported.domains).toHaveLength(1)
        expect(exported.resources).toHaveLength(1)
        expect(exported.actions).toHaveLength(1)
        expect(exported.domains[0].name).toBe('infra')
        expect(exported.resources[0].name).toBe('server')
        expect(exported.actions[0].name).toBe('create')
      })

      it('should import registry configuration', () => {
        const config = {
          domains: [
            {
              name: 'dev',
              description: 'Development',
              resources: ['project'],
              actions: ['create'],
            },
          ],
          resources: [
            {
              domain: 'dev',
              name: 'project',
              description: 'Project instances',
              actions: ['create'],
              attributes: ['name'],
              relationships: ['app'],
            },
          ],
          actions: [
            {
              domain: 'dev',
              resource: 'project',
              name: 'create',
              description: 'Create project',
              args: ['--name'],
              options: ['--verbose'],
            },
          ],
        }

        registry.import(config)

        expect(registry.getDomain('dev')).toBeDefined()
        expect(registry.getResource('dev', 'project')).toBeDefined()
        expect(registry.getAction('dev', 'project', 'create')).toBeDefined()
      })
    })
  })

  describe('Default Enterprise Registry', () => {
    it('should create enterprise registry with default domains', () => {
      const enterpriseRegistry = createEnterpriseRegistry()

      expect(enterpriseRegistry.getDomain('infra')).toBeDefined()
      expect(enterpriseRegistry.getDomain('dev')).toBeDefined()
      expect(enterpriseRegistry.getDomain('security')).toBeDefined()
      expect(enterpriseRegistry.getDomain('data')).toBeDefined()
      expect(enterpriseRegistry.getDomain('monitor')).toBeDefined()
    })

    it('should create enterprise registry with default resources', () => {
      const enterpriseRegistry = createEnterpriseRegistry()

      expect(enterpriseRegistry.getResource('infra', 'server')).toBeDefined()
      expect(enterpriseRegistry.getResource('infra', 'network')).toBeDefined()
      expect(enterpriseRegistry.getResource('dev', 'project')).toBeDefined()
      expect(enterpriseRegistry.getResource('security', 'user')).toBeDefined()
    })

    it('should have global registry instance', () => {
      expect(globalRegistry).toBeInstanceOf(CommandRegistry)
      expect(globalRegistry.getDomain('infra')).toBeDefined()
    })
  })

  describe('Default Domains and Resources', () => {
    it('should have default domains defined', () => {
      expect(defaultDomains.infra).toBeDefined()
      expect(defaultDomains.dev).toBeDefined()
      expect(defaultDomains.security).toBeDefined()
      expect(defaultDomains.data).toBeDefined()
      expect(defaultDomains.monitor).toBeDefined()
    })

    it('should have default resources defined', () => {
      expect(defaultResources['infra:server']).toBeDefined()
      expect(defaultResources['infra:network']).toBeDefined()
      expect(defaultResources['dev:project']).toBeDefined()
      expect(defaultResources['security:user']).toBeDefined()
    })

    it('should have proper domain structure', () => {
      const infraDomain = defaultDomains.infra
      expect(infraDomain.name).toBe('infra')
      expect(infraDomain.description).toBeDefined()
      expect(infraDomain.resources).toBeInstanceOf(Array)
      expect(infraDomain.actions).toBeInstanceOf(Array)
      expect(infraDomain.metadata).toBeDefined()
    })

    it('should have proper resource structure', () => {
      const serverResource = defaultResources['infra:server']
      expect(serverResource.name).toBe('server')
      expect(serverResource.description).toBeDefined()
      expect(serverResource.actions).toBeInstanceOf(Array)
      expect(serverResource.attributes).toBeInstanceOf(Array)
      expect(serverResource.relationships).toBeInstanceOf(Array)
      expect(serverResource.metadata).toBeDefined()
    })
  })
})
