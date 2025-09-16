# GitVan Playground - Troubleshooting Guide

## 🔍 Common Issues and Solutions

This guide helps diagnose and resolve common issues encountered when using the GitVan playground.

## 🚨 Quick Diagnostics

### Check System Status

```bash
cd playground

# Check if jobs are discovered
npm run list

# Check daemon status
npm run status

# Check git receipts
git notes --ref=refs/notes/gitvan/results show HEAD

# Check generated files
ls -la dist/
```

### Verify Dependencies

```bash
# Check Node.js version
node --version  # Should be 18+

# Check pnpm installation
pnpm --version

# Check Git installation
git --version

# Check repository status
git status
```

## 🔧 Job Discovery Issues

### Issue: "No jobs found"

**Symptoms**:
```
Discovered jobs:
==================================================
No jobs found
```

**Causes**:
1. Job files not in correct location
2. Incorrect file naming
3. Invalid ES module exports
4. Import path errors

**Solutions**:

1. **Check file location**:
   ```bash
   ls -la jobs/
   ls -la jobs/docs/
   ls -la jobs/test/
   ls -la jobs/alerts/
   ```

2. **Verify file naming**:
   - On-demand: `*.mjs`
   - Cron: `*.cron.mjs`
   - Event: `*.evt.mjs`

3. **Check exports**:
   ```javascript
   // Correct export
   export default defineJob({
     meta: { desc: "Job description" },
     async run({ ctx }) {
       // Job implementation
     }
   });
   ```

4. **Verify imports**:
   ```javascript
   // Correct imports
   import { defineJob } from "gitvan/define";
   import { useGit } from "gitvan/useGit";
   import { useTemplate } from "gitvan/useTemplate";
   ```

### Issue: "Failed to load job from..."

**Symptoms**:
```
Failed to load job from /path/to/job.mjs: Cannot find module...
```

**Causes**:
1. Missing dependencies
2. Incorrect import paths
3. Package not installed

**Solutions**:

1. **Install dependencies**:
   ```bash
   cd playground
   pnpm install
   ```

2. **Check package.json**:
   ```json
   {
     "devDependencies": {
       "gitvan": "link:.."
     }
   }
   ```

3. **Verify package exports**:
   ```bash
   # Check if package exports are working
   node -e "import('gitvan/define').then(m => console.log(Object.keys(m)))"
   ```

## 🎯 Job Execution Issues

### Issue: "Job not found: job-id"

**Symptoms**:
```
Error: Job not found: job-id
```

**Causes**:
1. Incorrect job ID
2. Job not discovered
3. Typo in job name

**Solutions**:

1. **List available jobs**:
   ```bash
   npm run list
   ```

2. **Use correct job ID**:
   ```bash
   # Correct format: path:to:job
   npm run run:changelog  # docs:changelog
   npm run run:simple     # test:simple
   ```

3. **Check job discovery**:
   ```bash
   node -e "import('./dev.mjs').then(m=>m.list())"
   ```

### Issue: "Command failed: git..."

**Symptoms**:
```
Command failed: git log --pretty=%h%x09%s -n
error: -n requires an argument
```

**Causes**:
1. Incorrect git command arguments
2. Git command syntax errors
3. Missing git arguments

**Solutions**:

1. **Fix git command arguments**:
   ```javascript
   // Incorrect
   const logOutput = await git.log("%h%x09%s", "-n", "30");
   
   // Correct
   const logOutput = await git.log("%h%x09%s", ["-n", "30"]);
   ```

2. **Check git command syntax**:
   ```bash
   # Test git command manually
   git log --pretty=%h%x09%s -n 30
   ```

3. **Verify git repository**:
   ```bash
   git status
   git log --oneline -5
   ```

### Issue: "template not found: template.njk"

**Symptoms**:
```
template not found: template.njk
```

**Causes**:
1. Template file missing
2. Incorrect template path
3. Template directory not configured

**Solutions**:

1. **Check template file exists**:
   ```bash
   ls -la templates/
   cat templates/changelog.njk
   ```

2. **Verify template path**:
   ```javascript
   // Correct template path
   const outputPath = await template.renderToFile(
     "changelog.njk",  // Template name
     "dist/CHANGELOG.md",  // Output path
     data
   );
   ```

3. **Check template configuration**:
   ```javascript
   // gitvan.config.js
   export default {
     templates: { 
       engine: "nunjucks", 
       dirs: ["templates"]  // Template directory
     }
   };
   ```

## 🔒 Lock Management Issues

### Issue: "Job job-id is already running"

**Symptoms**:
```
Job test:simple is already running
```

