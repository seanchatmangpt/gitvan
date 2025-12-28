# GitVan v4 Hook Reference with @unrdf/hooks

Complete API reference for the GitVan v4 Knowledge Hook system.

---

## Table of Contents

1. [Overview](#overview)
2. [Hook Types](#hook-types)
3. [Predicate Types](#predicate-types)
4. [Hook Lifecycle](#hook-lifecycle)
5. [API Reference](#api-reference)
6. [Hook Definition Format](#hook-definition-format)
7. [Composables API](#composables-api)

---

## Overview

GitVan v4 introduces the Knowledge Hook Engine, a powerful system for reactive automation based on semantic graph predicates. Unlike traditional event-driven hooks, Knowledge Hooks evaluate logical conditions against your project's knowledge graph.

### Key Concepts

- **Knowledge Graph**: RDF-based representation of your project state stored in `.ttl` files
- **Predicate**: A logical condition evaluated against the graph (SPARQL query)
- **Workflow**: A sequence of steps executed when a predicate evaluates to true
- **Hook**: Combines a predicate with one or more workflows

---

## Hook Types

### 1. Git Lifecycle Hooks

Traditional Git event hooks integrated with the Knowledge Hook Engine:

| Hook | Trigger | Use Case |
|------|---------|----------|
| `pre-commit` | Before commit | Linting, formatting, validation |
| `post-commit` | After commit | Notifications, logging |
| `pre-push` | Before push | Tests, security scans |
| `post-merge` | After merge | Dependency updates |
| `pre-rebase` | Before rebase | State backup |

### 2. Knowledge Hooks

Reactive hooks triggered by knowledge graph changes:

| Type | Description |
|------|-------------|
| `ResultDelta` | Detects changes in query results between commits |
| `ASK` | Evaluates boolean conditions |
| `SELECTThreshold` | Monitors numerical values against thresholds |
| `SHACL` | Validates graph conformance against shapes |
| `CONSTRUCT` | Builds knowledge graphs dynamically |
| `DESCRIBE` | Describes resources in detail |
| `Federated` | Queries multiple data sources |
| `Temporal` | Time-based condition evaluation |

---

## Predicate Types

### ResultDelta Predicate

Detects changes in SPARQL query results between commits.

```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:my-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        SELECT ?item WHERE {
            ?item rdf:type gv:Task .
            ?item gv:status "completed" .
        }
    """ ;
    gh:description "Triggers when task completion status changes" .
```

**Properties:**
- `gh:queryText` (required): SPARQL SELECT query
- `gh:description` (optional): Human-readable description

**Trigger Condition:** Query results differ between current and previous state.

### ASK Predicate

Evaluates a boolean SPARQL ASK query.

```turtle
ex:my-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:severity "critical" .
        }
    """ ;
    gh:description "Triggers when critical bugs exist" .
```

**Properties:**
- `gh:queryText` (required): SPARQL ASK query
- `gh:description` (optional): Human-readable description

**Trigger Condition:** ASK query returns true.

### SELECTThreshold Predicate

Monitors numerical values against configurable thresholds.

```turtle
ex:my-predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """
        SELECT (COUNT(?bug) AS ?count) WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:status "open" .
        }
    """ ;
    gh:threshold 10 ;
    gh:operator ">" ;
    gh:description "Triggers when more than 10 open bugs" .
```

**Properties:**
- `gh:queryText` (required): SPARQL SELECT query returning numeric value
- `gh:threshold` (required): Numeric threshold value
- `gh:operator` (required): Comparison operator (`>`, `>=`, `<`, `<=`, `==`, `!=`)
- `gh:description` (optional): Human-readable description

**Trigger Condition:** Numeric comparison evaluates to true.

### SHACL Predicate

Validates graph conformance against SHACL shapes.

```turtle
ex:my-predicate rdf:type gh:SHACLAllConform ;
    gh:shapesText """
        gv:ProjectShape a sh:NodeShape ;
            sh:targetClass gv:Project ;
            sh:property [
                sh:path gv:version ;
                sh:minCount 1 ;
                sh:datatype xsd:string ;
            ] .
    """ ;
    gh:description "Validates project structure compliance" .
```

**Properties:**
- `gh:shapesText` (required): SHACL shapes in Turtle format
- `gh:description` (optional): Human-readable description

**Trigger Condition:** All targeted nodes conform to shapes.

### CONSTRUCT Predicate

Builds derived knowledge dynamically.

```turtle
ex:my-predicate rdf:type gh:CONSTRUCT ;
    gh:queryText """
        CONSTRUCT {
            ?task gv:requiresReview true .
        } WHERE {
            ?task rdf:type gv:Task .
            ?task gv:complexity "high" .
        }
    """ ;
    gh:description "Marks high-complexity tasks for review" .
```

**Properties:**
- `gh:queryText` (required): SPARQL CONSTRUCT query
- `gh:description` (optional): Human-readable description

**Trigger Condition:** CONSTRUCT produces at least one triple.

### Temporal Predicate

Evaluates time-based conditions.

```turtle
ex:my-predicate rdf:type gh:TemporalPredicate ;
    gh:queryText """
        SELECT ?item WHERE {
            ?item gv:dueDate ?date .
            FILTER(?date < NOW())
        }
    """ ;
    gh:timeWindow 3600000 ;
    gh:description "Triggers for overdue items" .
```

**Properties:**
- `gh:queryText` (required): SPARQL query with temporal conditions
- `gh:timeWindow` (optional): Time window in milliseconds (default: 1 hour)
- `gh:description` (optional): Human-readable description

**Trigger Condition:** Temporal query returns results.

---

## Hook Lifecycle

```
+-------------------+
|   Hook Discovery  |
+---------+---------+
          |
          v
+-------------------+
|   Hook Parsing    |
+---------+---------+
          |
          v
+-------------------+
| Predicate Eval.   |<----- Current Graph
+---------+---------+       Previous Graph
          |
          | (if triggered)
          v
+-------------------+
| Workflow Planning |
+---------+---------+
          |
          v
+-------------------+
|  Step Execution   |
+---------+---------+
          |
          v
+-------------------+
| Receipt Writing   |
+-------------------+
```

### Lifecycle Phases

1. **Discovery**: Registry scans `./hooks` directory for `.ttl` files
2. **Parsing**: Hook definitions are validated and parsed
3. **Evaluation**: Predicates are evaluated against the knowledge graph
4. **Planning**: DAG planner creates execution order for triggered workflows
5. **Execution**: Steps are executed with concurrency control
6. **Receipt**: Execution results are written to Git Notes

---

## API Reference

### HookOrchestrator

Main orchestrator for the Knowledge Hook Engine.

```javascript
import { HookOrchestrator } from 'gitvan/hooks';

const orchestrator = new HookOrchestrator({
  graphDir: './hooks',
  logger: console,
  timeoutMs: 300000
});
```

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `graphDir` | `string` | `'./hooks'` | Directory containing hook definitions |
| `logger` | `object` | `console` | Logger instance |
| `timeoutMs` | `number` | `300000` | Evaluation timeout (5 min) |
| `context` | `object` | - | GitVan context |
| `cwd` | `string` | `process.cwd()` | Working directory |

#### Methods

##### `evaluate(options?): Promise<EvaluationResult>`

Evaluates all hooks and executes triggered workflows.

```javascript
const result = await orchestrator.evaluate({
  dryRun: false,
  verbose: true
});

// Returns:
// {
//   success: true,
//   duration: 1234,
//   hooksEvaluated: 10,
//   hooksTriggered: 3,
//   workflowsExecuted: 3,
//   workflowsSuccessful: 3,
//   triggeredHooks: [...],
//   executions: [...]
// }
```

##### `listHooks(): Promise<HookInfo[]>`

Lists all available hooks.

```javascript
const hooks = await orchestrator.listHooks();
// [{ id, title, predicate, predicateType, workflowCount }, ...]
```

##### `validateHook(hookId): Promise<ValidationResult>`

Validates a hook definition.

```javascript
const result = await orchestrator.validateHook('my-hook');
// { valid: true, predicateType: 'ask', workflowSteps: 3, estimatedComplexity: 'medium' }
```

##### `getStats(): Promise<Stats>`

Returns orchestrator statistics.

```javascript
const stats = await orchestrator.getStats();
// { hooksLoaded, contextInitialized, lastEvaluation, graphSize, gitNativeIO }
```

### KnowledgeHookRegistry

Central registry for Knowledge Hooks.

```javascript
import { KnowledgeHookRegistry } from 'gitvan/hooks';

const registry = new KnowledgeHookRegistry({
  hooksDir: './hooks',
  logger: console
});

await registry.initialize();
```

#### Methods

##### `getAllHooks(): HookInfo[]`

Returns all registered hooks.

##### `getHooksByCategory(category): HookInfo[]`

Returns hooks filtered by category.

```javascript
const jtbdHooks = registry.getHooksByCategory('jtbd');
```

##### `getHooksByDomain(domain): HookInfo[]`

Returns hooks filtered by domain.

```javascript
const securityHooks = registry.getHooksByDomain('security');
```

##### `evaluateAll(options?): Promise<EvaluationResult>`

Evaluates all registered hooks.

##### `getStats(): RegistryStats`

Returns registry statistics.

```javascript
const stats = registry.getStats();
// {
//   totalHooks: 15,
//   categories: { jtbd: 5, general: 10 },
//   domains: { security: 3, development: 12 },
//   predicateTypes: { ask: 5, resultDelta: 10 }
// }
```

### PredicateEvaluator

Evaluates hook predicates against knowledge graphs.

```javascript
import { PredicateEvaluator } from 'gitvan/hooks';

const evaluator = new PredicateEvaluator({ logger: console });

const result = await evaluator.evaluate(
  hook,
  currentGraph,
  previousGraph,
  { verbose: true }
);
```

#### Methods

##### `evaluate(hook, currentGraph, previousGraph?, options?): Promise<EvaluationResult>`

Evaluates a hook's predicate.

##### `validatePredicate(predicate): Promise<boolean>`

Validates predicate definition.

##### `analyzePredicateComplexity(predicate): ComplexityAnalysis`

Analyzes predicate complexity.

---

## Hook Definition Format

Complete hook definition in Turtle format:

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Hook Definition
ex:my-hook rdf:type gh:Hook ;
    gv:title "My Hook Title" ;
    gh:hasPredicate ex:my-predicate ;
    gh:orderedPipelines ex:my-pipeline .

# Predicate Definition
ex:my-predicate rdf:type gh:ASKPredicate ;
    gh:queryText """
        ASK WHERE { ?s ?p ?o }
    """ ;
    gh:description "Example predicate" .

# Workflow Pipeline
ex:my-pipeline rdf:type op:Pipeline ;
    op:steps (ex:step1 ex:step2) .

# Workflow Steps
ex:step1 rdf:type gv:TemplateStep ;
    gv:text "Step 1 output: {{ data }}" ;
    gv:filePath "./output/step1.txt" .

ex:step2 rdf:type op:CLIStep ;
    op:command "echo 'Step 2 complete'" ;
    op:dependsOn ex:step1 .
```

### Step Types

| Type | Description | Properties |
|------|-------------|------------|
| `gv:TemplateStep` | Renders template to file | `gv:text`, `gv:filePath` |
| `op:CLIStep` | Executes shell command | `op:command`, `op:timeout`, `op:failOn` |
| `op:HTTPStep` | Makes HTTP request | `op:url`, `op:method`, `op:headers`, `op:body` |
| `op:SPARQLStep` | Executes SPARQL query | `op:query`, `op:endpoint` |
| `op:FileStep` | File operations | `op:operation`, `op:source`, `op:destination` |

---

## Composables API

### useGit()

Git operations composable.

```javascript
import { useGit } from 'gitvan/composables';

const git = useGit();

// Get current branch
const branch = await git.branch();

// Commit changes
await git.add(['file.js']);
await git.commit('feat: add feature');

// Create and checkout branch
await git.branchCreate('feature/new');
await git.checkout('feature/new');
```

#### Available Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `branch()` | Current branch name | `Promise<string>` |
| `head()` | Current HEAD SHA | `Promise<string>` |
| `add(paths)` | Stage files | `Promise<void>` |
| `commit(message, opts?)` | Create commit | `Promise<void>` |
| `push(remote?, ref?, opts?)` | Push changes | `Promise<void>` |
| `pull(remote?, branch?, opts?)` | Pull changes | `Promise<void>` |
| `branchCreate(name, startPoint?)` | Create branch | `Promise<void>` |
| `branchDelete(name, opts?)` | Delete branch | `Promise<void>` |
| `checkout(ref, opts?)` | Switch branch | `Promise<void>` |
| `merge(ref, opts?)` | Merge branch | `Promise<void>` |
| `diff(opts?)` | Get diff | `Promise<string>` |
| `log(format?, extra?)` | Get log | `Promise<string>` |
| `noteAdd(ref, message, sha?)` | Add note | `Promise<void>` |
| `noteAppend(ref, message, sha?)` | Append note | `Promise<void>` |

### useGitVan() / withGitVan()

Context management for GitVan operations.

```javascript
import { useGitVan, withGitVan } from 'gitvan/composables';

// Get current context
const ctx = useGitVan();
console.log(ctx.cwd, ctx.env);

// Run code within context
await withGitVan({ cwd: '/project', env: { CI: 'true' } }, async () => {
  const git = useGit();
  await git.commit('ci: automated commit');
});
```

### useTemplate()

Template rendering composable.

```javascript
import { useTemplate } from 'gitvan/composables';

const tmpl = useTemplate({ autoescape: false });

// Render inline template
const output = tmpl.render('Hello {{ name }}!', { name: 'World' });

// Render to file
const result = tmpl.renderToFile('template.njk', 'output.txt', { data: 'value' });
```

### useEvent()

Event emission composable.

```javascript
import { useEvent } from 'gitvan/composables';

const event = useEvent();

// Emit custom event
await event.emit('custom:event', { payload: 'data' });
```

---

## CLI Commands

```bash
# List all hooks
gitvan hooks list

# List by category
gitvan hooks list-category jtbd

# List by domain
gitvan hooks list-domain security

# Evaluate all hooks
gitvan hooks evaluate

# Dry run evaluation
gitvan hooks evaluate --dry-run

# Verbose evaluation
gitvan hooks evaluate --verbose

# Evaluate by category
gitvan hooks evaluate-category developer-workflow

# Validate specific hook
gitvan hooks validate my-hook

# Get registry statistics
gitvan hooks stats

# Create new hook template
gitvan hooks create my-new-hook "My Hook Title" ask

# Refresh registry
gitvan hooks refresh
```

---

## Next Steps

- [Getting Started Tutorial](../tutorials/GETTING-STARTED.md)
- [Architecture Overview](../architecture/OVERVIEW.md)
- [Best Practices Guide](BEST-PRACTICES.md)
