/**
 * Enterprise Command Builder System Tests
 *
 * Tests the fluent API for constructing enterprise noun-verb CLI commands
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  command,
  CommandBuilder,
  ResourceBuilder,
  ActionBuilder,
  enterprise,
} from '../../src/command-builder.js'

describe('Enterprise Command Builder System', () => {
  let builder

  beforeEach(() => {
    builder = new CommandBuilder()
  })

  describe('CommandBuilder', () => {
    it('should create a new command builder instance', () => {
      expect(builder).toBeInstanceOf(CommandBuilder)
      expect(builder.getDomain()).toBeNull()
      expect(builder.getResource()).toBeNull()
      expect(builder.getAction()).toBeNull()
    })

    it('should support domain-first approach', () => {
      const resourceBuilder = builder.domain('infra')
      expect(resourceBuilder).toBeInstanceOf(ResourceBuilder)
      expect(builder.getDomain()).toBe('infra')
    })

    it('should support resource-first approach', () => {
      const actionBuilder = builder.resource('infra', 'server')
      expect(actionBuilder).toBeInstanceOf(ActionBuilder)
      expect(builder.getDomain()).toBe('infra')
      expect(builder.getResource()).toBe('server')
    })

    it('should support direct command construction', () => {
      const result = builder.command('infra', 'server', 'create')
      expect(result).toBe(builder)
      expect(builder.getDomain()).toBe('infra')
      expect(builder.getResource()).toBe('server')
      expect(builder.getAction()).toBe('create')
    })

    it('should add arguments', () => {
      builder.command('infra', 'server', 'create').arg('--type', 'web').arg('--region', 'us-east-1')

      expect(builder.getArgs()).toEqual({
        '--type': 'web',
        '--region': 'us-east-1',
      })
    })

    it('should add multiple arguments', () => {
      builder.command('infra', 'server', 'create').args({
        '--type': 'web',
        '--region': 'us-east-1',
        '--size': 'large',
      })

      expect(builder.getArgs()).toEqual({
        '--type': 'web',
        '--region': 'us-east-1',
        '--size': 'large',
      })
    })

    it('should add options', () => {
      builder
        .command('infra', 'server', 'create')
        .option('--verbose', true)
        .option('--dry-run', false)

      expect(builder.getOptions()).toEqual({
        '--verbose': true,
        '--dry-run': false,
      })
    })

    it('should add multiple options', () => {
      builder.command('infra', 'server', 'create').options({
        '--verbose': true,
        '--dry-run': false,
        '--json': true,
      })

      expect(builder.getOptions()).toEqual({
        '--verbose': true,
        '--dry-run': false,
        '--json': true,
      })
    })

    it('should set enterprise context', () => {
      const context = {
        project: 'my-project',
        environment: 'staging',
        region: 'us-east-1',
      }

      builder.command('infra', 'server', 'create').context(context)

      expect(builder.getContext()).toEqual(context)
    })

    it('should build command array correctly', () => {
      const commandArray = builder
        .command('infra', 'server', 'create')
        .arg('--type', 'web')
        .arg('--region', 'us-east-1')
        .option('--verbose', true)
        .build()

      expect(commandArray).toEqual([
        'infra',
        'server',
        'create',
        '--type',
        'web',
        '--region',
        'us-east-1',
        '--verbose',
        true,
      ])
    })

    it('should throw error when building incomplete command', () => {
      expect(() => {
        builder.command('infra', 'server').build()
      }).toThrow('Command must have domain, resource, and action')
    })
  })

  describe('ResourceBuilder', () => {
    it('should set resource and return ActionBuilder', () => {
      const actionBuilder = builder.domain('infra').resource('server')
      expect(actionBuilder).toBeInstanceOf(ActionBuilder)
      expect(builder.getResource()).toBe('server')
    })

    it('should support server resource', () => {
      const actionBuilder = builder.domain('infra').server()
      expect(actionBuilder).toBeInstanceOf(ActionBuilder)
      expect(builder.getResource()).toBe('server')
    })

    it('should support network resource', () => {
      const actionBuilder = builder.domain('infra').network()
      expect(actionBuilder).toBeInstanceOf(ActionBuilder)
      expect(builder.getResource()).toBe('network')
    })

    it('should support project resource', () => {
      const actionBuilder = builder.domain('dev').project()
      expect(actionBuilder).toBeInstanceOf(ActionBuilder)
      expect(builder.getResource()).toBe('project')
    })

    it('should support user resource', () => {
      const actionBuilder = builder.domain('security').user()
      expect(actionBuilder).toBeInstanceOf(ActionBuilder)
      expect(builder.getResource()).toBe('user')
    })
  })

  describe('ActionBuilder', () => {
    it('should set action and return CommandBuilder', () => {
      const commandBuilder = builder.domain('infra').server().create()
      expect(commandBuilder).toBeInstanceOf(CommandBuilder)
      expect(builder.getAction()).toBe('create')
    })

    it('should support create action', () => {
      const commandBuilder = builder.domain('infra').server().create()
      expect(builder.getAction()).toBe('create')
    })

    it('should support list action', () => {
      const commandBuilder = builder.domain('infra').server().list()
      expect(builder.getAction()).toBe('list')
    })

    it('should support show action', () => {
      const commandBuilder = builder.domain('infra').server().show()
      expect(builder.getAction()).toBe('show')
    })

    it('should support update action', () => {
      const commandBuilder = builder.domain('infra').server().update()
      expect(builder.getAction()).toBe('update')
    })

    it('should support delete action', () => {
      const commandBuilder = builder.domain('infra').server().delete()
      expect(builder.getAction()).toBe('delete')
    })

    it('should support deploy action', () => {
      const commandBuilder = builder.domain('dev').app().deploy()
      expect(builder.getAction()).toBe('deploy')
    })

    it('should support audit action', () => {
      const commandBuilder = builder.domain('security').user().audit()
      expect(builder.getAction()).toBe('audit')
    })
  })

  describe('Factory Function', () => {
    it('should create command builder with domain', () => {
      const resourceBuilder = command('infra')
      expect(resourceBuilder).toBeInstanceOf(ResourceBuilder)
    })

    it('should create command builder without domain', () => {
      const commandBuilder = command()
      expect(commandBuilder).toBeInstanceOf(CommandBuilder)
    })
  })

  describe('Enterprise Convenience Functions', () => {
    it('should provide infrastructure server commands', () => {
      const createCmd = enterprise.infra.server.create({ '--type': 'web' })
      expect(createCmd).toBeInstanceOf(CommandBuilder)
      expect(createCmd._domain).toBe('infra')
      expect(createCmd._resource).toBe('server')
      expect(createCmd._action).toBe('create')
      expect(createCmd._options).toEqual({ '--type': 'web' })

      const listCmd = enterprise.infra.server.list()
      expect(listCmd._action).toBe('list')

      const showCmd = enterprise.infra.server.show('server-001')
      expect(showCmd._action).toBe('show')
      expect(showCmd._args).toEqual({ '--id': 'server-001' })
    })

    it('should provide development project commands', () => {
      const createCmd = enterprise.dev.project.create({ '--name': 'my-app' })
      expect(createCmd._domain).toBe('dev')
      expect(createCmd._resource).toBe('project')
      expect(createCmd._action).toBe('create')
      expect(createCmd._options).toEqual({ '--name': 'my-app' })

      const deployCmd = enterprise.dev.project.deploy('project-001', { '--environment': 'staging' })
      expect(deployCmd._action).toBe('deploy')
      expect(deployCmd._args).toEqual({ '--id': 'project-001' })
      expect(deployCmd._options).toEqual({ '--environment': 'staging' })
    })

    it('should provide security user commands', () => {
      const createCmd = enterprise.security.user.create({ '--name': 'john.doe' })
      expect(createCmd._domain).toBe('security')
      expect(createCmd._resource).toBe('user')
      expect(createCmd._action).toBe('create')
      expect(createCmd._options).toEqual({ '--name': 'john.doe' })

      const auditCmd = enterprise.security.user.audit('user-001', { '--days': '30' })
      expect(auditCmd._action).toBe('audit')
      expect(auditCmd._args).toEqual({ '--id': 'user-001' })
      expect(auditCmd._options).toEqual({ '--days': '30' })
    })
  })

  describe('Fluent API Chaining', () => {
    it('should support fluent chaining', () => {
      const commandArray = command('infra')
        .server()
        .create()
        .arg('--type', 'web')
        .arg('--region', 'us-east-1')
        .option('--verbose', true)
        .context({ project: 'my-project' })
        .build()

      expect(commandArray).toEqual([
        'infra',
        'server',
        'create',
        '--type',
        'web',
        '--region',
        'us-east-1',
        '--verbose',
        true,
      ])
    })

    it('should support complex enterprise scenarios', () => {
      const commandArray = command('dev')
        .project()
        .create()
        .args({
          '--name': 'my-app',
          '--type': 'web',
          '--framework': 'react',
        })
        .options({
          '--verbose': true,
          '--json': true,
        })
        .context({
          project: 'enterprise-prod',
          environment: 'staging',
          compliance: 'sox',
        })
        .build()

      expect(commandArray).toEqual([
        'dev',
        'project',
        'create',
        '--name',
        'my-app',
        '--type',
        'web',
        '--framework',
        'react',
        '--verbose',
        true,
        '--json',
        true,
      ])
    })
  })
})
