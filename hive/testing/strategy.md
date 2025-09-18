# useGit() Comprehensive Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the `useGit()` composable function, covering all aspects from unit tests to integration tests, mock strategies, and performance validation.

## Test Architecture

### Test Pyramid Structure

```
         /\
        /E2E\      <- End-to-End (Real git operations)
       /------\
      /Integr. \   <- Integration (Real repos, mocked context)
     /----------\
    /   Unit     \ <- Unit tests (Full mocking, isolated)
   /--------------\
```

## Test Categories

### 1. Unit Tests (Isolated)
- **Mock Level**: Full execFile mocking
- **Focus**: Function logic, argument construction, error handling
- **Coverage**: All git operations, edge cases, boundary conditions

### 2. Integration Tests (Semi-Real)
- **Mock Level**: Context mocking only
- **Focus**: Real git operations with controlled environments
- **Coverage**: Git repository interactions, file system operations

### 3. End-to-End Tests (Full Real)
- **Mock Level**: None (real git, real repos)
- **Focus**: Complete workflows, performance, concurrent operations
- **Coverage**: Real-world scenarios, system integration

## Mock Strategies

### execFile Mock Strategy

```javascript
// Level 1: Full Mock (Unit Tests)
const mockExecFile = vi.fn();
vi.mock('node:child_process', () => ({
  execFile: mockExecFile
}));

// Level 2: Selective Mock (Integration Tests)
const realExecFile = require('node:child_process').execFile;
const conditionalMock = (command, args, options) => {
  if (command === 'git' && args[0] === 'remote') {
    // Mock only specific commands
    return Promise.resolve({ stdout: 'mocked-output' });
  }
  return realExecFile(command, args, options);
};

// Level 3: No Mock (E2E Tests)
// Use real execFile for authentic testing
```

### Context Mock Strategy

```javascript
// unctx context mocking
const mockContext = {
  cwd: '/test/repo',
  env: { CUSTOM_VAR: 'test' }
};

vi.mock('../core/context.mjs', () => ({
  useGitVan: () => mockContext,
  tryUseGitVan: () => mockContext
}));
```

## Test Categories by Function Groups

### Repository Info Operations
- `branch()` - Current branch detection
- `head()` - HEAD commit SHA retrieval
- `repoRoot()` - Repository root path detection
- `worktreeGitDir()` - Git directory location
- `nowISO()` - Deterministic time handling

### Read Operations
- `log()` - Commit history with formatting
- `statusPorcelain()` - Working directory status
- `isAncestor()` - Ancestry relationship checks
- `mergeBase()` - Common ancestor detection
- `revList()` - Revision listing

### Write Operations
- `add()` - Stage files for commit
- `commit()` - Create commits with options
- `tag()` - Create tags with signing

### Notes Operations (Receipts)
- `noteAdd()` - Add notes to commits
- `noteAppend()` - Append to existing notes
- `noteShow()` - Display commit notes

### Atomic Operations (Locks)
- `updateRefCreate()` - Atomic reference creation
- Lock conflict handling
- Race condition prevention

### Plumbing Operations
- `hashObject()` - Object hashing
- `writeTree()` - Tree object creation
- `catFilePretty()` - Object content display

## Error Handling Test Scenarios

### Happy Path Violations
1. **Invalid Arguments**: Empty arrays, null values, invalid paths
2. **Git Command Failures**: Non-existent refs, dirty working directory
3. **System Failures**: Permission errors, disk space issues
4. **Network Issues**: Remote repository access failures
5. **Concurrency Issues**: Lock conflicts, race conditions

### Context Binding Edge Cases
1. **Missing Context**: No unctx context available
2. **Invalid Context**: Malformed context data
3. **Context Loss**: Async operations losing context
4. **Environment Conflicts**: Conflicting environment variables

## Performance Testing

### Benchmarks
1. **Single Operation Performance**: <50ms per git command
2. **Batch Operation Performance**: Linear scaling
3. **Memory Usage**: No memory leaks in long-running operations
4. **Concurrent Operations**: Thread-safe execution

### Load Testing
1. **High Frequency Operations**: 100+ operations/second
2. **Large Repository Handling**: Repos with 10K+ commits
3. **Concurrent Users**: Multiple simultaneous git operations
4. **Resource Constraints**: Limited memory/CPU scenarios

## Security Testing

