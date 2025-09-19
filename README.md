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

### 🎯 Next.js Packs Ecosystem
- **Hyper-Advanced Dashboard Pack**: Next.js 15.5.2 + React 19 + shadcn/ui + deck.gl
- **Static CMS Pack**: React components in markdown, GitHub Pages deployment
- **Docker Compose Integration**: Live development with hot reloading
- **Production Ready**: Cleanroom tested, enterprise-grade architecture

### 🔧 Git Native I/O System
- **Advanced Git Operations**: Locking, queuing, and atomic operations
- **Snapshot Management**: Efficient state tracking and rollback capabilities
- **Worker Threads**: Non-blocking Git operations for performance
- **Receipt System**: Comprehensive operation logging and validation

### 🤖 JTBD Hooks (Job-to-be-Done)
- **Business Intelligence**: Market intelligence, predictive analytics, dashboards
- **Development Lifecycle**: Code quality gatekeepers, test coverage enforcers
- **Infrastructure DevOps**: Deployment monitoring, configuration drift detection
- **Developer Workflow**: Daily scrum automation, sprint planning, end-of-day reporting

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

## 🎯 Next.js Packs

### 📊 Hyper-Advanced Dashboard Pack
Create enterprise-grade dashboards with the latest technologies:

```bash
# Create a new dashboard project
gitvan pack install nextjs-dashboard-pack

# Generate dashboard with Docker Compose
gitvan run create-dashboard-project --name "my-dashboard"

# Start development with live updates
cd my-dashboard && docker-compose up --build
```

**Features:**
- **Next.js 15.5.2** + **React 19** + **TypeScript 5.7.0**
- **shadcn/ui** components with Radix UI primitives
- **deck.gl** for advanced data visualization
- **Docker Compose** with live updates and hot reloading
- **AI-powered insights** and real-time data streaming
- **Enterprise security** and performance optimizations

### 📝 Static CMS Pack
Build content management systems with React components in markdown:

```bash
# Create a new CMS project
gitvan pack install nextjs-cms-pack

# Generate CMS with GitHub Pages deployment
gitvan run create-cms-project --name "my-cms"

# Deploy to GitHub Pages
gitvan run deploy-cms
```

**Features:**
- **MDX Integration**: React components embedded in markdown
- **GitHub Pages**: Automatic deployment with GitHub Actions
- **Static Generation**: Fast, SEO-friendly static sites
- **Template System**: Nunjucks templates for content generation
- **Live Development**: Docker Compose with hot reloading

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

## 🤖 JTBD Hooks (Job-to-be-Done)

### Business Intelligence Hooks
- **Market Intelligence Analyzer**: Track competitor analysis and market trends
- **Predictive Analytics Engine**: Forecast business metrics and outcomes
- **Business Intelligence Dashboard**: Real-time KPI monitoring and reporting

### Development Lifecycle Hooks
- **Code Quality Gatekeeper**: Enforce coding standards and best practices
- **Dependency Vulnerability Scanner**: Monitor and alert on security vulnerabilities
- **Test Coverage Enforcer**: Ensure minimum test coverage thresholds
- **Performance Regression Detector**: Identify performance degradation
- **Documentation Sync Enforcer**: Keep documentation in sync with code

### Infrastructure DevOps Hooks
- **Deployment Health Monitor**: Track deployment success and rollback triggers
- **Configuration Drift Detector**: Identify infrastructure configuration changes
- **Infrastructure Drift Detector**: Monitor resource changes and compliance
- **Backup Recovery Validator**: Ensure backup integrity and recovery procedures
- **Resource Usage Optimizer**: Optimize resource allocation and costs

### Developer Workflow Hooks
- **Daily Scrum Automation**: Automated standup reports and sprint tracking
- **Sprint Planning**: Intelligent sprint planning based on historical data
- **End-of-Day Reporting**: Automated daily progress and blocker reporting
- **File Saving Triggers**: Context-aware actions on file changes
- **Definition of Done**: Automated quality gates and completion criteria

## 🔧 Git Native I/O System

Advanced Git operations with enterprise-grade features:

### Core Components
- **GitNativeIO**: High-level Git operations with error handling
- **LockManager**: Distributed locking for concurrent operations
- **QueueManager**: Operation queuing and priority management
- **SnapshotStore**: Efficient state tracking and rollback
- **ReceiptWriter**: Comprehensive operation logging
- **Worker Threads**: Non-blocking Git operations

### Features
- **Atomic Operations**: All-or-nothing Git operations
- **Concurrent Safety**: Lock-based concurrency control
- **Performance Optimization**: Worker threads and efficient I/O
- **State Management**: Snapshot-based state tracking
- **Audit Trail**: Complete operation history and receipts

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
- **[Git Native I/O](./docs/GIT-NATIVE-IO-ARCHITECTURE.md)** - Advanced Git operations

### Pack Documentation
- **[Next.js Dashboard Pack](./packs/nextjs-dashboard-pack/README.md)** - Hyper-advanced dashboard creation
- **[Next.js CMS Pack](./packs/nextjs-cms-pack/README.md)** - Static CMS with React components
- **[Docker Compose Integration](./packs/nextjs-dashboard-pack/DASHBOARD-PACK-COMPOSE-LIVE-UPDATES-TEST-REPORT.md)** - Live development setup

### API Reference
- **[Composables API](./docs/api/composables.md)** - Core composables documentation
- **[CLI Commands](./docs/api/cli.md)** - Command-line interface reference
- **[Configuration](./docs/api/configuration.md)** - Configuration options

### Examples
- **[Knowledge Hooks](./hooks/README.md)** - Hook examples and patterns
- **[Workflows](./workflows/README.md)** - Workflow examples
- **[Templates](./templates/README.md)** - Template examples
- **[JTBD Hooks](./hooks/jtbd-hooks/README.md)** - Job-to-be-Done examples

## 🛠️ Development

### Prerequisites
- Node.js 18+ (LTS recommended)
- Git 2.30+
- pnpm (recommended) or npm
- Docker (for containerized development)

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
pnpm test tests/packs/

# Run with coverage
pnpm test --coverage
```

### Pack Development
```bash
# Test dashboard pack
cd packs/nextjs-dashboard-pack
./test-live-updates.sh

# Test CMS pack
cd packs/nextjs-cms-pack
./test-cleanroom-local.sh

# Run cleanroom tests
./test-dashboard-pack-cleanroom.sh
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
- **Docker**: Test in cleanroom environments

## 📄 License

GitVan is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- **Ollama**: For local AI model integration
- **RDF.js Community**: For excellent RDF tooling
- **Nunjucks**: For powerful templating
- **Next.js Team**: For the amazing React framework
- **shadcn/ui**: For beautiful UI components
- **deck.gl**: For advanced data visualization
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