**Causes**:
1. Previous job execution didn't complete
2. Lock not released properly
3. Concurrent execution attempt

**Solutions**:

1. **Check for running jobs**:
   ```bash
   # Check git refs for locks
   git show-ref | grep gitvan/locks
   ```

2. **Release lock manually**:
   ```bash
   # Remove lock ref
   git update-ref -d refs/gitvan/locks/test:simple
   ```

3. **Use force flag**:
   ```bash
   # Force execution (bypasses lock)
   node -e "import('./dev.mjs').then(m=>m.run('test:simple', {force: true}))"
   ```

### Issue: "fatal: update_ref failed for ref..."

**Symptoms**:
```
fatal: update_ref failed for ref 'refs/gitvan/locks/job-id': refusing to update ref with bad name
```

**Causes**:
1. Invalid job ID characters
2. Git ref naming restrictions
3. Special characters in job ID

**Solutions**:

1. **Check job ID format**:
   ```javascript
   // Job IDs should use colons for separation
   // Good: "docs:changelog", "test:simple"
   // Bad: "docs/changelog", "test.simple"
   ```

2. **Verify job ID encoding**:
   ```javascript
   // The system automatically encodes job IDs for git refs
   // Colons become hyphens, special chars become underscores
   ```

## 📝 Template Rendering Issues

### Issue: "Template syntax error"

**Symptoms**:
```
Template syntax error: Unexpected token
```

**Causes**:
1. Invalid Nunjucks syntax
2. Missing template variables
3. Incorrect filter usage

**Solutions**:

1. **Check template syntax**:
   ```njk
   <!-- Correct syntax -->
   {{ variable }}
   {% for item in items %}
     {{ item }}
   {% endfor %}
   
   <!-- Incorrect syntax -->
   {{ variable
   {% for item in items
     {{ item
   {% endfor
   ```

2. **Verify template variables**:
   ```javascript
   // Ensure all template variables are provided
   const data = {
     commits: commits,
     generatedAt: ctx.nowISO,
     totalCommits: commits.length
   };
   ```

3. **Check filter usage**:
   ```njk
   <!-- Correct filter syntax -->
   {{ 'hello' | capitalize }}
   {{ data | json(2) }}
   
   <!-- Incorrect filter syntax -->
   {{ 'hello' | capitalize 2 }}
   {{ data | json 2 }}
   ```

### Issue: "Filter not found"

**Symptoms**:
```
Filter not found: filter-name
```

**Causes**:
1. Filter not registered
2. Incorrect filter name
3. Missing filter dependency

**Solutions**:

1. **Check available filters**:
   ```bash
   node -e "import('./src/utils/nunjucks-config.mjs').then(m => console.log(m.listAvailableFilters()))"
   ```

2. **Use correct filter names**:
   ```njk
   <!-- Available filters -->
   {{ 'hello' | capitalize }}
   {{ 'cats' | pluralize }}
   {{ 'hello_world' | camelize }}
   {{ 'helloWorld' | underscore }}
   {{ 'hello_world' | dasherize }}
   {{ 'hello_world' | humanize }}
   {{ 'hello world' | titleize }}
   {{ data | json(2) }}
   ```

## 🔄 Daemon Issues

### Issue: "Daemon is not running"

**Symptoms**:
```
Daemon is not running
```

**Causes**:
1. Daemon not started
2. Daemon crashed
3. Process terminated

**Solutions**:

1. **Start daemon**:
   ```bash
   npm run daemon
   ```

2. **Check daemon status**:
   ```bash
   npm run status
   ```

3. **Start daemon programmatically**:
   ```bash
   node -e "import('./dev.mjs').then(m=>m.startDaemon())"
   ```

### Issue: "Cron scheduler not working"

**Symptoms**:
```
No cron jobs scheduled
```

**Causes**:
1. No cron jobs defined
2. Invalid cron expressions
3. Scheduler not started

**Solutions**:

1. **Check cron jobs**:
   ```bash
   # Look for .cron.mjs files
   find jobs/ -name "*.cron.mjs"
   ```

2. **Verify cron expressions**:
   ```javascript
   // Valid cron expressions
   cron: "0 2 * * *"        // Daily at 2 AM
   cron: "*/15 * * * *"     // Every 15 minutes
   cron: "0 9-17 * * 1-5"   // Business hours
   ```

3. **Test cron parsing**:
   ```bash
   node -e "import('./src/jobs/cron.mjs').then(m => { const s = new m.CronScheduler(); console.log(s.parseCron('0 2 * * *')); })"
   ```

## 🎯 Event System Issues

### Issue: "No event-driven jobs found"

