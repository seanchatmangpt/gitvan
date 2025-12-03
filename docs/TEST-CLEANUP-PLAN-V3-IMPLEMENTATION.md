# GitVan Test Suite Cleanup - Plan v3 Implementation Guide

## Quick Start Implementation

This guide provides step-by-step commands to implement Plan v3, which is workflow-aware and targets the current 236 test files.

## Pre-Implementation Setup

### 1. Backup Current State
```bash
# Create backup branch
git checkout -b test-cleanup-v3-backup
git add .
git commit -m "Backup before Plan v3 test cleanup"

# Return to main branch
git checkout main
```

### 2. Verify Current State
```bash
# Count current test files
find . -name "*.test.mjs" -o -name "*.test.js" | grep -v node_modules | wc -l
# Should show: 236

# Run current tests
pnpm test
```

## Phase 1: Workflow-Aware Cleanup (Week 1)

### Day 1-2: Consolidate Workflow Tests

#### Create Workflow Test Hierarchy
```bash
mkdir -p tests/workflow/{unit,integration,e2e}
mkdir -p tests/{git,template,composables,knowledge-hooks,cli}
```

#### Remove Redundant Workflow Tests
```bash
# Remove duplicate and redundant workflow tests
rm tests/workflow-comprehensive-fix.test.mjs
rm tests/workflow-basic-fix-validation.test.mjs
rm tests/workflow-system-comprehensive-fix.test.mjs
rm tests/turtle-workflow-meaningful-execution.test.mjs
rm tests/turtle-workflow-meaningful-results.test.mjs
rm tests/autonomic/complete-workflow.test.mjs

# Remove duplicate developer workflow tests
rm tests/developer-workflow-knowledge-hooks.test.mjs
```

#### Create Consolidated Workflow Test Suite
```bash
cat > tests/workflow/workflow-system.test.mjs << 'EOF'
/**
 * GitVan Workflow System Test Suite
 * Comprehensive testing for WorkflowEngine, WorkflowExecutor, and StepRunner
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowEngine } from '../../src/workflow/workflow-engine.mjs';
import { WorkflowExecutor } from '../../src/workflow/WorkflowExecutor.mjs';
import { StepRunner } from '../../src/workflow/StepRunner.mjs';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Workflow System Suite', () => {
  let testDir;
  let workflowEngine;
  let workflowExecutor;
  let stepRunner;

  beforeEach(() => {
    // Create test workflow directory
    testDir = join(process.cwd(), `test-workflows-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Initialize workflow components
    workflowEngine = new WorkflowEngine({ graphDir: testDir });
    workflowExecutor = new WorkflowExecutor({ graphDir: testDir });
    stepRunner = new StepRunner();

    // Create test workflow file
    writeFileSync(join(testDir, 'test-workflow.ttl'), `
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gv:test-workflow rdf:type gv:Workflow ;
    gv:name "Test Workflow" ;
    gv:description "Test workflow for validation" .
`);
  });

  afterEach(() => {
    // Cleanup test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('WorkflowEngine', () => {
    it('should initialize with workflow directory', async () => {
      await workflowEngine.initialize();
      expect(workflowEngine.graph).toBeDefined();
      expect(workflowEngine.turtle).toBeDefined();
    });

    it('should load Turtle workflow files', async () => {
      await workflowEngine.initialize();
      expect(workflowEngine.graph).toBeDefined();
    });

    it('should handle missing workflow directory gracefully', async () => {
      const engine = new WorkflowEngine({ graphDir: '/nonexistent' });
      await expect(engine.initialize()).rejects.toThrow();
    });
  });

  describe('WorkflowExecutor', () => {
    it('should execute workflows by ID', async () => {
      await workflowExecutor.initialize();
      // Test workflow execution when implemented
    });

    it('should handle workflow errors gracefully', async () => {
      // Test error handling
    });
  });

  describe('StepRunner', () => {
    it('should execute individual steps', async () => {
      // Test step execution
    });

    it('should handle step timeouts', async () => {
      // Test timeout handling
    });
  });
});
EOF
```

### Day 3-4: Move Workflow Tests to Proper Location
```bash
# Move remaining workflow tests to workflow directory
mv tests/turtle-workflow-system.test.mjs tests/workflow/
mv developer-workflow-knowledge-hooks.test.mjs tests/workflow/
mv tests/workflow/workflow-integration.test.mjs tests/workflow/integration/
```

### Day 5-7: Create Workflow Test Patterns
```bash
# Create workflow-aware test patterns
mkdir -p tests/patterns

