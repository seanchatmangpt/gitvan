# GitVan v3.0.0

**Git-native development automation built on unrdf knowledge graphs.**

GitVan transforms Git into a runtime environment for development automation with intelligent Knowledge Hooks driven by SPARQL predicates. Built on [unrdf](https://github.com/zazuko/unrdf) for production-grade RDF/SPARQL capabilities.

## Installation

```bash
# Global installation
npm install -g gitvan

# Local installation
npm install gitvan

# Or with pnpm
pnpm add gitvan
```

## Quick Start

```bash
# Initialize GitVan in your project
gitvan init --name "my-project"

# Complete setup
gitvan setup

# List available hooks
gitvan hooks list

# Evaluate all hooks
gitvan hooks evaluate --verbose

# Run a workflow
gitvan workflow run data-processing
```

## Core Features

### Knowledge Hook Engine

Autonomous hooks that react to changes in your knowledge graph using SPARQL predicates:

```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix ex: <http://example.org/> .

ex:version-change-hook a gh:Hook ;
    gh:predicate ex:version-change-predicate ;
    gh:workflow ex:version-workflow .

ex:version-change-predicate a gh:ResultDelta ;
    gh:queryText """
        SELECT ?project ?version WHERE {
            ?project a gv:Project ;
                     gv:version ?version .
        }
    """ .
```

**Predicate Types:**
- `ResultDelta` - Detect changes in query results between states
- `ASK` - Boolean conditions for simple triggers
- `SELECTThreshold` - Metric-based triggers with comparison operators
- `SHACLAllConform` - Shape-based validation triggers

### Workflow Engine

Execute multi-step workflows with dependency management:

```bash
# List workflows
gitvan workflow list

# Run a workflow
gitvan workflow run my-workflow

# Validate workflow definition
gitvan workflow validate my-workflow

# View execution history
gitvan workflow history
```

**Step Types:**
- `sparql` - Query knowledge graph
- `template` - Generate content with Nunjucks
- `file` - Read/write/copy/move files
- `http` - API requests
- `cli` - Command execution

### Git-Native I/O

Enterprise-grade Git operations with concurrency control:

- **LockManager** - Distributed locking for safe concurrent operations
- **QueueManager** - Operation queuing with priority management
- **SnapshotStore** - State tracking and rollback capabilities
- **WorkerPool** - Non-blocking Git operations
- **ReceiptWriter** - Comprehensive audit logging

### RDF Engine

Built on [unrdf](https://github.com/zazuko/unrdf) with GitVan-specific extensions:

```javascript
import { RdfEngine } from 'gitvan';

const engine = new RdfEngine({ deterministic: true });

// SPARQL queries
const results = await engine.query(store, `
  SELECT ?project ?version WHERE {
    ?project a gv:Project ;
             gv:version ?version .
  }
`);

// SHACL validation
const report = await engine.validateShacl(dataStore, shapesStore);

// N3 reasoning
const inferred = await engine.reason(dataStore, rulesStore);
```

## CLI Commands

```
gitvan <command>

Commands:
  init          Initialize GitVan in a directory
  setup         Complete GitVan setup
  boot          Start GitVan runtime

  hooks         Knowledge Hook management
    list        List available hooks
    evaluate    Evaluate all hooks
    validate    Validate hook definition
    stats       Hook execution statistics

  workflow      Workflow management
    list        List available workflows
    run         Execute a workflow
    validate    Validate workflow definition
    history     View execution history

  graph         RDF graph operations
    query       Run SPARQL query
    load        Load RDF data
    export      Export graph data

  pack          Pack management
    list        List available packs
    install     Install a pack
    search      Search for packs

  daemon        Background processing
    start       Start daemon
    stop        Stop daemon
    status      Daemon status
```

## Composables

Vue.js-style composables for Git operations:

```javascript
import {
  useGit,
  useGraph,
  useTurtle,
  useTemplate,
  useJob,
  usePack
} from 'gitvan';

// Git operations
const git = useGit({ cwd: './my-repo' });
await git.commit('feat: add feature');
await git.push();

// RDF graph operations
const graph = useGraph(store);
const results = await graph.query('SELECT * WHERE { ?s ?p ?o }');

// Template rendering
const template = useTemplate();
const output = await template.render('report.njk', { data });

// Job scheduling
const job = useJob('daily-backup');
await job.schedule('0 0 * * *');
```

## Architecture

```
src/
  cli.mjs              # Citty-based CLI
  index.mjs            # Main exports

  composables/         # Vue.js-style composables
    git.mjs            # Git operations
    graph.mjs          # RDF graph operations
    turtle.mjs         # Turtle parsing
    template.mjs       # Nunjucks templates
    ...

  engines/
    RdfEngine.mjs      # Extends unrdf

  git-native/          # Git I/O layer
    GitNativeIO.mjs
    LockManager.mjs
    QueueManager.mjs
    SnapshotStore.mjs
    WorkerPool.mjs
    ReceiptWriter.mjs

  hooks/               # Knowledge Hook Engine
    HookOrchestrator.mjs
    HookParser.mjs
    PredicateEvaluator.mjs

  workflow/            # Workflow Engine
    WorkflowEngine.mjs
    WorkflowExecutor.mjs
    dag-planner.mjs
    step-runner.mjs
```

## Configuration

GitVan uses [c12](https://github.com/unjs/c12) for configuration:

```javascript
// gitvan.config.mjs
export default {
  // Graph directory for Turtle files
  graphDir: './hooks',

  // Workflow directory
  workflowDir: './workflows',

  // Pack registry
  registry: 'https://registry.gitvan.dev',

  // RDF engine options
  rdf: {
    deterministic: true,
    baseIRI: 'https://example.org/'
  }
};
```

## Development

```bash
# Clone repository
git clone https://github.com/gitvan/gitvan.git
cd gitvan

# Install dependencies
pnpm install

# Run tests
pnpm test

# Run CLI locally
node src/cli.mjs --help
```

## Dependencies

GitVan is built on these excellent projects:

- [unrdf](https://github.com/zazuko/unrdf) - Production-grade RDF engine
- [citty](https://github.com/unjs/citty) - CLI framework
- [c12](https://github.com/unjs/c12) - Configuration loader
- [nunjucks](https://mozilla.github.io/nunjucks/) - Template engine
- [n3](https://github.com/rdfjs/N3.js) - RDF parsing/serialization

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Links

- **GitHub**: [github.com/gitvan/gitvan](https://github.com/gitvan/gitvan)
- **npm**: [npmjs.com/package/gitvan](https://www.npmjs.com/package/gitvan)
