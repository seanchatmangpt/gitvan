# Migration Guide: v2.1.1 → v4.0.0

This guide helps you migrate from GitVan v2.1.1 to v4.0.0.

## Overview

GitVan v4.0.0 is a major release with significant improvements to the job system, security fixes, and enhanced composable architecture. While most APIs remain backward compatible, there are important changes to be aware of.

## Breaking Changes

### 1. Job System Refactoring

**v2.1.1**: Job system was monolithic with limited capabilities.

**v4.0.0**: Job system is now modular with focused sub-composables.

#### Before (v2.1.1)
```javascript
const job = useJob();
await job.run("my-job");  // Basic execution only
```

#### After (v4.0.0)
```javascript
const job = useJob();

// All old methods still work
await job.run("my-job");

// But you now have many more capabilities:
await job.runWithLock("my-job", { lockTimeout: 60000 });
await job.schedule("my-job", "0 2 * * *");
await job.history("my-job", { limit: 10 });
const status = await job.getSchedulerStatus();
```

**Migration**: No changes required, but you can now use additional methods.

### 2. Security: CLI Step Handler

**v2.1.1**: CLI steps were vulnerable to command injection.

**v4.0.0**: All shell arguments are now properly sanitized.

#### Impact
If you were relying on shell interpolation in CLI steps, this will no longer work:

**Before (v2.1.1) - UNSAFE**
```turtle
op:hasStep [
  a op:CLIStep ;
  op:command "echo $USER && rm -rf /" ;  # Command injection possible
] .
```

**After (v4.0.0) - SAFE**
```turtle
op:hasStep [
  a op:CLIStep ;
  op:command "echo" ;
  op:args [ "$USER" ] ;  # Arguments are properly escaped
] .
```

**Migration**: Update any CLI steps that rely on shell interpolation to use explicit arguments.

### 3. Dependency Changes

**v4.0.0** adds 7 previously missing dependencies. If you were working around their absence, you can now rely on them:

- `@babel/traverse` - AST traversal
- `@ai-sdk/anthropic` - Anthropic AI SDK
- `ollama-ai-provider-v2` - Ollama integration
- `p-queue` - Promise queue management
- `marked` - Markdown parsing
- `exceljs` - Excel file handling
- `isomorphic-git` - Programmatic Git (re-verified)

**Migration**: If you added these as peer dependencies, you can remove them.

### 4. Test Removals

**v4.0.0** removes several obsolete test files:
- `mock-strategies.test.mjs`
- `context.test.mjs`
- `unit-refactored.test.mjs`
- `e2e-refactored.test.mjs`
- `WorkerPool.test.mjs`
- `e2e-pack-system.test.mjs`

**Migration**: If you extended these tests, you'll need to update your test suite.

## New Features

### 1. Enhanced Job Scheduling

v4.0.0 introduces Bree-based job scheduling with cron support.

```javascript
const job = useJob();

// Schedule a job
await job.schedule("backup", "0 2 * * *");  // Daily at 2am

// Auto-schedule all jobs with cron expressions
await job.autoScheduleCronJobs();

// Start scheduler
await job.startScheduler();

// View scheduled jobs
const scheduled = await job.listScheduledJobs();

// Stop scheduler
await job.stopScheduler();
```

### 2. Job Discovery Enhancements

New methods for finding jobs:

```javascript
const job = useJob();

// Search jobs
const results = await job.search("backup");

// Find by tag
const deployJobs = await job.getByTag("deploy");

// Get cron jobs
const cronJobs = await job.getCronJobs();

// Find unrouted jobs
const unrouted = await job.listUnrouted();

// Get by directory
const dirJobs = await job.getByDirectory("./custom-jobs");
```

### 3. Job Execution with Locking

Distributed locking for concurrent job execution:

```javascript
const job = useJob();

// Run with automatic locking
const result = await job.runWithLock("my-job", {
  lockTimeout: 60000,  // 60 seconds
  params: { key: "value" }
});

// Lock is automatically acquired and released
```