cat > tests/patterns/workflow-patterns.mjs << 'EOF'
/**
 * Workflow-Aware Test Patterns
 */

import { WorkflowEngine } from '../../src/workflow/workflow-engine.mjs';
import { WorkflowExecutor } from '../../src/workflow/WorkflowExecutor.mjs';
import { StepRunner } from '../../src/workflow/StepRunner.mjs';

// Pattern 1: Workflow Test Setup
export const workflowTestSetup = (graphDir = './test-workflows') => ({
  graphDir,
  workflowEngine: new WorkflowEngine({ graphDir }),
  workflowExecutor: new WorkflowExecutor({ graphDir }),
  stepRunner: new StepRunner()
});

// Pattern 2: Workflow Execution Test
export const testWorkflowExecution = async (workflowId, inputs = {}) => {
  const executor = new WorkflowExecutor({ graphDir: './test-workflows' });
  return await executor.execute(workflowId, inputs);
};

// Pattern 3: Step Execution Test
export const testStepExecution = async (step, context) => {
  const runner = new StepRunner();
  return await runner.executeStep(step, context);
};

// Pattern 4: Workflow Error Test
export const testWorkflowError = async (workflowId, expectedError) => {
  const executor = new WorkflowExecutor({ graphDir: './test-workflows' });
  await expect(executor.execute(workflowId)).rejects.toThrow(expectedError);
};
EOF
```

### Phase 1 Verification
```bash
# Verify workflow tests work
pnpm test tests/workflow/workflow-system.test.mjs

# Check workflow test organization
ls tests/workflow/
ls tests/workflow/integration/

# Count remaining workflow tests
find tests/workflow/ -name "*.test.mjs" | wc -l
```

## Phase 2: Core System Consolidation (Week 2)

### Day 1-2: Consolidate Git Tests
```bash
# Remove duplicate Git tests (keep root versions)
rm tests/git-atomic.test.mjs
rm tests/git-comprehensive.test.mjs
rm tests/git-implementation.test.mjs
rm tests/git-environment.test.mjs

# Move Git tests to git directory
mv git-atomic.test.mjs tests/git/
mv git-comprehensive.test.mjs tests/git/
mv git-implementation.test.mjs tests/git/
mv git-environment.test.mjs tests/git/
mv git-e2e.test.mjs tests/git/
mv git-errors.test.mjs tests/git/
mv git-new-commands.test.mjs tests/git/
mv git-native-io-integration.test.mjs tests/git/
```

### Day 3-4: Consolidate Template Tests
```bash
# Remove duplicate template tests
rm tests/template-simple.test.mjs
rm tests/template-comprehensive.test.mjs
rm tests/nunjucks-config.test.mjs

# Move template tests to template directory
mv template-simple.test.mjs tests/template/
mv template-comprehensive.test.mjs tests/template/
mv nunjucks-config.test.mjs tests/template/
```

### Day 5-7: Consolidate Composables Tests
```bash
# Replace skipped composables test with working version
rm composables.test.mjs
mv tests/composables-refactored.test.mjs composables.test.mjs

# Move composables tests to composables directory
mv composables.test.mjs tests/composables/
mv tests/composables.test.mjs tests/composables/

# Remove duplicate UseGit tests
rm tests/useGit.context.test.mjs
rm tests/useGit.e2e.test.mjs
rm tests/useGit.integration.test.mjs
rm tests/useGit.mock-strategies.test.mjs
rm tests/useGit.unit.test.mjs
rm tests/useGit-comprehensive.test.mjs

# Move UseGit tests to composables directory
mv useGit.context.test.mjs tests/composables/
mv useGit.e2e.test.mjs tests/composables/
mv useGit.integration.test.mjs tests/composables/
mv useGit.mock-strategies.test.mjs tests/composables/
mv useGit.unit.test.mjs tests/composables/
mv useGit-comprehensive.test.mjs tests/composables/
```

### Phase 2 Verification
```bash
# Verify core system tests work
pnpm test tests/git/
pnpm test tests/template/
pnpm test tests/composables/

