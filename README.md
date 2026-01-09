# GitVan v4.0.0

**Git-native workflow automation. Simple to use. Powerful underneath.**

GitVan brings Git into your workflow system. Define workflows once, trigger them on Git events (commit, push, merge), track performance automatically. All in `.ttl` files that live in your repo.

**The innovation**: Behind the scenes, GitVan uses semantic graph technology to unlock capabilities traditional workflow systems can't provide (federated queries, reactive hooks, composable workflows). But you'll never need to learn that - it's completely hidden.

---

## Quick Start (1 minute)

```bash
# Install globally
npm install -g gitvan

# Initialize in your project
gitvan workflow init

# Create your first workflow
cat > .gitvan/workflows/hello.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:HelloWorld a gh:Hook ;
  rdfs:label "Hello World" ;
  op:hasPipeline [
    op:hasStep [ a op:CLIStep ; op:command "echo Hello, GitVan!" ]
  ] .
EOF

# List workflows
gitvan workflow list

# Run it
gitvan workflow run HelloWorld
```

---

## Documentation

### 🚀 [Getting Started](GETTING_STARTED.md)
**New to GitVan?** Get up and running in 10 minutes with hands-on tutorials.

### 📖 [API Reference](API_REFERENCE.md)
**Complete API documentation.** All composables, commands, and configuration options.

### 🔄 [Migration Guide](MIGRATION_GUIDE.md)
**Upgrading from v2.1.1?** Step-by-step migration guide to v4.0.0.

### 📋 [Changelog](CHANGELOG.md)
**What's new?** Full release history and version notes.

### 🏗️ [Developer Guide](CLAUDE.md)
**Contributing to GitVan?** Architecture, patterns, and development workflows.

### Additional Documentation

- **[Tutorials](docs/TUTORIALS.md)** - Learning by doing (when available)
- **[How-To Guides](docs/HOW-TO-GUIDES.md)** - Solve specific problems (when available)
- **[Architecture](docs/80-20-ARCHITECTURE.md)** - Core components explained (when available)
- **[Risk Analysis](docs/FMEA-RISK-ANALYSIS.md)** - Failure mode analysis (when available)
- **[Error Prevention](docs/POKA-YOKE.md)** - Safety mechanisms (when available)

---

## What's New in v4.0.0

### 🎉 Major Enhancements
- **Enhanced Job System**: Bree scheduler integration with cron support
- **Job Scheduling**: Auto-schedule recurring jobs with cron expressions
- **Job Discovery**: Search, filter by tags, find unrouted jobs
- **Execution Locking**: Distributed locking for concurrent execution
- **Job History**: Track execution history and performance over time
- **Job Validation**: Validate job definitions before execution

### 🔒 Security Improvements
- **Fixed**: Command injection vulnerability in CLI step handler
- **Fixed**: 4 critical vulnerabilities in Bree job system
- **Enhanced**: Proper argument sanitization for all shell commands

### 📦 Dependency Updates
- Added 7 previously missing dependencies
- All dependencies now properly declared in package.json

### ⚡ Performance Improvements
- Job discovery: 10x faster (50ms → 5ms)
- Job execution setup: 2x faster (100ms → 50ms)
- Lock acquisition: 4x faster (20ms → 5ms)

See [CHANGELOG.md](CHANGELOG.md) for complete details.

---

## Installation

```bash
# Global installation (recommended)
npm install -g gitvan

# Local installation (in project)
npm install gitvan

# Or with pnpm
pnpm add -g gitvan
```

**Requirements**: Node.js 18+

---

## Core Concepts

### Workflows

**What**: A sequence of steps that runs on Git events or on-demand.

```turtle
gh:MyWorkflow a gh:Hook ;
  rdfs:label "My Workflow" ;
  op:hasPipeline [ op:hasStep step-1 ; op:hasStep step-2 ] .
```

**Where**: `.ttl` files in `.gitvan/workflows/`

**Triggers**: `git commit`, `git push`, `git merge`, or manual (`gitvan workflow run`)

### Steps

**What**: Individual tasks (run shell command, query, API call, etc.)

**Types:**
- `CLIStep` - Execute shell command
- `TemplateStep` - Use predefined template
- `SPARQLStep` - Query workflow graph
- `HTTPStep` - Make API request
- `FileStep` - Read/write files

### Git Integration

**What**: Workflows trigger automatically on Git events.

```bash
gitvan hook install pre-commit MyWorkflow
# Now MyWorkflow runs before every commit
```

### Performance Monitoring

**What**: Automatic SLO tracking and metrics collection.

```turtle
gh:Deploy a gh:Hook ;
  perf:sloTarget 300000 ;      # 5 minute target
  perf:sloP99 360000 .         # p99 under 6 minutes
```

### Hooks Integration (v3.0+)

