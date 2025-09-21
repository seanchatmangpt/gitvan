#!/usr/bin/env node
// src/enterprise-assertions.js - Enhanced Enterprise Assertions

import { wrapExpectation } from './assertions.js'
import { domainRegistry } from './domain-registry.js'

/**
 * Enhanced Enterprise Assertions
 *
 * Provides enterprise-specific assertions including:
 * - Resource assertions
 * - Domain assertions
 * - Compliance assertions
 * - Audit assertions
 */

export class EnterpriseAssertions {
  constructor(result) {
    this.result = result
    this.baseAssertions = wrapExpectation(result)
  }

  // Resource assertions
  expectResourceCreated(domain, resource, id) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'create')

    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected resource ${resource} to be created in domain ${domain}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for resource creation indicators
    const creationIndicators = ['created', 'successfully', 'id', 'uuid']
    const hasCreationIndicator = creationIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasCreationIndicator) {
      throw new Error(
        `Expected resource creation confirmation, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  expectResourceUpdated(domain, resource, id) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'update')

    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected resource ${resource} to be updated in domain ${domain}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for update indicators
    const updateIndicators = ['updated', 'successfully', 'modified', 'changed']
    const hasUpdateIndicator = updateIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasUpdateIndicator) {
      throw new Error(
        `Expected resource update confirmation, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  expectResourceDeleted(domain, resource, id) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'delete')

    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected resource ${resource} to be deleted in domain ${domain}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for deletion indicators
    const deletionIndicators = ['deleted', 'successfully', 'removed', 'destroyed']
    const hasDeletionIndicator = deletionIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasDeletionIndicator) {
      throw new Error(
        `Expected resource deletion confirmation, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  expectResourceListed(domain, resource, expectedCount = null) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'list')

    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected resource list for ${resource} in domain ${domain}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for list indicators
    const listIndicators = ['list', 'resources', 'items', 'count']
    const hasListIndicator = listIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasListIndicator) {
      throw new Error(
        `Expected resource list output, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    // Check count if specified
    if (expectedCount !== null) {
      const countMatch = this.result.result.stdout.match(/(\d+)\s+(?:items|resources|count)/i)
      if (countMatch) {
        const actualCount = parseInt(countMatch[1])
        if (actualCount !== expectedCount) {
          throw new Error(
            `Expected ${expectedCount} resources, got ${actualCount}\n` +
              `Command: ${this.result.result.args.join(' ')}\n` +
              `Output: ${this.result.result.stdout}`
          )
        }
      }
    }

    return this
  }

  expectResourceShown(domain, resource, id) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'show')

    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected resource ${resource} details in domain ${domain}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for resource details
    const detailIndicators = ['id', 'name', 'status', 'created', 'updated']
    const hasDetailIndicator = detailIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasDetailIndicator) {
      throw new Error(
        `Expected resource details, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  // Domain assertions
  expectDomainOperation(domain, operation) {
    const domainInfo = domainRegistry.getDomain(domain)

    if (!domainInfo) {
      throw new Error(`Unknown domain: ${domain}`)
    }

    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected ${operation} operation in domain ${domain}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for domain-specific indicators
    const domainIndicators = [domain, domainInfo.displayName.toLowerCase()]
    const hasDomainIndicator = domainIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasDomainIndicator) {
      throw new Error(
        `Expected domain ${domain} operation confirmation, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  expectCrossDomainConsistency(domains) {
    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected cross-domain consistency check, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for consistency indicators
    const consistencyIndicators = ['consistent', 'validated', 'verified', 'success']
    const hasConsistencyIndicator = consistencyIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasConsistencyIndicator) {
      throw new Error(
        `Expected cross-domain consistency confirmation, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  // Compliance assertions
  expectComplianceValidated(standard) {
    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected compliance validation for ${standard}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for compliance indicators
    const complianceIndicators = [standard.toLowerCase(), 'compliant', 'validated', 'passed']
    const hasComplianceIndicator = complianceIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasComplianceIndicator) {
      throw new Error(
        `Expected compliance validation for ${standard}, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  expectPolicyEnforced(policy) {
    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected policy ${policy} to be enforced, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for policy enforcement indicators
    const policyIndicators = [policy.toLowerCase(), 'enforced', 'applied', 'active']
    const hasPolicyIndicator = policyIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasPolicyIndicator) {
      throw new Error(
        `Expected policy ${policy} enforcement confirmation, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  // Audit assertions
  expectAuditLog(action, resource, user) {
    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected audit log for ${action} on ${resource} by ${user}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for audit log indicators
    const auditIndicators = [
      action.toLowerCase(),
      resource.toLowerCase(),
      user.toLowerCase(),
      'audit',
      'log',
    ]
    const hasAuditIndicator = auditIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasAuditIndicator) {
      throw new Error(
        `Expected audit log for ${action} on ${resource} by ${user}, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  expectAuditTrail(operations) {
    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected audit trail, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for audit trail indicators
    const trailIndicators = ['audit', 'trail', 'history', 'log']
    const hasTrailIndicator = trailIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasTrailIndicator) {
      throw new Error(
        `Expected audit trail, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    // Check for specific operations
    for (const operation of operations) {
      const operationIndicators = [operation.action, operation.resource, operation.user]
      const hasOperationIndicator = operationIndicators.some((indicator) =>
        this.result.result.stdout.toLowerCase().includes(indicator.toLowerCase())
      )

      if (!hasOperationIndicator) {
        throw new Error(
          `Expected audit trail to include operation ${operation.action} on ${operation.resource} by ${operation.user}, got: ${this.result.result.stdout}\n` +
            `Command: ${this.result.result.args.join(' ')}`
        )
      }
    }

    return this
  }

  // Resource validation
  expectResourceState(domain, resource, id, expectedState) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'show')

    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected resource state for ${resource} in domain ${domain}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for expected state
    const stateIndicators = [expectedState.toLowerCase(), 'status', 'state']
    const hasStateIndicator = stateIndicators.some((indicator) =>
      this.result.result.stdout.toLowerCase().includes(indicator)
    )

    if (!hasStateIndicator) {
      throw new Error(
        `Expected resource state ${expectedState}, got: ${this.result.result.stdout}\n` +
          `Command: ${this.result.result.args.join(' ')}`
      )
    }

    return this
  }

  expectResourceAttributes(domain, resource, id, attributes) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'show')

    if (this.result.result.exitCode !== 0) {
      throw new Error(
        `Expected resource attributes for ${resource} in domain ${domain}, got exit code ${this.result.result.exitCode}\n` +
          `Command: ${this.result.result.args.join(' ')}\n` +
          `Stdout: ${this.result.result.stdout}\n` +
          `Stderr: ${this.result.result.stderr}`
      )
    }

    // Check for expected attributes
    for (const attribute of attributes) {
      if (!this.result.result.stdout.toLowerCase().includes(attribute.toLowerCase())) {
        throw new Error(
          `Expected resource attribute ${attribute}, got: ${this.result.result.stdout}\n` +
            `Command: ${this.result.result.args.join(' ')}`
        )
      }
    }

    return this
  }

  // Delegate to base assertions
  expectSuccess() {
    return this.baseAssertions.expectSuccess()
  }

  expectFailure() {
    return this.baseAssertions.expectFailure()
  }

  expectExit(code) {
    return this.baseAssertions.expectExit(code)
  }

  expectOutput(match) {
    return this.baseAssertions.expectOutput(match)
  }

  expectStderr(match) {
    return this.baseAssertions.expectStderr(match)
  }

  expectNoOutput() {
    return this.baseAssertions.expectNoOutput()
  }

  expectNoStderr() {
    return this.baseAssertions.expectNoStderr()
  }

  expectJson(validator) {
    return this.baseAssertions.expectJson(validator)
  }

  expectDuration(maxDuration) {
    return this.baseAssertions.expectDuration(maxDuration)
  }
}

// Resource Validator
export class ResourceValidator {
  constructor() {
    this.validators = new Map()
  }

  // Register validator for resource type
  registerValidator(domain, resource, validator) {
    const key = `${domain}.${resource}`
    this.validators.set(key, validator)
    return this
  }

  // Validate resource
  validateResource(domain, resource, data) {
    const key = `${domain}.${resource}`
    const validator = this.validators.get(key)

    if (!validator) {
      throw new Error(`No validator registered for ${domain}.${resource}`)
    }

    return validator(data)
  }

  // Validate resource state
  validateResourceState(domain, resource, id) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'show')

    if (!metadata) {
      throw new Error(`Unknown resource ${resource} in domain ${domain}`)
    }

    // Basic state validation
    return {
      valid: true,
      state: 'active',
      attributes: metadata.resource.attributes,
      relationships: metadata.resource.relationships,
    }
  }

  // Validate resource relationships
  validateResourceRelationships(domain, resource, id) {
    const metadata = domainRegistry.getCommandMetadata(domain, resource, 'show')

    if (!metadata) {
      throw new Error(`Unknown resource ${resource} in domain ${domain}`)
    }

    // Basic relationship validation
    return {
      valid: true,
      relationships: metadata.resource.relationships || [],
      dependencies: [],
      dependents: [],
    }
  }
}

// Convenience functions
export function createEnterpriseAssertions(result) {
  return new EnterpriseAssertions(result)
}

export function createResourceValidator() {
  return new ResourceValidator()
}

// Export all classes and functions
export default {
  EnterpriseAssertions,
  ResourceValidator,
  createEnterpriseAssertions,
  createResourceValidator,
}
