# Cleanroom Testing

This chapter covers testing GitVan applications in isolated Docker containers using the cleanroom runner. Cleanroom testing provides consistent, reproducible results across different environments.

## Overview

Cleanroom testing executes GitVan CLI commands in isolated Docker containers. It's ideal for:

- **Production-like testing** - Test in clean, isolated environments
- **Cross-environment validation** - Ensure consistency across systems
- **Integration testing** - Test complete workflows in isolation
- **CI/CD pipelines** - Reliable testing in automated environments

## Basic Cleanroom Testing

### Setup and Teardown

```javascript
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

// Setup cleanroom (run once per test suite)
await setupCleanroom({ 
  rootDir: '.',                    // Directory to copy into container
  nodeImage: 'node:20-alpine'      // Docker image to use
})

try {
  // Run tests in cleanroom
  const result = await runCitty(['--help'])
  result
    .expectSuccess()
    .expectOutput('USAGE')
    .expectNoStderr()
} finally {
  // Cleanup (run once per test suite)
  await teardownCleanroom()
}
```

### Basic Command Testing

```javascript
// Test help command in cleanroom
const helpResult = await runCitty(['--help'])
helpResult
  .expectSuccess()
  .expectOutput('USAGE')
  .expectNoStderr()

// Test version command in cleanroom
const versionResult = await runCitty(['--version'])
versionResult
  .expectSuccess()
  .expectOutput(/\d+\.\d+\.\d+/)
  .expectDuration(2000)  // Slightly longer due to container overhead
```

### Error Testing

```javascript
// Test invalid command in cleanroom
const errorResult = await runCitty(['invalid-command'])
errorResult
  .expectFailure()
  .expectStderr(/Unknown command/)
  .expectNoOutput()
```

## Advanced Cleanroom Testing

### Custom Docker Images

Use different Node.js versions:

```javascript
// Test with Node.js 18
await setupCleanroom({ 
  rootDir: '.',
  nodeImage: 'node:18-alpine'
})

// Test with Node.js 20
await setupCleanroom({ 
  rootDir: '.',
  nodeImage: 'node:20-alpine'
})

// Test with specific Alpine version
await setupCleanroom({ 
  rootDir: '.',
  nodeImage: 'node:20-alpine3.18'
})
```

### Project Directory Management

```javascript
// Copy specific directory
await setupCleanroom({ 
  rootDir: '/path/to/gitvan/project'
})

// Copy current directory
await setupCleanroom({ 
  rootDir: process.cwd()
})

// Copy with exclusions (via .dockerignore)
await setupCleanroom({ 
  rootDir: '.'
})
```

### Environment Variables

Test with custom environment:

```javascript
const result = await runCitty(['dev'], {
  env: {
    NODE_ENV: 'production',
    DEBUG: 'false',
    PORT: '8080'
  }
})
result.expectSuccess()
```

### Working Directory

Test from different directories in container:

```javascript
// Test from container root
const rootResult = await runCitty(['status'], {
  cwd: '/app'
})

// Test from subdirectory
const subResult = await runCitty(['status'], {
  cwd: '/app/subdir'
})
```

## Cleanroom Patterns

### Cross-Environment Testing

Compare local vs cleanroom results:

```javascript
async function testCrossEnvironment() {
  // Test locally
  const localResult = await runLocalCitty(['--version'])
  
  // Setup cleanroom
  await setupCleanroom({ rootDir: '.' })
  
  try {
    // Test in cleanroom
    const cleanroomResult = await runCitty(['--version'])
    
    // Compare results
    expect(localResult.result.stdout).toBe(cleanroomResult.result.stdout)
    expect(localResult.result.exitCode).toBe(cleanroomResult.result.exitCode)
  } finally {
    await teardownCleanroom()
  }
}
```

### Environment-Specific Behavior

Test environment-specific features:

```javascript
async function testEnvironmentSpecific() {
  await setupCleanroom({ rootDir: '.' })
  
  try {
    // Test daemon status (might behave differently in container)
    const daemonResult = await runCitty(['daemon', 'status'])
    
    // Accept different exit codes due to environment differences
    if (daemonResult.result.exitCode === 0) {
      daemonResult.expectOutput(/running/)
    } else {
      daemonResult.expectFailure()
    }
  } finally {
    await teardownCleanroom()
  }
}
```

### Resource Management

Test resource usage:

