/**
 * Simple test for Enterprise Command Builder System
 */

import { describe, it, expect } from 'vitest'
import { command, domain, resource } from '../../src/command-builder.js'

describe('Enterprise Command Builder System - Basic', () => {
  describe('Command Builder', () => {
    it('should create a command with domain, resource, and action', () => {
      const cmd = command('infra', 'server', 'create')
      const built = cmd.build()

      expect(built).toContain('infra')
      expect(built).toContain('server')
      expect(built).toContain('create')
    })

    it('should add arguments to command', () => {
      const cmd = command('infra', 'server', 'create').arg('type', 'web').arg('region', 'us-east-1')

      const built = cmd.build()

      expect(built).toContain('--type')
      expect(built).toContain('web')
      expect(built).toContain('--region')
      expect(built).toContain('us-east-1')
    })

    it('should add options to command', () => {
      const cmd = command('infra', 'server', 'create')
        .option('size', 'large')
        .option('backup', true)

      const built = cmd.build()

      expect(built).toContain('--size')
      expect(built).toContain('large')
      expect(built).toContain('--backup')
    })
  })

  describe('Domain Builder', () => {
    it('should create domain-first command', () => {
      const cmd = domain('infra').resource('server').action('create')

      const built = cmd.build()

      expect(built).toContain('infra')
      expect(built).toContain('server')
      expect(built).toContain('create')
    })

    it('should use convenience methods for common actions', () => {
      const cmd = domain('infra').resource('server').create()

      const built = cmd.build()

      expect(built).toContain('infra')
      expect(built).toContain('server')
      expect(built).toContain('create')
    })
  })

  describe('Resource Builder', () => {
    it('should create resource-first command', () => {
      const cmd = resource('infra', 'server').action('create')

      const built = cmd.build()

      expect(built).toContain('infra')
      expect(built).toContain('server')
      expect(built).toContain('create')
    })

    it('should use convenience methods for common actions', () => {
      const cmd = resource('infra', 'server').list()

      const built = cmd.build()

      expect(built).toContain('infra')
      expect(built).toContain('server')
      expect(built).toContain('list')
    })
  })
})
