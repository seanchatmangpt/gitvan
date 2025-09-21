# CI/CD Integration

This chapter covers integrating GitVan testing into CI/CD pipelines using `citty-test-utils`. Learn how to set up automated testing, reporting, and deployment validation.

## Overview

CI/CD integration provides:

- **Automated testing** - Run tests on every commit
- **Quality gates** - Prevent bad code from reaching production
- **Performance monitoring** - Track performance over time
- **Cross-environment validation** - Test across different environments
- **Deployment validation** - Verify deployments work correctly

## GitHub Actions Integration

### Basic GitHub Actions Workflow

```yaml
# .github/workflows/cli-tests.yml
name: CLI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install citty-test-utils
      run: npm install citty-test-utils
      
    - name: Run unit tests
      run: npm run test:unit
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Run E2E tests
      run: npm run test:e2e
```

### Advanced GitHub Actions Workflow

```yaml
# .github/workflows/advanced-cli-tests.yml
name: Advanced CLI Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  test-matrix:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: ['18', '20']
        
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install citty-test-utils
      run: npm install citty-test-utils
      
    - name: Run tests
      run: npm run test:cli
      
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results-${{ matrix.os }}-${{ matrix.node-version }}
        path: test-results.json
        
  cleanroom-tests:
    runs-on: ubuntu-latest
    needs: test-matrix
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install citty-test-utils
      run: npm install citty-test-utils
      
    - name: Run cleanroom tests
      run: npm run test:cleanroom
      
  performance-tests:
    runs-on: ubuntu-latest
    needs: test-matrix
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install citty-test-utils
      run: npm install citty-test-utils
      
    - name: Run performance tests
      run: npm run test:performance
      
    - name: Upload performance results
      uses: actions/upload-artifact@v3
      with:
        name: performance-results
        path: performance-results.json
```

### Docker-based Testing

```yaml
# .github/workflows/docker-tests.yml
name: Docker Tests

on: [push, pull_request]

jobs:
  docker-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build test image
      run: docker build -f Dockerfile.test -t gitvan-test .
      
    - name: Run tests in container
      run: docker run --rm gitvan-test npm run test:cli
      
    - name: Run cleanroom tests
      run: docker run --rm gitvan-test npm run test:cleanroom
```

## Jenkins Integration

