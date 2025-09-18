# GitVan v2 Integration Test Scenarios

## Overview

This document defines comprehensive integration test scenarios that validate GitVan v2's ability to work correctly with external systems, tools, and environments. Integration tests ensure that all components work together seamlessly in real-world conditions.

## Test Environment Setup

### Base Test Environment
```bash
# Standard integration test setup
export GITVAN_TEST_MODE=integration
export GITVAN_DEBUG=true
export TZ=UTC

# Initialize test repository
git init test-repo
cd test-repo
git config user.name "GitVan Test"
git config user.email "test@gitvan.dev"
git config commit.gpgsign false  # For non-signing tests

# Install GitVan
npm install gitvan
```

### Multi-Environment Matrix
- **Local Development**: macOS, Windows, Ubuntu
- **CI/CD Platforms**: GitHub Actions, GitLab CI, Jenkins
- **Container Environments**: Docker, Podman
- **Cloud Platforms**: AWS EC2, Google Cloud, Azure VMs

## Git Integration Tests

### Test Suite: GIT-INT-001 - Core Git Operations

#### Test Case: Basic Git Workflow Integration
```bash
#!/bin/bash
# Test: GitVan integrates with standard Git workflow
set -e

# Setup
git init integration-test
cd integration-test
echo '{"type":"module"}' > package.json
npm install gitvan

# Create basic job
mkdir -p jobs/test
cat > jobs/test/basic.mjs << 'EOF'
import { defineJob } from 'gitvan/define'
import { useGit } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Basic Git integration test' },
  async run() {
    const git = useGit()
    const status = git.status()
    const head = git.head()
    return { ok: true, meta: { status, head } }
  }
})
EOF

# Test execution
gitvan job run --name test:basic

# Verify receipt
git notes --ref=refs/notes/gitvan/results show HEAD | jq '.status' | grep -q "OK"
echo "✅ Basic Git workflow integration test passed"
```

#### Test Case: Signed Commit Integration
```bash
#!/bin/bash
# Test: GitVan handles GPG signed commits correctly
set -e

# Setup GPG for testing (skip if no GPG available)
if command -v gpg >/dev/null 2>&1; then
  # Configure Git for signing
  git config commit.gpgsign true
  git config user.signingkey test@gitvan.dev

  # Create and run job
  echo "test content" > test.txt
  git add test.txt
  git commit -m "Signed commit test"

  # Verify signature verification in GitVan
  gitvan job run --name test:verify-signature

  echo "✅ Signed commit integration test passed"
else
  echo "⚠️  GPG not available, skipping signed commit test"
fi
```

### Test Suite: GIT-INT-002 - Worktree Operations

#### Test Case: Multi-Worktree Execution
```bash
#!/bin/bash
# Test: GitVan daemon works correctly with multiple worktrees
set -e

# Setup main repository
git init worktree-test
cd worktree-test
git commit --allow-empty -m "Initial commit"

# Create multiple worktrees
git worktree add ../feature-branch feature
git worktree add ../hotfix-branch hotfix

# Setup GitVan in each worktree
for dir in . ../feature-branch ../hotfix-branch; do
  (
    cd $dir
    mkdir -p jobs/test
    cat > jobs/test/worktree.mjs << 'EOF'
import { defineJob } from 'gitvan/define'
import { useGit } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Worktree test job' },
  async run() {
    const git = useGit()
    const branch = git.branch()
    const worktreeId = git.worktreeId()
    return { ok: true, meta: { branch, worktreeId } }
  }
})
EOF
  )
done

# Test daemon with all worktrees
gitvan daemon start --worktrees all --dry-run

echo "✅ Multi-worktree integration test passed"
```

## CI/CD Platform Integration Tests

### Test Suite: CI-INT-001 - GitHub Actions Integration

