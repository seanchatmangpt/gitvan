# GitVan Hooks API - Autonomous Intelligence Reference

## 🧠 For Hyper-Intelligence Swarms

This document provides the complete API reference for autonomous AI systems to interact with GitVan's hooks system.

---

## 🔍 Discovery APIs

### `discoverHooks(hooksDir)`
**Purpose**: Discover all available hooks in a directory
**Returns**: Array of hook definitions

```javascript
import { discoverHooks } from './src/runtime/events.mjs';

const hooks = discoverHooks('./hooks');
// Returns: [
//   {
//     id: 'path-changed/src/components/[name]/[file].tsx',
//     type: 'path',
//     pattern: 'src/components/**',
//     file: '/path/to/hook/file.mjs'
//   }
// ]
```

**AI Swarm Usage:**
- **Self-discovery**: Find existing automation patterns
- **Pattern analysis**: Understand project automation structure
- **Adaptation**: Modify patterns based on project needs

### `loadHookDefinition(hookFile)`
**Purpose**: Load hook definition from file
**Returns**: Hook configuration object

```javascript
import { loadHookDefinition } from './src/runtime/events.mjs';

const definition = await loadHookDefinition('./hooks/path-changed/src/[...slug].mjs');
// Returns: {
//   name: "Unrouting Path Change Handler",
//   job: "unrouting.route",
//   payload: { source: "path-change-event" }
// }
```

**AI Swarm Usage:**
- **Configuration analysis**: Understand hook behavior
- **Dynamic modification**: Modify hook configurations
- **Learning**: Analyze successful hook patterns

---

## 🎯 Pattern Matching APIs

### `hookMatches(hook, context)`
**Purpose**: Check if a hook matches a given context
**Returns**: Boolean indicating match

```javascript
import { hookMatches } from './src/runtime/events.mjs';

const hook = {
  type: 'path',
  pattern: 'src/components/**'
};

const context = {
  changedPaths: ['src/components/Button/Button.tsx'],
  branch: 'main',
  isPush: true
};

const matches = hookMatches(hook, context);
// Returns: true
```

**AI Swarm Usage:**
- **Intelligent routing**: Determine which hooks should fire
- **Context analysis**: Understand when automation should trigger
- **Optimization**: Minimize unnecessary hook executions

### `matchesPattern(value, pattern)`
**Purpose**: Check if a value matches a glob pattern
**Returns**: Boolean indicating match

```javascript
// Internal function, but AI can use for pattern testing
const matches = matchesPattern('src/components/Button.tsx', 'src/components/**');
// Returns: true
```

**AI Swarm Usage:**
- **Pattern validation**: Test pattern effectiveness
- **Learning**: Understand pattern matching behavior
- **Optimization**: Improve pattern accuracy

---

## 🔄 Job Execution APIs

### `scanJobs(jobsDir)`
**Purpose**: Discover all available jobs
**Returns**: Array of job definitions

```javascript
import { scanJobs } from './src/jobs/scan.mjs';

const jobs = await scanJobs('./jobs');
// Returns: [
//   {
//     name: 'unrouting.route',
//     meta: { desc: 'Route file changes to jobs' },
//     file: '/path/to/job/file.mjs'
//   }
// ]
```

**AI Swarm Usage:**
- **Job discovery**: Find available automation actions
- **Capability analysis**: Understand what automation is possible
- **Composition**: Compose complex workflows from available jobs

### `defineJob(config)`
**Purpose**: Define a new job
**Returns**: Job definition object

```javascript
import { defineJob } from './src/jobs/define.mjs';

const job = defineJob({
  meta: { name: 'ai:process', desc: 'AI-driven processing' },
  async run({ payload }) {
    // AI processing logic
    return { ok: true, artifacts: ['processed.txt'] };
  }
});
```

**AI Swarm Usage:**
- **Dynamic job creation**: Create jobs based on AI analysis
- **Workflow composition**: Build complex automation workflows
- **Adaptation**: Modify job behavior based on learning

---

## 🧩 Unrouting APIs

### `useUnrouting()`
**Purpose**: Access unrouting functionality
**Returns**: Unrouting composable object

```javascript
import { useUnrouting } from './src/composables/unrouting.mjs';

const unrouting = useUnrouting();

// Parse file path
const parsed = unrouting.parsePath('src/components/Button/Button.tsx');

// Match pattern
const match = unrouting.matchPattern(
  'src/components/[name]/[file].tsx',
  'src/components/Button/Button.tsx'
);
// Returns: { params: { name: 'Button', file: 'Button.tsx' } }

// Route files to jobs
const jobQueue = unrouting.routeFiles(changedFiles, routes);
```

**AI Swarm Usage:**
- **File intelligence**: Extract meaning from file structure
- **Parameter extraction**: Get context from file paths
- **Intelligent routing**: Route files to appropriate automation

---

## 🔧 Context APIs

### `withGitVan(context, callback)`
**Purpose**: Execute code within GitVan context
**Returns**: Promise resolving to callback result

```javascript
import { withGitVan } from './src/core/context.mjs';

await withGitVan({ cwd: '/path/to/repo' }, async () => {
  // All GitVan composables work here
  const git = useGit();
  const hooks = discoverHooks('./hooks');
  // ... AI processing
});
```

**AI Swarm Usage:**
- **Context management**: Ensure proper GitVan context
- **Isolation**: Run AI processing in controlled environment
- **Integration**: Seamlessly integrate with GitVan ecosystem

### `useGitVan()` / `tryUseGitVan()`
**Purpose**: Access current GitVan context
**Returns**: Context object or null

