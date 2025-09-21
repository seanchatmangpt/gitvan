/**
 * Test file for Enterprise Command Builder System
 * 
 * Tests the basic functionality of the command builder, registry, and context management.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { 
  command, 
  domain, 
  resource, 
  buildCommand,
  commandRegistry,
  contextManager,
  initializeEnterpriseRegistry,
  initializeEnterpriseContext
} from '../../src/index.js'

describe('Enterprise Command Builder System', () => {
  beforeAll(async () => {
    // Initialize enterprise registry and context
    initializeEnterpriseRegistry()
    initializeEnterpriseContext()
  })

  afterAll(async () => {
    // Clean up
    commandRegistry.clear()
    await contextManager.clearContext()
  })

  describe('Command Builder', () => {
    it('should create a command with domain, resource, and action', () => {
      const cmd = command('infra', 'server', 'create')
      const built = cmd.build()
      
      expect(built.domain).toBe('infra')
      expect(built.resource).toBe('server')
      expect(built.action).toBe('create')
      expect(built.id).toBeDefined()
      expect(built.args).toEqual({})
      expect(built.options).toEqual({})
    })

    it('should add arguments to command', () => {
      const cmd = command('infra', 'server', 'create')
        .arg('type', 'web')
        .arg('region', 'us-east-1')
      
      const built = cmd.build()
      
      expect(built.args.type).toBe('web')
      expect(built.args.region).toBe('us-east-1')
    })

    it('should add options to command', () => {
      const cmd = command('infra', 'server', 'create')
        .option('size', 'large')
        .option('backup', true)
      
      const built = cmd.build()
      
      expect(built.options.size).toBe('large')
      expect(built.options.backup).toBe(true)
    })

    it('should add context to command', () => {
      const context = {
        id: 'test-context',
        project: 'test-project',
        environment: 'staging',
        permissions: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const cmd = command('infra', 'server', 'create')
        .context(context)
      
      const built = cmd.build()
      
      expect(built.context).toEqual(context)
    })

    it('should build command arguments correctly', () => {
      const cmd = command('infra', 'server', 'create')
        .arg('type', 'web')
        .option('size', 'large')
        .option('backup', true)
      
      const built = cmd.build()
      
      // Test command serialization to args
      const { CommandSerializer } = await import('../../src/command-builder.js')
      const args = CommandSerializer.toArgs(built)
      
      expect(args).toContain('infra')
      expect(args).toContain('server')
      expect(args).toContain('create')
      expect(args).toContain('--type')
      expect(args).toContain('web')
      expect(args).toContain('--size')
      expect(args).toContain('large')
      expect(args).toContain('--backup')
    })
  })

  describe('Domain Builder', () => {
    it('should create domain-first command', () => {
      const cmd = domain('infra')
        .resource('server')
        .action('create')
      
      const built = cmd.build()
      
      expect(built.domain).toBe('infra')
      expect(built.resource).toBe('server')
      expect(built.action).toBe('create')
    })

    it('should use convenience methods for common actions', () => {
      const cmd = domain('infra')
        .resource('server')
        .create()
      
      const built = cmd.build()
      
      expect(built.domain).toBe('infra')
      expect(built.resource).toBe('server')
      expect(built.action).toBe('create')
    })
  })

  describe('Resource Builder', () => {
    it('should create resource-first command', () => {
      const cmd = resource('infra', 'server')
        .action('create')
      
      const built = cmd.build()
      
      expect(built.domain).toBe('infra')
      expect(built.resource).toBe('server')
      expect(built.action).toBe('create')
    })

    it('should use convenience methods for common actions', () => {
      const cmd = resource('infra', 'server')
        .list()
      
      const built = cmd.build()
      
      expect(built.domain).toBe('infra')
      expect(built.resource).toBe('server')
      expect(built.action).toBe('list')
    })
  })

  describe('Command Registry', () => {
    it('should register and retrieve domains', () => {
      const domains = commandRegistry.listDomains()
      
      expect(domains.length).toBeGreaterThan(0)
      expect(domains.some(d => d.name === 'infra')).toBe(true)
      expect(domains.some(d => d.name === 'dev')).toBe(true)
      expect(domains.some(d => d.name === 'security')).toBe(true)
    })

    it('should register and retrieve resources', () => {
      const infraResources = commandRegistry.listResources('infra')
      
      expect(infraResources.length).toBeGreaterThan(0)
      expect(infraResources.some(r => r.name === 'server')).toBe(true)
    })

    it('should register and retrieve actions', () => {
      const serverActions = commandRegistry.listActions('infra', 'server')
      
      expect(serverActions.length).toBeGreaterThan(0)
      expect(serverActions.some(a => a.name === 'create')).toBe(true)
      expect(serverActions.some(a => a.name === 'list')).toBe(true)
      expect(serverActions.some(a => a.name === 'show')).toBe(true)
    })

    it('should discover all commands', () => {
      const commands = commandRegistry.discoverCommands()
      
      expect(commands.length).toBeGreaterThan(0)
      expect(commands.some(c => c.domain === 'infra' && c.resource === 'server' && c.action === 'create')).toBe(true)
    })

    it('should find commands by query', () => {
      const infraCommands = commandRegistry.findCommands({ domain: 'infra' })
      
      expect(infraCommands.length).toBeGreaterThan(0)
      expect(infraCommands.every(c => c.domain === 'infra')).toBe(true)
    })

    it('should validate commands', () => {
      const validation = commandRegistry.validateCommand('infra', 'server', 'create')
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should return validation errors for invalid commands', () => {
      const validation = commandRegistry.validateCommand('invalid', 'server', 'create')
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should get registry statistics', () => {
      const stats = commandRegistry.getStats()
      
      expect(stats.domainCount).toBeGreaterThan(0)
      expect(stats.resourceCount).toBeGreaterThan(0)
      expect(stats.actionCount).toBeGreaterThan(0)
      expect(stats.totalCommands).toBeGreaterThan(0)
    })
  })

  describe('Context Manager', () => {
    it('should set and get context', async () => {
      const context = {
        id: 'test-context',
        project: 'test-project',
        environment: 'staging',
        permissions: [
          { resource: 'server', actions: ['create', 'list'] }
        ],
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await contextManager.setContext(context)
      const retrieved = await contextManager.getContext()
      
      expect(retrieved).toEqual(context)
    })

    it('should validate context', async () => {
      const context = {
        id: 'test-context',
        project: 'test-project',
        environment: 'staging',
        permissions: [
          { resource: 'server', actions: ['create', 'list'] }
        ],
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const validation = contextManager.validateContext(context)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should validate permissions', async () => {
      const context = {
        id: 'test-context',
        project: 'test-project',
        environment: 'staging',
        permissions: [
          { resource: 'server', actions: ['create', 'list'] }
        ],
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const validation = contextManager.validatePermissions(context, 'server', 'create')
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should return permission errors for invalid permissions', async () => {
      const context = {
        id: 'test-context',
        project: 'test-project',
        environment: 'staging',
        permissions: [
          { resource: 'server', actions: ['create', 'list'] }
        ],
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const validation = contextManager.validatePermissions(context, 'server', 'delete')
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should create and manage workspaces', async () => {
      const workspace = await contextManager.createWorkspace('test-workspace', {
        name: 'test-workspace',
        description: 'Test workspace',
        domains: ['infra', 'dev'],
        resources: ['server', 'project'],
        permissions: [
          { resource: 'server', actions: ['create', 'list'] }
        ]
      })
      
      expect(workspace.name).toBe('test-workspace')
      expect(workspace.domains).toContain('infra')
      expect(workspace.domains).toContain('dev')
      
      const workspaces = await contextManager.listWorkspaces()
      expect(workspaces.length).toBeGreaterThan(0)
      
      await contextManager.deleteWorkspace('test-workspace')
    })

    it('should export context to environment variables', async () => {
      const context = {
        id: 'test-context',
        project: 'test-project',
        environment: 'staging',
        region: 'us-east-1',
        permissions: [
          { resource: 'server', actions: ['create', 'list'] }
        ],
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const envVars = contextManager.exportContextToEnvVars(context)
      
      expect(envVars.ENTERPRISE_PROJECT).toBe('test-project')
      expect(envVars.ENTERPRISE_ENVIRONMENT).toBe('staging')
      expect(envVars.ENTERPRISE_REGION).toBe('us-east-1')
    })
  })

  describe('Integration', () => {
    it('should build and execute enterprise command', async () => {
      // Set enterprise context
      const context = {
        id: 'test-context',
        project: 'test-project',
        environment: 'staging',
        permissions: [
          { resource: 'server', actions: ['create', 'list'] }
        ],
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await contextManager.setContext(context)
      
      // Build enterprise command
      const cmd = command('infra', 'server', 'create')
        .arg('type', 'web')
        .option('size', 'large')
        .context(context)
      
      const built = cmd.build()
      
      expect(built.domain).toBe('infra')
      expect(built.resource).toBe('server')
      expect(built.action).toBe('create')
      expect(built.args.type).toBe('web')
      expect(built.options.size).toBe('large')
      expect(built.context).toEqual(context)
    })
  })
})
