#!/usr/bin/env node
// src/enterprise-scenarios.js - Enterprise Scenario System

import { scenario } from './scenario-dsl.js'
import { domainRegistry } from './domain-registry.js'
import { createEnterpriseRunner, createEnterpriseContext } from './enterprise-runner.js'

/**
 * Enterprise Scenario System
 * 
 * Provides domain-specific scenarios with:
 * - Domain-aware workflows
 * - Cross-domain operations
 * - Compliance validation
 * - Audit trails
 */

export class EnterpriseScenarioBuilder {
  constructor(name, domain = null) {
    this.name = name
    this.domain = domain
    this.steps = []
    this.context = createEnterpriseContext()
    this.compliance = []
    this.audit = []
  }

  // Domain-specific scenarios
  static infraServerCreate(options = {}) {
    const builder = new EnterpriseScenarioBuilder('Infrastructure Server Creation', 'infra')
    
    return builder
      .step('Validate server requirements')
      .runDomain('infra', 'server', 'create', ['--validate'], { ...options })
      .expectSuccess()
      .step('Create server instance')
      .runDomain('infra', 'server', 'create', ['--name', options.name || 'test-server'], { ...options })
      .expectSuccess()
      .step('Verify server status')
      .runDomain('infra', 'server', 'show', [options.name || 'test-server'], { ...options })
      .expectSuccess()
  }

  static infraServerLifecycle(options = {}) {
    const builder = new EnterpriseScenarioBuilder('Infrastructure Server Lifecycle', 'infra')
    
    return builder
      .step('Create server')
      .runDomain('infra', 'server', 'create', ['--name', options.name || 'lifecycle-server'], { ...options })
      .expectSuccess()
      .step('Start server')
      .runDomain('infra', 'server', 'start', [options.name || 'lifecycle-server'], { ...options })
      .expectSuccess()
      .step('Scale server')
      .runDomain('infra', 'server', 'scale', [options.name || 'lifecycle-server', '--size', 'large'], { ...options })
      .expectSuccess()
      .step('Backup server')
      .runDomain('infra', 'server', 'backup', [options.name || 'lifecycle-server'], { ...options })
      .expectSuccess()
      .step('Delete server')
      .runDomain('infra', 'server', 'delete', [options.name || 'lifecycle-server'], { ...options })
      .expectSuccess()
  }

  static devProjectCreate(options = {}) {
    const builder = new EnterpriseScenarioBuilder('Development Project Creation', 'dev')
    
    return builder
      .step('Initialize project')
      .runDomain('dev', 'project', 'create', ['--name', options.name || 'test-project'], { ...options })
      .expectSuccess()
      .step('Create application')
      .runDomain('dev', 'app', 'create', ['--name', options.appName || 'test-app'], { ...options })
      .expectSuccess()
      .step('Create test suite')
      .runDomain('dev', 'test', 'create', ['--name', options.testName || 'test-suite'], { ...options })
      .expectSuccess()
      .step('Run initial tests')
      .runDomain('dev', 'test', 'run', [options.testName || 'test-suite'], { ...options })
      .expectSuccess()
  }

  static devProjectDeploy(options = {}) {
    const builder = new EnterpriseScenarioBuilder('Development Project Deployment', 'dev')
    
    return builder
      .step('Build application')
      .runDomain('dev', 'app', 'build', [options.appName || 'test-app'], { ...options })
      .expectSuccess()
      .step('Run tests')
      .runDomain('dev', 'test', 'run', [options.testName || 'test-suite'], { ...options })
      .expectSuccess()
      .step('Deploy application')
      .runDomain('dev', 'app', 'deploy', [options.appName || 'test-app'], { ...options })
      .expectSuccess()
      .step('Verify deployment')
      .runDomain('dev', 'app', 'show', [options.appName || 'test-app'], { ...options })
      .expectSuccess()
  }