### Input Validation
1. **Command Injection**: Malicious git arguments
2. **Path Traversal**: Directory escape attempts
3. **Environment Variable Injection**: Malicious env vars
4. **File System Access**: Unauthorized file access

### Privilege Escalation
1. **Git Config Manipulation**: Unauthorized configuration changes
2. **Hook Exploitation**: Malicious git hooks
3. **Symlink Attacks**: Symbolic link manipulation

## Test Data Management

### Repository Fixtures
```javascript
// Minimal repository
const minimalRepo = {
  commits: 1,
  branches: ['main'],
  files: ['README.md']
};

// Complex repository
const complexRepo = {
  commits: 100,
  branches: ['main', 'develop', 'feature/test'],
  tags: ['v1.0.0', 'v1.1.0'],
  files: ['src/**/*.js', 'tests/**/*.test.js'],
  notes: true,
  remotes: ['origin']
};
```

### Test Data Factories
```javascript
class GitRepoFactory {
  static async createMinimal(tempDir) {
    // Create minimal git repo for testing
  }

  static async createComplex(tempDir) {
    // Create complex git repo with history
  }

  static async createCorrupted(tempDir) {
    // Create repo with intentional issues
  }
}
```

## Coverage Requirements

### Code Coverage Targets
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >95%
- **Lines**: >90%

### Functional Coverage
- **All Git Operations**: 100% tested
- **Error Paths**: 100% tested
- **Edge Cases**: 100% tested
- **Performance Scenarios**: 100% tested

## Test Execution Strategy

### Parallel Execution
```javascript
// Group 1: Fast unit tests (parallel)
describe.concurrent('Unit Tests', () => {
  // All mocked tests run in parallel
});

// Group 2: Integration tests (sequential)
describe('Integration Tests', () => {
  // File system operations run sequentially
});

// Group 3: E2E tests (isolated)
describe('E2E Tests', () => {
  // Real git operations in isolation
});
```

### Test Environment Isolation
1. **Temporary Directories**: Each test gets fresh temp dir
2. **Process Isolation**: No shared state between tests
3. **Environment Reset**: Clean environment variables
4. **Git Configuration**: Isolated git config per test

## Continuous Integration

### CI Pipeline Stages
1. **Lint**: Code style and static analysis
2. **Unit Tests**: Fast, mocked tests
3. **Integration Tests**: Real git operations
4. **E2E Tests**: Full workflow testing
5. **Performance Tests**: Benchmark validation
6. **Security Tests**: Vulnerability scanning

### Test Matrix
- **Node.js Versions**: 18.x, 20.x, 22.x
- **Operating Systems**: Ubuntu, macOS, Windows
- **Git Versions**: 2.30+, 2.40+, latest
- **Repository Types**: Fresh, large, corrupted

## Debugging and Diagnostics

### Test Debugging Tools
```javascript
const debugGit = (command, args, result) => {
  console.log(`[DEBUG] git ${args.join(' ')}`);
  console.log(`[DEBUG] Result: ${JSON.stringify(result)}`);
};

const captureGitCommands = () => {
  const commands = [];
  // Intercept and log all git commands
  return commands;
};
```

### Error Reproduction
1. **Deterministic Failures**: Consistent test conditions
2. **Environment Capture**: Full system state recording
3. **Command History**: Complete git command log
4. **Timing Information**: Operation duration tracking

## Test Maintenance

### Test Review Criteria
1. **Readability**: Clear test names and descriptions
2. **Reliability**: Consistent pass/fail behavior
3. **Maintainability**: Easy to update when code changes
4. **Performance**: Fast execution times

### Test Refactoring Guidelines
1. **DRY Principle**: Eliminate duplicate test code
2. **Test Utilities**: Shared helper functions
3. **Data Builders**: Reusable test data creation
4. **Assertion Libraries**: Consistent assertion patterns

## Metrics and Reporting

### Test Metrics
- **Execution Time**: Per test and suite
- **Coverage Percentage**: Line and branch coverage
- **Failure Rate**: Historical test reliability
- **Performance Trends**: Operation speed over time

### Quality Gates
- **Coverage Threshold**: >90% required for merge
- **Performance Regression**: >10% slowdown fails
- **Flaky Test Detection**: >5% failure rate investigation
- **Security Scan**: Zero critical vulnerabilities

This comprehensive testing strategy ensures the `useGit()` function is thoroughly validated across all use cases, providing confidence in its reliability, performance, and security.