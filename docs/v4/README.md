# GitVan v4 Documentation with @unrdf/hooks

Comprehensive documentation for GitVan v4 Knowledge Hook system.

---

## Overview

GitVan v4 introduces the **Knowledge Hook Engine** - a paradigm shift from event-based to predicate-based reactive automation. Instead of reacting to simple events, Knowledge Hooks evaluate logical conditions against your project's semantic knowledge graph.

### Key Features

- **Reactive Automation**: Hooks trigger on knowledge graph state changes
- **SPARQL Predicates**: Powerful query-based triggering conditions
- **RDF-Based Workflows**: Composable, queryable workflow definitions
- **Git-Native Storage**: All state in Git (commits, notes, refs)
- **TypeScript Support**: Full type definitions for development

---

## Quick Start

```bash
# Install GitVan
npm install -g gitvan

# Initialize in your project
cd your-project
gitvan init

# Create a hook
cat > hooks/my-hook.ttl << 'EOF'
@prefix ex: <http://example.org/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:my-hook rdf:type gh:Hook ;
    gv:title "My First Hook" ;
    gh:hasPredicate ex:my-pred ;
    gh:orderedPipelines ex:my-pipeline .

ex:my-pred rdf:type gh:ASKPredicate ;
    gh:queryText "ASK WHERE { BIND(true AS ?always) }" .

ex:my-pipeline rdf:type op:Pipeline ;
    op:steps (ex:hello) .

ex:hello rdf:type op:CLIStep ;
    op:command "echo Hello from GitVan!" .
EOF

# Run hooks
gitvan hooks evaluate --verbose
```

---

## Documentation Index

### API Reference

| Document | Description |
|----------|-------------|
| [Hook Reference](api/HOOK-REFERENCE.md) | Complete API documentation |
| [Usage Examples](api/USAGE-EXAMPLES.md) | Practical code examples |
| [Best Practices](api/BEST-PRACTICES.md) | Guidelines and recommendations |
| [TypeScript Reference](api/TYPESCRIPT-REFERENCE.md) | Type definitions |

### Tutorials

| Document | Description |
|----------|-------------|
| [Getting Started](tutorials/GETTING-STARTED.md) | 15-minute quick start |
| [Advanced Patterns](tutorials/ADVANCED-PATTERNS.md) | Complex hook architectures |

### Architecture

| Document | Description |
|----------|-------------|
| [Architecture Overview](architecture/OVERVIEW.md) | System design and modules |

### Migration

| Document | Description |
|----------|-------------|
| [v3 to v4 Migration](migration/V3-TO-V4-MIGRATION.md) | Complete migration guide |

### Examples

| Document | Description |
|----------|-------------|
| [Example Projects](examples/EXAMPLE-PROJECTS.md) | Complete example collections |

### Security & Testing

| Document | Description |
|----------|-------------|
| [Security Guide](security/SECURITY-GUIDE.md) | Security best practices |
| [Testing Guide](testing/TESTING-GUIDE.md) | Testing strategies |

### Support

| Document | Description |
|----------|-------------|
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues and solutions |
| [FAQ](FAQ.md) | Frequently asked questions |

---

## Predicate Types

| Type | Description | Use Case |
|------|-------------|----------|
| `ASKPredicate` | Boolean condition | Simple presence checks |
| `ResultDelta` | Change detection | State change triggers |
| `SELECTThreshold` | Numeric comparison | Threshold monitoring |
| `SHACLAllConform` | Schema validation | Data quality gates |
| `TemporalPredicate` | Time-based | Scheduled triggers |
| `CONSTRUCT` | Graph building | Dynamic data |
| `Federated` | Multi-source | External queries |

---

## CLI Commands

```bash
# List all hooks
gitvan hooks list

# Evaluate hooks
gitvan hooks evaluate

# Dry run (no execution)
gitvan hooks evaluate --dry-run

# Verbose output
gitvan hooks evaluate --verbose

# Evaluate by category
gitvan hooks evaluate-category <category>

# Validate hook
gitvan hooks validate <hook-id>

# Get statistics
gitvan hooks stats

# Create new hook
gitvan hooks create <name> "<title>" <predicate-type>

# Refresh registry
gitvan hooks refresh
```

---

## Composables

```javascript
import { useGit, useTemplate, withGitVan } from 'gitvan/composables';

await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  const tmpl = useTemplate();

  const branch = await git.branch();
  console.log(`Current branch: ${branch}`);

  await git.add(['file.js']);
  await git.commit('feat: add feature');
});
```

---

## Project Structure

```
your-project/
  hooks/
    my-hook.ttl        # Hook definitions
    data/
      state.ttl        # Knowledge graph data
  .gitvan/
    workflows/         # Legacy workflow support
    config.yaml        # Configuration
```

---

## Requirements

- Node.js 18+
- Git 2.25+
- Any OS (Linux, macOS, Windows)

---

## Getting Help

- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [FAQ](FAQ.md)
- [GitHub Issues](https://github.com/seanchatmangpt/gitvan/issues)

---

## License

MIT - See [LICENSE](../../LICENSE)
