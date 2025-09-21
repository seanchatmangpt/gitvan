// enhanced-runner.js - Enhanced Runner System
// Provides domain-aware execution with context management

/**
 * Enhanced Runner Interface for Enterprise Noun-Verb CLI Testing
 * Supports domain-aware execution, batch processing, and pipeline execution
 */

import { runLocalCitty, runCitty } from './local-runner.js'
import { domainRegistry } from './domain-registry.js'

export class EnterpriseRunner {
  constructor() {
    this.context = {}
    this.workspace = null
    this.batchQueue = []
    this.pipelineQueue = []
  }

  // Domain-aware execution
  async executeDomain(domainName, resourceName, actionName, args = [], options = {}) {
    // Validate command exists
    const validation = domainRegistry.validateCommand(domainName, resourceName, actionName)
    if (!validation.valid) {
      throw new Error(`Invalid command: ${validation.errors.join(', ')}`)
    }

    // Build command array
    const commandArray = [domainName, resourceName, actionName, ...args]

    // Merge context with options
    const runnerOptions = {
      ...options,
      context: { ...this.context, ...options.context }
    }

    // Execute command
    const runner = options.runner || 'local'
    if (runner === 'local') {
      return runLocalCitty(commandArray, runnerOptions)
    } else if (runner === 'cleanroom') {
      return runCitty(commandArray, runnerOptions)
    } else {
      throw new Error(`Unknown runner: ${runner}`)
    }
  }

  // Context-aware execution
  async executeWithContext(command, context, options = {}) {
    // Merge context
    const mergedContext = { ...this.context, ...context }
    
    // Build command array
    const commandArray = Array.isArray(command) ? command : [command]

    // Execute with context
    const runnerOptions = {
      ...options,
      context: mergedContext
    }

    const runner = options.runner || 'local'
    if (runner === 'local') {
      return runLocalCitty(commandArray, runnerOptions)
    } else if (runner === 'cleanroom') {
      return runCitty(commandArray, runnerOptions)
    } else {
      throw new Error(`Unknown runner: ${runner}`)
    }
  }