**Symptoms**:
```
No event-driven jobs found
```

**Causes**:
1. No event jobs defined
2. Invalid event predicates
3. Event evaluator not working

**Solutions**:

1. **Check event jobs**:
   ```bash
   # Look for .evt.mjs files
   find jobs/ -name "*.evt.mjs"
   ```

2. **Verify event predicates**:
   ```javascript
   // Valid event predicates
   on: {
     any: [
       { tagCreate: "v*.*.*" },
       { semverTag: true }
     ]
   }
   ```

3. **Test event evaluation**:
   ```bash
   node -e "import('./src/jobs/events.mjs').then(m => { const e = new m.EventEvaluator(); console.log(e.evaluatePredicates({tagCreate: 'v*.*.*'}, {commit: 'HEAD'})); })"
   ```

## 🔧 Configuration Issues

### Issue: "Configuration not loaded"

**Symptoms**:
```
Configuration not loaded
```

**Causes**:
1. Missing config file
2. Invalid config syntax
3. Config loading error

**Solutions**:

1. **Check config file**:
   ```bash
   ls -la gitvan.config.js
   cat gitvan.config.js
   ```

2. **Verify config syntax**:
   ```javascript
   // Valid config syntax
   export default {
     root: process.cwd(),
     jobs: { dir: "jobs" },
     templates: { engine: "nunjucks", dirs: ["templates"] },
     receipts: { ref: "refs/notes/gitvan/results" }
   };
   ```

3. **Test config loading**:
   ```bash
   node -e "import('./dev.mjs').then(m => m.loadConfig().then(c => console.log(c)))"
   ```

## 📊 Performance Issues

### Issue: "Job execution too slow"

**Symptoms**:
- Jobs take longer than expected
- Timeout errors
- Resource exhaustion

**Solutions**:

1. **Check execution time**:
   ```bash
   time node -e "import('./dev.mjs').then(m=>m.run('test:simple'))"
   ```

2. **Optimize job implementation**:
   ```javascript
   // Use parallel operations
   const [result1, result2] = await Promise.all([
     operation1(),
     operation2()
   ]);
   ```

3. **Check resource usage**:
   ```bash
   # Monitor memory usage
   node --inspect -e "import('./dev.mjs').then(m=>m.run('test:simple'))"
   ```

### Issue: "Memory leaks"

**Symptoms**:
- Increasing memory usage
- Out of memory errors
- Performance degradation

**Solutions**:

1. **Check for resource leaks**:
   ```javascript
   // Ensure proper cleanup
   try {
     // Job logic
   } finally {
     // Cleanup resources
     await cleanup();
   }
   ```

2. **Monitor memory usage**:
   ```bash
   # Use Node.js inspector
   node --inspect --inspect-brk -e "import('./dev.mjs').then(m=>m.run('test:simple'))"
   ```

## 🐛 Debugging Techniques

### Enable Debug Logging

```javascript
// Add debug logging to jobs
async run({ ctx }) {
  ctx.logger.log("Starting job execution");
  ctx.logger.log("Context:", ctx);
  
  try {
    // Job logic
    ctx.logger.log("Job completed successfully");
  } catch (error) {
    ctx.logger.error("Job failed:", error);
    throw error;
  }
}
```

### Use Node.js Inspector

```bash
# Start with inspector
node --inspect -e "import('./dev.mjs').then(m=>m.run('test:simple'))"

# Connect with Chrome DevTools
# Open chrome://inspect
```

### Check Git State

```bash
# Check repository status
git status
git log --oneline -5
git show-ref | grep gitvan

# Check git notes
git notes --ref=refs/notes/gitvan/results show HEAD
```

### Verify File System

```bash
# Check generated files
ls -la dist/
cat dist/CHANGELOG.md
cat dist/status-report.json

# Check job files
ls -la jobs/
cat jobs/docs/changelog.mjs
```

## 📞 Getting Help

### Check Logs

```bash
# Check console output
npm run dev

# Check error logs
node -e "import('./dev.mjs').then(m=>m.run('test:simple'))" 2>&1 | tee error.log
```

### Run Diagnostics

```bash
# Run comprehensive test
node test-playground.mjs

# Run E2E tests
npx vitest run tests/playground-e2e.test.mjs
```

### Report Issues

When reporting issues, include:

1. **Error message**: Complete error output
2. **Steps to reproduce**: Exact commands run
3. **Environment**: Node.js version, OS, Git version
4. **Configuration**: Relevant config files
5. **Logs**: Console output and error logs

This troubleshooting guide should help resolve most common issues encountered with the GitVan playground.