#### Test Case: GitHub Actions Workflow
```yaml
# .github/workflows/gitvan-integration.yml
name: GitVan Integration Test
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  gitvan-integration:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for GitVan

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install GitVan
        run: npm install gitvan

      - name: Create Test Job
        run: |
          mkdir -p jobs/ci
          cat > jobs/ci/github-test.mjs << 'EOF'
          import { defineJob } from 'gitvan/define'
          import { useGit, useTemplate } from 'gitvan/composables'

          export default defineJob({
            kind: 'atomic',
            meta: { desc: 'GitHub Actions integration test' },
            async run() {
              const git = useGit()
              const commits = git.log('%h %s', '-10').split('\n')
              return {
                ok: true,
                meta: {
                  ci: 'github-actions',
                  commitCount: commits.length
                }
              }
            }
          })
          EOF

      - name: Run GitVan Job
        run: gitvan job run --name ci:github-test

      - name: Verify Receipt
        run: |
          git notes --ref=refs/notes/gitvan/results show HEAD
          git notes --ref=refs/notes/gitvan/results show HEAD | jq -r '.meta.ci' | grep -q "github-actions"

      - name: Test Event Processing
        run: |
          mkdir -p events/push-to
          echo 'export default { job: "ci:github-test" }' > events/push-to/main.mjs
          gitvan event list | grep -q "push-to/main"
```

### Test Suite: CI-INT-002 - GitLab CI Integration

#### Test Case: GitLab CI Pipeline
```yaml
# .gitlab-ci.yml
stages:
  - setup
  - test
  - validate

gitvan-integration:
  stage: test
  image: node:18-alpine
  before_script:
    - apk add --no-cache git
    - npm install gitvan
  script:
    - |
      # Create GitLab-specific job
      mkdir -p jobs/ci
      cat > jobs/ci/gitlab-test.mjs << 'EOF'
      import { defineJob } from 'gitvan/define'
      import { useGit, useExec } from 'gitvan/composables'

      export default defineJob({
        kind: 'atomic',
        meta: { desc: 'GitLab CI integration test' },
        async run() {
          const git = useGit()
          const exec = useExec()

          // Test CI environment detection
          const ciInfo = {
            platform: 'gitlab',
            job: process.env.CI_JOB_NAME,
            pipeline: process.env.CI_PIPELINE_ID
          }

          return { ok: true, meta: ciInfo }
        }
      })
      EOF

    - gitvan job run --name ci:gitlab-test
    - git notes --ref=refs/notes/gitvan/results show HEAD | jq -r '.meta.platform' | grep -q "gitlab"
  artifacts:
    when: always
    paths:
      - gitvan-logs/
```

## Container Integration Tests

### Test Suite: CONT-INT-001 - Docker Integration

#### Test Case: Docker Container Execution
```dockerfile
# integration-tests/Dockerfile
FROM node:18-alpine

# Install Git and required tools
RUN apk add --no-cache git bash jq

# Setup working directory
WORKDIR /app

# Copy test repository
COPY . .

# Install GitVan
RUN npm install gitvan

# Create container-specific job
RUN mkdir -p jobs/container && \
    echo 'import { defineJob } from "gitvan/define"' > jobs/container/docker-test.mjs && \
    echo 'import { useGit } from "gitvan/composables"' >> jobs/container/docker-test.mjs && \
    echo 'export default defineJob({' >> jobs/container/docker-test.mjs && \
    echo '  kind: "atomic",' >> jobs/container/docker-test.mjs && \
    echo '  async run() {' >> jobs/container/docker-test.mjs && \
    echo '    const git = useGit()' >> jobs/container/docker-test.mjs && \
    echo '    return { ok: true, meta: { container: "docker" } }' >> jobs/container/docker-test.mjs && \
    echo '  }' >> jobs/container/docker-test.mjs && \
    echo '})' >> jobs/container/docker-test.mjs

# Test command
CMD ["sh", "-c", "gitvan job run --name container:docker-test && echo 'Docker integration test passed'"]
```

```bash
#!/bin/bash
# Test runner for Docker integration
set -e

# Build and run container
docker build -f integration-tests/Dockerfile -t gitvan-test .
docker run --rm gitvan-test

# Test with mounted repository
docker run --rm -v $(pwd):/app -w /app node:18-alpine sh -c "
  apk add --no-cache git
  npm install gitvan
  gitvan job list
  echo '✅ Docker mount integration test passed'
"
```

## External Tool Integration Tests

### Test Suite: EXT-INT-001 - Package Manager Integration