  // Batch execution
  async executeBatch(commands, options = {}) {
    const {
      parallel = false,
      maxConcurrency = 5,
      stopOnError = false,
      timeout = 30000
    } = options

    const results = []
    const errors = []

    if (parallel) {
      // Execute commands in parallel with concurrency limit
      const semaphore = new Semaphore(maxConcurrency)
      
      const promises = commands.map(async (command, index) => {
        try {
          await semaphore.acquire()
          const result = await this.executeCommand(command, options)
          results[index] = result
          return result
        } catch (error) {
          errors[index] = error
          if (stopOnError) {
            throw error
          }
          return null
        } finally {
          semaphore.release()
        }
      })

      await Promise.allSettled(promises)
    } else {
      // Execute commands sequentially
      for (let i = 0; i < commands.length; i++) {
        try {
          const result = await this.executeCommand(commands[i], options)
          results[i] = result
        } catch (error) {
          errors[i] = error
          if (stopOnError) {
            throw error
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalCommands: commands.length,
      successfulCommands: results.filter(r => r !== null).length,
      failedCommands: errors.length
    }
  }

  // Pipeline execution
  async executePipeline(pipeline, options = {}) {
    const {
      validateDependencies = true,
      stopOnError = true,
      timeout = 300000,
      retryPolicy = null
    } = options

    const results = []
    const errors = []
    const startTime = Date.now()

    try {
      // Validate dependencies if requested
      if (validateDependencies) {
        this.validatePipelineDependencies(pipeline)
      }

      // Execute pipeline steps
      for (const step of pipeline.steps) {
        try {
          // Check step condition
          if (step.condition && !step.condition(results)) {
            continue
          }

          // Execute step with retry policy
          let result
          if (retryPolicy) {
            result = await this.executeWithRetry(step, retryPolicy)
          } else {
            result = await this.executeStep(step, options)
          }

          results.push({
            step: step.name,
            success: true,
            result,
            duration: Date.now() - startTime
          })
        } catch (error) {
          const stepResult = {
            step: step.name,
            success: false,
            error,
            duration: Date.now() - startTime
          }
          
          results.push(stepResult)
          errors.push(stepResult)

          if (stopOnError) {
            break
          }
        }
      }
    } catch (error) {
      throw new Error(`Pipeline execution failed: ${error.message}`)
    }

    return {
      success: errors.length === 0,
      steps: results,
      errors,
      duration: Date.now() - startTime,
      pipeline: pipeline.name
    }
  }

  // Context management
  setContext(context) {
    this.context = { ...this.context, ...context }
    return this
  }

  getContext() {
    return { ...this.context }
  }

  clearContext() {
    this.context = {}
    return this
  }

  // Workspace management
  setWorkspace(workspace) {
    this.workspace = workspace
    return this
  }

  getWorkspace() {
    return this.workspace
  }

  clearWorkspace() {
    this.workspace = null
    return this
  }

  // Helper methods
  async executeCommand(command, options = {}) {
    if (Array.isArray(command)) {
      // Command array
      const runner = options.runner || 'local'
      if (runner === 'local') {
        return runLocalCitty(command, options)
      } else if (runner === 'cleanroom') {
        return runCitty(command, options)
      }
    } else if (typeof command === 'object') {
      // Command object with domain/resource/action
      const { domain, resource, action, args = [], ...commandOptions } = command
      return this.executeDomain(domain, resource, action, args, { ...options, ...commandOptions })
    } else {
      throw new Error('Invalid command format')
    }
  }

  async executeStep(step, options = {}) {
    const stepOptions = {
      ...options,
      timeout: step.timeout || options.timeout
    }

    return this.executeCommand(step.command, stepOptions)
  }

  async executeWithRetry(step, retryPolicy) {
    const { maxAttempts = 3, delay = 1000, backoff = 'exponential' } = retryPolicy
    let lastError

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.executeStep(step)
      } catch (error) {
        lastError = error
        
        if (attempt === maxAttempts) {
          throw error
        }

        // Calculate delay
        let currentDelay = delay
        if (backoff === 'exponential') {
          currentDelay = delay * Math.pow(2, attempt - 1)
        }

        await new Promise(resolve => setTimeout(resolve, currentDelay))
      }
    }

    throw lastError
  }

  validatePipelineDependencies(pipeline) {
    const stepNames = new Set(pipeline.steps.map(step => step.name))
    
    for (const step of pipeline.steps) {
      for (const dependency of step.dependencies || []) {
        if (!stepNames.has(dependency)) {
          throw new Error(`Step '${step.name}' depends on '${dependency}' which is not defined`)
        }
      }
    }
  }
}

// Semaphore for concurrency control
class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency
    this.currentConcurrency = 0
    this.queue = []
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.currentConcurrency < this.maxConcurrency) {
        this.currentConcurrency++
        resolve()
      } else {
        this.queue.push(resolve)
      }
    })
  }

  release() {
    this.currentConcurrency--
    if (this.queue.length > 0) {
      const next = this.queue.shift()
      this.currentConcurrency++
      next()
    }
  }
}

// Pipeline builder
export class PipelineBuilder {
  constructor(name) {
    this.pipeline = {
      name,
      description: '',
      steps: [],
      dependencies: [],
      metadata: {}
    }
  }

  description(desc) {
    this.pipeline.description = desc
    return this
  }

  step(name, command, options = {}) {
    this.pipeline.steps.push({
      name,
      command,
      dependencies: options.dependencies || [],
      condition: options.condition,
      retryPolicy: options.retryPolicy,
      timeout: options.timeout,
      metadata: options.metadata || {}
    })
    return this
  }

  dependency(fromStep, toStep) {
    this.pipeline.dependencies.push({ from: fromStep, to: toStep })
    return this
  }

  metadata(data) {
    this.pipeline.metadata = { ...this.pipeline.metadata, ...data }
    return this
  }

  build() {
    return this.pipeline
  }

  async execute(runner, options = {}) {
    const enterpriseRunner = new EnterpriseRunner()
    return enterpriseRunner.executePipeline(this.pipeline, { ...options, runner })
  }
}

// Factory functions
export function pipeline(name) {
  return new PipelineBuilder(name)
}

export function enterpriseRunner() {
  return new EnterpriseRunner()
}

// Create global enterprise runner instance
export const enterpriseRunnerInstance = new EnterpriseRunner()

// Export all components
export default {
  EnterpriseRunner,
  PipelineBuilder,
  pipeline,
  enterpriseRunner,
  enterpriseRunnerInstance
}