### 4. Job History & Status

Track job execution over time:

```javascript
const job = useJob();

// Get execution history
const history = await job.history("my-job", { limit: 10 });
// Returns: [{ timestamp, duration, success, output }, ...]

// Check if running
const running = await job.isRunning("my-job");

// Get detailed status
const status = await job.status("my-job");
// Returns: { running, lastRun, nextRun, executions }
```

### 5. Job Validation

Validate job definitions:

```javascript
const job = useJob();

// Validate one job
const result = await job.validate("my-job");
if (!result.valid) {
  console.error(result.errors);
}

// Validate all jobs
const results = await job.validateAll();
for (const [name, validation] of results) {
  if (!validation.valid) {
    console.error(`${name}: ${validation.errors}`);
  }
}
```

### 6. Hybrid Git Implementation

v4.0.0 introduces a hybrid Git implementation combining `isomorphic-git` and native Git:

```javascript
const git = useGit();

// Automatically uses best implementation for each operation
// - Fast operations: isomorphic-git
// - Complex operations: native Git
await git.status();  // Uses most efficient implementation
```

### 7. Job Fingerprinting

Track job definition changes:

```javascript
const job = useJob();

// Get job fingerprint (SHA-256 of definition)
const fingerprint = await job.getFingerprint("my-job");

// Detects when job definition changes
// Useful for cache invalidation and audit trails
```

## API Additions (No Breaking Changes)

### Job Composable

All new methods are additions - existing methods work identically:

- ✅ `job.run()` - Works as before
- ✅ `job.list()` - Works as before
- ✅ `job.get()` - Works as before
- ✅ `job.exists()` - Works as before
- ➕ `job.runWithLock()` - NEW
- ➕ `job.schedule()` - NEW
- ➕ `job.unschedule()` - NEW
- ➕ `job.startScheduler()` - NEW
- ➕ `job.stopScheduler()` - NEW
- ➕ `job.getSchedulerStatus()` - NEW
- ➕ `job.listScheduledJobs()` - NEW
- ➕ `job.autoScheduleCronJobs()` - NEW
- ➕ `job.history()` - NEW
- ➕ `job.status()` - NEW
- ➕ `job.isRunning()` - NEW
- ➕ `job.search()` - NEW
- ➕ `job.getByTag()` - NEW
- ➕ `job.getCronJobs()` - NEW
- ➕ `job.validate()` - NEW
- ➕ `job.validateAll()` - NEW
- ➕ `job.getFingerprint()` - NEW
- ➕ `job.createContext()` - NEW

## Performance Improvements

v4.0.0 includes Tier 1 performance optimizations:

| Operation | v2.1.1 | v4.0.0 | Improvement |
|-----------|--------|--------|-------------|
| Job discovery | 50ms | 5ms | 10x faster |
| Job execution setup | 100ms | 50ms | 2x faster |
| Lock acquisition | 20ms | 5ms | 4x faster |
| Receipt write | 10ms | 5ms | 2x faster |

## Configuration Changes

### Before (v2.1.1)
```javascript
// gitvan.config.js
export default {
  jobs: {
    dir: "jobs"
  }
}
```

### After (v4.0.0)
```javascript
// gitvan.config.js
export default {
  jobs: {
    dir: "jobs",
    timeout: 300000,      // NEW: Default timeout
    scheduler: {          // NEW: Scheduler config
      enabled: true,
      autoStart: true
    }
  }
}
```

**Migration**: Existing configs work without changes. New options are optional.

## Error Handling Changes

v4.0.0 provides more detailed error information:

### Before (v2.1.1)
```javascript
try {
  await job.run("my-job");
} catch (error) {
  console.error(error.message);  // Generic message
}
```

### After (v4.0.0)
```javascript
try {
  await job.run("my-job");
} catch (error) {
  console.error(error.message);      // Human-readable message
  console.error(error.jobName);      // Job that failed
  console.error(error.phase);        // Execution phase
  console.error(error.originalError); // Original error
  console.error(error.context);      // Execution context
}
```