#### Test Case: npm/yarn Integration
```bash
#!/bin/bash
# Test: GitVan works with different package managers
set -e

test_package_manager() {
  local pm=$1
  echo "Testing $pm integration..."

  # Create test project
  mkdir -p test-$pm
  cd test-$pm

  # Initialize with package manager
  case $pm in
    npm)
      npm init -y
      npm install gitvan
      ;;
    yarn)
      yarn init -y
      yarn add gitvan
      ;;
    pnpm)
      pnpm init
      pnpm add gitvan
      ;;
  esac

  # Test GitVan functionality
  mkdir -p jobs/test
  cat > jobs/test/pm-test.mjs << EOF
import { defineJob } from 'gitvan/define'

export default defineJob({
  kind: 'atomic',
  meta: { desc: '$pm integration test' },
  async run() {
    return { ok: true, meta: { packageManager: '$pm' } }
  }
})
EOF

  # Execute job
  npx gitvan job run --name test:pm-test

  cd ..
  echo "✅ $pm integration test passed"
}

# Test all package managers
for pm in npm yarn pnpm; do
  if command -v $pm >/dev/null 2>&1; then
    test_package_manager $pm
  else
    echo "⚠️  $pm not available, skipping"
  fi
done
```

### Test Suite: EXT-INT-002 - Template Engine Integration

#### Test Case: Nunjucks Template Processing
```bash
#!/bin/bash
# Test: GitVan template integration with various data sources
set -e

# Setup
mkdir -p templates jobs/template-tests

# Create comprehensive template
cat > templates/integration-test.njk << 'EOF'
# Integration Test Report
Generated: {{ nowISO }}
Repository: {{ git.root }}
Branch: {{ git.branch() }}

## Commits (Last 10)
{% for commit in commits %}
- {{ commit }}
{% endfor %}

## Environment
- Node Version: {{ process.version }}
- Platform: {{ process.platform }}
- Working Directory: {{ process.cwd() }}

## Custom Data
{% if customData %}
{% for key, value in customData %}
- {{ key }}: {{ value }}
{% endfor %}
{% endif %}

---
Generated by GitVan v2
EOF

# Create template test job
cat > jobs/template-tests/comprehensive.mjs << 'EOF'
import { defineJob } from 'gitvan/define'
import { useGit, useTemplate } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Comprehensive template integration test' },
  async run() {
    const git = useGit()
    const template = useTemplate()

    const commits = git.log('%h %s', '-10').split('\n')
    const customData = {
      testType: 'integration',
      executionTime: new Date().toISOString(),
      randomValue: Math.floor(Math.random() * 1000)
    }

    const result = template.renderToFile(
      'integration-test.njk',
      'test-output.md',
      { commits, customData }
    )

    return {
      ok: true,
      artifact: result.path,
      meta: { bytes: result.bytes }
    }
  }
})
EOF

# Execute test
gitvan job run --name template-tests:comprehensive

# Verify output
if [[ -f test-output.md ]]; then
  echo "✅ Template integration test passed"
  echo "Generated file size: $(stat -f%z test-output.md) bytes"
else
  echo "❌ Template integration test failed"
  exit 1
fi
```

## Database and Storage Integration Tests

### Test Suite: STORE-INT-001 - Git Notes Storage

#### Test Case: Large-Scale Receipt Storage
```bash
#!/bin/bash
# Test: GitVan handles large numbers of receipts efficiently
set -e

echo "Testing large-scale receipt storage..."

# Create job that generates receipts
mkdir -p jobs/storage-test
cat > jobs/storage-test/receipt-generator.mjs << 'EOF'
import { defineJob } from 'gitvan/define'
import { useGit } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Receipt generation test' },
  async run({ payload }) {
    const git = useGit()
    const testData = {
      iteration: payload.iteration || 0,
      timestamp: new Date().toISOString(),
      data: 'x'.repeat(1000)  // 1KB of data per receipt
    }

    return {
      ok: true,
      meta: testData
    }
  }
})
EOF

# Generate 1000 receipts
for i in {1..1000}; do
  git commit --allow-empty -m "Test commit $i"
  gitvan job run --name storage-test:receipt-generator --payload "{\"iteration\":$i}"
done

# Verify receipt storage efficiency
receipt_count=$(git notes --ref=refs/notes/gitvan/results list | wc -l)
repo_size=$(du -sh .git | cut -f1)

echo "Generated $receipt_count receipts"
echo "Repository size: $repo_size"

if [[ $receipt_count -ge 1000 ]]; then
  echo "✅ Large-scale receipt storage test passed"
else
  echo "❌ Large-scale receipt storage test failed"
  exit 1
fi
```

## Network and Remote Integration Tests

### Test Suite: NET-INT-001 - Remote Repository Integration

