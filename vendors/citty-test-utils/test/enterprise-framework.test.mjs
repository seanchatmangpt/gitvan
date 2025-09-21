#!/usr/bin/env node
// test/enterprise-framework.test.mjs - Enterprise Framework Integration Test

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { 
  command, 
  createCommand, 
  createDomainRegistry, 
  createEnterpriseRunner, 
  createEnterpriseContext,
  createEnterpriseScenario,
  createEnterpriseAssertions,
  createEnterpriseTestUtils,
  infra,
  dev,
  security,
  enterpriseScenarios
} from '../index.js'

describe('Enterprise Noun-Verb CLI Testing Framework', () => {
  let domainRegistry
  let enterpriseRunner
  let enterpriseContext
  let enterpriseTestUtils

  beforeAll(async () => {
    domainRegistry = createDomainRegistry()
    enterpriseRunner = createEnterpriseRunner()
    enterpriseContext = createEnterpriseContext()
    enterpriseTestUtils = createEnterpriseTestUtils()
  })

  afterAll(async () => {
    // Cleanup any resources created during testing
    await enterpriseTestUtils.cleanupAllResources()
  })

  describe('Command Builder System', () => {
    it('should support domain-first approach', () => {
      const cmd = command('infra')
        .server()
        .create()
        .withName('test-server')
        .withType('web')
        .withRegion('us-east-1')
        .build()

      expect(cmd.domain).toBe('infra')
      expect(cmd.resource).toBe('server')
      expect(cmd.action).toBe('create')
      expect(cmd.args).toContain('--name')
      expect(cmd.args).toContain('test-server')
      expect(cmd.args).toContain('--type')
      expect(cmd.args).toContain('web')
      expect(cmd.args).toContain('--region')
      expect(cmd.args).toContain('us-east-1')
    })

    it('should support resource-first approach', () => {
      const cmd = createCommand()
        .domain('dev')
        .resource('project')
        .action('create')
        .withName('test-project')
        .withConfig('{"type": "application"}')
        .build()

      expect(cmd.domain).toBe('dev')
      expect(cmd.resource).toBe('project')
      expect(cmd.action).toBe('create')
      expect(cmd.args).toContain('--name')
      expect(cmd.args).toContain('test-project')
      expect(cmd.args).toContain('--config')
    })

    it('should support domain-specific builders', () => {
      const infraCmd = infra.server().create().withName('infra-server').build()
      const devCmd = dev.project().create().withName('dev-project').build()
      const securityCmd = security.user().create().withName('security-user').build()

      expect(infraCmd.domain).toBe('infra')
      expect(infraCmd.resource).toBe('server')
      expect(devCmd.domain).toBe('dev')
      expect(devCmd.resource).toBe('project')
      expect(securityCmd.domain).toBe('security')
      expect(securityCmd.resource).toBe('user')
    })
  })

  describe('Domain Registry System', () => {
    it('should register and retrieve domains', () => {
      const infraDomain = domainRegistry.getDomain('infra')
      expect(infraDomain).toBeDefined()
      expect(infraDomain.name).toBe('infra')
      expect(infraDomain.displayName).toBe('Infrastructure')
      expect(infraDomain.resources).toHaveLength(4)
      expect(infraDomain.actions).toHaveLength(7)
    })

    it('should validate command structure', () => {
      expect(() => domainRegistry.validateCommand('infra', 'server', 'create')).not.toThrow()
      expect(() => domainRegistry.validateCommand('infra', 'server', 'invalid')).toThrow()
      expect(() => domainRegistry.validateCommand('invalid', 'server', 'create')).toThrow()
    })

    it('should get command metadata', () => {
      const metadata = domainRegistry.getCommandMetadata('infra', 'server', 'create')
      expect(metadata.domain.name).toBe('infra')
      expect(metadata.resource.name).toBe('server')
      expect(metadata.action).toBe('create')
      expect(metadata.command).toBe('infra server create')
    })

    it('should get domain resources and actions', () => {
      const infraResources = domainRegistry.getDomainResources('infra')
      const infraActions = domainRegistry.getDomainActions('infra')
      
      expect(infraResources).toHaveLength(4)
      expect(infraActions).toHaveLength(7)
      
      const resourceNames = infraResources.map(r => r.name)
      expect(resourceNames).toContain('server')
      expect(resourceNames).toContain('network')
      expect(resourceNames).toContain('storage')
      expect(resourceNames).toContain('database')
    })
  })

  describe('Enterprise Context Management', () => {
    it('should manage enterprise context', () => {
      enterpriseContext
        .setDomain('infra')
        .setProject('test-project')
        .setEnvironment('development')
        .setRegion('us-east-1')
        .setCompliance('SOC2')
        .setUser('test-user')
        .setRole('admin')

      const context = enterpriseContext.getContext()
      expect(context.domain).toBe('infra')
      expect(context.project).toBe('test-project')
      expect(context.environment).toBe('development')
      expect(context.region).toBe('us-east-1')
      expect(context.compliance).toBe('SOC2')
      expect(context.user).toBe('test-user')
      expect(context.role).toBe('admin')
    })

    it('should validate context', () => {
      enterpriseContext.clearContext()
      expect(() => enterpriseContext.validate()).toThrow()

      enterpriseContext
        .setDomain('infra')
        .setProject('test-project')
        .setEnvironment('development')
      
      expect(() => enterpriseContext.validate()).not.toThrow()
    })

    it('should clone context', () => {
      enterpriseContext
        .setDomain('infra')
        .setProject('test-project')
        .setEnvironment('development')

      const clonedContext = enterpriseContext.clone()
      const originalContext = enterpriseContext.getContext()
      const clonedContextData = clonedContext.getContext()

      expect(clonedContextData.domain).toBe(originalContext.domain)
      expect(clonedContextData.project).toBe(originalContext.project)
      expect(clonedContextData.environment).toBe(originalContext.environment)
    })
  })

  describe('Enterprise Runner System', () => {
    it('should execute domain commands', async () => {
      enterpriseRunner.setContext({
        domain: 'infra',
        project: 'test-project',
        environment: 'development'
      })

      // Mock the actual command execution since we don't have a real CLI
      const result = await enterpriseRunner.executeDomain('infra', 'server', 'list', [], {
        mock: true,
        mockResult: { exitCode: 0, stdout: 'Server list output', stderr: '' }
      })

      expect(result).toBeDefined()
    })

    it('should manage audit log', () => {
      enterpriseRunner.clearAuditLog()
      expect(enterpriseRunner.getAuditLog()).toHaveLength(0)
    })

    it('should manage batch results', () => {
      enterpriseRunner.clearBatchResults()
      expect(enterpriseRunner.getBatchResults()).toHaveLength(0)
    })
  })

  describe('Enterprise Scenario System', () => {
    it('should create domain-specific scenarios', () => {
      const scenario = createEnterpriseScenario('Test Infrastructure Server Creation', 'infra')
        .step('Create server')
        .runDomain('infra', 'server', 'create', ['--name', 'test-server'])
        .expectSuccess()
        .step('Verify server')
        .runDomain('infra', 'server', 'show', ['test-server'])
        .expectSuccess()

      expect(scenario.name).toBe('Test Infrastructure Server Creation')
      expect(scenario.domain).toBe('infra')
      expect(scenario.steps).toHaveLength(4)
    })

    it('should support pre-built enterprise scenarios', () => {
      const infraScenario = enterpriseScenarios.infra.server.create({ name: 'test-server' })
      const devScenario = enterpriseScenarios.dev.project.create({ name: 'test-project' })
      const securityScenario = enterpriseScenarios.security.user.audit({ userName: 'test-user' })

      expect(infraScenario.name).toBe('Infrastructure Server Creation')
      expect(infraScenario.domain).toBe('infra')
      expect(devScenario.name).toBe('Development Project Creation')
      expect(devScenario.domain).toBe('dev')
      expect(securityScenario.name).toBe('Security User Audit')
      expect(securityScenario.domain).toBe('security')
    })

    it('should support cross-domain scenarios', () => {
      const crossDomainScenario = enterpriseScenarios.crossDomain.deployment({
        projectName: 'test-project',
        serverName: 'test-server',
        appName: 'test-app',
        userName: 'test-user'
      })

      expect(crossDomainScenario.name).toBe('Cross-Domain Deployment Workflow')
      expect(crossDomainScenario.domain).toBeNull() // Cross-domain scenarios don't have a specific domain
    })
  })

  describe('Enterprise Assertions', () => {
    it('should create enterprise assertions', () => {
      const mockResult = {
        result: {
          exitCode: 0,
          stdout: 'Resource created successfully',
          stderr: '',
          args: ['infra', 'server', 'create', '--name', 'test-server']
        }
      }

      const assertions = createEnterpriseAssertions(mockResult)
      expect(assertions).toBeDefined()
      expect(assertions.result).toBeDefined()
    })
  })

  describe('Enterprise Test Utils', () => {
    it('should manage workspaces', async () => {
      const workspace = await enterpriseTestUtils.createWorkspace('test-workspace', {
        domain: 'dev',
        project: 'test-project',
        environment: 'development',
        createProject: false
      })

      expect(workspace.name).toBe('test-workspace')
      expect(workspace.config.domain).toBe('dev')
      expect(workspace.config.project).toBe('test-project')

      const workspaces = await enterpriseTestUtils.listWorkspaces()
      expect(workspaces).toHaveLength(1)
      expect(workspaces[0].name).toBe('test-workspace')
    })

    it('should manage context', () => {
      enterpriseTestUtils.setContext({
        domain: 'infra',
        project: 'test-project',
        environment: 'development'
      })

      const context = enterpriseTestUtils.getContext()
      expect(context.domain).toBe('infra')
      expect(context.project).toBe('test-project')
      expect(context.environment).toBe('development')
    })

    it('should track resource references', () => {
      const references = enterpriseTestUtils.getResourceReferences()
      expect(Array.isArray(references)).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should work with domain-first command building', () => {
      const cmd = command('infra')
        .server()
        .create()
        .withName('integration-server')
        .withType('web')
        .withRegion('us-east-1')
        .build()

      expect(cmd.domain).toBe('infra')
      expect(cmd.resource).toBe('server')
      expect(cmd.action).toBe('create')
      expect(cmd.fullCommand).toContain('infra server create')
    })

    it('should work with resource-first command building', () => {
      const cmd = createCommand()
        .domain('dev')
        .resource('project')
        .action('create')
        .withName('integration-project')
        .build()

      expect(cmd.domain).toBe('dev')
      expect(cmd.resource).toBe('project')
      expect(cmd.action).toBe('create')
      expect(cmd.fullCommand).toContain('dev project create')
    })

    it('should validate commands through domain registry', () => {
      expect(() => domainRegistry.validateCommand('infra', 'server', 'create')).not.toThrow()
      expect(() => domainRegistry.validateCommand('dev', 'project', 'create')).not.toThrow()
      expect(() => domainRegistry.validateCommand('security', 'user', 'create')).not.toThrow()
    })

    it('should support enterprise context across components', () => {
      const context = createEnterpriseContext()
        .setDomain('infra')
        .setProject('integration-project')
        .setEnvironment('development')
        .getContext()

      expect(context.domain).toBe('infra')
      expect(context.project).toBe('integration-project')
      expect(context.environment).toBe('development')
    })
  })
})