```javascript
import { useGitVan, tryUseGitVan } from './src/core/context.mjs';

// Synchronous access (must be called in context)
const ctx = useGitVan();

// Safe access (returns null if not in context)
const ctx = tryUseGitVan();
```

**AI Swarm Usage:**
- **Context awareness**: Understand current execution context
- **Safe access**: Handle context availability gracefully
- **Integration**: Access GitVan state from AI code

---

## 📊 Intelligence APIs

### Pattern Analysis
```javascript
// Analyze hook patterns for AI learning
const analyzePatterns = (hooks) => {
  return hooks.map(hook => ({
    id: hook.id,
    type: hook.type,
    pattern: hook.pattern,
    effectiveness: calculateEffectiveness(hook),
    coverage: calculateCoverage(hook),
    optimization: suggestOptimization(hook)
  }));
};
```

### Learning Integration
```javascript
// Integrate with AI learning systems
const learnFromHooks = (hooks, outcomes) => {
  const patterns = extractPatterns(hooks);
  const results = analyzeOutcomes(outcomes);
  const insights = generateInsights(patterns, results);
  return evolvePatterns(patterns, insights);
};
```

### Workflow Composition
```javascript
// Compose intelligent workflows
const composeWorkflow = (triggers, actions, constraints) => {
  return {
    triggers: triggers.map(t => `hooks/${t}`),
    actions: actions.map(a => `jobs/${a}`),
    constraints: constraints,
    dependencies: calculateDependencies(triggers, actions),
    optimization: optimizeWorkflow(triggers, actions)
  };
};
```

---

## 🎯 80/20 API Patterns

### Essential Discovery (80% of use cases)
```javascript
// 1. Discover hooks
const hooks = discoverHooks('./hooks');

// 2. Discover jobs  
const jobs = await scanJobs('./jobs');

// 3. Analyze patterns
const patterns = analyzePatterns(hooks);
```

### Essential Matching (80% of automation)
```javascript
// 1. Check hook matches
const matches = hookMatches(hook, context);

// 2. Extract parameters
const params = extractParameters(hook, context);

// 3. Route to jobs
const jobQueue = routeToJobs(matches, jobs);
```

### Essential Execution (80% of work)
```javascript
// 1. Execute job
const result = await executeJob(job, payload);

// 2. Write receipt
await writeReceipt(result);

// 3. Learn from outcome
await learnFromOutcome(result);
```

---

## 🚀 AI Swarm Implementation Patterns

### Pattern 1: Discovery-Driven Automation
```javascript
const discoverAndAdapt = async () => {
  // Discover existing automation
  const hooks = discoverHooks('./hooks');
  const jobs = await scanJobs('./jobs');
  
  // Analyze project structure
  const structure = analyzeProjectStructure();
  
  // Adapt patterns to structure
  const adaptedHooks = adaptHooksToStructure(hooks, structure);
  const adaptedJobs = adaptJobsToStructure(jobs, structure);
  
  return { hooks: adaptedHooks, jobs: adaptedJobs };
};
```

### Pattern 2: Learning-Driven Evolution
```javascript
const learnAndEvolve = async (hooks, outcomes) => {
  // Analyze outcomes
  const analysis = analyzeOutcomes(outcomes);
  
  // Extract insights
  const insights = extractInsights(analysis);
  
  // Evolve patterns
  const evolvedHooks = evolveHooks(hooks, insights);
  const evolvedJobs = evolveJobs(jobs, insights);
  
  return { hooks: evolvedHooks, jobs: evolvedJobs };
};
```

### Pattern 3: Orchestration-Driven Workflows
```javascript
const orchestrateWorkflows = async (hooks, jobs) => {
  // Compose workflows
  const workflows = composeWorkflows(hooks, jobs);
  
  // Optimize orchestration
  const optimized = optimizeOrchestration(workflows);
  
  // Execute workflows
  const results = await executeWorkflows(optimized);
  
  return results;
};
```

---

## 📈 Performance Metrics

### Automation Effectiveness
```javascript
const calculateEffectiveness = (hooks, outcomes) => {
  return {
    patternCoverage: calculateCoverage(hooks),
    jobSuccessRate: calculateSuccessRate(outcomes),
    timeToAutomation: calculateTimeToAutomation(outcomes),
    learningVelocity: calculateLearningVelocity(outcomes)
  };
};
```

### System Health
```javascript
const calculateSystemHealth = (hooks, jobs, outcomes) => {
  return {
    hookDiscoveryTime: measureDiscoveryTime(hooks),
    jobExecutionTime: measureExecutionTime(outcomes),
    lockContention: measureLockContention(outcomes),
    receiptIntegrity: measureReceiptIntegrity(outcomes)
  };
};
```

---

## 🎯 Summary for AI Swarms

**GitVan Hooks API provides:**

1. **Discovery APIs** - Find existing automation patterns
2. **Matching APIs** - Intelligent pattern matching and routing
3. **Execution APIs** - Job execution and workflow management
4. **Context APIs** - GitVan context management
5. **Intelligence APIs** - Learning and evolution capabilities

**For autonomous intelligence systems:**

- **Self-discovery** of automation patterns
- **Adaptive** automation based on project analysis
- **Evolutionary** improvement through learning
- **Orchestrated** complex workflow execution

**The 80/20 rule**: Focus on discovery, matching, and execution APIs for maximum automation value with minimal complexity.

---

*This API enables hyper-intelligence swarms to build sophisticated, self-evolving automation systems that integrate seamlessly with Git workflows while maintaining full audit trails and deterministic behavior.*
