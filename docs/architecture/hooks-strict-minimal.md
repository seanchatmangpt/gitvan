# GitVan Hooks - Strict Minimal Architecture

## 🎯 Rule Set Implemented

**Scope**: `post-commit` and `post-merge` only (v1). `post-rewrite` and `pre-push` added later.

**ABI**: Each module exports a single `run(ctx)` that returns nothing. Happy path.

**Loader**: One launcher resolves and executes all `src/hooks/*.{githook}.mjs` in lexicographic order.

**Order**: Enforce filename prefixes for determinism: `10-*.mjs`, `20-*.mjs`, etc.

**Isolation**: Shared logic lives in `src/hooks/_shared/`. Hook files are thin delegators.

---

## 📁 File Layout (80/20)

```
src/hooks/
├── 10-router.post-commit.mjs     # compute diff, unrouting match, enqueue jobs
├── 10-router.post-merge.mjs      # same as above
├── 20-receipts.post-commit.mjs   # write one note for the commit (optional)
└── _shared/
    └── index.mjs                 # TZ=UTC, LANG=C, LC_ALL=C, diff, routes

bin/
├── gitvan-hook.mjs              # gitvan hook <name>
├── gitvan-ensure.mjs            # gitvan ensure
└── gitvan-event-simulate.mjs    # gitvan event simulate --files "<path>"
```

---

## 🔧 Execution Model

### Git Hook Integration
- `.git/hooks/post-commit` → `gitvan hook post-commit`
- `.git/hooks/post-merge` → `gitvan hook post-merge`

### Hook Execution Flow
1. **Loader** loads `src/hooks/*.<name>.mjs`
2. **Sort** by filename prefix (10-, 20-, etc.)
3. **Execute** each hook's `run(ctx)` function
4. **Router hooks** emit Hookable events (`git:commit`, `dispatch:queue`)
5. **Job queue** execution

### Deterministic Ordering
```bash
# Files are executed in this order:
10-router.post-commit.mjs    # First: routing logic
20-receipts.post-commit.mjs  # Second: receipt writing
30-custom.post-commit.mjs     # Third: custom logic
```

---

## 🚀 Implementation Details

### 1. Hook Loader (`src/core/hook-loader.mjs`)

```javascript
export class GitVanHookLoader {
  async run(gitHookName, context = {}) {
    // Find all hook files for this Git hook type
    const hookFiles = await this.findHookFiles(gitHookName);
    
    // Sort by filename prefix for deterministic order
    const sortedFiles = hookFiles.sort((a, b) => {
      const aPrefix = this.extractPrefix(a);
      const bPrefix = this.extractPrefix(b);
      return aPrefix.localeCompare(bPrefix);
    });
    
    // Execute hooks in deterministic order
    for (const hookFile of sortedFiles) {
      await this.executeHook(hookFile, context);
    }
  }
}
```

### 2. Router Hooks (`src/hooks/10-router.*.mjs`)

```javascript
export async function run(ctx) {
  const gitDiff = createGitDiff();
  const routesRegistry = createRoutesRegistry();
  const unrouting = useUnrouting();
  
  // Guardrail: Trunk-only
  const isMain = await gitDiff.isMainBranch();
  if (!isMain) {
    console.log("   ⚠️  Not on main branch - skipping router");
    return;
  }
  
  // Get changed files
  const changedFiles = await gitDiff.getChangedFiles();
  
  // Load routes
  const routes = await routesRegistry.loadRoutes();
  
  // Route files to jobs
  const jobQueue = unrouting.routeFiles(changedFiles, routes);
  
  // Emit Hookable events
  await emitHookableEvents(jobQueue, "post-commit");
  
  // Execute job queue
  await executeJobQueue(jobQueue);
}
```

### 3. Shared Utilities (`src/hooks/_shared/index.mjs`)

```javascript
// Environment setup - Deterministic
export function setupEnv() {
  return {
    TZ: "UTC",
    LANG: "C", 
    LC_ALL: "C",
    ...process.env
  };
}

// Git diff operations - Happy path only
export class GitDiff {
  async getChangedFiles() {
    const { stdout } = await execFile("git", ["diff", "--name-only", "HEAD~1", "HEAD"], {
      cwd: this.cwd,
      env: this.env
    });
    return stdout.trim().split("\n").filter(f => f.trim());
  }
}

// Routes registry - Load from packs
export class RoutesRegistry {
  async loadRoutes() {
    // Load from packs directory
    // Fallback to default routes
  }
}
```

