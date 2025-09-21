#!/usr/bin/env node
// src/enterprise-runner.js - Enhanced Enterprise Runner System

import { runLocalCitty, setupCleanroom, runCitty, teardownCleanroom } from './local-runner.js'
import { domainRegistry } from './domain-registry.js'

/**
 * Enterprise Runner Interface
 * 
 * Provides domain-aware execution with:
 * - Context management
 * - Batch execution
 * - Pipeline execution
 * - Cross-domain consistency
 */

export class EnterpriseRunner {
  constructor(options = {}) {
    this.options = {
      defaultTimeout: 30000,
      defaultEnvironment: 'local',
      enableContext: true,
      enableAudit: true,
      ...options
    }
    this.context = new EnterpriseContext()
    this.auditLog = []
    this.batchResults = []
  }

  // Domain-aware execution
  async executeDomain(domain, resource, action, args = [], options = {}) {
    // Validate command structure
    domainRegistry.validateCommand(domain, resource, action)
    
    // Get command metadata
    const metadata = domainRegistry.getCommandMetadata(domain, resource, action)
    
    // Build command
    const command = `${domain} ${resource} ${action} ${args.join(' ')}`.trim()
    
    // Execute with context
    const result = await this.executeWithContext(command, {
      domain,
      resource,
      action,
      metadata,
      ...options
    })
    
    return result
  }

  // Context-aware execution
  async executeWithContext(command, context = {}) {
    const startTime = Date.now()
    
    // Merge context
    const fullContext = {
      ...this.context.getContext(),
      ...context
    }
    
    // Determine runner
    const runner = this.getRunner(fullContext.environment || this.options.defaultEnvironment)
    
    // Execute command
    const result = await runner(command.split(' '), {
      context: fullContext,
      timeout: fullContext.timeout || this.options.defaultTimeout,
      ...fullContext.options
    })
    
    // Audit logging
    if (this.options.enableAudit) {
      this.auditLog.push({
        timestamp: new Date(),
        command,
        context: fullContext,
        result: {
          exitCode: result.result.exitCode,
          duration: Date.now() - startTime
        }
      })
    }
    
    return result
  }

  // Batch execution
  async executeBatch(commands) {
    this.batchResults = []
    
    for (const command of commands) {
      try {
        const result = await this.executeWithContext(command.command, command.context)
        this.batchResults.push({
          command: command.command,
          success: true,
          result
        })
      } catch (error) {
        this.batchResults.push({
          command: command.command,
          success: false,
          error: error.message
        })
      }
    }
    
    return this.batchResults
  }

  // Pipeline execution
  async executePipeline(pipeline) {
    const results = []
    let context = { ...this.context.getContext() }
    
    for (const stage of pipeline.stages) {
      try {
        const result = await this.executeWithContext(stage.command, {
          ...context,
          ...stage.context
        })
        
        results.push({
          stage: stage.name,
          success: true,
          result
        })
        
        // Update context for next stage
        if (stage.updateContext) {
          context = { ...context, ...stage.updateContext(result) }
        }
      } catch (error) {
        results.push({
          stage: stage.name,
          success: false,
          error: error.message
        })
        
        // Handle pipeline failure
        if (pipeline.failFast) {
          break
        }
      }
    }
    
    return {
      pipeline: pipeline.name,
      results,
      success: results.every(r => r.success)
    }
  }

  // Get appropriate runner
  getRunner(environment) {
    switch (environment) {
      case 'cleanroom':
        return runCitty
      case 'local':
      default:
        return runLocalCitty
    }
  }

  // Context management
  setContext(context) {
    this.context.setContext(context)
    return this
  }

  getContext() {
    return this.context.getContext()
  }

  clearContext() {
    this.context.clearContext()
    return this
  }

  // Audit management
  getAuditLog() {
    return this.auditLog
  }

  clearAuditLog() {
    this.auditLog = []
    return this
  }

