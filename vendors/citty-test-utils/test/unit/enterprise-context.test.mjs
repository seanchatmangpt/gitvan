/**
 * Enterprise Context Management System Tests
 * 
 * Tests enterprise context and workspace management for CLI testing
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { 
  EnterpriseContext, 
  EnterpriseWorkspace, 
  EnterpriseContextManager,
  globalContextManager,
  contextUtils 
} from '../../src/enterprise-context.js'

describe('Enterprise Context Management System', () => {
  let context, workspace, manager

  beforeEach(() => {
    context = new EnterpriseContext()
    manager = new EnterpriseContextManager()
    manager.clearAll()
  })

  describe('EnterpriseContext', () => {
    it('should create a new context instance', () => {
      expect(context).toBeInstanceOf(EnterpriseContext)
      expect(context.domain).toBeNull()
      expect(context.project).toBeNull()
      expect(context.environment).toBe('development')
      expect(context.region).toBe('us-east-1')
      expect(context.user).toBe('test-user')
      expect(context.role).toBe('admin')
      expect(context.workspace).toBe('default')
    })

    it('should create context with initial data', () => {
      const contextData = {
        domain: 'infra',
        project: 'my-project',
        environment: 'staging',
        region: 'us-west-2',
        compliance: 'sox',
        user: 'admin',
        role: 'admin',
        workspace: 'prod',
        tenant: 'enterprise',
        metadata: { version: '1.0' }
      }

      const customContext = new EnterpriseContext(contextData)
      expect(customContext.domain).toBe('infra')
      expect(customContext.project).toBe('my-project')
      expect(customContext.environment).toBe('staging')
      expect(customContext.region).toBe('us-west-2')
      expect(customContext.compliance).toBe('sox')
      expect(customContext.user).toBe('admin')
      expect(customContext.role).toBe('admin')
      expect(customContext.workspace).toBe('prod')
      expect(customContext.tenant).toBe('enterprise')
      expect(customContext.metadata).toEqual({ version: '1.0' })
    })

    describe('Setters', () => {
      it('should set domain', () => {
        const result = context.setDomain('infra')
        expect(result).toBe(context)
        expect(context.domain).toBe('infra')
        expect(context.updatedAt).toBeInstanceOf(Date)
      })

      it('should set project', () => {
        const result = context.setProject('my-project')
        expect(result).toBe(context)
        expect(context.project).toBe('my-project')
      })

      it('should set environment', () => {
        const result = context.setEnvironment('production')
        expect(result).toBe(context)
        expect(context.environment).toBe('production')
      })

      it('should set region', () => {
        const result = context.setRegion('eu-west-1')
        expect(result).toBe(context)
        expect(context.region).toBe('eu-west-1')
      })

      it('should set compliance', () => {
        const result = context.setCompliance('gdpr')
        expect(result).toBe(context)
        expect(context.compliance).toBe('gdpr')
      })

      it('should set user', () => {
        const result = context.setUser('john.doe')
        expect(result).toBe(context)
        expect(context.user).toBe('john.doe')
      })

      it('should set role', () => {
        const result = context.setRole('developer')
        expect(result).toBe(context)
        expect(context.role).toBe('developer')
      })

      it('should set workspace', () => {
        const result = context.setWorkspace('dev-workspace')
        expect(result).toBe(context)
        expect(context.workspace).toBe('dev-workspace')
      })

      it('should set tenant', () => {
        const result = context.setTenant('tenant-001')
        expect(result).toBe(context)
        expect(context.tenant).toBe('tenant-001')
      })

      it('should set metadata', () => {
        const metadata = { version: '2.0', team: 'backend' }
        const result = context.setMetadata(metadata)
        expect(result).toBe(context)
        expect(context.metadata).toEqual(metadata)
      })

      it('should merge metadata', () => {
        context.setMetadata({ version: '1.0' })
        context.setMetadata({ team: 'backend' })
        expect(context.metadata).toEqual({ version: '1.0', team: 'backend' })
      })
    })

    describe('Cloning', () => {
      it('should clone context', () => {
        context.setDomain('infra').setProject('my-project')
        const cloned = context.clone()
        
        expect(cloned).toBeInstanceOf(EnterpriseContext)
        expect(cloned.domain).toBe('infra')
        expect(cloned.project).toBe('my-project')
        expect(cloned).not.toBe(context)
      })

      it('should clone context with overrides', () => {
        context.setDomain('infra').setProject('my-project')
        const cloned = context.clone({ 
          environment: 'production',
          region: 'eu-west-1'
        })
        
        expect(cloned.domain).toBe('infra')
        expect(cloned.project).toBe('my-project')
        expect(cloned.environment).toBe('production')
        expect(cloned.region).toBe('eu-west-1')
      })
    })

    describe('Command Arguments', () => {
      it('should convert to command arguments', () => {
        context
          .setProject('my-project')
          .setEnvironment('staging')
          .setRegion('us-east-1')
          .setCompliance('sox')
          .setUser('admin')
          .setRole('admin')
          .setWorkspace('prod')
          .setTenant('enterprise')

        const args = context.toCommandArgs()
        expect(args).toEqual([
          '--project', 'my-project',
          '--environment', 'staging',
          '--compliance', 'sox',
          '--user', 'admin',
          '--workspace', 'prod',
          '--tenant', 'enterprise'
        ])
      })

      it('should only include non-null values in command arguments', () => {
        context.setProject('my-project')
        const args = context.toCommandArgs()
        expect(args).toEqual(['--project', 'my-project'])
      })
    })

    describe('Environment Variables', () => {
      it('should convert to environment variables', () => {
        context
          .setDomain('infra')
          .setProject('my-project')
          .setEnvironment('staging')
          .setRegion('us-east-1')
          .setCompliance('sox')
          .setUser('admin')
          .setRole('admin')
          .setWorkspace('prod')
          .setTenant('enterprise')
          .setMetadata({ version: '1.0' })

        const envVars = context.toEnvVars()
        expect(envVars).toEqual({
          ENTERPRISE_DOMAIN: 'infra',
          ENTERPRISE_PROJECT: 'my-project',
          ENTERPRISE_ENVIRONMENT: 'staging',
          ENTERPRISE_REGION: 'us-east-1',
          ENTERPRISE_COMPLIANCE: 'sox',
          ENTERPRISE_USER: 'admin',
          ENTERPRISE_ROLE: 'admin',
          ENTERPRISE_WORKSPACE: 'prod',
          ENTERPRISE_TENANT: 'enterprise',
          version: '1.0'
        })
      })
    })

    describe('Serialization', () => {
      it('should serialize to JSON', () => {
        context
          .setDomain('infra')
          .setProject('my-project')
          .setMetadata({ version: '1.0' })

        const json = context.toJSON()
        expect(json.domain).toBe('infra')
        expect(json.project).toBe('my-project')
        expect(json.metadata).toEqual({ version: '1.0' })
        expect(json.createdAt).toBeInstanceOf(Date)
        expect(json.updatedAt).toBeInstanceOf(Date)
      })

      it('should create from JSON', () => {
        const json = {
          domain: 'infra',
          project: 'my-project',
          metadata: { version: '1.0' }
        }

        const contextFromJson = EnterpriseContext.fromJSON(json)
        expect(contextFromJson).toBeInstanceOf(EnterpriseContext)
        expect(contextFromJson.domain).toBe('infra')
        expect(contextFromJson.project).toBe('my-project')
        expect(contextFromJson.metadata).toEqual({ version: '1.0' })
      })
    })
  })

  describe('EnterpriseWorkspace', () => {
    beforeEach(() => {
      workspace = new EnterpriseWorkspace({
        name: 'test-workspace',
        description: 'Test workspace',
        domains: ['infra', 'dev'],
        resources: ['server', 'project'],
        permissions: [
          { resource: 'server', actions: ['create', 'list', 'show'] },
          { resource: 'project', actions: ['create', 'deploy'] }
        ],
        context: new EnterpriseContext({ project: 'test-project' }),
        metadata: { team: 'backend' }
      })
    })

    it('should create a new workspace instance', () => {
      expect(workspace).toBeInstanceOf(EnterpriseWorkspace)
      expect(workspace.name).toBe('test-workspace')
      expect(workspace.description).toBe('Test workspace')
      expect(workspace.domains).toEqual(['infra', 'dev'])
      expect(workspace.resources).toEqual(['server', 'project'])
      expect(workspace.permissions).toHaveLength(2)
      expect(workspace.context).toBeInstanceOf(EnterpriseContext)
      expect(workspace.metadata).toEqual({ team: 'backend' })
    })

    it('should generate unique ID', () => {
      const workspace1 = new EnterpriseWorkspace({ name: 'ws1' })
      const workspace2 = new EnterpriseWorkspace({ name: 'ws2' })
      expect(workspace1.id).not.toBe(workspace2.id)
    })

    describe('Domain Management', () => {
      it('should add domain to workspace', () => {
        const result = workspace.addDomain('security')
        expect(result).toBe(workspace)
        expect(workspace.domains).toContain('security')
      })

      it('should remove domain from workspace', () => {
        const result = workspace.removeDomain('infra')
        expect(result).toBe(workspace)
        expect(workspace.domains).not.toContain('infra')
        expect(workspace.domains).toContain('dev')
      })
    })

    describe('Resource Management', () => {
      it('should add resource to workspace', () => {
        const result = workspace.addResource('user')
        expect(result).toBe(workspace)
        expect(workspace.resources).toContain('user')
      })

      it('should remove resource from workspace', () => {
        const result = workspace.removeResource('server')
        expect(result).toBe(workspace)
        expect(workspace.resources).not.toContain('server')
        expect(workspace.resources).toContain('project')
      })
    })

    describe('Permission Management', () => {
      it('should add permission to workspace', () => {
        const permission = { resource: 'user', actions: ['create', 'list'] }
        const result = workspace.addPermission(permission)
        expect(result).toBe(workspace)
        expect(workspace.permissions).toContain(permission)
      })

      it('should remove permission from workspace', () => {
        const permission = workspace.permissions[0]
        const result = workspace.removePermission(permission)
        expect(result).toBe(workspace)
        expect(workspace.permissions).not.toContain(permission)
      })

      it('should check if workspace has permission', () => {
        expect(workspace.hasPermission('server', 'create')).toBe(true)
        expect(workspace.hasPermission('server', 'delete')).toBe(false)
        expect(workspace.hasPermission('project', 'deploy')).toBe(true)
        expect(workspace.hasPermission('user', 'create')).toBe(false)
      })
    })

    describe('Context Management', () => {
      it('should update workspace context', () => {
        const result = workspace.updateContext({
          environment: 'production',
          region: 'eu-west-1'
        })
        expect(result).toBe(workspace)
        expect(workspace.context.environment).toBe('production')
        expect(workspace.context.region).toBe('eu-west-1')
      })
    })

    describe('Serialization', () => {
      it('should serialize to JSON', () => {
        const json = workspace.toJSON()
        expect(json.name).toBe('test-workspace')
        expect(json.description).toBe('Test workspace')
        expect(json.domains).toEqual(['infra', 'dev'])
        expect(json.resources).toEqual(['server', 'project'])
        expect(json.permissions).toHaveLength(2)
        expect(json.context).toBeDefined()
        expect(json.metadata).toEqual({ team: 'backend' })
        expect(json.createdAt).toBeInstanceOf(Date)
        expect(json.updatedAt).toBeInstanceOf(Date)
      })
    })
  })

  describe('EnterpriseContextManager', () => {
    it('should create a new context manager instance', () => {
      expect(manager).toBeInstanceOf(EnterpriseContextManager)
      expect(manager.getCurrentContext()).toBeInstanceOf(EnterpriseContext)
      expect(manager._workspaces).toBeInstanceOf(Map)
      expect(manager._contextHistory).toEqual([])
    })

    describe('Context Management', () => {
      it('should get current context', () => {
        const currentContext = manager.getCurrentContext()
        expect(currentContext).toBeInstanceOf(EnterpriseContext)
      })

      it('should set context from object', () => {
        const contextData = {
          domain: 'infra',
          project: 'my-project',
          environment: 'staging'
        }
        
        const result = manager.setContext(contextData)
        expect(result).toBeInstanceOf(EnterpriseContext)
        expect(result.domain).toBe('infra')
        expect(result.project).toBe('my-project')
        expect(result.environment).toBe('staging')
      })

      it('should set context from EnterpriseContext instance', () => {
        const contextInstance = new EnterpriseContext({
          domain: 'dev',
          project: 'test-project'
        })
        
        const result = manager.setContext(contextInstance)
        expect(result).toBe(contextInstance)
      })

      it('should update current context', () => {
        manager.setContext({ domain: 'infra' })
        const result = manager.updateContext({
          project: 'my-project',
          environment: 'staging'
        })
        
        expect(result.domain).toBe('infra')
        expect(result.project).toBe('my-project')
        expect(result.environment).toBe('staging')
      })

      it('should clear current context', () => {
        manager.setContext({ domain: 'infra', project: 'my-project' })
        const result = manager.clearContext()
        
        expect(result).toBeInstanceOf(EnterpriseContext)
        expect(result.domain).toBeNull()
        expect(result.project).toBeNull()
      })

      it('should maintain context history', () => {
        manager.setContext({ domain: 'infra' })
        manager.setContext({ domain: 'dev' })
        manager.setContext({ domain: 'security' })
        
        const history = manager.getContextHistory()
        expect(history).toHaveLength(3)
        expect(history[0].domain).toBeNull() // Initial context
        expect(history[1].domain).toBe('infra')
        expect(history[2].domain).toBe('dev')
      })

      it('should restore context from history', () => {
        manager.setContext({ domain: 'infra' })
        manager.setContext({ domain: 'dev' })
        
        const result = manager.restoreContext(0)
        expect(result.domain).toBeNull() // Restored initial context
      })

      it('should throw error when restoring invalid history index', () => {
        expect(() => {
          manager.restoreContext(999)
        }).toThrow('Invalid context history index')
      })
    })

    describe('Workspace Management', () => {
      it('should create workspace', () => {
        const workspace = manager.createWorkspace('test-workspace', {
          description: 'Test workspace',
          domains: ['infra', 'dev'],
          resources: ['server', 'project']
        })
        
        expect(workspace).toBeInstanceOf(EnterpriseWorkspace)
        expect(workspace.name).toBe('test-workspace')
        expect(workspace.domains).toEqual(['infra', 'dev'])
        expect(workspace.resources).toEqual(['server', 'project'])
      })

      it('should get workspace by ID', () => {
        const workspace = manager.createWorkspace('test-workspace')
        const retrieved = manager.getWorkspace(workspace.id)
        
        expect(retrieved).toBe(workspace)
      })

      it('should get workspace by name', () => {
        const workspace = manager.createWorkspace('test-workspace')
        const retrieved = manager.getWorkspace('test-workspace')
        
        expect(retrieved).toBe(workspace)
      })

      it('should return null for non-existent workspace', () => {
        const retrieved = manager.getWorkspace('non-existent')
        expect(retrieved).toBeNull()
      })

      it('should list all workspaces', () => {
        manager.createWorkspace('workspace-1')
        manager.createWorkspace('workspace-2')
        
        const workspaces = manager.listWorkspaces()
        expect(workspaces).toHaveLength(2)
        expect(workspaces.map(w => w.name)).toContain('workspace-1')
        expect(workspaces.map(w => w.name)).toContain('workspace-2')
      })

      it('should switch to workspace', () => {
        const workspace = manager.createWorkspace('test-workspace', {
          context: new EnterpriseContext({ project: 'workspace-project' })
        })
        
        const result = manager.switchWorkspace('test-workspace')
        expect(result.project).toBe('workspace-project')
      })

      it('should throw error when switching to non-existent workspace', () => {
        expect(() => {
          manager.switchWorkspace('non-existent')
        }).toThrow("Workspace 'non-existent' not found")
      })

      it('should delete workspace', () => {
        const workspace = manager.createWorkspace('test-workspace')
        const result = manager.deleteWorkspace('test-workspace')
        
        expect(result).toBe(true)
        expect(manager.getWorkspace('test-workspace')).toBeNull()
      })

      it('should throw error when deleting non-existent workspace', () => {
        expect(() => {
          manager.deleteWorkspace('non-existent')
        }).toThrow("Workspace 'non-existent' not found")
      })
    })

    describe('Export/Import', () => {
      it('should export all data', () => {
        manager.setContext({ domain: 'infra', project: 'my-project' })
        manager.createWorkspace('test-workspace', {
          context: new EnterpriseContext({ project: 'workspace-project' })
        })
        
        const exported = manager.export()
        expect(exported.currentContext).toBeDefined()
        expect(exported.workspaces).toHaveLength(1)
        expect(exported.contextHistory).toHaveLength(1)
      })

      it('should import all data', () => {
        const data = {
          currentContext: { domain: 'dev', project: 'imported-project' },
          workspaces: [{
            name: 'imported-workspace',
            description: 'Imported workspace',
            domains: ['dev'],
            resources: ['project'],
            permissions: [],
            context: { project: 'workspace-project' },
            metadata: {}
          }],
          contextHistory: [{ domain: 'infra' }]
        }
        
        manager.import(data)
        
        expect(manager.getCurrentContext().domain).toBe('dev')
        expect(manager.getCurrentContext().project).toBe('imported-project')
        expect(manager.listWorkspaces()).toHaveLength(1)
        expect(manager.getContextHistory()).toHaveLength(1)
      })
    })
  })

  describe('Global Context Manager', () => {
    it('should have global context manager instance', () => {
      expect(globalContextManager).toBeInstanceOf(EnterpriseContextManager)
    })
  })

  describe('Context Utils', () => {
    it('should provide convenience functions', () => {
      expect(contextUtils.setContext).toBeInstanceOf(Function)
      expect(contextUtils.getCurrentContext).toBeInstanceOf(Function)
      expect(contextUtils.updateContext).toBeInstanceOf(Function)
      expect(contextUtils.clearContext).toBeInstanceOf(Function)
      expect(contextUtils.createWorkspace).toBeInstanceOf(Function)
      expect(contextUtils.getWorkspace).toBeInstanceOf(Function)
      expect(contextUtils.listWorkspaces).toBeInstanceOf(Function)
      expect(contextUtils.switchWorkspace).toBeInstanceOf(Function)
      expect(contextUtils.deleteWorkspace).toBeInstanceOf(Function)
    })

    it('should work with global context manager', async () => {
      await contextUtils.setContext({ domain: 'infra', project: 'test-project' })
      const currentContext = contextUtils.getCurrentContext()
      
      expect(currentContext.domain).toBe('infra')
      expect(currentContext.project).toBe('test-project')
    })
  })
})
