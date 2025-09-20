# GitVan Test Suite Cleanup - Plan v3
## Workflow-Aware Test Consolidation Strategy

## Executive Summary

Plan v3 refines the test cleanup approach based on the current state of GitVan, which now includes a sophisticated workflow system. With 236 test files currently in the repository, this plan focuses on workflow-aware consolidation while maintaining the core cleanup objectives.

## Current State Analysis

### Test Count: 236 files
### Key Systems Identified:
- **Workflow System** - New sophisticated workflow engine with StepRunner, WorkflowExecutor
- **Knowledge Hooks** - Extensive stress testing (15+ variants)
- **Git Operations** - Core GitVan functionality
- **Template System** - Nunjucks-based templating
- **Composables** - Core GitVan composables

## Plan v3 Strategy

### **Phase 1: Workflow-Aware Cleanup (Week 1)**
Focus on consolidating workflow-related tests while preserving the new workflow system functionality.

### **Phase 2: Core System Consolidation (Week 2)**
Consolidate core GitVan systems (Git, Templates, Composables) with workflow integration.

### **Phase 3: Knowledge Hooks Optimization (Week 3)**
Dramatically reduce knowledge hooks stress testing while maintaining essential functionality.

### **Phase 4: Final Standardization (Week 4)**
Standardize remaining tests with workflow-aware patterns.

---

## Phase 1: Workflow-Aware Cleanup

### Objective
Consolidate workflow-related tests while preserving the new workflow system functionality.

### Current Workflow Tests (10+ files)
- `developer-workflow-knowledge-hooks.test.mjs`
- `tests/turtle-workflow-system.test.mjs`
- `tests/developer-workflow-knowledge-hooks.test.mjs`
- `tests/autonomic/complete-workflow.test.mjs`
- `tests/workflow-comprehensive-fix.test.mjs`
- `tests/workflow-basic-fix-validation.test.mjs`
- `tests/turtle-workflow-meaningful-execution.test.mjs`
- `tests/turtle-workflow-meaningful-results.test.mjs`
- `tests/workflow/workflow-integration.test.mjs`
- `tests/workflow-system-comprehensive-fix.test.mjs`

### Consolidation Strategy

#### 1. Create Workflow Test Hierarchy
```bash
mkdir -p tests/workflow/{unit,integration,e2e}
```

#### 2. Consolidate Workflow Tests
**Keep Essential Tests:**
- `tests/workflow/workflow-integration.test.mjs` - Core workflow integration
- `tests/turtle-workflow-system.test.mjs` - Turtle workflow system
- `tests/developer-workflow-knowledge-hooks.test.mjs` - Developer workflow

**Remove Redundant Tests:**
```bash
# Remove duplicate workflow tests
rm tests/workflow-comprehensive-fix.test.mjs
rm tests/workflow-basic-fix-validation.test.mjs
rm tests/workflow-system-comprehensive-fix.test.mjs
rm tests/turtle-workflow-meaningful-execution.test.mjs
rm tests/turtle-workflow-meaningful-results.test.mjs
rm tests/autonomic/complete-workflow.test.mjs
```

#### 3. Create Workflow Test Suite
```bash
cat > tests/workflow/workflow-suite.test.mjs << 'EOF'
/**
 * GitVan Workflow System Test Suite
 * Comprehensive testing for WorkflowEngine, WorkflowExecutor, and StepRunner
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowEngine } from '../../src/workflow/workflow-engine.mjs';
import { WorkflowExecutor } from '../../src/workflow/WorkflowExecutor.mjs';
import { StepRunner } from '../../src/workflow/StepRunner.mjs';

describe('Workflow System Suite', () => {
  let workflowEngine;
  let workflowExecutor;
  let stepRunner;

  beforeEach(() => {
    workflowEngine = new WorkflowEngine({ graphDir: './test-workflows' });
    workflowExecutor = new WorkflowExecutor({ graphDir: './test-workflows' });
    stepRunner = new StepRunner();
  });

  describe('WorkflowEngine', () => {
    it('should initialize with workflow directory', async () => {
      await workflowEngine.initialize();
      expect(workflowEngine.graph).toBeDefined();
    });

    it('should load Turtle workflow files', async () => {
      // Test Turtle file loading
    });
  });

  describe('WorkflowExecutor', () => {
    it('should execute workflows by ID', async () => {
      // Test workflow execution
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

### Expected Results
- **Workflow Tests:** 10+ files → 4 essential files
- **Files Removed:** ~6 redundant workflow tests
- **Coverage Maintained:** Core workflow functionality preserved

---

## Phase 2: Core System Consolidation

### Objective
Consolidate core GitVan systems while maintaining workflow integration.

### Core Systems to Consolidate

#### 1. Git Operations (Keep Gold Standard)
- `git-atomic.test.mjs` - **KEEP** (10/10 rating)
- `git-environment.test.mjs` - **KEEP** (9/10 rating)
- `git-implementation.test.mjs` - **KEEP** (7/10 rating)
- `git-comprehensive.test.mjs` - **KEEP** (8/10 rating)

#### 2. Template System (Consolidate)
- `template-simple.test.mjs` - **KEEP** (8/10 rating)
- `template-comprehensive.test.mjs` - **MERGE** with simple version
- `nunjucks-config.test.mjs` - **KEEP** (7/10 rating)

#### 3. Composables (Replace with Working Version)
- `composables.test.mjs` - **REPLACE** with refactored version
- `tests/composables-refactored.test.mjs` - **USE** as replacement

### Consolidation Commands
```bash
# Replace skipped composables test
rm composables.test.mjs
mv tests/composables-refactored.test.mjs composables.test.mjs

