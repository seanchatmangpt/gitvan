# GitVan Error Codes & Troubleshooting Guide

> **Version:** 3.0.0
> **Last Updated:** January 6, 2026

Complete guide to GitVan error codes, common issues, and solutions.

## Table of Contents

- [Error Code Reference](#error-code-reference)
- [Common Errors](#common-errors)
- [Context Errors](#context-errors)
- [Git Errors](#git-errors)
- [Job Errors](#job-errors)
- [Template Errors](#template-errors)
- [Lock Errors](#lock-errors)
- [Configuration Errors](#configuration-errors)
- [Network Errors](#network-errors)
- [Performance Issues](#performance-issues)
- [Debugging Tools](#debugging-tools)
- [Getting Help](#getting-help)

---

## Error Code Reference

| Code | Category | Name | Severity |
|------|----------|------|----------|
| `E001` | Context | Context Not Available | Error |
| `E002` | Context | Context Lost After Await | Error |
| `E003` | Context | Invalid Context | Error |
| `E010` | Git | Git Command Failed | Error |
| `E011` | Git | Git Object Not Found | Error |
| `E012` | Git | Working Directory Not Clean | Warning |
| `E013` | Git | Detached HEAD State | Warning |
| `E014` | Git | Merge Conflict | Error |
| `E020` | Job | Job Not Found | Error |
| `E021` | Job | Job Execution Failed | Error |
| `E022` | Job | Job Timeout | Error |
| `E023` | Job | Job Validation Failed | Error |
| `E024` | Job | Invalid Job Definition | Error |
| `E030` | Template | Template Not Found | Error |
| `E031` | Template | Template Syntax Error | Error |
| `E032` | Template | Template Rendering Failed | Error |
| `E033` | Template | Frontmatter Parse Error | Error |
| `E040` | Lock | Lock Acquisition Failed | Error |
| `E041` | Lock | Lock Timeout | Error |
| `E042` | Lock | Lock Already Held | Warning |
| `E043` | Lock | Lock Release Failed | Error |
| `E050` | Config | Configuration Invalid | Error |
| `E051` | Config | Configuration Not Found | Error |
| `E052` | Config | Environment Variable Missing | Warning |
| `E060` | Network | Connection Failed | Error |
| `E061` | Network | API Timeout | Error |
| `E062` | Network | Rate Limit Exceeded | Warning |
| `E070` | Workflow | Workflow Parse Error | Error |
| `E071` | Workflow | Cycle Detected in DAG | Error |
| `E072` | Workflow | Step Failed | Error |
| `E080` | Receipt | Receipt Verification Failed | Error |
| `E081` | Receipt | Receipt Not Found | Error |
| `E082` | Receipt | Invalid Fingerprint | Error |

---

## Common Errors

### E001: Context Not Available

**Error Message:**
```
Error: Context not available - did you forget to use withGitVan()?
```

**Cause:**
Attempting to use a composable outside of `withGitVan()` context wrapper.

**Solution:**

```javascript
// ✗ WRONG
const git = useGit();
await git.branch(); // Error: Context not available

// ✓ CORRECT
import { withGitVan, useGit } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  await git.branch(); // Works!
});
```

**Prevention:**
- Always wrap composable usage in `withGitVan()`
- Use ESLint plugin `eslint-plugin-gitvan` to detect this error

---

### E002: Context Lost After Await

**Error Message:**
```
Error: GitVan context was lost after async operation
```

**Cause:**
Context is not preserved across `await` calls when not using `withGitVan()` wrapper.

**Solution:**

```javascript
// ✗ WRONG - Context lost
const git = useGit();
await someAsyncOperation();
await git.branch(); // Context lost!

// ✓ CORRECT - Context preserved
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  await someAsyncOperation();
  await git.branch(); // Context still available
});
```

**Technical Details:**
GitVan uses `unctx` for async context preservation. The `withGitVan()` wrapper establishes an async context that survives `await` calls.

---

### E010: Git Command Failed

**Error Message:**
```
Error: Command failed: git push origin main
fatal: unable to access 'https://github.com/...': Could not resolve host
```

**Cause:**
Git command execution failed with non-zero exit code.

**Solution:**

1. **Check error details:**
```javascript
try {
  await git.push('origin', 'main');
} catch (error) {
  console.error('Git command:', error.command);
  console.error('Exit code:', error.originalError.code);
  console.error('Stderr:', error.stderr);
}
```

2. **Common causes and fixes:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Could not resolve host` | Network issue | Check internet connection |
| `Permission denied (publickey)` | SSH key not configured | Configure SSH keys |
| `Repository not found` | Invalid URL or permissions | Verify repository URL |
| `Not a git repository` | Wrong directory | Check `cwd` parameter |

**Prevention:**
- Validate repository state before Git operations
- Use `try-catch` blocks around Git commands
- Check network connectivity before remote operations

---

### E020: Job Not Found

**Error Message:**
```
Error: Job not found: deploy-production
```

**Cause:**
Referenced job doesn't exist in the jobs directory.

**Solution:**

1. **List available jobs:**
```bash
gitvan job list
```

2. **Check job file exists:**
```bash
ls -la jobs/deploy-production.mjs
```

3. **Verify job discovery:**
```javascript
const job = useJob();
const jobs = await job.list();
console.log('Available jobs:', jobs.map(j => j.id));
```

4. **Common causes:**
   - Typo in job name
   - Job file not in `jobs/` directory
   - Job file has wrong extension (must be `.mjs` or `.js`)
   - Job not exported correctly

**Prevention:**
- Use auto-completion in IDE
- Validate job IDs before execution
- Use consistent naming conventions

---

### E021: Job Execution Failed

**Error Message:**
```
Error: Job execution failed: ReferenceError: undefined variable
```

**Cause:**
Job code threw an exception during execution.

**Solution:**

1. **Check job logs:**
```bash
gitvan daemon logs --tail 100
```

2. **Run job with verbose output:**
```bash
gitvan job run --name my-job --verbose
```

3. **Add error handling to job:**
```javascript
export default defineJob({
  async run(payload) {
    try {
      // Job logic
    } catch (error) {
      console.error('Job error:', error);
      throw error; // Re-throw for GitVan to handle
    }
  }
});
```

4. **Common causes:**
   - Undefined variables
   - Missing dependencies
   - Network timeouts
   - Permission issues

**Prevention:**
- Test jobs locally before deploying
- Use TypeScript for type checking
- Add comprehensive error handling
- Validate payload before processing

---

### E022: Job Timeout

**Error Message:**
```
Error: Job execution timed out after 300000ms
```

**Cause:**
Job exceeded maximum execution time.

**Solution:**

1. **Increase timeout:**
```javascript
// In config
export default {
  jobs: {
    timeout: 600000 // 10 minutes
  }
};

// Per-job
gitvan job run --name long-job --timeout 900000
```

2. **Optimize job performance:**
   - Profile slow operations
   - Add progress logging
   - Break into smaller jobs
   - Use parallel execution where possible

3. **Investigate hanging operations:**
```javascript
// Add timeout to individual operations
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const result = await Promise.race([
  longOperation(),
  timeout(60000).then(() => { throw new Error('Operation timeout'); })
]);
```

---

### E030: Template Not Found

**Error Message:**
```
Error: Template not found: job-template.njk
```

**Cause:**
Template file doesn't exist in configured template directories.

**Solution:**

1. **Check template paths:**
```javascript
// In config
export default {
  templates: {
    dirs: ["templates", "packs/*/templates"]
  }
};
```

2. **List template directories:**
```bash
ls -R templates/
```

3. **Verify template file:**
```bash
find . -name "job-template.njk"
```

4. **Debug template resolution:**
```javascript
const template = await useTemplate({ paths: ['templates'] });
console.log('Template paths:', template.paths);
```

**Prevention:**
- Use consistent template naming
- Configure multiple template directories
- Validate template existence before rendering

---

### E031: Template Syntax Error

**Error Message:**
```
Error: Template syntax error at line 12: unexpected token 'endif'
```

**Cause:**
Invalid Nunjucks template syntax.

**Solution:**

1. **Check template syntax:**
```nunjucks
{# ✗ WRONG #}
{% if condition %}
  Content
{% end %}  {# Wrong - should be 'endif' #}

{# ✓ CORRECT #}
{% if condition %}
  Content
{% endif %}
```

2. **Common syntax errors:**

| Error | Wrong | Correct |
|-------|-------|---------|
| Block end | `{% end %}` | `{% endif %}`, `{% endfor %}` |
| Variable output | `{{ variable }` | `{{ variable }}` |
| Comments | `{/* comment */}` | `{# comment #}` |
| Filters | `{{ value \| filter }}` | `{{ value \| filter }}` |

3. **Validate template:**
```javascript
try {
  const result = await template.render('my-template.njk', {});
} catch (error) {
  console.error('Template error:', error.message);
  console.error('Line:', error.lineno);
}
```

---

### E040: Lock Acquisition Failed

**Error Message:**
```
Error: Failed to acquire lock 'deploy-lock': already held by another process
```

**Cause:**
Distributed lock is already held by another job execution.

**Solution:**

1. **Wait and retry:**
```javascript
const lock = useLock();
let attempts = 0;
const maxAttempts = 5;

while (attempts < maxAttempts) {
  const result = await lock.acquire('deploy-lock', {
    timeout: 30000
  });

  if (result.acquired) {
    try {
      // Critical section
    } finally {
      await lock.release('deploy-lock');
    }
    break;
  }

  attempts++;
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

2. **Check lock status:**
```javascript
const isLocked = await lock.isLocked('deploy-lock');
if (isLocked) {
  const info = await lock.getInfo('deploy-lock');
  console.log('Lock held by:', info.owner);
  console.log('Expires at:', info.expiresAt);
}
```

3. **Increase timeout:**
```javascript
const result = await lock.acquire('deploy-lock', {
  timeout: 120000, // 2 minutes
  ttl: 600000      // 10 minutes
});
```

**Prevention:**
- Use appropriate lock timeouts
- Always release locks in `finally` blocks
- Monitor lock usage
- Implement lock expiration (TTL)

---

### E050: Configuration Invalid

**Error Message:**
```
Error: Invalid configuration: jobs.timeout must be a positive number
```

**Cause:**
Configuration file contains invalid values.

**Solution:**

1. **Validate configuration:**
```bash
# Check syntax
node -c gitvan.config.mjs

# Test configuration loading
gitvan config validate
```

2. **Use schema validation:**
```typescript
import { defineGitVanConfig } from 'gitvan';

export default defineGitVanConfig({
  jobs: {
    timeout: 300000 // TypeScript will validate this
  }
});
```

3. **Common configuration errors:**

| Error | Wrong | Correct |
|-------|-------|---------|
| Timeout type | `timeout: "5m"` | `timeout: 300000` |
| Array type | `dirs: "templates"` | `dirs: ["templates"]` |
| Boolean type | `autoescape: "false"` | `autoescape: false` |

**Prevention:**
- Use `defineGitVanConfig` helper
- Enable TypeScript
- Validate configuration in CI
- Use environment-specific configs

---

## Context Errors

### Debugging Context Issues

**Symptoms:**
- "Context not available" errors
- Composables returning `undefined`
- Intermittent failures

**Diagnostic Steps:**

1. **Check context usage:**
```javascript
import { useGitVan } from 'gitvan';

try {
  const ctx = useGitVan();
  console.log('Context available:', ctx);
} catch (error) {
  console.error('Context not available');
}
```

2. **Verify wrapper:**
```javascript
// Check if code is wrapped
await withGitVan({ cwd: process.cwd() }, async () => {
  // All composable usage here
});
```

3. **Trace context loss:**
```javascript
await withGitVan({ cwd: process.cwd() }, async () => {
  console.log('1. Context available');

  const git = useGit();
  console.log('2. Git composable created');

  await someAsyncCall();
  console.log('3. After async call');

  await git.branch(); // If this fails, context was lost
});
```

**Solutions:**
- Ensure all composable usage is within `withGitVan()`
- Don't store composables outside context scope
- Use single `withGitVan()` wrapper at entry point

---

## Performance Issues

### Slow Job Execution

**Symptoms:**
- Jobs take longer than expected
- Timeouts occurring
- High CPU/memory usage

**Diagnostic Steps:**

1. **Profile job execution:**
```javascript
export default defineJob({
  async run(payload) {
    const startTime = Date.now();

    console.time('operation1');
    await operation1();
    console.timeEnd('operation1');

    console.time('operation2');
    await operation2();
    console.timeEnd('operation2');

    console.log('Total time:', Date.now() - startTime);
  }
});
```

2. **Check Git operations:**
```javascript
// Slow: Multiple git operations
for (const file of files) {
  await git.add(file); // N operations
}

// Fast: Batch operation
await git.add(files); // 1 operation
```

3. **Monitor resource usage:**
```bash
# Check daemon CPU/memory
ps aux | grep gitvan

# Check disk I/O
iotop -p $(pgrep -f gitvan)
```

**Solutions:**
- Batch Git operations
- Use parallel execution where possible
- Cache template environments
- Limit concurrent jobs
- Optimize SPARQL queries

---

### High Memory Usage

**Symptoms:**
- Memory consumption increasing over time
- Out of memory errors
- Slow performance

**Diagnostic Steps:**

1. **Monitor memory:**
```javascript
console.log('Memory usage:', process.memoryUsage());
```

2. **Check for leaks:**
```bash
# Run with memory profiling
node --inspect gitvan daemon start

# Use Chrome DevTools to analyze heap
```

**Solutions:**
- Disable template caching in config
- Limit receipt retention
- Clear graph cache periodically
- Use streaming for large files
- Restart daemon periodically

---

## Debugging Tools

### Enable Debug Logging

```bash
# All GitVan debug output
DEBUG=gitvan:* gitvan job run --name my-job

# Specific subsystems
DEBUG=gitvan:job,gitvan:git gitvan daemon start

# Include timestamps
DEBUG=gitvan:* LOG_TIMESTAMPS=true gitvan daemon start
```

### Verbose Mode

```bash
# Verbose CLI output
gitvan job run --name deploy --verbose

# Verbose daemon
gitvan daemon start --verbose --log-level debug
```

### Inspect Configuration

```javascript
import { loadOptions } from 'gitvan/config';

const config = await loadOptions({ rootDir: process.cwd() });
console.log('Loaded config:', JSON.stringify(config, null, 2));
```

### Check Git State

```bash
# Repository info
git status
git log --oneline -5
git branch -a
git remote -v

# GitVan-specific
git notes list refs/notes/gitvan/audit
git for-each-ref refs/gitvan/
```

### Validate Jobs

```bash
# Validate all jobs
for job in jobs/*.mjs; do
  gitvan job validate --name $(basename $job .mjs)
done

# Test job discovery
DEBUG=gitvan:job gitvan job list
```

---

## Getting Help

### Self-Diagnosis Checklist

Before seeking help, check:

- [ ] GitVan version: `gitvan --version`
- [ ] Node.js version: `node --version`
- [ ] Configuration file exists and is valid
- [ ] Git repository is initialized
- [ ] Composables are used within `withGitVan()`
- [ ] Permissions are correct (file, Git, network)
- [ ] Environment variables are set
- [ ] Logs contain error details
- [ ] Error is reproducible

### Collecting Debug Information

```bash
# Create debug report
cat > debug-report.md <<EOF
# GitVan Debug Report

## Environment
- GitVan Version: $(gitvan --version)
- Node Version: $(node --version)
- OS: $(uname -a)
- Working Directory: $(pwd)

## Configuration
\`\`\`javascript
$(cat gitvan.config.mjs)
\`\`\`

## Error
\`\`\`
$(gitvan job run --name failing-job 2>&1)
\`\`\`

## Logs
\`\`\`
$(tail -n 100 .gitvan/daemon.log)
\`\`\`

## Git Status
\`\`\`
$(git status)
\`\`\`
EOF
```

### Community Resources

- **Documentation:** https://gitvan.dev/docs
- **GitHub Issues:** https://github.com/gitvan/gitvan/issues
- **Discord:** https://discord.gg/gitvan
- **Stack Overflow:** Tag `gitvan`

### Filing Bug Reports

Include:

1. **Title:** Clear, concise description
2. **GitVan version:** Output of `gitvan --version`
3. **Environment:** OS, Node.js version
4. **Steps to reproduce:** Minimal reproducible example
5. **Expected behavior:** What should happen
6. **Actual behavior:** What actually happens
7. **Logs:** Relevant error messages and stack traces
8. **Configuration:** Sanitized config file

**Template:**
```markdown
## Bug Description
<!-- Clear description of the issue -->

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
<!-- What should happen -->

## Actual Behavior
<!-- What actually happens -->

## Environment
- GitVan Version: 3.0.0
- Node.js Version: 18.x
- OS: Ubuntu 22.04

## Configuration
```javascript
// gitvan.config.mjs
export default {
  jobs: { dir: "jobs" }
};
```

## Logs
```
Error: ...
```

## Additional Context
<!-- Any other relevant information -->
```

---

## Quick Reference

### Most Common Errors

| Error | Quick Fix |
|-------|-----------|
| Context not available | Wrap in `withGitVan()` |
| Job not found | Check job name and directory |
| Lock timeout | Increase timeout or check lock status |
| Template not found | Verify template path in config |
| Git command failed | Check repository state and permissions |
| Configuration invalid | Validate config file syntax |

### Emergency Commands

```bash
# Stop all GitVan processes
pkill -f gitvan

# Clear all locks
rm -rf .gitvan/locks/*

# Reset daemon
gitvan daemon stop && gitvan daemon start

# Clear template cache
rm -rf .gitvan/cache/templates/*

# Validate configuration
node -c gitvan.config.mjs
```

---

## See Also

- [Complete API Reference](./api/complete-reference.md)
- [Configuration Guide](./configuration.md)
- [CLI Reference](./cli/complete-reference.md)
- [Quick Start Guide](./quickstart.md)