### Jenkinsfile

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        NPM_CACHE = '~/.npm'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh 'node --version'
                sh 'npm --version'
                sh 'npm ci'
                sh 'npm install citty-test-utils'
            }
        }
        
        stage('Unit Tests') {
            steps {
                sh 'npm run test:unit'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                }
            }
        }
        
        stage('Integration Tests') {
            steps {
                sh 'npm run test:integration'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'integration-results.xml'
                }
            }
        }
        
        stage('E2E Tests') {
            steps {
                sh 'npm run test:e2e'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'e2e-results.xml'
                }
            }
        }
        
        stage('Cleanroom Tests') {
            steps {
                sh 'npm run test:cleanroom'
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'cleanroom-results.xml'
                }
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'test-results.json', fingerprint: true
            archiveArtifacts artifacts: 'coverage/', fingerprint: true
        }
        success {
            emailext (
                subject: "Build Successful: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Build successful. Tests passed.",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
        failure {
            emailext (
                subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Build failed. Please check the logs.",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
```

## GitLab CI Integration

### .gitlab-ci.yml

```yaml
# .gitlab-ci.yml
stages:
  - test
  - e2e
  - cleanroom
  - performance

variables:
  NODE_VERSION: "18"
  NPM_CACHE: ".npm"

cache:
  paths:
    - node_modules/
    - .npm/

test:unit:
  stage: test
  image: node:18-alpine
  script:
    - npm ci
    - npm install citty-test-utils
    - npm run test:unit
  artifacts:
    reports:
      junit: test-results.xml
    paths:
      - coverage/
    expire_in: 1 week

test:integration:
  stage: test
  image: node:18-alpine
  script:
    - npm ci
    - npm install citty-test-utils
    - npm run test:integration
  artifacts:
    reports:
      junit: integration-results.xml
    expire_in: 1 week

test:e2e:
  stage: e2e
  image: node:18-alpine
  script:
    - npm ci
    - npm install citty-test-utils
    - npm run test:e2e
  artifacts:
    reports:
      junit: e2e-results.xml
    expire_in: 1 week

test:cleanroom:
  stage: cleanroom
  image: node:18-alpine
  services:
    - docker:dind
  script:
    - npm ci
    - npm install citty-test-utils
    - npm run test:cleanroom
  artifacts:
    reports:
      junit: cleanroom-results.xml
    expire_in: 1 week

test:performance:
  stage: performance
  image: node:18-alpine
  script:
    - npm ci
    - npm install citty-test-utils
    - npm run test:performance
  artifacts:
    paths:
      - performance-results.json
    expire_in: 1 week
```

## Azure DevOps Integration

### azure-pipelines.yml

```yaml
# azure-pipelines.yml
trigger:
- main
- develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '18.x'
  npmCache: '~/.npm'

stages:
- stage: Test
  displayName: 'Test Stage'
  jobs:
  - job: UnitTests
    displayName: 'Unit Tests'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(nodeVersion)
    - task: Cache@2
      inputs:
        key: 'npm | "$(Agent.OS)" | package-lock.json'
        restoreKeys: |
          npm | "$(Agent.OS)"
        path: $(npmCache)
    - script: |
        npm ci
        npm install citty-test-utils
        npm run test:unit
      displayName: 'Run Unit Tests'
    - task: PublishTestResults@2
      inputs:
        testResultsFiles: 'test-results.xml'
        testRunTitle: 'Unit Tests'
        
  - job: IntegrationTests
    displayName: 'Integration Tests'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(nodeVersion)
    - task: Cache@2
      inputs:
        key: 'npm | "$(Agent.OS)" | package-lock.json'
        restoreKeys: |
          npm | "$(Agent.OS)"
        path: $(npmCache)
    - script: |
        npm ci
        npm install citty-test-utils
        npm run test:integration
      displayName: 'Run Integration Tests'
    - task: PublishTestResults@2
      inputs:
        testResultsFiles: 'integration-results.xml'
        testRunTitle: 'Integration Tests'
        
  - job: E2ETests
    displayName: 'E2E Tests'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(nodeVersion)
    - task: Cache@2
      inputs:
        key: 'npm | "$(Agent.OS)" | package-lock.json'
        restoreKeys: |
          npm | "$(Agent.OS)"
        path: $(npmCache)
    - script: |
        npm ci
        npm install citty-test-utils
        npm run test:e2e
      displayName: 'Run E2E Tests'
    - task: PublishTestResults@2
      inputs:
        testResultsFiles: 'e2e-results.xml'
        testRunTitle: 'E2E Tests'
        
  - job: CleanroomTests
    displayName: 'Cleanroom Tests'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(nodeVersion)
    - task: Cache@2
      inputs:
        key: 'npm | "$(Agent.OS)" | package-lock.json'
        restoreKeys: |
          npm | "$(Agent.OS)"
        path: $(npmCache)
    - script: |
        npm ci
        npm install citty-test-utils
        npm run test:cleanroom
      displayName: 'Run Cleanroom Tests'
    - task: PublishTestResults@2
      inputs:
        testResultsFiles: 'cleanroom-results.xml'
        testRunTitle: 'Cleanroom Tests'
```

## Test Scripts Configuration

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:cleanroom": "vitest run tests/cleanroom",
    "test:performance": "vitest run tests/performance",
    "test:cli": "vitest run tests/cli-tests.mjs",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:ci": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### Vitest Configuration

```javascript
// vitest.config.mjs
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    timeout: 60000,
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
    include: ['tests/**/*.test.mjs', 'tests/**/*.spec.mjs'],
    exclude: ['node_modules/**', 'dist/**', '**/*.d.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        '*.js',
        '!**/*.test.mjs',
        '!**/*.spec.mjs',
        '!**/node_modules/**',
        '!**/coverage/**',
      ],
      exclude: ['tests/**', 'node_modules/**', 'coverage/**', '**/*.d.ts'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    reporter: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results.xml',
    },
  },
})
```

## Docker Integration

### Dockerfile.test

```dockerfile
# Dockerfile.test
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Install citty-test-utils
RUN npm install citty-test-utils

# Set up test environment
ENV NODE_ENV=test
ENV CI=true

# Run tests
CMD ["npm", "run", "test:ci"]
```

### Docker Compose for Testing

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  test:
    build:
      context: .
      dockerfile: Dockerfile.test
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=test
      - CI=true
    command: npm run test:ci
    
  cleanroom-test:
    build:
      context: .
      dockerfile: Dockerfile.test
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=test
      - CI=true
    command: npm run test:cleanroom
```

## Test Reporting

### JUnit XML Output

```javascript
// vitest.config.mjs
export default defineConfig({
  test: {
    reporter: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results.xml',
    },
  },
})
```

### Coverage Reporting

```javascript
// vitest.config.mjs
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
})
```

### Custom Test Reporter

```javascript
// custom-reporter.mjs
export class CustomReporter {
  constructor() {
    this.results = []
  }
  
  onTestResult(test, result) {
    this.results.push({
      name: test.name,
      status: result.status,
      duration: result.duration,
      error: result.error
    })
  }
  
  onRunComplete() {
    const report = {
      timestamp: new Date().toISOString(),
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      results: this.results
    }
    
    require('fs').writeFileSync('test-report.json', JSON.stringify(report, null, 2))
  }
}
```

## Performance Monitoring

### Performance Test Configuration

```javascript
// performance-test.mjs
import { runLocalCitty } from 'citty-test-utils'

export class PerformanceMonitor {
  constructor() {
    this.metrics = []
  }
  
  async measureCommand(command, iterations = 10) {
    const results = []
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      const result = await runLocalCitty(command)
      const duration = Date.now() - start
      
      results.push({
        iteration: i + 1,
        duration,
        exitCode: result.result.exitCode,
        success: result.result.exitCode === 0
      })
    }
    
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
    const successRate = results.filter(r => r.success).length / results.length
    
    this.metrics.push({
      command: command.join(' '),
      iterations,
      avgDuration,
      successRate,
      results
    })
    
    return { avgDuration, successRate, results }
  }
  
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics
    }
    
    require('fs').writeFileSync('performance-report.json', JSON.stringify(report, null, 2))
    return report
  }
}
```

## Quality Gates

### Test Quality Gates

```javascript
// quality-gates.mjs
export class QualityGates {
  constructor() {
    this.gates = []
  }
  
  addGate(name, condition, message) {
    this.gates.push({ name, condition, message })
  }
  
  async checkGates() {
    const results = []
    
    for (const gate of this.gates) {
      try {
        const passed = await gate.condition()
        results.push({
          name: gate.name,
          passed,
          message: gate.message
        })
      } catch (error) {
        results.push({
          name: gate.name,
          passed: false,
          message: `${gate.message}: ${error.message}`
        })
      }
    }
    
    return results
  }
  
  async enforceGates() {
    const results = await this.checkGates()
    const failed = results.filter(r => !r.passed)
    
    if (failed.length > 0) {
      console.error('Quality gates failed:')
      failed.forEach(gate => {
        console.error(`❌ ${gate.name}: ${gate.message}`)
      })
      process.exit(1)
    }
    
    console.log('✅ All quality gates passed')
  }
}

// Usage
const qualityGates = new QualityGates()

qualityGates.addGate(
  'Test Coverage',
  async () => {
    const coverage = require('./coverage/coverage-summary.json')
    return coverage.total.lines.pct >= 80
  },
  'Test coverage must be at least 80%'
)

qualityGates.addGate(
  'Performance',
  async () => {
    const result = await runLocalCitty(['--help'])
    return result.result.duration < 1000
  },
  'Help command must complete within 1 second'
)

await qualityGates.enforceGates()
```

## Deployment Validation

### Post-Deployment Testing

```javascript
// deployment-validation.mjs
export class DeploymentValidator {
  constructor(deploymentUrl) {
    this.deploymentUrl = deploymentUrl
  }
  
  async validateDeployment() {
    console.log(`🔍 Validating deployment at ${this.deploymentUrl}`)
    
    const validations = [
      this.validateHealthCheck(),
      this.validateVersion(),
      this.validateEndpoints(),
      this.validatePerformance()
    ]
    
    const results = await Promise.all(validations)
    const failed = results.filter(r => !r.passed)
    
    if (failed.length > 0) {
      console.error('Deployment validation failed:')
      failed.forEach(validation => {
        console.error(`❌ ${validation.name}: ${validation.message}`)
      })
      throw new Error('Deployment validation failed')
    }
    
    console.log('✅ Deployment validation passed')
    return results
  }
  
  async validateHealthCheck() {
    try {
      const result = await runLocalCitty(['health'])
      return {
        name: 'Health Check',
        passed: result.result.exitCode === 0,
        message: 'Health check endpoint responding'
      }
    } catch (error) {
      return {
        name: 'Health Check',
        passed: false,
        message: `Health check failed: ${error.message}`
      }
    }
  }
  
  async validateVersion() {
    try {
      const result = await runLocalCitty(['--version'])
      return {
        name: 'Version Check',
        passed: result.result.exitCode === 0,
        message: 'Version command working'
      }
    } catch (error) {
      return {
        name: 'Version Check',
        passed: false,
        message: `Version check failed: ${error.message}`
      }
    }
  }
  
  async validateEndpoints() {
    try {
      const result = await runLocalCitty(['--help'])
      return {
        name: 'Endpoints Check',
        passed: result.result.exitCode === 0,
        message: 'Help endpoint responding'
      }
    } catch (error) {
      return {
        name: 'Endpoints Check',
        passed: false,
        message: `Endpoints check failed: ${error.message}`
      }
    }
  }
  
  async validatePerformance() {
    try {
      const start = Date.now()
      const result = await runLocalCitty(['--help'])
      const duration = Date.now() - start
      
      return {
        name: 'Performance Check',
        passed: duration < 5000,
        message: `Response time: ${duration}ms`
      }
    } catch (error) {
      return {
        name: 'Performance Check',
        passed: false,
        message: `Performance check failed: ${error.message}`
      }
    }
  }
}

// Usage
const validator = new DeploymentValidator('https://my-app.com')
await validator.validateDeployment()
```

## Best Practices

### 1. Test Organization

Organize tests for CI/CD:

```javascript
// Good: Organized test structure
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Medium-speed integration tests
├── e2e/           # Slow, end-to-end tests
└── performance/   # Performance and load tests
```

### 2. Parallel Execution

Run tests in parallel:

```yaml
# Good: Parallel test execution
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:integration
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:e2e
```

### 3. Resource Management

Manage CI/CD resources:

```yaml
# Good: Resource management
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - run: npm run test:ci
```

### 4. Error Handling

Handle CI/CD errors gracefully:

```javascript
// Good: Error handling
try {
  await runTest()
  console.log('✅ Test passed')
} catch (error) {
  console.error('❌ Test failed:', error.message)
  process.exit(1)
}
```

## Common Issues

### CI/CD Environment Issues

**Error:** Tests pass locally but fail in CI/CD

**Solutions:**
1. Check environment differences
2. Verify Node.js version
3. Check environment variables
4. Ensure dependencies are installed

### Docker Issues

**Error:** Docker not available in CI/CD

**Solutions:**
1. Use Docker-in-Docker (DinD)
2. Use Docker service in CI/CD
3. Check Docker permissions

### Performance Issues

**Error:** Tests timeout in CI/CD

**Solutions:**
1. Increase timeout values
2. Optimize test execution
3. Use parallel execution
4. Check resource limits

## Summary

CI/CD integration provides:

1. **Automated testing** - Run tests on every commit
2. **Quality gates** - Prevent bad code from reaching production
3. **Performance monitoring** - Track performance over time
4. **Cross-environment validation** - Test across different environments
5. **Deployment validation** - Verify deployments work correctly

CI/CD integration is essential for:
- Automated quality assurance
- Continuous deployment
- Performance monitoring
- Cross-environment testing

For troubleshooting common issues, see [Troubleshooting](./troubleshooting.md).

---

**Need help with issues?** Let's explore [Troubleshooting](./troubleshooting.md)!