# Merge template tests
rm template-comprehensive.test.mjs
# Add comprehensive tests to template-simple.test.mjs

# Remove duplicate Git tests
rm tests/git-atomic.test.mjs
rm tests/git-comprehensive.test.mjs
rm tests/git-implementation.test.mjs
rm tests/git-environment.test.mjs
```

### Expected Results
- **Core Tests:** Maintained with improved quality
- **Files Removed:** ~8 duplicate core tests
- **Quality Improved:** Working tests replace skipped tests

---

## Phase 3: Knowledge Hooks Optimization

### Objective
Dramatically reduce knowledge hooks stress testing while maintaining essential functionality.

### Current Knowledge Hooks Tests (20+ files)
**Excessive Stress Test Variants:**
- `knowledge-hooks-breaking-point-benchmark.test.mjs`
- `knowledge-hooks-extreme-breaking-point.test.mjs`
- `knowledge-hooks-one-million-breaking-point.test.mjs`
- `knowledge-hooks-timer-stress.test.mjs`
- `knowledge-hooks-real-breaking-point.test.mjs`
- `knowledge-hooks-millisecond-timers.test.mjs`
- `knowledge-hooks-dark-matter-workloads.test.mjs`
- `knowledge-hooks-complete-suite.test.mjs`
- `knowledge-hooks-suite.test.mjs`
- `knowledge-hooks-stress.test.mjs`

### Consolidation Strategy

#### Keep Only 3 Essential Tests
1. `knowledge-hooks-end-to-end.test.mjs` - E2E validation
2. `knowledge-hooks-simple-verification.test.mjs` - Basic functionality
3. `knowledge-hooks-git-lifecycle.test.mjs` - Git integration

#### Remove All Stress Test Variants
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
rm tests/knowledge-hooks-*.test.mjs
```

### Expected Results
- **Knowledge Hooks Tests:** 20+ files → 3 essential files
- **Files Removed:** ~17 stress test variants
- **Time Saved:** ~10 minutes per test run
- **Focus Improved:** Production functionality only

---

## Phase 4: Final Standardization

### Objective
Standardize remaining tests with workflow-aware patterns.

### Standardization Tasks

#### 1. Create Workflow-Aware Test Patterns
```bash
cat > tests/patterns/workflow-patterns.mjs << 'EOF'
/**
 * Workflow-Aware Test Patterns
 */

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
EOF
```

#### 2. Organize Tests by System
```bash
# Create system-based organization
mkdir -p tests/{workflow,git,template,composables,knowledge-hooks,cli}

# Move tests to appropriate directories
mv tests/workflow-*.test.mjs tests/workflow/
mv tests/turtle-workflow-*.test.mjs tests/workflow/
mv tests/knowledge-hooks-*.test.mjs tests/knowledge-hooks/
mv tests/git-*.test.mjs tests/git/
mv tests/template-*.test.mjs tests/template/
mv tests/composables-*.test.mjs tests/composables/
mv tests/cli-*.test.mjs tests/cli/
```

#### 3. Create System-Specific Test Suites
```bash
# Create comprehensive test suites for each system
cat > tests/workflow/workflow-system.test.mjs << 'EOF'
/**
 * Workflow System Comprehensive Test Suite
 */
import { describe, it, expect } from 'vitest';
import { workflowTestSetup, testWorkflowExecution } from '../patterns/workflow-patterns.mjs';

describe('Workflow System', () => {
  describe('WorkflowEngine', () => {
    // WorkflowEngine tests
  });

  describe('WorkflowExecutor', () => {
    // WorkflowExecutor tests
  });

  describe('StepRunner', () => {
    // StepRunner tests
  });
});
EOF
```

### Expected Results
- **Test Organization:** Clear system-based structure
- **Patterns:** Workflow-aware test patterns
- **Maintainability:** Easier to maintain and extend

---

## Plan v3 Summary

### Expected Outcomes

#### Before Cleanup
- **Total Tests:** 236 files
- **Workflow Tests:** 10+ files
- **Knowledge Hooks:** 20+ stress test variants
- **Duplicates:** ~30 files
- **Maintenance Burden:** High

#### After Cleanup
- **Total Tests:** ~80-100 files
- **Workflow Tests:** 4 essential files
- **Knowledge Hooks:** 3 essential files
- **Duplicates:** 0 files
- **Maintenance Burden:** Low

### Key Improvements

1. **Workflow-Aware:** Tests designed for the new workflow system
2. **System-Organized:** Clear organization by GitVan system
3. **Quality-Focused:** Keep only production-critical tests
4. **Performance-Optimized:** Dramatically faster test execution
5. **Maintainable:** Standardized patterns and documentation

### Success Metrics
- **File Reduction:** 60% (236 → 80-100 files)
- **Test Execution:** <2 minutes total
- **Coverage:** >90% code coverage
- **Organization:** Clear system-based structure
- **Workflow Integration:** Tests support new workflow system

### Implementation Priority
1. **Week 1:** Workflow-aware cleanup
2. **Week 2:** Core system consolidation
3. **Week 3:** Knowledge hooks optimization
4. **Week 4:** Final standardization

This plan v3 provides a more targeted approach that respects the new workflow system while achieving the same cleanup objectives with better organization and workflow integration.