**What**: Complete integration of Husky + @unrdf/hooks + Bree for Git-native workflow automation.

GitVan v3.0+ provides a powerful hooks system that combines three technologies:
- **Husky**: Intercepts Git events (commit, push, merge)
- **@unrdf/hooks**: RDF-based reactive hook system
- **Bree**: Background job scheduler for async tasks

**Quick Setup**:
```bash
# Set up hooks integration
gitvan hooks setup

# Register a hook
gitvan hooks register hooks/pre-commit-quality.ttl

# View hook status
gitvan hooks status
```

**Example Hook Definition** (hooks/pre-commit-quality.ttl):
```turtle
@prefix : <http://example.com/hooks#> .
@prefix git: <http://example.com/git#> .
@prefix hook: <http://example.com/hook#> .

:PreCommitQuality a hook:Hook ;
  rdfs:label "Pre-commit code quality check" ;
  hook:on [
    a git:PreCommitEvent ;
    hook:pathChanged "**/*.{js,ts}"
  ] ;
  hook:job [
    hook:name "quality-check" ;
    hook:schedule "immediate" ;
    hook:timeout 60000
  ] .
```

**Documentation**:
- **[Integration Guide](docs/HOOKS_INTEGRATION_GUIDE.md)** - Step-by-step setup
- **[Architecture](docs/HOOKS_ARCHITECTURE.md)** - System design
- **[API Reference](docs/HOOKS_API_REFERENCE.md)** - Complete API docs
- **[Examples](docs/HOOKS_EXAMPLES.md)** - Real-world use cases

### Phase 1: RDF-Backed Git-Native Operations (v3.1+)

**What**: Git-Native I/O subsystem refactored with RDF-backed semantic state management.

GitVan v3.1+ implements Phase 1 of the RDF refactoring, bringing semantic graph capabilities to core Git operations:

**Features**:
- **Semantic Deadlock Detection**: Query circular lock dependencies with SPARQL
- **Advanced Lock Analytics**: Duration analysis, resource contention patterns
- **Snapshot Provenance**: Full audit trail of state evolution
- **Queue Reasoning**: Automatic dependency resolution

**RDF Ontologies** (loaded automatically):
- `lock-ontology.ttl` - Distributed lock management
- `snapshot-ontology.ttl` - State snapshots with provenance
- `queue-ontology.ttl` - Job queue with dependencies

**Performance Characteristics**:
| Operation | Target | P95 |
|-----------|--------|-----|
| Lock acquire/release | < 10ms | ✓ |
| SPARQL queries | < 100ms | ✓ |
| Snapshot operations | < 50ms | ✓ |
| Queue operations | < 25ms | ✓ |

**Example: Detect Deadlocks**:
```javascript
import { useRDFLockManager } from 'gitvan/git-native';

const lockManager = useRDFLockManager();

// Check for circular dependencies
const hasDeadlock = await lockManager.detectDeadlocks();

if (hasDeadlock) {
  // Get blocking chain
  const chain = await lockManager.getBlockingChain('my-resource');
  console.log('Blocking chain:', chain);
}
```

**SPARQL Query Example**:
```sparql
PREFIX lock: <https://gitvan.dev/lock#>

# Find all locks blocking a specific resource
SELECT ?lock ?owner ?duration WHERE {
  ?lock lock:resourceId <resource://workflow-state> ;
        lock:owner ?owner ;
        lock:acquiredAt ?acquiredAt .
  BIND((NOW() - ?acquiredAt) AS ?duration)
}
ORDER BY DESC(?duration)
```

**Documentation**:
- **[Phase 1 Implementation Plan](docs/PHASE-1-GIT-NATIVE-RDF-IMPLEMENTATION.md)** - Complete specification
- **[Week 1 Completion Report](docs/phase-1-reports/WEEK-1-COMPLETION-REPORT.md)** - Progress status

**Status**: ✅ Week 1-3 Complete (Ontologies, Lock Manager, Snapshot Store, Queue Manager)

---

## Common Tasks

| Task | Command |
|------|---------|
| List workflows | `gitvan workflow list` |
| Run a workflow | `gitvan workflow run MyWorkflow` |
| View performance | `gitvan workflow stats MyWorkflow` |
| Check history | `gitvan workflow history MyWorkflow` |
| Install Git hook | `gitvan hook install pre-commit MyWorkflow` |
| View Git hooks | `gitvan hook list` |
| Validate workflow | `gitvan workflow validate MyWorkflow` |
| Create alert | `gitvan alert create --workflow X --metric Y --threshold Z` |

See [How-To Guides](docs/HOW-TO-GUIDES.md) for detailed instructions.

---

## Examples

### Example 1: Lint on Commit

```turtle
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:LintOnCommit a gh:Hook ;
  rdfs:label "Lint on Commit" ;
  op:hasPipeline [
    op:hasStep [
      a op:CLIStep ;
      rdfs:label "Lint code" ;
      op:command "npm run lint" ;
      op:timeout 30000 ;
      op:failOn "error"
    ]
  ] .
```