#### Test Case: Remote Origin Operations
```bash
#!/bin/bash
# Test: GitVan works with remote repositories
set -e

# Setup remote repository simulation
mkdir -p remote-test/origin remote-test/clone
cd remote-test/origin
git init --bare

cd ../clone
git clone ../origin .
git config user.name "Test User"
git config user.email "test@example.com"

# Setup GitVan
echo '{"type":"module"}' > package.json
npm install gitvan

# Create job that interacts with remote
mkdir -p jobs/remote
cat > jobs/remote/push-test.mjs << 'EOF'
import { defineJob } from 'gitvan/define'
import { useGit } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Remote push integration test' },
  async run() {
    const git = useGit()

    // Create and push a tag
    const tag = `test-${Date.now()}`
    git.tag(tag, 'Test tag from GitVan')
    git.push('origin', tag)

    return { ok: true, meta: { tag } }
  }
})
EOF

# Create initial commit
git commit --allow-empty -m "Initial commit"
git push origin main

# Run test
gitvan job run --name remote:push-test

# Verify tag was pushed
cd ../origin
if git tag | grep -q "test-"; then
  echo "✅ Remote repository integration test passed"
else
  echo "❌ Remote repository integration test failed"
  exit 1
fi
```

## Security Integration Tests

### Test Suite: SEC-INT-001 - Security Policy Integration

#### Test Case: Command Allow-list Enforcement
```bash
#!/bin/bash
# Test: GitVan enforces security policies correctly
set -e

# Create security configuration
cat > gitvan.config.js << 'EOF'
import { defineConfig } from 'gitvan/define'

export default defineConfig({
  security: {
    allowList: {
      commands: ['echo', 'cat', 'ls'],
      paths: ['/usr/bin', '/bin']
    },
    requireSigned: true,
    separationOfDuties: false
  }
})
EOF

# Create job that tests command restrictions
mkdir -p jobs/security
cat > jobs/security/restricted-test.mjs << 'EOF'
import { defineJob } from 'gitvan/define'
import { useExec } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Security restriction test' },
  async run() {
    const exec = useExec()

    try {
      // This should succeed (allowed command)
      const result1 = await exec({ exec: 'cli', cmd: 'echo', args: ['allowed'] })

      // This should fail (disallowed command)
      const result2 = await exec({ exec: 'cli', cmd: 'rm', args: ['-rf', '/'] })

      return {
        ok: false,
        meta: { error: 'Security policy not enforced' }
      }
    } catch (error) {
      // Expected to catch security violation
      return {
        ok: true,
        meta: { security: 'enforced', error: error.message }
      }
    }
  }
})
EOF

# Run security test
if gitvan job run --name security:restricted-test; then
  echo "✅ Security policy integration test passed"
else
  echo "❌ Security policy integration test failed"
  exit 1
fi
```

## Performance Integration Tests

### Test Suite: PERF-INT-001 - Real-World Performance

#### Test Case: Production-Like Load
```bash
#!/bin/bash
# Test: GitVan performs well under production-like conditions
set -e

echo "Running production-like performance test..."

# Create multiple job types
mkdir -p jobs/{fast,medium,slow}

# Fast job (should complete in <100ms)
cat > jobs/fast/quick-status.mjs << 'EOF'
import { defineJob } from 'gitvan/define'
import { useGit } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Quick status check' },
  async run() {
    const git = useGit()
    const status = git.status()
    return { ok: true, meta: { lines: status.split('\n').length } }
  }
})
EOF

# Medium job (should complete in <500ms)
cat > jobs/medium/changelog.mjs << 'EOF'
import { defineJob } from 'gitvan/define'
import { useGit, useTemplate } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Generate changelog' },
  async run() {
    const git = useGit()
    const commits = git.log('%h %s', '-50').split('\n')

    const template = useTemplate()
    const changelog = template.render('changelog.njk', { commits })

    return { ok: true, meta: { commitCount: commits.length } }
  }
})
EOF

# Create template
mkdir -p templates
cat > templates/changelog.njk << 'EOF'
# Changelog
{% for commit in commits %}
- {{ commit }}
{% endfor %}
EOF

# Simulate production load
start_time=$(date +%s)

# Run 100 fast jobs
for i in {1..100}; do
  git commit --allow-empty -m "Fast test $i"
  gitvan job run --name fast:quick-status >/dev/null 2>&1 &
done

# Run 20 medium jobs
for i in {1..20}; do
  gitvan job run --name medium:changelog >/dev/null 2>&1 &
done

# Wait for completion
wait

end_time=$(date +%s)
total_time=$((end_time - start_time))

echo "Completed 120 jobs in ${total_time} seconds"

# Verify all receipts were created
receipt_count=$(git notes --ref=refs/notes/gitvan/results list | wc -l)

if [[ $receipt_count -ge 120 && $total_time -lt 60 ]]; then
  echo "✅ Production-like performance test passed"
else
  echo "❌ Production-like performance test failed"
  echo "Receipts: $receipt_count (expected ≥120)"
  echo "Time: ${total_time}s (expected <60s)"
  exit 1
fi
```