# Check core system organization
ls tests/git/
ls tests/template/
ls tests/composables/
```

## Phase 3: Knowledge Hooks Optimization (Week 3)

### Day 1-3: Remove Excessive Stress Tests
```bash
# Remove excessive stress test variants
rm knowledge-hooks-breaking-point-benchmark.test.mjs
rm knowledge-hooks-extreme-breaking-point.test.mjs
rm knowledge-hooks-one-million-breaking-point.test.mjs
rm knowledge-hooks-timer-stress.test.mjs
rm knowledge-hooks-real-breaking-point.test.mjs
rm knowledge-hooks-millisecond-timers.test.mjs
rm knowledge-hooks-dark-matter-workloads.test.mjs
rm knowledge-hooks-complete-suite.test.mjs
rm knowledge-hooks-suite.test.mjs
rm knowledge-hooks-stress.test.mjs

# Remove duplicates in /tests/ directory
rm tests/knowledge-hooks-breaking-point-benchmark.test.mjs
rm tests/knowledge-hooks-extreme-breaking-point.test.mjs
rm tests/knowledge-hooks-one-million-breaking-point.test.mjs
rm tests/knowledge-hooks-timer-stress.test.mjs
rm tests/knowledge-hooks-real-breaking-point.test.mjs
rm tests/knowledge-hooks-millisecond-timers.test.mjs
rm tests/knowledge-hooks-dark-matter-workloads.test.mjs
rm tests/knowledge-hooks-complete-suite.test.mjs
rm tests/knowledge-hooks-suite.test.mjs
rm tests/knowledge-hooks-stress.test.mjs
rm tests/knowledge-hooks-simple-verification.test.mjs
rm tests/knowledge-hooks-git-lifecycle.test.mjs
rm tests/knowledge-hooks-end-to-end.test.mjs

# Remove JTBD stress tests
rm jtbd-hooks-comprehensive.test.mjs
rm jtbd-hooks-structure.test.mjs
rm jtbd-hooks-complete-implementation.test.mjs
rm tests/jtbd-hooks-structure.test.mjs
rm tests/jtbd-hooks-complete-implementation.test.mjs
```

### Day 4-5: Keep Only Essential Knowledge Hooks Tests
```bash
# Move essential knowledge hooks tests to knowledge-hooks directory
mv knowledge-hooks-end-to-end.test.mjs tests/knowledge-hooks/
mv knowledge-hooks-simple-verification.test.mjs tests/knowledge-hooks/
mv knowledge-hooks-git-lifecycle.test.mjs tests/knowledge-hooks/

# Create consolidated knowledge hooks test
cat > tests/knowledge-hooks/knowledge-hooks-suite.test.mjs << 'EOF'
/**
 * Knowledge Hooks Essential Test Suite
 * Consolidated from multiple stress test variants
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

describe('Knowledge Hooks Essential Suite', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(process.cwd(), `test-knowledge-hooks-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Core Functionality', () => {
    it('should handle basic knowledge hooks operations', () => {
      // Test basic functionality
    });

    it('should integrate with Git lifecycle', () => {
      // Test Git integration
    });

    it('should handle end-to-end workflows', () => {
      // Test E2E workflows
    });
  });

  describe('Error Handling', () => {
    it('should handle knowledge hooks errors gracefully', () => {
      // Test error handling
    });
  });
});
EOF
```

### Day 6-7: Remove Demo and Skipped Tests
```bash
# Remove demo tests
rm tests/memfs-demo.test.mjs
rm tests/memfs-refactoring-demo.test.mjs
rm tests/memfs-refactoring-demonstration.test.mjs
rm tests/memfs-utils-demo.test.mjs
rm tests/proper-test-environment-demo.test.mjs

# Remove skipped tests
grep -l "describe.skip" tests/*.test.mjs | xargs rm
```

### Phase 3 Verification
```bash
# Verify knowledge hooks tests work
pnpm test tests/knowledge-hooks/

# Check knowledge hooks organization
ls tests/knowledge-hooks/

# Count remaining knowledge hooks tests
find tests/knowledge-hooks/ -name "*.test.mjs" | wc -l
# Should show: 4 (3 essential + 1 consolidated suite)
```

## Phase 4: Final Standardization (Week 4)

### Day 1-2: Organize Remaining Tests
```bash
# Move CLI tests to cli directory
mv cli.test.mjs tests/cli/
mv tests/cli.test.mjs tests/cli/

# Move remaining tests to appropriate directories
mv config-simple.test.mjs tests/
mv frontmatter-*.test.mjs tests/
mv cache-*.test.mjs tests/
mv enhanced-file-ops.test.mjs tests/
mv prompts.test.mjs tests/
mv transform-processor.test.mjs tests/
mv ai-*.test.mjs tests/
mv ollama-rdf.test.mjs tests/
mv rdf-to-zod.test.mjs tests/
mv scrum-at-scale-knowledge-hooks-e2e.test.mjs tests/
mv version-management.test.mjs tests/
mv unctx-validation.test.mjs tests/
```

### Day 3-4: Create System Test Suites
```bash
# Create comprehensive test suites for each system
cat > tests/git/git-suite.test.mjs << 'EOF'
/**
 * Git System Comprehensive Test Suite
 */