## Security Improvements

### 1. Command Injection Fix

**CVE**: Command injection in CLI step handler

**Impact**: Remote code execution possible through workflow files

**Fix**: All shell arguments are now properly escaped

**Action Required**: Review any CLI steps that use dynamic commands

### 2. Bree Vulnerabilities

**Fixed**: 4 critical vulnerabilities in Bree job system

**Impact**: Job execution security improved

**Action Required**: None - automatically fixed by upgrade

## Deprecation Notices

### None in v4.0.0

All v2.1.1 APIs remain supported in v4.0.0. No deprecations in this release.

## Step-by-Step Migration

### 1. Update package.json

```bash
npm install gitvan@4.0.0
```

### 2. Review CLI Steps

Check any workflow files using `op:CLIStep`:

```bash
# Find all CLI steps
grep -r "op:CLIStep" .gitvan/workflows/
```

If any use shell interpolation, update to use explicit arguments:

```turtle
# Before (unsafe)
op:command "echo $USER && rm -rf /"

# After (safe)
op:command "echo" ;
op:args [ "$USER" ]
```

### 3. Update Tests

If you extended GitVan's test suite:

```bash
# Check for removed test files
ls tests/mock-strategies.test.mjs 2>/dev/null && echo "Update needed"
ls tests/context.test.mjs 2>/dev/null && echo "Update needed"
# etc.
```

Update any imports or extensions of removed tests.

### 4. Verify Dependencies

Check if you were working around missing dependencies:

```bash
# Check package.json for these
grep "@babel/traverse" package.json
grep "@ai-sdk/anthropic" package.json
grep "ollama-ai-provider-v2" package.json
grep "p-queue" package.json
grep "marked" package.json
grep "exceljs" package.json
```

If you added them as peer dependencies, you can remove them.

### 5. Test Your Application

```bash
# Run full test suite
npm test

# Test workflow execution
gitvan workflow list
gitvan workflow run <your-workflow>

# Test job system
gitvan job list
gitvan job run <your-job>
```

### 6. Enable New Features (Optional)

Try out new capabilities:

```javascript
const job = useJob();

// Enable job scheduling
await job.autoScheduleCronJobs();
await job.startScheduler();

// View job history
const history = await job.history("my-job");
console.log(history);

// Validate jobs
const validation = await job.validateAll();
for (const [name, result] of validation) {
  if (!result.valid) {
    console.error(`${name}: ${result.errors}`);
  }
}
```

## Rollback Plan

If you encounter issues, rollback is simple:

```bash
# Rollback to v2.1.1
npm install gitvan@2.1.1

# Or use exact version
npm install gitvan@2.1.1 --save-exact
```

## Getting Help

- **Issues**: [github.com/seanchatmangpt/gitvan/issues](https://github.com/seanchatmangpt/gitvan/issues)
- **Discussions**: [github.com/seanchatmangpt/gitvan/discussions](https://github.com/seanchatmangpt/gitvan/discussions)
- **Documentation**: [API Reference](API_REFERENCE.md)

## Summary Checklist

- [ ] Updated to v4.0.0 (`npm install gitvan@4.0.0`)
- [ ] Reviewed CLI steps for shell interpolation
- [ ] Updated test suite if needed
- [ ] Removed workaround dependencies
- [ ] Tested workflow execution
- [ ] Tested job execution
- [ ] (Optional) Enabled job scheduling
- [ ] (Optional) Enabled job validation

## What's Next?

See [CHANGELOG.md](CHANGELOG.md) for future planned features:
- Enhanced AI provider support (OpenAI, Google AI)
- Advanced workflow visualization
- Performance optimizations for large repositories
- Extended pack marketplace

---

**Last Updated**: 2026-01-09
**Version**: 4.0.0
**License**: MIT