  static securityUserAudit(options = {}) {
    const builder = new EnterpriseScenarioBuilder('Security User Audit', 'security')
    
    return builder
      .step('List users')
      .runDomain('security', 'user', 'list', [], { ...options })
      .expectSuccess()
      .step('Audit user permissions')
      .runDomain('security', 'user', 'audit', [options.userName || 'test-user'], { ...options })
      .expectSuccess()
      .step('Validate user policies')
      .runDomain('security', 'policy', 'validate', ['--user', options.userName || 'test-user'], { ...options })
      .expectSuccess()
      .step('Generate audit report')
      .runDomain('security', 'user', 'audit', ['--report', '--format', 'json'], { ...options })
      .expectSuccess()
  }

  // Cross-domain workflows
  static deploymentWorkflow(options = {}) {
    const builder = new EnterpriseScenarioBuilder('Cross-Domain Deployment Workflow')
    
    return builder
      .step('Create development project')
      .runDomain('dev', 'project', 'create', ['--name', options.projectName || 'deployment-project'], { ...options })
      .expectSuccess()
      .step('Create infrastructure')
      .runDomain('infra', 'server', 'create', ['--name', options.serverName || 'deployment-server'], { ...options })
      .expectSuccess()
      .step('Deploy application')
      .runDomain('dev', 'app', 'deploy', [options.appName || 'deployment-app'], { ...options })
      .expectSuccess()
      .step('Configure security')
      .runDomain('security', 'user', 'create', ['--name', options.userName || 'deployment-user'], { ...options })
      .expectSuccess()
      .step('Monitor deployment')
      .runDomain('infra', 'server', 'show', [options.serverName || 'deployment-server'], { ...options })
      .expectSuccess()
  }

  static complianceWorkflow(options = {}) {
    const builder = new EnterpriseScenarioBuilder('Compliance Validation Workflow')
    
    return builder
      .step('Audit infrastructure')
      .runDomain('infra', 'server', 'audit', [], { ...options })
      .expectSuccess()
      .step('Audit development')
      .runDomain('dev', 'project', 'audit', [], { ...options })
      .expectSuccess()
      .step('Audit security')
      .runDomain('security', 'user', 'audit', [], { ...options })
      .expectSuccess()
      .step('Validate compliance')
      .runDomain('security', 'policy', 'validate', ['--compliance', options.compliance || 'SOC2'], { ...options })
      .expectSuccess()
      .step('Generate compliance report')
      .runDomain('security', 'policy', 'validate', ['--report', '--format', 'json'], { ...options })
      .expectSuccess()
  }

  // Scenario builder methods
  step(description, action) {
    this.steps.push({ description, action })
    return this
  }

  runDomain(domain, resource, action, args = [], options = {}) {
    const command = `${domain} ${resource} ${action} ${args.join(' ')}`.trim()
    this.steps.push({ 
      description: `Run ${command}`,
      command,
      options: { ...options, domain, resource, action }
    })
    return this
  }

