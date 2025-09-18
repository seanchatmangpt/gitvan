# GitVan v2.1.0 🚀

**The Git-Native Development Automation Platform with Knowledge Hook Engine**

GitVan transforms Git into a runtime environment for development automation, providing intelligent job scheduling, template generation, AI-powered workflows, and autonomous knowledge-driven hooks through a unified autonomic system. Everything happens automatically after initialization.

## 🌟 What's New in v2.1.0

### 🧠 Knowledge Hook Engine
- **Autonomous Intelligence**: Hooks that react to changes in your knowledge graph
- **SPARQL-Driven Logic**: Complex queries determine when actions should trigger
- **State Change Detection**: ResultDelta predicates detect meaningful changes
- **Boolean Conditions**: ASK predicates for simple true/false logic
- **Threshold Monitoring**: SELECTThreshold predicates for metric-based triggers
- **SHACL Validation**: Shape-based validation triggers

### ⚡ Turtle as Workflow Engine
- **Declarative Workflows**: Define complex workflows in Turtle (.ttl) format
- **DAG Execution**: Topological sorting ensures proper step dependencies
- **Template Processing**: Advanced Nunjucks templates with filters
- **SPARQL Integration**: Query your knowledge graph within workflows
- **Context Management**: Rich context passing between workflow steps

### 🐳 Docker Cleanroom Support
- **Containerized Initialization**: Full GitVan setup in Docker environments
- **Reproducible Builds**: Consistent initialization across all environments
- **Production Ready**: Optimized Alpine Linux containers

## 📦 NPM Package

GitVan v2.1.0 is now available on npm! Install it globally or locally:

- **Package:** [gitvan@2.1.0](https://www.npmjs.com/package/gitvan)
- **Registry:** npmjs.org
- **Size:** 3.1 MB unpacked
- **Dependencies:** 7 core packages (Ollama, Giget, Hookable, etc.)

## 🚀 Quick Start

### 1. Install GitVan
```bash
# Global installation
npm install -g gitvan@2.1.0

# Local installation
npm install gitvan@2.1.0
```

### 2. Initialize Your Project
```bash
# In an empty directory
gitvan init --name "my-project" --description "My GitVan project"

# Or with Docker
docker run --rm -v $(pwd):/workspace gitvan-cleanroom
```

### 3. Complete Setup
```bash
# Configure Git (if not already done)
git config user.name "Your Name"
git config user.email "your@email.com"

# Complete GitVan setup
gitvan setup
```

### 4. Start Automating
```bash
# List available hooks
gitvan hooks list

# Evaluate all hooks
gitvan hooks evaluate

# List available workflows
gitvan workflow list

# Run a workflow
gitvan workflow run data-processing
```

## 🧠 Knowledge Hook Engine

GitVan's Knowledge Hook Engine represents a paradigm shift from simple event-driven triggers to intelligent, knowledge-driven automation.

### Hook Types

#### 🔄 ResultDelta Predicates
Detect changes in your knowledge graph state:
```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .

ex:version-change-predicate rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?project ?version WHERE {
            ?project rdf:type gv:Project .
            ?project gv:version ?version .
        }
    """ .
```

#### ❓ ASK Predicates
Simple boolean conditions:
```turtle
ex:critical-issues-predicate rdf:type gh:ASK ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        ASK WHERE {
            ?issue rdf:type gv:Issue .
            ?issue gv:priority "critical" .
            ?issue gv:status "open" .
        }
    """ .
```

#### 📊 SELECTThreshold Predicates
Monitor metrics and thresholds:
```turtle
ex:bug-threshold-predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?bug) AS ?count) WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:status "open" .
        }
    """ ;
    gh:threshold "10" ;
    gh:operator ">" .
```

#### ✅ SHACL Validation Predicates
Shape-based validation:
```turtle
ex:validation-predicate rdf:type gh:SHACLAllConform ;
    gh:shapesText """
        PREFIX sh: <http://www.w3.org/ns/shacl#>
        ex:ProjectShape sh:targetClass gv:Project ;
            sh:property [
                sh:path gv:name ;
                sh:minCount 1 ;
            ] .
    """ .
```

## ⚡ Turtle as Workflow Engine

Define complex workflows declaratively in Turtle format:

```turtle
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix op: <https://gitvan.dev/op#> .

# Data Processing Workflow
ex:data-processing-workflow rdf:type gv:Workflow ;
    gv:title "Data Processing Pipeline" ;
    gv:steps ex:analyze-data, ex:generate-report .

# Step 1: Analyze Data
ex:analyze-data rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?item) AS ?total) WHERE {
            ?item rdf:type gv:TestItem .
        }
    """ ;
    gv:outputMapping '{"total": "total"}' .

# Step 2: Generate Report
ex:generate-report rdf:type gv:TemplateStep ;
    gv:text "Total Items: {{ total }}\\nGenerated: {{ 'now' | date('YYYY-MM-DD') }}" ;
    gv:filePath "./reports/data-analysis.txt" ;
    gv:dependsOn ex:analyze-data .
```

## 🎯 Core Features

### 🤖 AI-Powered Automation
- **Ollama Integration**: Local Ollama models for intelligent task execution
- **Context-Aware**: AI understands your project structure and history
- **Natural Language**: Describe tasks in plain English
- **Learning System**: Improves over time based on your patterns

### 📝 Advanced Template System
- **Nunjucks Templates**: Powerful templating with filters and functions
- **Dynamic Content**: Generate documentation, code, and reports
- **Filter Support**: Date formatting, JSON serialization, string manipulation
- **Context Injection**: Rich data from Git history and project state

### 🔧 Composable Architecture
- **Modular Design**: Mix and match composables for custom workflows
- **RDF Integration**: Full RDF/SPARQL support for knowledge management
- **Type Safety**: Comprehensive TypeScript definitions
- **Extensible**: Easy to add new composables and functionality

### 🐳 Container Support
- **Docker Ready**: Full containerization support
- **Cleanroom Testing**: Isolated environment testing
- **CI/CD Integration**: Seamless integration with build pipelines
- **Multi-Platform**: Works on Linux, macOS, and Windows

## 📚 Documentation

### Core Concepts
- **[Knowledge Hook Engine](./docs/KNOWLEDGE-HOOK-IMPLEMENTATION-REPORT.md)** - Complete implementation guide
- **[Turtle as Workflow](./docs/C4-ARCHITECTURE-TURTLE-WORKFLOW.md)** - Workflow engine architecture
- **[RDF Composable Architecture](./docs/RDF-COMPOSABLE-ARCHITECTURE.md)** - RDF integration patterns

### API Reference
- **[Composables API](./docs/api/composables.md)** - Core composables documentation
- **[CLI Commands](./docs/api/cli.md)** - Command-line interface reference
- **[Configuration](./docs/api/configuration.md)** - Configuration options

### Examples
- **[Knowledge Hooks](./hooks/README.md)** - Hook examples and patterns
- **[Workflows](./workflows/README.md)** - Workflow examples
- **[Templates](./templates/README.md)** - Template examples

## 🛠️ Development

### Prerequisites
- Node.js 18+ (LTS recommended)
- Git 2.30+
- pnpm (recommended) or npm

### Local Development
```bash
# Clone the repository
git clone https://github.com/gitvan/gitvan.git
cd gitvan

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the project
pnpm run build
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test tests/hooks/
pnpm test tests/workflows/

# Run with coverage
pnpm test --coverage
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Standards
- **ESLint**: Follow the configured linting rules
- **Prettier**: Code formatting is enforced
- **TypeScript**: Use TypeScript for new features
- **Tests**: All new features must include tests

## 📄 License

GitVan is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- **Ollama**: For local AI model integration
- **RDF.js Community**: For excellent RDF tooling
- **Nunjucks**: For powerful templating
- **Contributors**: All the amazing developers who make GitVan possible

## 🔗 Links

- **Website**: [gitvan.dev](https://gitvan.dev)
- **Documentation**: [docs.gitvan.dev](https://docs.gitvan.dev)
- **NPM Package**: [npmjs.com/package/gitvan](https://www.npmjs.com/package/gitvan)
- **GitHub**: [github.com/gitvan/gitvan](https://github.com/gitvan/gitvan)
- **Issues**: [github.com/gitvan/gitvan/issues](https://github.com/gitvan/gitvan/issues)

---

**GitVan v2.1.0** - Where Git meets AI. Where automation becomes intelligent. Where workflows become effortless.

*Transform your development workflow with the power of Git-native automation.*