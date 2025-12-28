# GitVan v4 Frequently Asked Questions

Common questions and answers about GitVan v4 and @unrdf/hooks.

---

## General Questions

### What is GitVan v4?

GitVan v4 is a Git-native workflow automation platform that uses Knowledge Hooks - reactive hooks triggered by changes in your project's knowledge graph rather than simple events.

### What are Knowledge Hooks?

Knowledge Hooks are predicate-based automation triggers that evaluate logical conditions against RDF knowledge graphs. They provide more sophisticated triggering logic than traditional event-based hooks.

### Why use Turtle (.ttl) files instead of JSON/YAML?

Turtle format provides:
- **Queryable data**: SPARQL queries for discovery
- **Composability**: RDF triples can be combined
- **Schema validation**: SHACL for data quality
- **Semantic meaning**: Ontologies define relationships
- **Git-friendly**: Text-based, easy diffs

### Is GitVan compatible with existing Git hooks?

Yes! GitVan integrates with standard Git hooks (pre-commit, post-commit, etc.) while adding Knowledge Hook capabilities. You can use both traditional hooks and Knowledge Hooks together.

---

## Installation & Setup

### What are the system requirements?

- Node.js 18 or higher
- Git 2.25 or higher
- Any OS (Linux, macOS, Windows)

### Can I use GitVan with pnpm/yarn?

Yes, all package managers are supported:

```bash
# npm
npm install -g gitvan

# pnpm
pnpm add -g gitvan

# yarn
yarn global add gitvan
```

### How do I initialize GitVan in an existing project?

```bash
cd your-project
gitvan init
```

This creates the necessary directories and configuration files.

---

## Hooks & Predicates

### What predicate types are available?

| Type | Use Case |
|------|----------|
| `ASKPredicate` | Boolean conditions |
| `ResultDelta` | Detect changes between states |
| `SELECTThreshold` | Numerical monitoring |
| `SHACLAllConform` | Schema validation |
| `TemporalPredicate` | Time-based triggers |
| `CONSTRUCT` | Dynamic graph building |
| `Federated` | Multi-source queries |

### How do I test a hook without executing workflows?

Use dry-run mode:

```bash
gitvan hooks evaluate --dry-run
```

### Can hooks trigger other hooks?

Yes! Hooks can update the knowledge graph, which triggers other hooks that monitor those changes. See the [Advanced Patterns](tutorials/ADVANCED-PATTERNS.md) guide.

### How do I run hooks on a schedule?

Add a `gv:schedule` property:

```turtle
ex:daily-hook rdf:type gh:Hook ;
    gv:schedule "0 9 * * *" ;  # Daily at 9 AM
    gh:hasPredicate ex:pred .
```

Then run the daemon:
```bash
gitvan daemon start
```

### What happens if a hook fails?

By default, hook failures are logged and execution continues. You can configure failure behavior:

```turtle
ex:critical-step rdf:type op:CLIStep ;
    op:failOn "error" ;
    op:continueOnError false .
```

---

## SPARQL & Graphs

### Do I need to learn SPARQL?

Basic SPARQL is helpful but not required. Simple hooks use straightforward queries:

```sparql
# Check if bugs exist
ASK WHERE { ?bug rdf:type gv:Bug }

# Count items
SELECT (COUNT(?x) AS ?count) WHERE { ?x rdf:type gv:Task }
```

### Where does the knowledge graph data come from?

Data comes from:
1. `.ttl` files in your repository
2. Generated data from hooks
3. External sources (via federated queries)
4. Automatic extraction (git metadata, package.json, etc.)

### Can I query external SPARQL endpoints?

Yes, using federated queries:

```turtle
ex:federated-pred rdf:type gh:Federated ;
    gh:endpoints [
        gh:url "https://dbpedia.org/sparql" ;
        gh:timeout 5000
    ] ;
    gh:queryText "SELECT ?item WHERE { ... }" .
```

### How large can the knowledge graph be?

GitVan handles graphs with millions of triples efficiently. For very large graphs:
- Use lazy loading
- Split into categories
- Archive historical data

---

## Workflows & Steps

### What step types are available?

| Type | Description |
|------|-------------|
| `op:CLIStep` | Shell commands |
| `gv:TemplateStep` | Template rendering |
| `op:HTTPStep` | HTTP requests |
| `op:SPARQLStep` | Graph queries |
| `op:FileStep` | File operations |
| `op:WaitStep` | Conditional waiting |