Register:
```bash
gitvan hook install pre-commit LintOnCommit
```

### Example 2: Multi-Step Pipeline

```turtle
gh:BuildAndDeploy a gh:Hook ;
  rdfs:label "Build and Deploy" ;
  op:hasPipeline [
    op:hasStep gh:build ;
    op:hasStep gh:test ;
    op:hasStep gh:deploy
  ] .

gh:build a op:CLIStep ;
  op:command "npm run build" ;
  op:timeout 60000 .

gh:test a op:CLIStep ;
  op:command "npm test" ;
  op:timeout 120000 ;
  op:dependsOn gh:build .

gh:deploy a op:CLIStep ;
  op:command "npm run deploy" ;
  op:timeout 180000 ;
  op:dependsOn gh:test .
```

---

## What Makes GitVan Different

### 1. Git-Native
Workflows live in your repo as `.ttl` files. Version them with Git, review in PRs.

### 2. Queryable
Ask "Which workflows use Docker?" → One query, instant answer. JSON/YAML requires manual scanning.

### 3. Composable
Combine workflows into larger workflows without duplication.

### 4. Reactive
Workflows automatically trigger based on state changes, not just Git events.

### 5. Performance-Focused
SLO tracking and performance metrics built-in from day one.

### 6. Audit Trail
Every workflow change is immutably recorded with full provenance.

---

## Project Structure

```
.gitvan/
├── workflows/           # Your workflow definitions (.ttl files)
│   ├── build.ttl
│   ├── test.ttl
│   ├── deploy.ttl
│   └── lint.ttl
├── config.yaml         # GitVan configuration
└── hooks/              # Git hook symlinks (auto-generated)
    ├── pre-commit
    ├── post-commit
    └── pre-push
```

---

## Getting Help

- **[Tutorials](docs/TUTORIALS.md)** - Step-by-step learning
- **[How-To Guides](docs/HOW-TO-GUIDES.md)** - Specific problem-solving
- **[Reference](docs/REFERENCE.md)** - Complete specifications
- **[Explanation](docs/EXPLANATION.md)** - Conceptual understanding
- **`gitvan --help`** - CLI help

---

## Performance

| Operation | Typical Time |
|-----------|--------------|
| List workflows | 5ms |
| Run workflow (setup) | 50ms |
| Query execution | < 10ms |
| Audit trail write | 5ms |
| Hook execution | 0.2ms (p50), 2ms (p99) |

See [80/20 Architecture](docs/80-20-ARCHITECTURE.md) for detailed benchmarks.

---

## Security & Reliability

✓ **Immutable audit trail** - Every change tracked and signed
✓ **Sandboxed execution** - Workflows cannot crash system
✓ **Pre-execution validation** - Invalid workflows caught before running
✓ **Atomic transactions** - All-or-nothing workflow changes
✓ **Error isolation** - Single bad workflow doesn't affect others
✓ **Concurrent write protection** - Git serializes modifications

See [Poka-Yoke](docs/POKA-YOKE.md) for 10 error-prevention mechanisms.

---

## Development

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/gitvan/gitvan.git
cd gitvan

# Run automated setup (recommended)
npm run setup-dev
```

**What `setup-dev` does:**
- Initializes git submodules (including UnRDF at `vendor/unrdf/`)
- Installs all dependencies
- Builds the UnRDF submodule
- Builds GitVan

**Note**: GitVan uses git submodules for some dependencies. The `setup-dev` script handles everything automatically. See [Submodule Setup Guide](docs/SUBMODULE_SETUP.md) for details.

### Manual Setup

```bash
# Clone and install
git clone https://github.com/gitvan/gitvan.git
cd gitvan

# Initialize submodules
git submodule update --init --recursive

# Install dependencies
npm install

# Build
npm run build
```

### Common Development Tasks

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Build
npm run build

# Build UnRDF submodule
npm run build:unrdf

# Local CLI
node src/cli.mjs --help

# Watch mode for development
npm run dev
```

### Working with Submodules

GitVan uses UnRDF as a git submodule at `vendor/unrdf/`. This allows for:
- Active co-development between GitVan and UnRDF
- Source-level debugging
- Pinning to specific versions

For detailed information about working with the submodule, see [Submodule Setup Guide](docs/SUBMODULE_SETUP.md).

---

## License

MIT - See [LICENSE](LICENSE)

---

## Links

- **GitHub**: [github.com/gitvan/gitvan](https://github.com/gitvan/gitvan)
- **npm**: [npmjs.com/package/gitvan](https://www.npmjs.com/package/gitvan)
- **Issues**: [github.com/gitvan/gitvan/issues](https://github.com/gitvan/gitvan/issues)
