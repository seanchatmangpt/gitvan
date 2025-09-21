#!/usr/bin/env node
// test/enterprise-simple.test.mjs - Simple Enterprise Framework Test

import { describe, it, expect } from 'vitest'

describe('Enterprise Framework Simple Test', () => {
  it('should import command builder', async () => {
    try {
      const { command } = await import('../src/command-builder.js')
      expect(command).toBeDefined()
      expect(typeof command).toBe('function')
    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  })

  it('should import domain registry', async () => {
    try {
      const { createDomainRegistry } = await import('../src/domain-registry.js')
      expect(createDomainRegistry).toBeDefined()
      expect(typeof createDomainRegistry).toBe('function')
    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  })

  it('should import enterprise runner', async () => {
    try {
      const { createEnterpriseRunner } = await import('../src/enterprise-runner.js')
      expect(createEnterpriseRunner).toBeDefined()
      expect(typeof createEnterpriseRunner).toBe('function')
    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  })
})
