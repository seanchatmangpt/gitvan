# Tests Using Git Operations Without Hybrid Test Environment Methods

## 🔍 **Analysis Summary**

I found **68 test files** that reference Git operations, but only **10 files** are using the new hybrid test environment methods. The remaining **58 files** need to be refactored to use the new hybrid architecture.

## 📊 **Current Status**

### ✅ **Already Using Hybrid Methods (10 files)**
- `tests/memfs-utils-demo.test.mjs` ✅
- `tests/proper-test-environment-demo.test.mjs` ✅
- `tests/git-native-io-integration.test.mjs` ✅
- `tests/git-e2e.test.mjs` ✅
- `tests/useGit.e2e.test.mjs` ✅
- `tests/useGit.integration.test.mjs` ✅
- `tests/test-pack-lifecycle.mjs` ✅
- `tests/memfs-comprehensive-integration.test.mjs` ✅
- `tests/memfs-test-utils.mjs` ✅
- `tests/memfs-integration.test.mjs` ✅

### ❌ **Need Refactoring (58 files)**

#### **High Priority - Direct Git Commands**
1. `tests/knowledge-hooks-end-to-end.test.mjs` - Uses `execSync("git init")`
2. `tests/tracer/git.test.mjs` - Uses `execSync("git init")`
3. `tests/tracer/e2e.test.mjs` - Uses `execSync("git init")`
4. `tests/git-comprehensive.test.mjs` - Uses `useGit()` directly
5. `tests/git-atomic.test.mjs` - Uses `useGit()` directly
6. `tests/git-implementation.test.mjs` - Uses `useGit()` directly
7. `tests/git-errors.test.mjs` - Uses `useGit()` directly
8. `tests/git-new-commands.test.mjs` - Uses `useGit()` directly

#### **Medium Priority - Git Operations**
9. `tests/filesystem-composable.test.mjs` - Uses Git operations
10. `tests/useGit-comprehensive.test.mjs` - Uses `useGit()` directly
11. `tests/useGit.unit.test.mjs` - Uses `useGit()` directly
12. `tests/useGit.mock-strategies.test.mjs` - Uses `useGit()` directly
13. `tests/useGit.context.test.mjs` - Uses `useGit()` directly
14. `tests/composables.test.mjs` - Uses Git operations
15. `tests/composables/turtle.test.mjs` - Uses Git operations
16. `tests/cli.test.mjs` - Uses Git operations
17. `tests/hooks/hooks-integration.test.mjs` - Uses Git operations
18. `tests/workflow/workflow-integration.test.mjs` - Uses Git operations

#### **Lower Priority - Indirect Git Usage**
19. `tests/scrum-at-scale-knowledge-hooks-e2e.test.mjs`
20. `tests/rdf-to-zod.test.mjs`
21. `tests/performance/simple-benchmarks.test.mjs`
22. `tests/performance/large-repo-tests.test.mjs`
23. `tests/performance/git-benchmarks.test.mjs`
24. `tests/performance/execfile-analysis.test.mjs`
25. `tests/pack/security/security-integration.test.mjs`
26. `tests/pack/security/receipt.test.mjs`
27. `tests/ollama-rdf.test.mjs`
28. `tests/knowledge-hooks-timer-stress.test.mjs`
29. `tests/knowledge-hooks-timer-stress-test.mjs`
30. `tests/knowledge-hooks-suite.test.mjs`
31. `tests/knowledge-hooks-stress.test.mjs`
32. `tests/knowledge-hooks-stress-test.mjs`
33. `tests/knowledge-hooks-simple-verification.test.mjs`
34. `tests/knowledge-hooks-real-breaking-point.test.mjs`
35. `tests/knowledge-hooks-one-million-breaking-point.test.mjs`
36. `tests/knowledge-hooks-millisecond-timers.test.mjs`
37. `tests/knowledge-hooks-git-lifecycle.test.mjs`
38. `tests/knowledge-hooks-extreme-breaking-point.test.mjs`
39. `tests/knowledge-hooks-dark-matter-workloads.test.mjs`
40. `tests/knowledge-hooks-complete-suite.test.mjs`
41. `tests/knowledge-hooks-breaking-point-benchmark.test.mjs`
42. `tests/jtbd-hooks-complete-implementation.test.mjs`
43. `tests/autonomic/ollama-integration.test.mjs`
44. `tests/autonomic/non-blocking-init.test.mjs`
45. `tests/autonomic/github-templates.test.mjs`
46. `tests/autonomic/complete-workflow.test.mjs`
47. `tests/autonomic/background-setup.test.mjs`
48. `tests/ai-commands.test.mjs`
49. `tests/ai-commands-fixed.test.mjs`
50. `tests/unctx-validation.test.mjs`
51. `tests/tracer/template.test.mjs`
52. `tests/tracer/receipt.test.mjs`
53. `tests/tracer/hooks.test.mjs`
54. `tests/playground-e2e.test.mjs`
55. `tests/git-native/integration.test.mjs`
56. `tests/git-native/WorkerPool.test.mjs`
57. `tests/git-native/SnapshotStore.test.mjs`
58. `tests/git-native/ReceiptWriter.test.mjs`
59. `tests/git-native/LockManager.test.mjs`