  expectSuccess() {
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1]
      lastStep.expectations = lastStep.expectations || []
      lastStep.expectations.push('success')
    }
    return this
  }

  expectFailure() {
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1]
      lastStep.expectations = lastStep.expectations || []
      lastStep.expectations.push('failure')
    }
    return this
  }

  expectOutput(match) {
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1]
      lastStep.expectations = lastStep.expectations || []
      lastStep.expectations.push({ type: 'output', match })
    }
    return this
  }

  expectStderr(match) {
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1]
      lastStep.expectations = lastStep.expectations || []
      lastStep.expectations.push({ type: 'stderr', match })
    }
    return this
  }

  // Context management
  withContext(context) {
    this.context.setContext(context)
    return this
  }

  withDomain(domain) {
    this.context.setDomain(domain)
    return this
  }

  withProject(project) {
    this.context.setProject(project)
    return this
  }

  withEnvironment(environment) {
    this.context.setEnvironment(environment)
    return this
  }

  withCompliance(compliance) {
    this.context.setCompliance(compliance)
    return this
  }

  // Compliance validation
  addCompliance(compliance) {
    this.compliance.push(compliance)
    return this
  }

  validateCompliance() {
    // Add compliance validation steps
    this.steps.push({
      description: 'Validate compliance',
      command: 'compliance validate',
      options: { compliance: this.compliance }
    })
    return this
  }

  // Execute scenario
  async execute(runner = 'local') {
    const enterpriseRunner = createEnterpriseRunner()
    enterpriseRunner.setContext(this.context.getContext())
    
    const results = []
    let success = true
    
    for (const step of this.steps) {
      try {
        let result
        
        if (step.command) {
          // Execute command
          if (step.options.domain) {
            result = await enterpriseRunner.executeDomain(
              step.options.domain,
              step.options.resource,
              step.options.action,
              step.command.split(' ').slice(3), // Remove domain resource action
              step.options
            )
          } else {
            result = await enterpriseRunner.executeWithContext(step.command, step.options)
          }
        } else if (step.action) {
          // Execute custom action
          result = await step.action({ context: this.context.getContext() })
        }
        
        // Apply expectations
        if (step.expectations) {
          for (const expectation of step.expectations) {
            if (expectation === 'success') {
              result.expectSuccess()
            } else if (expectation === 'failure') {
              result.expectFailure()
            } else if (expectation.type === 'output') {
              result.expectOutput(expectation.match)
            } else if (expectation.type === 'stderr') {
              result.expectStderr(expectation.match)
            }
          }
        }
        
        results.push({
          step: step.description,
          success: true,
          result
        })
        
      } catch (error) {
        results.push({
          step: step.description,
          success: false,
          error: error.message
        })
        success = false
      }
    }
    
    return {
      scenario: this.name,
      domain: this.domain,
      results,
      success,
      context: this.context.getContext(),
      compliance: this.compliance
    }
  }
}

