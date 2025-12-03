# GitVan v3.1.0

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

## Documentation Structure

Choose your starting point:

### 📚 [Tutorials](docs/TUTORIALS.md)
**Learning by doing.** Hands-on guides to get you productive in 30 minutes.
- Your first workflow (10 min)
- Multi-step workflows (15 min)
- Git hooks automation (15 min)
- Performance monitoring (10 min)

### 🎯 [How-To Guides](docs/HOW-TO-GUIDES.md)
**Solve specific problems.** Practical recipes for common tasks.
- Add a custom workflow
- Parallelize steps
- Query workflow history
- Set up SLOs and alerts
- Compose workflows

### 📖 [Reference](docs/REFERENCE.md)
**Look things up.** Complete specifications of commands, formats, and APIs.
- CLI commands (all options)
- Workflow file format (all properties)
- Step types (all available steps)
- Configuration (all settings)

### 💡 [Explanation](docs/EXPLANATION.md)
**Understand why.** Deep knowledge about architecture and design.
- Why GitVan uses RDF (hidden)
- 80/20 core components
- RDF capabilities vs JSON/YAML
- Performance characteristics
- Security implications

### 🛡️ [Architecture](docs/80-20-ARCHITECTURE.md)
**6 core components, 85% value.** How GitVan's innovation unlocks powerful capabilities.

### ⚠️ [Risk Analysis](docs/FMEA-RISK-ANALYSIS.md)
**Lean Six Sigma quality.** Failure mode analysis showing all risks are mitigated.

### 🚫 [Error Prevention](docs/POKA-YOKE.md)
**Design for safety.** 10 Poka-Yoke mechanisms that make failures impossible.

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

```bash
# Clone and install
git clone https://github.com/gitvan/gitvan.git
cd gitvan
npm install

# Run tests
npm test

# Build
npm run build

# Local CLI
node src/cli.mjs --help
```

---

## License

MIT - See [LICENSE](LICENSE)

---

## Links

- **GitHub**: [github.com/gitvan/gitvan](https://github.com/gitvan/gitvan)
- **npm**: [npmjs.com/package/gitvan](https://www.npmjs.com/package/gitvan)
- **Issues**: [github.com/gitvan/gitvan/issues](https://github.com/gitvan/gitvan/issues)
