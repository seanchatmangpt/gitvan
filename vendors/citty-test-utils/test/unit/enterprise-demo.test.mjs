/**
 * Simple Enterprise Framework Demo
 *
 * Demonstrates the basic functionality of the enterprise noun-verb CLI testing framework
 */

import { describe, it, expect } from 'vitest'
import {
  command,
  CommandBuilder,
  ResourceBuilder,
  ActionBuilder,
} from '../../src/command-builder.js'

describe('Enterprise Noun-Verb CLI Testing Framework Demo', () => {
  describe('Command Builder System', () => {
    it('should create a command builder instance', () => {
      const builder = new CommandBuilder()
      expect(builder).toBeInstanceOf(CommandBuilder)
      expect(builder.domain).toBeNull()
      expect(builder.resource).toBeNull()
      expect(builder.action).toBeNull()
    })

    it('should support domain-first approach', () => {
      const builder = new CommandBuilder()
      const resourceBuilder = builder.domain('infra')
      expect(resourceBuilder).toBeInstanceOf(ResourceBuilder)
      expect(builder.domain).toBe('infra')
    })

    it('should support resource-first approach', () => {
      const builder = new CommandBuilder()
      const actionBuilder = builder.resource('infra', 'server')
      expect(actionBuilder).toBeInstanceOf(ActionBuilder)
      expect(builder.domain).toBe('infra')
      expect(builder.resource).toBe('server')
    })

    it('should support direct command construction', () => {
      const builder = new CommandBuilder()
      const result = builder.command('infra', 'server', 'create')
      expect(result).toBe(builder)
      expect(builder.domain).toBe('infra')
      expect(builder.resource).toBe('server')
      expect(builder.action).toBe('create')
    })

    it('should add arguments', () => {
      const builder = new CommandBuilder()
      builder.command('infra', 'server', 'create').arg('--type', 'web').arg('--region', 'us-east-1')

      expect(builder.args['--type']).toBe('web')
      expect(builder.args['--region']).toBe('us-east-1')
    })

    it('should add multiple arguments', () => {
      const builder = new CommandBuilder()
      builder.command('infra', 'server', 'create').args({
        '--type': 'web',
        '--region': 'us-east-1',
        '--size': 'large',
      })

      expect(builder.args['--type']).toBe('web')
      expect(builder.args['--region']).toBe('us-east-1')
      expect(builder.args['--size']).toBe('large')
    })

    it('should add options', () => {
      const builder = new CommandBuilder()
      builder
        .command('infra', 'server', 'create')
        .option('--verbose', true)
        .option('--dry-run', false)

      expect(builder.options['--verbose']).toBe(true)
      expect(builder.options['--dry-run']).toBe(false)
    })

    it('should add multiple options', () => {
      const builder = new CommandBuilder()
      builder.command('infra', 'server', 'create').options({
        '--verbose': true,
        '--dry-run': false,
        '--timeout': 30000,
      })

      expect(builder.options['--verbose']).toBe(true)
      expect(builder.options['--dry-run']).toBe(false)
      expect(builder.options['--timeout']).toBe(30000)
    })

    it('should set enterprise context', () => {
      const builder = new CommandBuilder()
      const context = {
        project: 'enterprise-prod',
        environment: 'staging',
        region: 'us-east-1',
      }

      builder.command('infra', 'server', 'create').context(context)

      expect(builder.context.project).toBe('enterprise-prod')
      expect(builder.context.environment).toBe('staging')
      expect(builder.context.region).toBe('us-east-1')
    })

    it('should build command array', () => {
      const builder = new CommandBuilder()
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
      ])
    })
  })

  describe('Fluent API', () => {
    it('should support fluent command construction', () => {
      const cmd = command('infra')
        .server()
        .create()
        .arg('--type', 'web')
        .arg('--region', 'us-east-1')

      expect(cmd.domain).toBe('infra')
      expect(cmd.resource).toBe('server')
      expect(cmd.action).toBe('create')
      expect(cmd.args['--type']).toBe('web')
      expect(cmd.args['--region']).toBe('us-east-1')
    })

    it('should support resource-first approach', () => {
      const cmd = command()
        .domain('dev')
        .resource('project')
        .action('create')
        .arg('--name', 'my-app')
        .arg('--type', 'web')

      expect(cmd.domain).toBe('dev')
      expect(cmd.resource).toBe('project')
      expect(cmd.action).toBe('create')
      expect(cmd.args['--name']).toBe('my-app')
      expect(cmd.args['--type']).toBe('web')
    })
  })
})