```javascript
async function testResourceUsage() {
  await setupCleanroom({ rootDir: '.' })
  
  try {
    // Test memory usage
    const result = await runCitty(['--help'])
    result
      .expectSuccess()
      .expectOutputLength(100, 10000)  // Reasonable output size
    
    // Test multiple commands
    const commands = ['--help', '--version', 'status']
    for (const cmd of commands) {
      const cmdResult = await runCitty(cmd)
      cmdResult.expectSuccess()
    }
  } finally {
    await teardownCleanroom()
  }
}
```

## Test Organization

### File Structure

Organize cleanroom tests:

```
tests/
├── cleanroom/
│   ├── basic/
│   │   ├── commands.test.mjs
│   │   └── errors.test.mjs
│   ├── integration/
│   │   ├── workflows.test.mjs
│   │   └── cross-env.test.mjs
│   └── performance/
│       ├── resource.test.mjs
│       └── load.test.mjs
```

### Test Categories

#### Basic Cleanroom Tests

```javascript
// tests/cleanroom/basic/commands.test.mjs
import { describe, it, beforeAll, afterAll } from 'vitest'
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

describe('Cleanroom Command Tests', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: '.' })
  })
  
  afterAll(async () => {
    await teardownCleanroom()
  })
  
  it('should show help in cleanroom', async () => {
    const result = await runCitty(['--help'])
    result
      .expectSuccess()
      .expectOutput('USAGE')
      .expectNoStderr()
  })
  
  it('should show version in cleanroom', async () => {
    const result = await runCitty(['--version'])
    result
      .expectSuccess()
      .expectOutput(/\d+\.\d+\.\d+/)
  })
})
```

#### Integration Tests

```javascript
// tests/cleanroom/integration/workflows.test.mjs
import { describe, it, beforeAll, afterAll } from 'vitest'
import { setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

describe('Cleanroom Workflow Tests', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: '.' })
  })
  
  afterAll(async () => {
    await teardownCleanroom()
  })
  
  it('should handle complete workflow', async () => {
    // Initialize project
    const initResult = await runCitty(['init', 'cleanroom-test'])
    initResult.expectSuccess().expectOutput(/Initialized/)
    
    // Check status
    const statusResult = await runCitty(['status'])
    statusResult.expectSuccess().expectOutput(/cleanroom-test/)
    
    // Build project
    const buildResult = await runCitty(['build'])
    buildResult.expectSuccess().expectOutput(/Build complete/)
  })
})
```

#### Cross-Environment Tests

```javascript
// tests/cleanroom/integration/cross-env.test.mjs
import { describe, it, beforeAll, afterAll } from 'vitest'
import { runLocalCitty, setupCleanroom, runCitty, teardownCleanroom } from 'citty-test-utils'

describe('Cross-Environment Tests', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: '.' })
  })
  
  afterAll(async () => {
    await teardownCleanroom()
  })
  
  it('should produce consistent results', async () => {
    const commands = ['--help', '--version', 'status']
    
    for (const cmd of commands) {
      // Test locally
      const localResult = await runLocalCitty(cmd)
      
      // Test in cleanroom
      const cleanroomResult = await runCitty(cmd)
      
      // Compare results
      expect(localResult.result.exitCode).toBe(cleanroomResult.result.exitCode)
      expect(localResult.result.stdout).toBe(cleanroomResult.result.stdout)
    }
  })
})
```

## Performance Testing

### Load Testing

Test system under load in cleanroom:

```javascript
async function testCleanroomLoad() {
  await setupCleanroom({ rootDir: '.' })
  
  try {
    const concurrency = 5
    const iterations = 20
    
    const promises = []
    
    for (let i = 0; i < iterations; i++) {
      promises.push(runCitty(['--help']))
      
      if (promises.length >= concurrency) {
        const results = await Promise.all(promises)
        results.forEach(result => result.expectSuccess())
        promises.length = 0
      }
    }
    
    // Handle remaining promises
    if (promises.length > 0) {
      const results = await Promise.all(promises)
      results.forEach(result => result.expectSuccess())
    }
  } finally {
    await teardownCleanroom()
  }
}
```

### Resource Monitoring

Monitor resource usage:

```javascript
async function testResourceMonitoring() {
  await setupCleanroom({ rootDir: '.' })
  
  try {
    // Test memory usage
    const result = await runCitty(['--help'])
    result
      .expectSuccess()
      .expectOutputLength(100, 10000)
    
    // Test multiple commands for memory leaks
    for (let i = 0; i < 10; i++) {
      const cmdResult = await runCitty(['--version'])
      cmdResult.expectSuccess()
    }
  } finally {
    await teardownCleanroom()
  }
}
```

## Docker Configuration

### .dockerignore

Optimize container size:

```
node_modules
.git
dist
coverage
.nyc_output
*.log
.env
.DS_Store
Thumbs.db
```

### Custom Dockerfile

Create custom test image:

```dockerfile
# Dockerfile.test
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Set up test environment
ENV NODE_ENV=test
ENV CI=true

CMD ["node", "src/cli.mjs", "--help"]
```

## Troubleshooting

### Docker Issues

**Error:** `Docker is not available`

**Solutions:**
1. Check Docker installation:
   ```bash
   docker --version
   ```

2. Start Docker service:
   ```bash
   # macOS
   open -a Docker
   
   # Linux
   sudo systemctl start docker
   ```

3. Verify Docker daemon:
   ```bash
   docker ps
   ```

### Container Creation Failed

**Error:** `Failed to setup cleanroom`

**Solutions:**
1. Check Docker image availability:
   ```bash
   docker pull node:20-alpine
   ```

2. Verify disk space:
   ```bash
   df -h
   ```

3. Try different image:
   ```javascript
   await setupCleanroom({
     nodeImage: 'node:18-alpine'
   })
   ```

### Container Timeout

**Error:** `Container startup timed out`

**Solutions:**
1. Increase timeout:
   ```javascript
   await setupCleanroom({
     rootDir: '.',
     timeout: 60000  // 60 seconds
   })
   ```

2. Use lighter image:
   ```javascript
   await setupCleanroom({
     nodeImage: 'node:18-alpine'
   })
   ```

### Project Copy Issues

**Error:** `Failed to copy project to container`

**Solutions:**
1. Check project size:
   ```bash
   du -sh .
   ```

2. Use .dockerignore to exclude large directories

3. Copy specific files only:
   ```javascript
   await setupCleanroom({
     rootDir: 'src'  // Copy only src directory
   })
   ```

## Best Practices

### 1. Resource Management

Always clean up resources:

```javascript
// Good: Proper cleanup
await setupCleanroom({ rootDir: '.' })
try {
  const result = await runCitty(['--help'])
  result.expectSuccess()
} finally {
  await teardownCleanroom()
}

// Bad: Resource leak
await setupCleanroom({ rootDir: '.' })
const result = await runCitty(['--help'])
result.expectSuccess()
// Missing teardown
```

### 2. Error Handling

Handle Docker errors gracefully:

```javascript
// Good: Error handling
try {
  await setupCleanroom({ rootDir: '.' })
} catch (error) {
  console.error('Cleanroom setup failed:', error.message)
  // Handle Docker not available
  return
}
```

### 3. Performance Optimization

Use appropriate images and configurations:

```javascript
// Good: Lightweight image
await setupCleanroom({
  rootDir: '.',
  nodeImage: 'node:18-alpine'  // Smaller than node:20
})

// Bad: Heavy image
await setupCleanroom({
  rootDir: '.',
  nodeImage: 'node:20'  // Larger than alpine
})
```

### 4. Test Isolation

Keep tests independent:

```javascript
// Good: Independent tests
describe('Cleanroom Tests', () => {
  beforeAll(async () => {
    await setupCleanroom({ rootDir: '.' })
  })
  
  afterAll(async () => {
    await teardownCleanroom()
  })
  
  it('test 1', async () => {
    const result = await runCitty(['--help'])
    result.expectSuccess()
  })
  
  it('test 2', async () => {
    const result = await runCitty(['--version'])
    result.expectSuccess()
  })
})
```

## Common Issues

### Docker Not Available

**Error:** `Docker is not available. Please ensure Docker is installed and running.`

**Solution:** Install and start Docker

### Container Startup Failed

**Error:** `Failed to setup cleanroom: [error message]`

**Solution:** Check Docker daemon and image availability

### Project Copy Failed

**Error:** `Failed to copy project to container`

**Solution:** Check project size and use .dockerignore

### Container Timeout

**Error:** `Container startup timed out`

**Solution:** Increase timeout or use lighter image

## Summary

Cleanroom testing provides:

1. **Isolated environment** - Clean, reproducible testing
2. **Cross-platform consistency** - Same results across systems
3. **Production-like testing** - Test in containerized environment
4. **Resource management** - Controlled resource usage
5. **CI/CD integration** - Reliable automated testing

Cleanroom testing is essential for:
- Production-like testing
- Cross-environment validation
- CI/CD pipelines
- Integration testing

For complex multi-step workflows, consider using [Scenario Testing](./scenario-testing.md).

---

**Ready for complex workflows?** Let's explore [Scenario Testing](./scenario-testing.md)!
