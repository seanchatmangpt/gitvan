# GitVan Pack System Test Plan

## Current Test Status Analysis

### ✅ **Working Tests (165 passed)**
- **Security Policy Tests**: 26/26 passing - Comprehensive policy enforcement
- **Idempotency Tests**: 15/15 passing - Tracking, rollback, state management
- **Pack Prompts Tests**: 8/8 passing - Input resolution and validation
- **Pack Optimization Tests**: 2/2 passing - Caching system
- **Pack Registry Search Tests**: 20/20 passing - Search and listing functionality
- **Pack Registry GitHub Tests**: 15/15 passing - GitHub integration
- **Pack Signature Tests**: 19/19 passing - Cryptographic signatures
- **Pack Dependency Tests**: 60/60 passing - Dependency resolution and composition

### ❌ **Failing Tests (48 failed)**

#### 1. **Template Processing Issues (5 failures)**
- **Root Cause**: `attempted to output null or undefined value` errors
- **Affected Tests**:
  - `pack-integration.test.mjs` - Full pack installation workflow
  - `pack-operations.test.mjs` - Template processing with front-matter
  - `pack-operations.test.mjs` - Template without front-matter
  - `pack-operations.test.mjs` - Merge mode support
- **Priority**: **CRITICAL** - Core functionality broken

#### 2. **Worker Environment Issues (35 failures)**
- **Root Cause**: `process.chdir() is not supported in workers`
- **Affected Tests**:
  - All security integration tests (15 failures)
  - All receipt manager tests (20 failures)
- **Priority**: **HIGH** - Test environment configuration issue

#### 3. **Registry Configuration Issues (8 failures)**
- **Root Cause**: Registry URL configuration mismatches
- **Affected Tests**:
  - `pack-registry.test.mjs` - Registry initialization and validation
- **Priority**: **MEDIUM** - Configuration issue

## Test Reorganization Plan

### Phase 1: Fix Critical Issues

#### 1.1 **Template Processing Fix**
**Target**: Fix null/undefined value handling in template processor
**Files to Fix**:
- `src/pack/operations/template-processor.mjs`
- `tests/pack-operations.test.mjs`
- `tests/pack-integration.test.mjs`

**Action Items**:
- [ ] Add null/undefined value validation before template rendering
- [ ] Improve error messages for template processing failures
- [ ] Add input validation for template variables
- [ ] Fix merge mode implementation

#### 1.2 **Worker Environment Fix**
**Target**: Remove `process.chdir()` calls from tests
**Files to Fix**:
- `tests/pack/security/receipt.test.mjs`
- `tests/pack/security/security-integration.test.mjs`
- `tests/pack-registry.test.mjs`

**Action Items**:
- [ ] Replace `process.chdir()` with absolute path handling
- [ ] Use `withGitVan()` context for Git operations
- [ ] Update test setup to work in worker environment

#### 1.3 **Registry Configuration Fix**
**Target**: Fix registry URL configuration
**Files to Fix**:
- `tests/pack-registry.test.mjs`

**Action Items**:
- [ ] Update registry URL expectations to match actual implementation
- [ ] Fix pack ID validation tests
- [ ] Update marketplace category count expectations

### Phase 2: Test Reorganization

#### 2.1 **Move All Pack Tests to `tests/pack/`**
**Current Structure**:
```
tests/
├── pack/ (4 files)
├── pack-*.test.mjs (8 files scattered)
└── pack-*.mjs (2 files scattered)
```

**Target Structure**:
```
tests/pack/
├── core/
│   ├── pack.test.mjs
│   ├── manager.test.mjs
│   ├── applier.test.mjs
│   ├── planner.test.mjs
│   └── registry.test.mjs
├── operations/
│   ├── template-processor.test.mjs
│   ├── file-ops.test.mjs
│   ├── job-installer.test.mjs
│   └── transform-processor.test.mjs
├── security/
│   ├── signature.test.mjs
│   ├── receipt.test.mjs
│   ├── policy.test.mjs
│   └── security-integration.test.mjs
├── idempotency/
│   ├── tracker.test.mjs
│   ├── rollback.test.mjs
│   ├── state.test.mjs
│   └── integration.test.mjs
├── dependency/
│   ├── resolver.test.mjs
│   ├── composer.test.mjs
│   ├── graph.test.mjs
│   └── integration.test.mjs
├── optimization/
│   ├── cache.test.mjs
│   ├── optimizer.test.mjs
│   └── profiler.test.mjs
├── integration/
│   ├── pack-lifecycle.test.mjs
│   ├── pack-composition.test.mjs
│   └── e2e-pack-system.test.mjs
└── fixtures/
    ├── sample-pack/
    └── test-pack/
```