## 🎯 **Refactoring Strategy**

### **Phase 1: High Priority (8 files)**
Replace direct `execSync("git init")` and `useGit()` calls with:
- `withMemFSTestEnvironment()` for fast unit tests
- `withNativeGitTestEnvironment()` for integration tests
- `withHybridTestEnvironment()` for complex workflows

### **Phase 2: Medium Priority (10 files)**
Update tests using Git operations to use hybrid methods:
- Replace `env.withGit(async (git) => { ... })` with `env.gitAdd()`, `env.gitCommit()`, etc.
- Use `env.files.write()` instead of direct file operations
- Use `env.getBackendType()` to verify backend type

### **Phase 3: Lower Priority (40 files)**
Update indirect Git usage and knowledge hooks tests to use hybrid methods where appropriate.

## 🔧 **Refactoring Patterns**

### **Before (Old Pattern)**
```javascript
// Direct execSync usage
execSync("git init", { cwd: testDir });
execSync("git config user.name 'Test User'", { cwd: testDir });

// Direct useGit usage
const git = useGit();
await git.add("file.txt");
await git.commit("message");
```

### **After (New Pattern)**
```javascript
// MemFS backend for fast testing
await withMemFSTestEnvironment({}, async (env) => {
  expect(env.getBackendType()).toBe("memfs");
  
  env.files.write("file.txt", "content");
  await env.gitAdd("file.txt");
  await env.gitCommit("message");
});

// Native backend for integration testing
await withNativeGitTestEnvironment({}, async (env) => {
  expect(env.getBackendType()).toBe("native");
  
  env.files.write("file.txt", "content");
  await env.gitAdd("file.txt");
  await env.gitCommit("message");
});
```

## 📈 **Benefits of Refactoring**

1. **Consistency**: All tests use the same hybrid architecture
2. **Performance**: MemFS tests run 10-100x faster
3. **Isolation**: Complete test isolation with MemFS
4. **Reliability**: No complex backend switching mid-test
5. **Maintainability**: Clear patterns for different test types
6. **Debugging**: Easier to debug with consistent backend types

## 🚀 **Next Steps**

1. Start with **Phase 1** (High Priority) - 8 files with direct Git commands
2. Move to **Phase 2** (Medium Priority) - 10 files with Git operations
3. Complete with **Phase 3** (Lower Priority) - 40 files with indirect usage
4. Update documentation and examples
5. Run comprehensive test suite to verify all refactoring

This refactoring will bring all Git-related tests into the hybrid architecture, providing consistent, fast, and reliable testing across the entire GitVan codebase! 🎉
