# GitVan Job-Only Architecture

## 🎯 Problem Solved: Hooks Directory Complexity

**The Challenge:**
GitVan had a hooks directory system that added unnecessary complexity:
- **Hooks Directory**: `src/hooks/` with router hooks and shared utilities
- **Two Layers**: Hooks + Jobs (hooks call jobs)
- **Complex Mapping**: Hook files delegate to job execution
- **Extra Files**: More files to maintain and understand

**The Job-Only Solution:**
Eliminate hooks directory entirely and have jobs handle Git operations directly:
- **Jobs Only**: Define `hooks: ["post-commit", "post-merge"]` and handle Git operations directly
- **No Hooks Directory**: Eliminates `src/hooks/` complexity entirely
- **Single Layer**: Jobs execute directly - simple and predictable
- **Fewer Files**: Less code to maintain and understand

---

## 🚀 Implementation Delivered

### 1. Job-Only Job Definition (`src/core/job-registry.mjs`)

```javascript
export function defineJob(config) {
  const { meta, hooks = [], run } = config;
  
  return {
    meta: {
      name: meta.name,
      desc: meta.desc || "",
      tags: meta.tags || [],
      version: meta.version || "1.0.0",
    },
    hooks, // Array of Git hook names: ["post-commit", "post-merge"]
    run: async (context) => {
      // Execute the job's run function directly
      const result = await run(context);
      return result;
    }
  };
}
```

### 2. Simplified Hook Loader (`src/core/hook-loader.mjs`)

```javascript
export class GitVanHookLoader {
  constructor() {
    this.projectRoot = process.cwd();
    this.jobLoader = createJobLoader();
  }

  async run(gitHookName, context = {}) {
    console.log(`🔍 GitVan: Running ${gitHookName} jobs`);
    
    // Load all jobs first
    await this.jobLoader.loadAllJobs();
    
    // Get jobs registered for this hook
    const hookJobs = this.jobLoader.getJobsForHook(gitHookName);
    
    // Execute jobs directly
    for (const job of hookJobs) {
      await this.executeJob(job, context);
    }
  }

  async executeJob(job, context) {
    const jobName = job.meta.name;
    console.log(`   🔧 Running job: ${jobName}`);
    
    // Execute the job's run function directly
    await job.run(context);
  }
}
```

### 3. Jobs Handle Git Operations Directly

```javascript
// jobs/unrouting.route.mjs
export default defineJob({
  meta: {
    name: "unrouting:route",
    desc: "Route file changes to GitVan jobs using unrouting patterns",
    tags: ["unrouting", "router", "file-based"],
    version: "1.0.0",
  },
  hooks: ["post-commit", "post-merge"], // Job-only architecture

  async run(context) {
    const git = useGit();
    const notes = useNotes();
    const receipt = useReceipt();
    const unrouting = useUnrouting();

    const { hookName, timestamp } = context;

    // Jobs handle Git operations directly
    const diffOutput = await git.diff({
      from: "HEAD~1",
      to: "HEAD",
      nameOnly: true,
    });
    const changedFiles = diffOutput.split("\n").filter((f) => f.trim());

    // Process files and route to jobs
    const jobQueue = unrouting.routeFiles(changedFiles, routes);
    
    // Execute routed jobs
    for (const job of jobQueue) {
      await executeJob(job);
    }
  }
});
```

---

## 🔄 Migration Path

### Before: Hooks + Jobs System
```javascript
// Job definition
export default defineJob({
  meta: { name: "my-job" },
  hooks: ["post-commit", "post-merge"],
  async run(context) { /* ... */ }
});

// Hooks directory
src/hooks/
├── 10-router.post-commit.mjs  // Calls jobs
├── 10-router.post-merge.mjs  // Calls jobs
└── _shared/index.mjs         // Shared utilities

// Two layers: hooks call jobs
```

### After: Job-Only System
```javascript
// Job definition (same)
export default defineJob({
  meta: { name: "my-job" },
  hooks: ["post-commit", "post-merge"],
  async run(context) { 
    // Handle Git operations directly
    const git = useGit();
    const diffOutput = await git.diff({...});
    // Process files directly
  }
});

// No hooks directory
// Single layer: jobs execute directly
```