---

## 🎯 Commands

### 1. GitVan Hook Command
```bash
# Execute specific Git hook
gitvan hook post-commit
gitvan hook post-merge
```

### 2. GitVan Ensure Command
```bash
# Install Git hooks
gitvan ensure
```

### 3. GitVan Event Simulate Command
```bash
# Test router logic without real commit
gitvan event simulate --files "src/components/Button.tsx,src/pages/Dashboard.tsx"
```

---

## 🛡️ Guardrails

### Trunk-Only
Router exits if current ref ≠ `main`:
```javascript
const isMain = await gitDiff.isMainBranch();
if (!isMain) {
  console.log("   ⚠️  Not on main branch - skipping router");
  return;
}
```

### First-Match-Wins Routing
- Batch by `slug`
- One receipt per commit
- No external CLIs, jobs only

### Deterministic Execution
- Filename prefixes enforce order
- Lexicographic sorting
- Happy path only

---

## 🧪 Testing

### Architecture Test
```bash
node test-gitvan-hooks-minimal.mjs
```

### Event Simulation
```bash
node bin/gitvan-event-simulate.mjs --files "src/components/Button.tsx"
```

### Git Hook Integration
```bash
node bin/gitvan-ensure.mjs
git commit -m "test: GitVan hooks integration"
```

---

## 📊 Test Results

```
🤖 GitVan Hooks - Strict Minimal Architecture Test

🔍 Phase 1: Hook Loader Test
   📁 Found 1 post-commit hooks
   📁 Found 1 post-merge hooks

🔍 Phase 2: Shared Utilities Test
   🛣️  Loaded 8 routes
   🌿 Current branch: unknown
   🎯 Is main branch: false

🔍 Phase 3: Router Hooks Test (Simulation)
   🔧 Testing post-commit router: ✅
   🔧 Testing post-merge router: ✅

🔍 Phase 4: File Structure Test
   📁 Hooks directory contents: 3 files
   - 10-router.post-commit.mjs
   - 10-router.post-merge.mjs
   - _shared

✅ GitVan Hooks Test Complete!
```

---

## 🎯 Architecture Benefits

### Strict Minimal Design
- **Clean separation**: Each hook has single responsibility
- **Deterministic execution**: Filename prefixes enforce order
- **Shared utilities**: Common logic in `_shared/`
- **Thin delegators**: Hook files are minimal

### Surgical Precision
- **Change-only processing**: Only process what changed
- **Trunk-only execution**: Skip non-main branches
- **First-match routing**: Efficient pattern matching
- **Job queue execution**: Batch processing

### Extensibility
- **Pack integration**: Packs can add hooks
- **Hookable events**: Emit events for external systems
- **Deterministic ordering**: Predictable execution
- **Minimal scope**: Focus on essential operations

---

## 🚀 Next Steps

### Phase 1: Core Implementation ✅
- [x] Hook loader with deterministic execution
- [x] Router hooks for post-commit and post-merge
- [x] Shared utilities for Git operations
- [x] Git hook integration via gitvan ensure

### Phase 2: Extended Hooks (Future)
- [ ] `post-rewrite` hook support
- [ ] `pre-push` hook support
- [ ] `20-receipts.*` hooks for Git notes

### Phase 3: Pack Integration (Future)
- [ ] Pack hook discovery
- [ ] Pack route loading
- [ ] Pack-specific hooks

---

## 🎯 Summary

**GitVan Hooks - Strict Minimal Architecture** provides:

1. **Clean Architecture**: Deterministic hook execution with filename prefixes
2. **Surgical Precision**: Only process what changed, trunk-only execution
3. **Minimal Scope**: post-commit and post-merge only (v1)
4. **Shared Utilities**: Common logic in `_shared/` directory
5. **Git Integration**: Seamless Git hook integration via `gitvan ensure`
6. **Event Simulation**: Test router logic without real commits
7. **Extensible Design**: Pack integration and Hookable events

**The result**: A clean, minimal, and deterministic hook system that provides surgical precision for AI swarms while maintaining strict architectural boundaries.

---

*GitVan Hooks - Strict Minimal Architecture: Clean, deterministic, and surgical precision.*