## Cross-Platform Integration Tests

### Test Suite: PLAT-INT-001 - Platform Compatibility

#### Test Case: Windows Compatibility
```powershell
# Test: GitVan works correctly on Windows
# integration-tests/windows-test.ps1

# Setup
$ErrorActionPreference = "Stop"

Write-Host "Testing GitVan on Windows..."

# Initialize repository
git init windows-test
Set-Location windows-test
git config user.name "Windows Test"
git config user.email "windows@test.com"

# Install GitVan
npm install gitvan

# Create Windows-specific job
New-Item -ItemType Directory -Force -Path jobs/windows
@"
import { defineJob } from 'gitvan/define'
import { useGit, useExec } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Windows compatibility test' },
  async run() {
    const git = useGit()
    const exec = useExec()

    // Test Windows-specific functionality
    const result = await exec({
      exec: 'cli',
      cmd: 'dir',
      args: ['/b']
    })

    return {
      ok: true,
      meta: {
        platform: 'windows',
        files: result.stdout.split('\n').length
      }
    }
  }
})
"@ | Out-File -FilePath jobs/windows/compatibility.mjs -Encoding UTF8

# Run test
npx gitvan job run --name windows:compatibility

# Verify
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Windows compatibility test passed"
} else {
    Write-Host "❌ Windows compatibility test failed"
    exit 1
}
```

## Integration Test Execution Framework

### Test Suite Orchestrator
```javascript
// specs/validation/integration-test-runner.mjs
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

export class IntegrationTestRunner {
  constructor(config = {}) {
    this.config = {
      timeout: 300000, // 5 minutes
      parallel: 4,
      retries: 2,
      ...config
    }
    this.results = []
  }

  async runAllTests() {
    const testSuites = await this.discoverTestSuites()
    console.log(`Found ${testSuites.length} integration test suites`)

    const results = await Promise.allSettled(
      testSuites.map(suite => this.runTestSuite(suite))
    )

    return this.summarizeResults(results)
  }

  async runTestSuite(suitePath) {
    console.log(`Running test suite: ${path.basename(suitePath)}`)

    return new Promise((resolve, reject) => {
      const child = spawn('bash', [suitePath], {
        stdio: 'pipe',
        timeout: this.config.timeout
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        const result = {
          suite: path.basename(suitePath),
          success: code === 0,
          code,
          stdout,
          stderr,
          duration: process.hrtime.bigint()
        }

        if (code === 0) {
          resolve(result)
        } else {
          reject(result)
        }
      })

      child.on('error', (error) => {
        reject({
          suite: path.basename(suitePath),
          success: false,
          error: error.message
        })
      })
    })
  }

  summarizeResults(results) {
    const summary = {
      total: results.length,
      passed: 0,
      failed: 0,
      errors: []
    }

    for (const result of results) {
      if (result.status === 'fulfilled') {
        summary.passed++
      } else {
        summary.failed++
        summary.errors.push(result.reason)
      }
    }

    return summary
  }
}

// CLI runner
if (process.argv[1] === import.meta.url) {
  const runner = new IntegrationTestRunner()
  const results = await runner.runAllTests()

  console.log('\n' + '='.repeat(50))
  console.log('Integration Test Results')
  console.log('='.repeat(50))
  console.log(`Total: ${results.total}`)
  console.log(`Passed: ${results.passed}`)
  console.log(`Failed: ${results.failed}`)

  if (results.failed > 0) {
    console.log('\nFailures:')
    results.errors.forEach(error => {
      console.log(`- ${error.suite}: ${error.error || 'Test failed'}`)
    })
    process.exit(1)
  }

  console.log('\n✅ All integration tests passed!')
}
```

This comprehensive integration test suite ensures GitVan v2 works correctly with all major external systems and maintains compatibility across different environments and use cases.