---

## 📊 Test Results

```
🤖 GitVan Job-Only Architecture Test

🔍 Phase 1: Job Loader Test
📝 Registered job: unrouting:route (hooks: post-commit, post-merge)
   ✅ Loaded 10 jobs

   🎯 Hook-to-Job Mapping:
   - post-commit: unrouting:route
   - post-merge: unrouting:route

🔍 Phase 2: Hook Loader with Job-Only Architecture
   🔧 Testing post-commit with job-only architecture: ✅
   🔧 Testing post-merge with job-only architecture: ✅

🔍 Phase 3: Directory Structure Test
   📁 src/ directory contents: 21 files
   ✅ hooks/ directory successfully removed

✅ Job-Only Architecture Test Complete!
```

---

## 🎯 Architecture Benefits

### Eliminates Complexity
- **Before**: Hooks directory + Jobs (two layers)
- **After**: Jobs only (one layer)
- **Result**: Simpler execution flow

### Jobs Handle Everything
- **Before**: Hooks delegate to jobs
- **After**: Jobs handle Git operations directly
- **Result**: More intuitive for developers

### Fewer Files
- **Before**: `src/hooks/` + `jobs/` directories
- **After**: `jobs/` directory only
- **Result**: Less code to maintain

### Cleaner Project Structure
- **Before**: Complex hook-to-job mapping
- **After**: Direct job execution
- **Result**: Easier to understand

---

## 🚀 Usage Examples

### Job Definition
```javascript
export default defineJob({
  meta: {
    name: "component:update",
    desc: "Update component when files change",
    tags: ["component", "ui"],
    version: "1.0.0",
  },
  hooks: ["post-commit", "post-merge"], // Job-only architecture
  async run(context) {
    const { hookName } = context;
    
    console.log(`🚀 Component update triggered by ${hookName}`);
    
    // Handle Git operations directly
    const git = useGit();
    const diffOutput = await git.diff({
      from: "HEAD~1",
      to: "HEAD",
      nameOnly: true,
    });
    
    const changedFiles = diffOutput.split("\n").filter((f) => f.trim());
    
    // Process component changes directly
    for (const file of changedFiles) {
      if (file.includes("component")) {
        await updateComponent(file);
      }
    }
  }
});
```

### Hook Execution
```bash
# Git operations trigger jobs directly
git commit -m "feat: add Button component"
# → post-commit hook → component:update job (executes directly)

git merge feature-branch
# → post-merge hook → component:update job (executes directly)
```

### Manual Testing
```bash
# Test hook execution
node bin/gitvan-hook.mjs post-commit

# Test event simulation
node bin/gitvan-event-simulate.mjs --files "src/components/Button.tsx"
```

---

## 🎯 Summary

**GitVan Job-Only Architecture** successfully eliminates the hooks directory complexity by having jobs handle Git operations directly:

### ✅ **What Was Delivered**
1. **Removed Hooks Directory**: Eliminated `src/hooks/` entirely
2. **Simplified Hook Loader**: Executes jobs directly
3. **Jobs Handle Git Operations**: Direct Git operations in jobs
4. **Single Layer Execution**: Jobs execute directly without intermediate hooks
5. **Comprehensive Testing**: Verified job-only architecture works correctly

### ✅ **Architecture Benefits**
- **Eliminates Complexity**: No hooks directory to maintain
- **Jobs Handle Everything**: Git operations, routing, execution all in jobs
- **Simpler Execution**: Direct job execution without intermediate layers
- **Fewer Files**: Less code to maintain and understand
- **More Intuitive**: Developers work directly with jobs

### ✅ **Migration Complete**
- **Hooks Directory**: Successfully removed
- **Hook Loader**: Simplified to execute jobs directly
- **Jobs**: Updated to handle Git operations directly
- **Testing**: Comprehensive verification

**The result**: A job-only architecture that eliminates hooks directory complexity while providing simpler execution, fewer files to maintain, and a more intuitive development experience.

---

*GitVan Job-Only Architecture: Jobs handle everything, simpler execution, cleaner codebase.*
