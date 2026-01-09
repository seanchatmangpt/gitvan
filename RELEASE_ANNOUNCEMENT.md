# GitVan v1.0.0 Release Announcement

We're excited to announce **GitVan v1.0.0** - our first public release on npm!

## What is GitVan?

GitVan is a Git-native workflow automation platform that brings Git into your workflow system. Define workflows in `.ttl` (Turtle) files that live in your repository, trigger them on Git events, and track performance automatically.

**The innovation**: Behind the scenes, GitVan uses semantic graph technology (RDF/Turtle) to unlock powerful capabilities like federated queries, reactive hooks, and composable workflows. But you'll never need to learn RDF - it's completely hidden behind familiar Git concepts.

## Installation

```bash
# Install globally via npm
npm install -g gitvan

# Verify installation
gitvan --version
# Output: 1.0.0

# Initialize in your project
gitvan workflow init
```

## Quick Start

```bash
# Create your first workflow
cat > .gitvan/workflows/hello.ttl << 'EOF'
@prefix gh: <http://example.org/git-hooks#> .
@prefix op: <http://example.org/operations#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

gh:HelloWorld a gh:Hook ;
  rdfs:label "Hello World" ;
  op:hasPipeline [
    op:hasStep [
      a op:CLIStep ;
      op:command "echo Hello, GitVan!"
    ]
  ] .
EOF

# Run it
gitvan workflow run HelloWorld
```

## What's New in v1.0.0 (First Public Release)

### Documentation & Usability
- Complete API documentation with all composables
- Comprehensive getting started guide
- Configuration reference with all options
- Five detailed workflow examples
- Enhanced README with clear navigation

### Security Enhancements
- Fixed command injection vulnerability in workflow CLI steps
- Proper argument sanitization for shell commands
- Comprehensive security audit and hardening

### Performance & Quality
- Memory leak fixes in logger implementation
- Removed console statements from production code
- Optimized package size (under 1MB)
- Tree-shaking support with `sideEffects: false`

### Developer Experience
- Proper npm package metadata
- Enhanced .npmignore for clean installs
- Improved build configuration
- Better error messages

## Key Features

### Git-Native Workflows
Workflows live in your repository as `.ttl` files. Version them with Git, review in PRs, trigger on Git events.

```bash
# Install a Git hook
gitvan hook install pre-commit LintWorkflow

# Now LintWorkflow runs before every commit
```

### Composable & Queryable
Ask "Which workflows use Docker?" with a single SPARQL query. Compose workflows into larger workflows without duplication.

### AI-Powered
Multi-provider AI support (Anthropic, Ollama) with context-aware code generation and learning from previous executions.

### Performance Tracking
SLO tracking and metrics collection built-in from day one. Every workflow execution is measured and recorded.

### Semantic Graphs (Hidden)
Uses RDF/Turtle under the hood for reactive hooks, federated queries, and advanced capabilities - but you'll never need to learn it.

## Version History Note

This v1.0.0 release represents GitVan's first public npm publication. Internal development reached v3.x before this public release. We're using v1.0.0 to properly communicate this is the first stable public version available to the community.

## Documentation

- [Getting Started](./docs/GETTING_STARTED.md) - New user onboarding
- [API Reference](./docs/API_REFERENCE.md) - Complete API with all composables
- [Configuration Guide](./docs/CONFIGURATION_GUIDE.md) - All configuration options
- [Examples](./docs/examples/) - Five detailed workflow examples
- [Architecture](./CLAUDE.md) - Deep dive into design and patterns
- [80/20 Architecture](./docs/80-20-ARCHITECTURE.md) - Core components and value

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

See [docs/examples/](./docs/examples/) for five complete workflow examples.

## Performance

| Operation | Typical Time |
|-----------|--------------|
| List workflows | 5ms |
| Run workflow (setup) | 50ms |
| Query execution | < 10ms |
| Audit trail write | 5ms |
| Hook execution | 0.2ms (p50), 2ms (p99) |

See [80/20 Architecture](./docs/80-20-ARCHITECTURE.md) for detailed benchmarks.

## Support & Community

- Report issues: [GitHub Issues](https://github.com/seanchatmangpt/gitvan/issues)
- Discussions: [GitHub Discussions](https://github.com/seanchatmangpt/gitvan/discussions)
- Documentation: [docs/](./docs/)
- Homepage: [github.com/seanchatmangpt/gitvan](https://github.com/seanchatmangpt/gitvan)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) (if available) or check our [issues](https://github.com/seanchatmangpt/gitvan/issues) for areas where you can help.

## Requirements

- Node.js 18.0.0 or higher
- Git 2.0 or higher

## License

MIT License - See [LICENSE](./LICENSE) for details.

Copyright 2025 GitVan Development Team

---

## Project Stats

- 280 source files (.mjs modules)
- 310 test files
- 80%+ test coverage
- 54+ AI agents for development automation
- Zero external database dependencies (Git-native storage)

---

**Ready to automate your Git workflows?**

```bash
npm install -g gitvan
gitvan workflow init
```

Start building today!