#### 2.2 **Test Categories and Coverage**

**Unit Tests** (Component-level testing):
- **Core System**: Pack, PackManager, PackApplier, PackPlanner, PackRegistry
- **Operations**: TemplateProcessor, FileOperations, JobInstaller, TransformProcessor
- **Security**: PackSigner, ReceiptManager, PolicyEnforcer
- **Idempotency**: IdempotencyTracker, RollbackManager, StateManager
- **Dependencies**: DependencyResolver, PackComposer, DependencyGraph
- **Optimization**: PackCache, PackOptimizer, PackProfiler

**Integration Tests** (Component interaction testing):
- **Pack Lifecycle**: Install, update, remove, status
- **Security Workflow**: Sign, verify, audit, receipt management
- **Idempotency Workflow**: Track, rollback, state management
- **Dependency Workflow**: Resolve, compose, graph analysis
- **Template Processing**: Front-matter, merge modes, error handling

**End-to-End Tests** (Full workflow testing):
- **Complete Pack Installation**: From manifest to applied files
- **Pack Composition**: Multiple packs with dependencies
- **Security Audit Trail**: Complete security workflow
- **Rollback Scenarios**: Failed installations and rollbacks

#### 2.3 **Test Quality Improvements**

**Test Data Management**:
- [ ] Create comprehensive test fixtures
- [ ] Standardize test data across all tests
- [ ] Add test data validation

**Error Testing**:
- [ ] Add comprehensive error scenario testing
- [ ] Test edge cases and boundary conditions
- [ ] Add performance testing for large operations

**Mock Strategy**:
- [ ] Create consistent mocking strategy
- [ ] Add mock data for external dependencies
- [ ] Implement mock validation

### Phase 3: Test Enhancement

#### 3.1 **Performance Testing**
- [ ] Large pack installation performance
- [ ] Dependency resolution performance
- [ ] Template processing performance
- [ ] Security operation performance

#### 3.2 **Security Testing**
- [ ] Penetration testing for security components
- [ ] Malicious pack detection testing
- [ ] Signature verification edge cases
- [ ] Policy enforcement testing

#### 3.3 **Compatibility Testing**
- [ ] Cross-platform compatibility
- [ ] Node.js version compatibility
- [ ] Git version compatibility
- [ ] File system compatibility

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] Fix template processing null/undefined issues
- [ ] Fix worker environment issues
- [ ] Fix registry configuration issues
- [ ] Verify all critical tests pass

### Week 2: Test Reorganization
- [ ] Move all pack tests to `tests/pack/`
- [ ] Reorganize test structure
- [ ] Update test imports and paths
- [ ] Verify test organization

### Week 3: Test Enhancement
- [ ] Add comprehensive error testing
- [ ] Add performance testing
- [ ] Add security testing
- [ ] Add compatibility testing

### Week 4: Validation and Documentation
- [ ] Run full test suite
- [ ] Document test coverage
- [ ] Create test maintenance guide
- [ ] Update CI/CD pipeline

## Success Criteria

### Phase 1 Success Criteria
- [ ] All template processing tests pass
- [ ] All worker environment issues resolved
- [ ] All registry configuration issues resolved
- [ ] Test suite runs without critical failures

### Phase 2 Success Criteria
- [ ] All pack tests organized in `tests/pack/`
- [ ] Test structure follows best practices
- [ ] Test imports and paths updated
- [ ] Test organization documented

### Phase 3 Success Criteria
- [ ] Comprehensive test coverage (>90%)
- [ ] Performance benchmarks established
- [ ] Security testing implemented
- [ ] Compatibility testing implemented

## Risk Assessment

### High Risk
- **Template Processing**: Core functionality broken, affects pack installation
- **Worker Environment**: Test environment issues prevent proper testing

### Medium Risk
- **Registry Configuration**: May affect pack discovery and management
- **Test Organization**: May impact development workflow

### Low Risk
- **Test Enhancement**: Nice-to-have improvements
- **Performance Testing**: Optimization opportunities

## Conclusion

The GitVan Pack System has a solid foundation with **165 passing tests** covering core functionality. The main issues are:

1. **Template Processing**: Critical functionality broken (5 failures)
2. **Worker Environment**: Test environment configuration issues (35 failures)
3. **Registry Configuration**: Configuration mismatches (8 failures)

**Priority**: Fix template processing issues first, then resolve worker environment issues, then reorganize tests for better maintainability.

**Next Steps**: Start with Phase 1 critical fixes to restore core functionality, then proceed with test reorganization for better structure and maintainability.
