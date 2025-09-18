# Executable Specifications Guide

## Overview

This document defines how GitVan v2 specifications should be written to be executable and testable, following GitHub's specification-driven development methodology.

## Specification Structure

### 1. Executable Test Scenarios

Each specification must include executable test scenarios that can be run to validate implementation:

```javascript
// Example: Executable test for job definition
describe('Job Definition System', () => {
  test('should discover jobs from filesystem', async () => {
    // Given: A repository with jobs/ directory
    const repo = await createTestRepo({
      'jobs/example.mjs': `
        export default defineJob({
          kind: 'atomic',
          meta: { desc: 'Test job' },
          run: () => ({ ok: true })
        })
      `
    })
    
    // When: Scanning for jobs
    const jobs = await discoverJobs(repo.root)
    
    // Then: Job should be discoverable
    expect(jobs).toHaveLength(1)
    expect(jobs[0].name).toBe('example')
    expect(jobs[0].meta.desc).toBe('Test job')
  })
})
```

### 2. Behavior-Driven Specifications

Use Given-When-Then format for clear behavior specification:

```gherkin
Feature: Job Execution Engine
  Scenario: Execute atomic job with composables
    Given a job using useGit() and useTemplate() composables
    When the job executes within withGitVan context
    Then all composables should have access to RunContext
    And useGit() should return properly configured GitAPI instance
    And useTemplate() should render Nunjucks templates deterministically
```

### 3. Contract-First API Design

Define API contracts with executable validation:

```javascript
// API Contract Definition
const GitAPI = {
  root: 'string',
  head: '() => string',
  branch: '() => string',
  run: '(args: string) => string',
  note: '(ref: string, msg: string, sha?: string) => void'
}

// Executable Contract Validation
function validateGitAPI(api) {
  return Object.entries(GitAPI).every(([key, type]) => {
    return typeof api[key] === type.replace(/[()]/g, '')
  })
}
```

## Executable Specification Templates

### Core System Specification Template

```markdown
# [Specification Name]

## Executable Requirements

### Test Suite: [Feature Name]
```javascript
describe('[Feature Name]', () => {
  beforeEach(() => {
    // Setup test environment
  })
  
  test('[specific behavior]', async () => {
    // Given-When-Then implementation
  })
})
```

### Performance Specifications
```javascript
// Performance contract
const performanceContract = {
  'job-execution-time': '< 100ms for simple tasks',
  'template-rendering-speed': '> 1000 templates/second',
  'daemon-memory-usage': '< 50MB baseline'
}

// Executable performance tests
describe('Performance Contracts', () => {
  test('job execution time', async () => {
    const start = performance.now()
    await executeJob('simple-task')
    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })
})
```

### Security Specifications
```javascript
// Security contract
const securityContract = {
  'no-code-injection': 'Template rendering must escape user input',
  'signed-commits': 'Must verify commit signatures when required',
  'command-execution': 'Must validate allowed commands'
}

// Executable security tests
describe('Security Contracts', () => {
  test('template injection prevention', () => {
    const maliciousInput = '{{7*7}}'
    const result = renderTemplate('test.njk', { input: maliciousInput })
    expect(result).not.toContain('49')
  })
})
```

## Specification Validation Framework

### Automated Validation Pipeline

```javascript
// spec-validator.mjs
export class SpecificationValidator {
  async validateSpecification(specPath) {
    const spec = await import(specPath)
    
    return {
      executableTests: await this.runExecutableTests(spec),
      contractValidation: await this.validateContracts(spec),
      performanceValidation: await this.validatePerformance(spec),
      securityValidation: await this.validateSecurity(spec)
    }
  }
  
  async runExecutableTests(spec) {
    // Run all test scenarios defined in specification
  }
  
  async validateContracts(spec) {
    // Validate API contracts are met
  }
}
```

### Continuous Validation

```yaml
# .github/workflows/spec-validation.yml
name: Specification Validation
on: [push, pull_request]

jobs:
  validate-specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate Executable Specifications
        run: |
          npm run spec:validate
      - name: Run Contract Tests
        run: |
          npm run spec:contracts
      - name: Performance Validation
        run: |
          npm run spec:performance
```

## Integration with GitHub Spec Kit

### Spec Kit Configuration

```json
{
  "specKit": {
    "executableSpecs": true,
    "contractValidation": true,
    "performanceMonitoring": true,
    "securityScanning": true,
    "aiIntegration": {
      "copilot": true,
      "claude": true,
      "validation": true
    }
  }
}
```

### AI-Assisted Specification Development

```javascript
// AI integration for spec development
export const specKitIntegration = {
  async generateExecutableTests(specification) {
    // Use AI to generate test scenarios from natural language specs
  },
  
  async validateImplementation(specification, code) {
    // Use AI to validate code matches specification
  },
  
  async generateDocumentation(specification) {
    // Use AI to generate comprehensive documentation
  }
}
```

## Best Practices

### 1. Write Specifications Before Implementation
- Define WHAT and WHY, not HOW
- Include executable test scenarios
- Validate contracts before coding

### 2. Make Specifications Executable
- Every requirement should have a test
- Use Given-When-Then format
- Include performance and security contracts

### 3. Continuous Validation
- Run specifications on every commit
- Validate contracts in CI/CD
- Monitor performance continuously

### 4. Stakeholder Collaboration
- Use natural language for business requirements
- Include examples and scenarios
- Make specifications reviewable

### 5. AI Integration
- Use AI tools to generate test scenarios
- Validate implementation against specifications
- Generate documentation automatically

## Tools and Frameworks

### Required Tools
- **Jest**: Test framework for executable specifications
- **Cucumber**: BDD framework for Given-When-Then scenarios
- **Contract Testing**: Pact or similar for API contract validation
- **Performance Testing**: Artillery or k6 for performance contracts
- **Security Testing**: OWASP ZAP or similar for security validation

### GitHub Integration
- **Spec Kit**: GitHub's specification toolkit
- **Copilot**: AI-assisted specification development
- **Actions**: Automated validation pipelines
- **Issues**: Specification tracking and collaboration

## Example: Complete Executable Specification

```markdown
# Job Definition System

## Executable Requirements

### Test Suite: Job Discovery
```javascript
describe('Job Discovery', () => {
  test('should discover jobs from filesystem', async () => {
    // Given: Repository with jobs
    const repo = await createTestRepo({
      'jobs/example.mjs': `
        export default defineJob({
          kind: 'atomic',
          meta: { desc: 'Test job' },
          run: () => ({ ok: true })
        })
      `
    })
    
    // When: Scanning for jobs
    const jobs = await discoverJobs(repo.root)
    
    // Then: Job should be discoverable
    expect(jobs).toHaveLength(1)
    expect(jobs[0].name).toBe('example')
  })
})
```

### Performance Contract
- Job discovery scan: < 500ms for 1000 jobs
- Context initialization: < 50ms
- Lock acquisition: < 100ms under contention

### Security Contract
- No code injection in job definitions
- Validate job metadata before execution
- Sanitize all user inputs

### API Contract
```javascript
const JobDefinitionContract = {
  defineJob: '(config) => JobDefinition',
  discoverJobs: '(root: string) => JobDefinition[]',
  validateJob: '(job: JobDefinition) => ValidationResult'
}
```