  // Batch results
  getBatchResults() {
    return this.batchResults
  }

  clearBatchResults() {
    this.batchResults = []
    return this
  }
}

/**
 * Enterprise Context Management
 * 
 * Manages enterprise context including:
 * - Domain and project context
 * - Environment and region settings
 * - Compliance and governance rules
 * - User and role information
 */

export class EnterpriseContext {
  constructor() {
    this.context = {
      domain: null,
      project: null,
      environment: null,
      region: null,
      compliance: null,
      user: null,
      role: null,
      workspace: null,
      timestamp: new Date()
    }
  }

  // Set context
  setContext(context) {
    this.context = { ...this.context, ...context }
    return this
  }

  // Get context
  getContext() {
    return { ...this.context }
  }

  // Clear context
  clearContext() {
    this.context = {
      domain: null,
      project: null,
      environment: null,
      region: null,
      compliance: null,
      user: null,
      role: null,
      workspace: null,
      timestamp: new Date()
    }
    return this
  }

  // Domain context
  setDomain(domain) {
    this.context.domain = domain
    return this
  }

  getDomain() {
    return this.context.domain
  }

  // Project context
  setProject(project) {
    this.context.project = project
    return this
  }

  getProject() {
    return this.context.project
  }

  // Environment context
  setEnvironment(environment) {
    this.context.environment = environment
    return this
  }

  getEnvironment() {
    return this.context.environment
  }

  // Region context
  setRegion(region) {
    this.context.region = region
    return this
  }

  getRegion() {
    return this.context.region
  }

  // Compliance context
  setCompliance(compliance) {
    this.context.compliance = compliance
    return this
  }

  getCompliance() {
    return this.context.compliance
  }

  // User context
  setUser(user) {
    this.context.user = user
    return this
  }

  getUser() {
    return this.context.user
  }

  // Role context
  setRole(role) {
    this.context.role = role
    return this
  }

  getRole() {
    return this.context.role
  }

  // Workspace context
  setWorkspace(workspace) {
    this.context.workspace = workspace
    return this
  }

  getWorkspace() {
    return this.context.workspace
  }

  // Validate context
  validate() {
    const required = ['domain', 'project', 'environment']
    const missing = required.filter(field => !this.context[field])
    
    if (missing.length > 0) {
      throw new Error(`Missing required context fields: ${missing.join(', ')}`)
    }
    
    return true
  }

  // Clone context
  clone() {
    const cloned = new EnterpriseContext()
    cloned.setContext(this.getContext())
    return cloned
  }
}

/**
 * Pipeline Builder
 * 
 * Builds complex multi-stage pipelines with:
 * - Stage definitions
 * - Context passing
 * - Error handling
 * - Rollback support
 */

export class PipelineBuilder {
  constructor(name) {
    this.name = name
    this.stages = []
    this.failFast = true
    this.rollback = false
  }

  // Add stage
  stage(name, command, options = {}) {
    this.stages.push({
      name,
      command,
      context: options.context || {},
      updateContext: options.updateContext || null,
      rollback: options.rollback || null
    })
    return this
  }

  // Set fail fast behavior
  failFast(enabled = true) {
    this.failFast = enabled
    return this
  }

  // Enable rollback
  enableRollback(enabled = true) {
    this.rollback = enabled
    return this
  }

  // Build pipeline
  build() {
    return {
      name: this.name,
      stages: this.stages,
      failFast: this.failFast,
      rollback: this.rollback
    }
  }
}

// Convenience functions
export function createEnterpriseRunner(options) {
  return new EnterpriseRunner(options)
}

export function createEnterpriseContext() {
  return new EnterpriseContext()
}

export function createPipeline(name) {
  return new PipelineBuilder(name)
}

// Export all classes and functions
export default {
  EnterpriseRunner,
  EnterpriseContext,
  PipelineBuilder,
  createEnterpriseRunner,
  createEnterpriseContext,
  createPipeline
}