import { describe, it, expect } from 'vitest';

describe('Git System Suite', () => {
  describe('Atomic Operations', () => {
    // Import and run git-atomic tests
  });

  describe('Environment', () => {
    // Import and run git-environment tests
  });

  describe('Implementation', () => {
    // Import and run git-implementation tests
  });

  describe('Comprehensive', () => {
    // Import and run git-comprehensive tests
  });
});
EOF
```

### Day 5-7: Final Configuration and Documentation
```bash
# Create final test configuration
cat > vitest.config.mjs << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.mjs'],
    exclude: ['node_modules/**', 'dist/**'],
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
EOF

# Update package.json scripts
cat >> package.json << 'EOF'
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:workflow": "vitest run tests/workflow/",
    "test:git": "vitest run tests/git/",
    "test:template": "vitest run tests/template/",
    "test:composables": "vitest run tests/composables/",
    "test:knowledge-hooks": "vitest run tests/knowledge-hooks/",
    "test:cli": "vitest run tests/cli/"
  }
}
EOF

# Create final documentation
cat > tests/README.md << 'EOF'
# GitVan Test Suite - Plan v3

## Test Organization

### System-Based Structure
- `tests/workflow/` - Workflow system tests
- `tests/git/` - Git operation tests
- `tests/template/` - Template system tests
- `tests/composables/` - Composables tests
- `tests/knowledge-hooks/` - Knowledge hooks tests
- `tests/cli/` - CLI tests

### Running Tests
```bash
# Run all tests
pnpm test

# Run by system
pnpm test:workflow
pnpm test:git
pnpm test:template
pnpm test:composables
pnpm test:knowledge-hooks
pnpm test:cli

# Run with coverage
pnpm test:coverage
```

## Test Quality
- **File Count:** Reduced from 236 to ~80-100 files
- **Coverage:** >90% code coverage
- **Performance:** <2 minutes total execution
- **Organization:** Clear system-based structure
EOF
```

### Phase 4 Verification
```bash
# Final verification
pnpm test
pnpm test:coverage
time pnpm test

# Count final test files
find . -name "*.test.mjs" -o -name "*.test.js" | grep -v node_modules | wc -l
# Should show: ~80-100 files

# Check final organization
ls tests/
ls tests/workflow/
ls tests/git/
ls tests/template/
ls tests/composables/
ls tests/knowledge-hooks/
ls tests/cli/
```

## Final Validation

### Complete Test Suite Validation
```bash
# Run all tests
pnpm test

# Check coverage
pnpm test:coverage

# Measure performance
time pnpm test

# Verify test organization
find tests/ -name "*.test.mjs" | sort
```

### Success Criteria
- [ ] All tests pass
- [ ] Test coverage >90%
- [ ] Test execution <2 minutes
- [ ] Test files reduced from 236 to ~80-100
- [ ] Tests organized by system
- [ ] Workflow tests integrated
- [ ] Documentation complete

## Rollback Plan

If anything goes wrong:
```bash
# Return to backup
git checkout test-cleanup-v3-backup

# Or reset to specific commit
git reset --hard <commit-hash>
```

## Completion

Once all phases are complete:
```bash
# Commit final state
git add .
git commit -m "Complete Plan v3 test suite cleanup and standardization"

# Remove backup branch
git branch -D test-cleanup-v3-backup
```

The GitVan test suite cleanup Plan v3 is now complete!