### Can steps run in parallel?

Yes! Steps without dependencies run concurrently:

```turtle
ex:pipeline rdf:type op:Pipeline ;
    op:steps (ex:step1 ex:step2 ex:step3) .

# step1 and step2 run in parallel
# step3 waits for both
ex:step3 op:dependsOn ex:step1, ex:step2 .
```

### How do I pass data between steps?

Use output variables:

```turtle
ex:get-version rdf:type op:CLIStep ;
    op:command "node -p 'require(\"./package.json\").version'" ;
    op:outputVar "version" .

ex:use-version rdf:type op:CLIStep ;
    op:command "echo 'Version: {{ version }}'" ;
    op:dependsOn ex:get-version .
```

### Can I use environment variables in steps?

Yes:

```turtle
ex:deploy rdf:type op:CLIStep ;
    op:command "curl -H 'Authorization: Bearer ${API_TOKEN}' ..." .
```

---

## Performance

### How fast is hook evaluation?

Typical performance:
- Hook listing: ~5ms
- Single predicate evaluation: ~10-50ms
- Workflow execution: Depends on steps

### How can I improve performance?

1. Add LIMIT to queries
2. Use specific predicates over broad queries
3. Enable lazy loading
4. Categorize hooks and evaluate selectively
5. Use ResultDelta instead of repeated ASK

### Does GitVan work offline?

Yes! All core functionality works offline. Only federated queries require network access.

---

## Security

### How are secrets handled?

Never hardcode secrets. Use environment variables:

```turtle
op:command "curl -H 'Authorization: Bearer ${SECRET}' ..." .
```

### Are hooks sandboxed?

Yes, hooks run in isolated contexts with configurable:
- Timeout limits
- Resource limits
- Allowed commands
- Network access

### How do I audit hook executions?

All executions are logged to Git Notes. Query the audit trail:

```bash
gitvan query "SELECT ?execution ?hook ?time WHERE {
    ?execution rdf:type audit:HookExecution .
    ?execution audit:hookId ?hook .
    ?execution audit:timestamp ?time .
} ORDER BY DESC(?time)"
```

---

## Integration

### Does GitVan work with CI/CD?

Yes! See [CI/CD Integration](testing/TESTING-GUIDE.md#cicd-integration):

```yaml
# GitHub Actions
- run: gitvan hooks evaluate
```

### Can I use GitVan with monorepos?

Yes, configure per-package hooks:

```
packages/
  frontend/
    hooks/
  backend/
    hooks/
```

### How do I integrate with Slack/Teams/Discord?

Use HTTP steps:

```turtle
ex:notify rdf:type op:HTTPStep ;
    op:url "https://hooks.slack.com/..." ;
    op:method "POST" ;
    op:body """{"text": "Hook triggered!"}""" .
```

---

## Migration

### How do I migrate from v3?

See the complete [Migration Guide](migration/V3-TO-V4-MIGRATION.md).

### Can I run v3 and v4 together?

Not recommended. Migrate completely to v4 for best results.

### Are there breaking changes?

Yes, v4 has significant changes:
- Configuration format (JSON -> Turtle)
- Composable API (sync -> async)
- Hook registration (imperative -> declarative)

---

## Troubleshooting

### Why isn't my hook triggering?

Common causes:
1. Predicate query has typos
2. Data doesn't match query
3. Prefix URIs don't match
4. Hook not in hooks/ directory

See [Troubleshooting Guide](TROUBLESHOOTING.md).

### How do I debug predicates?

```bash
# Test query directly
gitvan query "YOUR SPARQL QUERY HERE"

# Verbose evaluation
gitvan hooks evaluate --verbose
```

### Where are logs stored?

- CLI output: stdout/stderr
- Execution receipts: Git Notes
- Debug logs: Set `DEBUG=gitvan:*`

---

## Contributing

### How can I contribute?

1. Report bugs via GitHub Issues
2. Submit PRs for fixes/features
3. Improve documentation
4. Share hook examples

### Where's the source code?

GitHub: [github.com/seanchatmangpt/gitvan](https://github.com/seanchatmangpt/gitvan)

### Is there a roadmap?

Check the GitHub project board and discussions for planned features.

---

## Getting Help

- **Documentation**: [docs/v4/](.)
- **Issues**: [GitHub Issues](https://github.com/gitvan/gitvan/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gitvan/gitvan/discussions)
- **Email**: support@gitvan.dev
