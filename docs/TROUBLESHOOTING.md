# GitVan Troubleshooting Guide

**Goal**: Solve common problems quickly.

This guide addresses the most frequent issues developers encounter when using GitVan. Each issue includes a diagnosis procedure and step-by-step solution.

---

## Table of Contents

1. [Context and Async Issues](#context-and-async-issues)
2. [Git Operations Failures](#git-operations-failures)
3. [Job System Problems](#job-system-problems)
4. [Configuration Issues](#configuration-issues)
5. [Performance and Memory](#performance-and-memory)
6. [Testing Failures](#testing-failures)
7. [Hooks and Events](#hooks-and-events)
8. [Dependencies and Setup](#dependencies-and-setup)

---

## Context and Async Issues

### "Context not available" Error

**Symptoms:**
```
Error: Context not available - are you in withGitVan()?
    at useGit() [composables/git.mjs:10]
```

**Root Cause:**
You called a composable outside of `withGitVan()` wrapper, or context was lost across an `await` call.

**Diagnosis:**
```bash
# Find where useGit() or other composables are called
grep -n "useGit\|useTemplate\|useJob" your-file.mjs
```

**Solution:**

✗ **WRONG** - Composable outside wrapper:
```javascript
const git = useGit();
await git.status();  // ✗ CRASH - context lost!
```

✓ **CORRECT** - Wrap with withGitVan:
```javascript
import { withGitVan, useGit } from 'gitvan';

await withGitVan(context, async () => {
  const git = useGit();
  await git.status();  // ✓ Works - context preserved!
});
```

✗ **WRONG** - Context lost after await:
```javascript
async function badCode() {
  const git = useGit();
  await someAsyncCall();  // ✗ Context lost here!
  await git.status();     // ✗ CRASH
}
```

✓ **CORRECT** - Use wrapper around all async:
```javascript
async function goodCode() {
  await withGitVan(context, async () => {
    const git = useGit();
    await someAsyncCall();  // ✓ Context preserved
    await git.status();     // ✓ Works
  });
}
```

**Prevention:**
- Always wrap async operations in `withGitVan()`
- Never call composables outside this wrapper
- If you see `const composable = use*()` not inside a function passed to `withGitVan()`, it's wrong

---

### Composable Returns Undefined

**Symptoms:**
```javascript
const git = useGit();
console.log(git);  // undefined
```

**Root Cause:**
Composable was called outside `withGitVan()` context.

**Solution:**
See "Context not available" section above.

---

## Git Operations Failures

### Git Command Hangs or Times Out

**Symptoms:**
```
Error: timeout waiting for git operation
Operation: git status
Timeout: 30000ms
```

**Common Causes:**
1. Network issues (push/pull operations)
2. Large repository (status is slow)
3. Stale lock files

**Diagnosis:**
```bash
# Check for stale lock files
find .git -name "*.lock" -ls

# Check git status manually
git status

# Test push/pull separately
git fetch origin
```

**Solutions:**

**Fix 1: Remove stale lock files**
```bash
rm -f .git/index.lock
rm -f .git/refs/heads/*.lock
```

**Fix 2: Increase timeout in code**
```javascript
await withGitVan(context, async () => {
  const git = useGit();
  const status = await git.status({
    timeout: 60000  // Increase to 60 seconds
  });
});
```

**Fix 3: Check network connectivity**
```bash
ping github.com
ssh -T git@github.com  # For GitHub
```

---

### "fatal: not a git repository" Error

**Symptoms:**
```
Error: fatal: not a git repository (or any of the parent directories): .git
```

**Root Cause:**
GitVan is running in a directory that's not a Git repository.

**Diagnosis:**
```bash
# Check if .git exists
ls -la .git

# Check current directory
pwd
```

**Solutions:**

**Fix 1: Initialize git repository**
```bash
cd /path/to/repo
git init
git config user.name "Your Name"
git config user.email "your@email.com"
```

**Fix 2: Set correct working directory**
```javascript
const context = {
  repo: '/path/to/git/repo',  // Must be a git repo
  config: {}
};

await withGitVan(context, async () => {
  // Now operations work in the correct repo
});
```

---

### Commit Fails with "nothing to commit"

**Symptoms:**
```
Error: nothing to commit, working tree clean
```

**Root Cause:**
No staged files. Composables don't auto-stage files.

**Diagnosis:**
```bash
git status  # Check what's staged
git add .   # Stage files manually if needed
```

**Solution:**

```javascript
await withGitVan(context, async () => {
  const git = useGit();
  const fs = useFileSystem();

  // 1. Make changes
  await fs.write('src/index.js', 'new content');

  // 2. Stage changes BEFORE committing
  await git.add('src/index.js');

  // 3. Now commit works
  const sha = await git.commit('feat: update index');
});
```

---

### Branch Operations Fail

**Symptoms:**
```
Error: pathspec 'feature/new' did not match any files
Error: branch 'main' not found
```

**Diagnosis:**
```bash
git branch -a          # List all branches
git show-ref           # Show all refs
git symbolic-ref HEAD  # Show current branch
```

**Solutions:**

**Issue: Creating branch on detached HEAD**
```javascript
// ✗ WRONG - May fail if detached
await git.branch('feature/new');

// ✓ CORRECT - Switch to main first
await git.checkout('main');
await git.branch('feature/new');
```

**Issue: Branch doesn't exist**
```javascript
// ✗ WRONG - Assumes branch exists
await git.checkout('staging');  // May fail if staging doesn't exist

// ✓ CORRECT - Create if needed
try {
  await git.checkout('staging');
} catch (e) {
  if (e.message.includes('not found')) {
    await git.branch('staging');
    await git.checkout('staging');
  } else {
    throw e;
  }
}
```

---

## Job System Problems

### Job Not Discovered

**Symptoms:**
```bash
$ gitvan job list
No jobs found
```

**Root Cause:**
Jobs are in wrong directory or don't export default function.

**Diagnosis:**
```bash
# Check job directory exists
ls -la jobs/

# Check job files
find . -name "*.mjs" -path "*/jobs/*"

# Check export
grep "export default" jobs/my-job.mjs
```

**Solutions:**

**Fix 1: Correct job directory**
```javascript
// In gitvan.config.js
export default {
  jobs: {
    dir: 'jobs'  // Must match actual directory
  }
};
```

**Fix 2: Add proper export**
```javascript
// In jobs/my-job.mjs

// ✗ WRONG - No export
async function doSomething() { }

// ✓ CORRECT - Default export
export default async function myJob(context) {
  console.log('Running job');
  return { success: true };
}
```

**Fix 3: Verify job discovery**
```javascript
import { createJobDiscovery } from 'gitvan/composables/job-discovery';

const discovery = createJobDiscovery({ cwd: process.cwd() });
const jobs = await discovery.list();
console.log('Found jobs:', jobs);
```

---

### Job Execution Hangs

**Symptoms:**
```
Job execution timeout after 30000ms
```

**Diagnosis:**
```bash
# Check if job completes manually
node jobs/my-job.mjs

# Check for blocking operations
grep -n "while\|for" jobs/my-job.mjs
```

**Solutions:**

**Fix 1: Add timeout handling**
```javascript
export default async function myJob(context) {
  const timeout = 5000;

  try {
    const result = await Promise.race([
      longRunningOperation(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
    return result;
  } catch (e) {
    return { error: e.message, success: false };
  }
}
```

**Fix 2: Increase job timeout in config**
```javascript
// In gitvan.config.js
export default {
  jobs: {
    dir: 'jobs',
    timeout: 60000  // 60 seconds instead of 30
  }
};
```

---

### Job Execution Fails Silently

**Symptoms:**
```
Job completed but output is empty/null
No error message
```

**Root Cause:**
Job is failing but not throwing. Check job return value.

**Diagnosis:**
```bash
# Run job manually
node jobs/my-job.mjs
echo $?  # Check exit code
```

**Solution:**

```javascript
// ✗ WRONG - Silent failure
export default async function myJob(context) {
  try {
    await riskyOperation();
  } catch (e) {
    // Error silently ignored
  }
  return null;  // Returns null, job executor thinks it succeeded
}

// ✓ CORRECT - Proper error handling
export default async function myJob(context) {
  try {
    const result = await riskyOperation();
    return { success: true, data: result };
  } catch (error) {
    // Log error
    console.error('Job failed:', error);

    // Return error object
    return { success: false, error: error.message };
  }
}
```

---

## Configuration Issues

### Configuration File Not Found

**Symptoms:**
```
Warning: no gitvan config found
Using defaults
```

**Diagnosis:**
```bash
# Check if config file exists
ls -la gitvan.config.js gitvan.config.mjs gitvan.config.ts .gitvanrc

# Check current directory
pwd
```

**Solutions:**

**Fix 1: Create config file**
```bash
cat > gitvan.config.js << 'EOF'
export default {
  jobs: { dir: 'jobs' },
  templates: { dirs: ['templates'] }
};
EOF
```

**Fix 2: Ensure it's in repository root**
```bash
# Config must be in repository root
ls gitvan.config.js  # Should be in /path/to/repo/gitvan.config.js
```

---

### Configuration Not Applied

**Symptoms:**
```
Jobs still not discovered despite config
Template dirs ignored
```

**Root Cause:**
Configuration syntax error or not exported correctly.

**Diagnosis:**
```javascript
// Test config loading
import { loadConfig } from 'c12';

const config = await loadConfig({ name: 'gitvan' });
console.log('Loaded config:', config);
```

**Solutions:**

**Fix 1: Verify export**
```javascript
// ✗ WRONG
const config = {
  jobs: { dir: 'jobs' }
};

// ✓ CORRECT
export default {
  jobs: { dir: 'jobs' }
};
```

**Fix 2: Use valid JavaScript**
```javascript
// ✗ WRONG - Syntax error
export default {
  jobs: { dir: 'jobs' },  // Extra comma
};

// ✓ CORRECT
export default {
  jobs: { dir: 'jobs' }
};
```

---

## Performance and Memory

### High Memory Usage

**Symptoms:**
```
Node process using 500MB+ memory
Process killed due to OOM
```

**Root Cause:**
Loading large files, large git history, or job queue buildup.

**Diagnosis:**
```bash
# Check process memory
node --max-old-space-size=4096 my-script.mjs

# Profile memory usage
node --prof my-script.mjs
node --prof-process isolate-*.log > prof.txt
```

**Solutions:**

**Fix 1: Increase Node memory**
```bash
node --max-old-space-size=4096 my-script.mjs
```

**Fix 2: Stream large files instead of loading**
```javascript
// ✗ WRONG - Loads entire file into memory
const content = await fs.read('large-file.txt');

// ✓ CORRECT - Stream processing
const stream = fs.createReadStream('large-file.txt');
stream.on('data', chunk => {
  // Process chunk by chunk
});
```

**Fix 3: Limit concurrent operations**
```javascript
// Don't start too many promises at once
const batchSize = 10;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await Promise.all(batch.map(item => processItem(item)));
}
```

---

### Slow Git Operations

**Symptoms:**
```
git status takes 5+ seconds
push/pull is very slow
```

**Root Cause:**
Large repository, poor network, or excessive hooks.

**Solutions:**

**Fix 1: Check repository size**
```bash
du -sh .git/
git count-objects -vH
```

**Fix 2: Disable hooks during operations**
```javascript
await withGitVan(context, async () => {
  const git = useGit();

  // Temporarily disable hooks
  const status = await git.status({
    ignoreHooks: true
  });
});
```

**Fix 3: Use shallow clones for large repos**
```bash
git clone --depth 1 <repo-url>
```

---

## Testing Failures

### Tests Timeout

**Symptoms:**
```
Test timeout exceeded (30000ms)
Jest/Vitest: Test did not complete
```

**Root Cause:**
Missing `await`, missing context wrapper, or infinite loop.

**Diagnosis:**
```javascript
// Look for missing await
it('should do something', async () => {
  const result = asyncFunction();  // ✗ Missing await
});

// Look for missing context
it('should use composable', () => {
  const git = useGit();  // ✗ Not in withGitVan
});
```

**Solutions:**

**Fix 1: Add missing await**
```javascript
// ✗ WRONG
it('should fetch status', async () => {
  const git = useGit();
  const status = git.status();  // Missing await
  expect(status).toBeDefined();
});

// ✓ CORRECT
it('should fetch status', async () => {
  await withGitVan(context, async () => {
    const git = useGit();
    const status = await git.status();
    expect(status).toBeDefined();
  });
});
```

**Fix 2: Use withGitVan wrapper**
```javascript
// ✗ WRONG
it('should work', async () => {
  const git = useGit();  // ✗ No context
  await git.status();
});

// ✓ CORRECT
it('should work', async () => {
  await withGitVan(testContext, async () => {
    const git = useGit();  // ✓ Has context
    await git.status();
  });
});
```

---

### Test Cleanup Issues

**Symptoms:**
```
Tests pass individually but fail in suite
Memory leaks between tests
Stale file handles
```

**Root Cause:**
Missing cleanup in afterEach hooks.

**Solutions:**

**Fix 1: Clean up after each test**
```javascript
describe('Git operations', () => {
  let context;

  beforeEach(() => {
    // Setup
    context = createTestContext();
  });

  afterEach(async () => {
    // Cleanup
    if (context?.tempDir) {
      await rm(context.tempDir, { recursive: true, force: true });
    }
  });

  it('should work', async () => {
    // Test
  });
});
```

---

## Hooks and Events

### Hooks Not Triggered

**Symptoms:**
```
Hook defined but never fires
Pre-commit hook not running
```

**Root Cause:**
- Hook not registered properly
- Predicate evaluation failing silently
- Git event not captured

**Diagnosis:**
```bash
# Check hook files exist
find .gitvan/hooks -name "*.ttl"

# Check Husky hooks
ls -la .husky/

# Test git event
git commit -m "test"  # Should trigger
```

**Solutions:**

**Fix 1: Verify hook definition**
```turtle
# hooks/my-hook.ttl

@prefix : <http://example.org#> .
@prefix git: <http://example.org/git#> .
@prefix hook: <http://example.org/hook#> .

:MyHook a hook:Hook ;          # ✓ Must be hook:Hook
  hook:on [ a git:CommitEvent ] ;
  hook:job [ hook:name "my-job" ] .
```

**Fix 2: Register hook with bridge**
```javascript
import { getHuskyHookBridge } from 'gitvan/integrations/husky-hook-bridge';

const bridge = getHuskyHookBridge({ cwd: process.cwd() });
await bridge.registerHook('pre-commit', {
  // Hook configuration
});
```

---

### Event Queue Buildup

**Symptoms:**
```
Warning: event queue has 1000+ pending events
Memory usage increasing
```

**Root Cause:**
Events not being processed, or jobs failing silently.

**Diagnosis:**
```javascript
const discovery = useJobDiscovery();
const stats = await discovery.getStats?.();
console.log('Pending jobs:', stats?.pending);
```

**Solution:**

```javascript
// Process events manually if needed
import { EventQueue } from 'gitvan/git-lifecycle/EventQueue';

const queue = new EventQueue({ maxSize: 100 });
await queue.process();
```

---

## Dependencies and Setup

### UnRDF Submodule Issues

**Symptoms:**
```
Error: cannot find module 'unrdf'
vendor/unrdf/ is empty
```

**Root Cause:**
Submodule not initialized.

**Diagnosis:**
```bash
# Check submodule status
git submodule status

# Check if directory has content
ls -la vendor/unrdf/
```

**Solutions:**

**Fix 1: Initialize submodule**
```bash
git submodule update --init --recursive
```

**Fix 2: If submodule doesn't exist**
```bash
# Clean and re-clone
rm -rf vendor/unrdf
git submodule add https://github.com/your/unrdf.git vendor/unrdf
git submodule update --init --recursive
```

---

### Dependency Version Conflicts

**Symptoms:**
```
Error: peer dependency conflict
Cannot resolve package version
```

**Diagnosis:**
```bash
npm ls unrdf
npm ls citty
```

**Solution:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or update specific package
npm update unrdf@latest
```

---

## Getting Additional Help

### Debug Mode

Enable detailed logging:

```bash
DEBUG=gitvan:* node my-script.mjs
DEBUG=gitvan:composables:* node my-script.mjs
DEBUG=* node my-script.mjs  # All debug info
```

### Common Error Messages

| Message | Cause | Solution |
|---------|-------|----------|
| "Context not available" | Outside withGitVan | Use withGitVan wrapper |
| "Not a git repository" | Wrong directory | Initialize repo or set correct path |
| "nothing to commit" | No staged files | Use git.add() before commit |
| "timeout" | Operation too slow | Increase timeout or optimize |
| "Job not found" | Wrong directory | Check jobs/ directory exists |

### Getting Help

1. **Check this guide** - Look for similar symptom
2. **Check documentation** - Review CONFIGURATION_GUIDE.md, API_REFERENCE.md
3. **Check CLAUDE.md** - Detailed architectural patterns
4. **Run tests** - `npm test` to verify setup
5. **Check examples** - Look in examples/ directory
6. **Search code** - `grep -r` to find patterns

---

**Last Updated**: January 9, 2026
**Version**: 4.0.1