// Pre-built enterprise scenarios
export const enterpriseScenarios = {
  infra: {
    server: {
      create: (options) => EnterpriseScenarioBuilder.infraServerCreate(options),
      lifecycle: (options) => EnterpriseScenarioBuilder.infraServerLifecycle(options),
      disasterRecovery: (options) => new EnterpriseScenarioBuilder('Infrastructure Server Disaster Recovery', 'infra')
        .step('Create backup')
        .runDomain('infra', 'server', 'backup', [options.name || 'test-server'], { ...options })
        .expectSuccess()
        .step('Simulate disaster')
        .runDomain('infra', 'server', 'delete', [options.name || 'test-server'], { ...options })
        .expectSuccess()
        .step('Restore from backup')
        .runDomain('infra', 'server', 'restore', [options.name || 'test-server'], { ...options })
        .expectSuccess()
    },
    network: {
      create: (options) => new EnterpriseScenarioBuilder('Infrastructure Network Creation', 'infra')
        .step('Create network')
        .runDomain('infra', 'network', 'create', ['--name', options.name || 'test-network'], { ...options })
        .expectSuccess()
        .step('Configure network')
        .runDomain('infra', 'network', 'configure', [options.name || 'test-network'], { ...options })
        .expectSuccess()
    }
  },
  dev: {
    project: {
      create: (options) => EnterpriseScenarioBuilder.devProjectCreate(options),
      deploy: (options) => EnterpriseScenarioBuilder.devProjectDeploy(options),
      ciCd: (options) => new EnterpriseScenarioBuilder('Development CI/CD Pipeline', 'dev')
        .step('Build project')
        .runDomain('dev', 'project', 'build', [options.name || 'test-project'], { ...options })
        .expectSuccess()
        .step('Run tests')
        .runDomain('dev', 'test', 'run', [options.testName || 'test-suite'], { ...options })
        .expectSuccess()
        .step('Deploy project')
        .runDomain('dev', 'project', 'deploy', [options.name || 'test-project'], { ...options })
        .expectSuccess()
    },
    test: {
      run: (options) => new EnterpriseScenarioBuilder('Development Test Execution', 'dev')
        .step('Run test suite')
        .runDomain('dev', 'test', 'run', [options.name || 'test-suite'], { ...options })
        .expectSuccess()
        .step('Generate test report')
        .runDomain('dev', 'test', 'show', [options.name || 'test-suite'], { ...options })
        .expectSuccess(),
      regression: (options) => new EnterpriseScenarioBuilder('Development Regression Testing', 'dev')
        .step('Run regression tests')
        .runDomain('dev', 'test', 'run', ['--type', 'regression'], { ...options })
        .expectSuccess()
        .step('Compare with baseline')
        .runDomain('dev', 'snapshot', 'compare', [options.baseline || 'baseline'], { ...options })
        .expectSuccess(),
      performance: (options) => new EnterpriseScenarioBuilder('Development Performance Testing', 'dev')
        .step('Run performance tests')
        .runDomain('dev', 'test', 'run', ['--type', 'performance'], { ...options })
        .expectSuccess()
        .step('Analyze performance metrics')
        .runDomain('dev', 'test', 'show', ['--metrics'], { ...options })
        .expectSuccess()
    }
  },
  security: {
    user: {
      audit: (options) => EnterpriseScenarioBuilder.securityUserAudit(options),
      lifecycle: (options) => new EnterpriseScenarioBuilder('Security User Lifecycle', 'security')
        .step('Create user')
        .runDomain('security', 'user', 'create', ['--name', options.name || 'test-user'], { ...options })
        .expectSuccess()
        .step('Assign role')
        .runDomain('security', 'role', 'assign', [options.name || 'test-user', options.role || 'user'], { ...options })
        .expectSuccess()
        .step('Audit user')
        .runDomain('security', 'user', 'audit', [options.name || 'test-user'], { ...options })
        .expectSuccess()
        .step('Delete user')
        .runDomain('security', 'user', 'delete', [options.name || 'test-user'], { ...options })
        .expectSuccess()
    },
    policy: {
      validate: (options) => new EnterpriseScenarioBuilder('Security Policy Validation', 'security')
        .step('List policies')
        .runDomain('security', 'policy', 'list', [], { ...options })
        .expectSuccess()
        .step('Validate policies')
        .runDomain('security', 'policy', 'validate', [], { ...options })
        .expectSuccess()
        .step('Generate validation report')
        .runDomain('security', 'policy', 'validate', ['--report'], { ...options })
        .expectSuccess()
    }
  },
  crossDomain: {
    deployment: (options) => EnterpriseScenarioBuilder.deploymentWorkflow(options),
    compliance: (options) => EnterpriseScenarioBuilder.complianceWorkflow(options),
    disasterRecovery: (options) => new EnterpriseScenarioBuilder('Cross-Domain Disaster Recovery')
      .step('Backup infrastructure')
      .runDomain('infra', 'server', 'backup', [], { ...options })
      .expectSuccess()
      .step('Backup development')
      .runDomain('dev', 'project', 'backup', [], { ...options })
      .expectSuccess()
      .step('Backup security')
      .runDomain('security', 'user', 'backup', [], { ...options })
      .expectSuccess()
      .step('Restore infrastructure')
      .runDomain('infra', 'server', 'restore', [], { ...options })
      .expectSuccess()
      .step('Restore development')
      .runDomain('dev', 'project', 'restore', [], { ...options })
      .expectSuccess()
      .step('Restore security')
      .runDomain('security', 'user', 'restore', [], { ...options })
      .expectSuccess()
  }
}

// Convenience functions
export function createEnterpriseScenario(name, domain = null) {
  return new EnterpriseScenarioBuilder(name, domain)
}

export function createInfraScenario(type, options = {}) {
  return enterpriseScenarios.infra[type](options)
}

export function createDevScenario(type, options = {}) {
  return enterpriseScenarios.dev[type](options)
}

export function createSecurityScenario(type, options = {}) {
  return enterpriseScenarios.security[type](options)
}

export function createCrossDomainScenario(type, options = {}) {
  return enterpriseScenarios.crossDomain[type](options)
}

export default {
  EnterpriseScenarioBuilder,
  enterpriseScenarios,
  createEnterpriseScenario,
  createInfraScenario,
  createDevScenario,
  createSecurityScenario,
  createCrossDomainScenario
}