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
- **Pure JavaScript Workflows**: Define workflows using simple JavaScript objects
- **DAG Execution**: Topological sorting ensures proper step dependencies
- **Template Processing**: Advanced Nunjucks templates with filters
- **SPARQL Integration**: Query your knowledge graph within workflows
- **Context Management**: Rich context passing between workflow steps
- **Step Handlers**: Modular, extensible step execution system
- **Error Handling**: Robust error handling with detailed diagnostics
- **Testing Support**: Built-in testing utilities and validation

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

# Validate a workflow before execution
gitvan workflow validate my-workflow

# Get workflow execution history
gitvan workflow history

# View workflow execution details
gitvan workflow logs workflow-id
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

GitVan's workflow engine executes complex multi-step processes with full dependency management, context passing, and error handling. Workflows are defined using pure JavaScript objects for maximum simplicity and maintainability.

### 🚀 Quick Start

```javascript
import { WorkflowExecutor } from '@gitvan/workflow';

// Define your workflow as JavaScript objects
const workflowData = {
  hooks: [{
    id: "http://example.org/my-workflow",
    title: "My Data Processing Workflow",
    pipelines: ["http://example.org/main-pipeline"]
  }],
  pipelines: [{
    id: "http://example.org/main-pipeline",
    steps: [
      "http://example.org/sparql-step",
      "http://example.org/template-step",
      "http://example.org/file-step"
    ]
  }],
  steps: [
    {
      id: "http://example.org/sparql-step",
      type: "sparql",
      config: {
        query: `SELECT ?project ?version WHERE { ?project rdf:type gv:Project ; gv:version ?version }`,
        outputMapping: '{"projects": "results"}'
      }
    },
    {
      id: "http://example.org/template-step",
      type: "template",
      config: {
        template: `# Project Report\n\n{% for project in projects %}- {{ project.project.value }}: {{ project.version.value }}\n{% endfor %}`,
        outputPath: "reports/project-summary.md"
      },
      dependsOn: ["http://example.org/sparql-step"]
    },
    {
      id: "http://example.org/file-step",
      type: "file",
      config: {
        filePath: "reports/project-data.json",
        operation: "write",
        content: `{"projects": {{ projects | dump }}, "generated": "{{ 'now' | date('YYYY-MM-DD') }}"}`
      },
      dependsOn: ["http://example.org/template-step"]
    }
  ]
};

// Execute the workflow
const executor = new WorkflowExecutor({
  graphDir: './workflows',
  logger: console
});

const result = await executor.execute('http://example.org/my-workflow', {});
console.log(`Workflow completed: ${result.success}`);
console.log(`Steps executed: ${result.steps.length}`);
```

### 📋 Step Types

#### 🔍 SPARQL Step
Execute SPARQL queries against your knowledge graph:

```javascript
{
  id: "http://example.org/sparql-step",
  type: "sparql",
  config: {
    query: `SELECT ?item ?status WHERE { ?item rdf:type gv:Task ; gv:status ?status }`,
    outputMapping: '{"tasks": "results"}'  // Maps query results to context variables
  }
}
```

**Returns to context:**
- `type`: Query type ("select", "ask", "construct")
- `results`: Query results array
- `count`: Number of results
- `hasResults`: Boolean indicating if results exist
- `variables`: Query variables
- `queryMetadata`: Additional query information

#### 📝 Template Step
Generate content using Nunjucks templates:

```javascript
{
  id: "http://example.org/template-step",
  type: "template",
  config: {
    template: `# {{ title }}\n\n## Summary\n{{ summary }}\n\n## Items\n{% for item in items %}- {{ item.name }}: {{ item.value }}\n{% endfor %}`,
    outputPath: "reports/generated-report.md"
  },
  dependsOn: ["http://example.org/sparql-step"]
}
```

**Returns to context:**
- `outputPath`: Path where content was written
- `content`: Generated content
- `contentLength`: Length of generated content
- `templateUsed`: Type of template used ("inline" or file path)

#### 📁 File Step
Perform file system operations:

```javascript
{
  id: "http://example.org/file-step",
  type: "file",
  config: {
    filePath: "data/output.json",
    operation: "write",  // read, write, copy, move, delete
    content: `{"data": {{ data | dump }}, "timestamp": "{{ 'now' | date('YYYY-MM-DD') }}"}`
  },
  dependsOn: ["http://example.org/template-step"]
}
```

**Returns to context:**
- `operation`: Operation performed
- `filePath`: Path of the file
- `contentLength`: Length of content (for write operations)
- `rendered`: Whether content was template-rendered

#### 🌐 HTTP Step
Make HTTP requests to external APIs:

```javascript
{
  id: "http://example.org/http-step",
  type: "http",
  config: {
    url: "https://api.example.com/data",
    method: "GET",  // GET, POST, PUT, DELETE, etc.
    headers: {
      "Authorization": "Bearer {{ token }}",
      "Content-Type": "application/json"
    },
    body: `{"query": "{{ searchQuery }}", "limit": 10}`  // Optional for POST/PUT
  }
}
```

**Returns to context:**
- `url`: Request URL
- `method`: HTTP method used
- `status`: HTTP status code
- `statusText`: HTTP status text
- `headers`: Response headers
- `responseData`: Parsed response body
- `success`: Boolean indicating success

#### 💻 CLI Step
Execute command-line commands:

```javascript
{
  id: "http://example.org/cli-step",
  type: "cli",
  config: {
    command: "echo 'Processing complete: {{ timestamp }}'",
    cwd: "/path/to/working/directory",  // Optional
    timeout: 30000,  // Optional timeout in ms
    env: {  // Optional environment variables
      "NODE_ENV": "production",
      "API_KEY": "{{ apiKey }}"
    }
  }
}
```

**Returns to context:**
- `command`: Command executed
- `cwd`: Working directory
- `stdout`: Standard output
- `stderr`: Standard error
- `exitCode`: Exit code (0 = success)
- `success`: Boolean indicating success

### 🔄 Workflow Execution Flow

1. **Parse Workflow**: Load workflow definition and validate structure
2. **Create Execution Plan**: Build dependency graph and determine execution order
3. **Initialize Context**: Set up execution context and input parameters
4. **Execute Steps**: Run steps in dependency order with context passing
5. **Handle Errors**: Graceful error handling with rollback capabilities
6. **Return Results**: Complete execution results with step outputs

### 📊 Context Management

Each step receives the full execution context and can access:
- **Input Parameters**: Initial workflow inputs
- **Previous Step Outputs**: Results from dependency steps
- **Global Variables**: Workflow-wide variables
- **Template Variables**: Available for template rendering

```javascript
// Step outputs are automatically available to dependent steps
const context = {
  // From SPARQL step
  tasks: [
    { item: { value: "task1" }, status: { value: "completed" } },
    { item: { value: "task2" }, status: { value: "pending" } }
  ],
  
  // From Template step
  reportPath: "reports/task-summary.md",
  
  // From File step
  dataFile: "data/tasks.json",
  
  // Global variables
  timestamp: "2024-01-01T00:00:00Z",
  environment: "production"
};
```

### 🛠️ Advanced Features

#### Dependency Management
Steps automatically execute in the correct order based on dependencies:

```javascript
// Step C depends on both A and B
{
  id: "step-c",
  dependsOn: ["step-a", "step-b"]  // Will wait for both to complete
}
```

#### Error Handling
Robust error handling with detailed error information:

```javascript
const result = await executor.execute('workflow-id', {});
if (!result.success) {
  console.error('Workflow failed:', result.error);
  console.error('Failed step:', result.failedStep);
}
```

#### Template Filters
Rich template system with built-in filters:

```javascript
template: `
# Report Generated: {{ timestamp | date('YYYY-MM-DD HH:mm') }}
# Items Count: {{ items.length }}
# Status: {{ status | capitalize }}
# Data: {{ data | dump(2) }}
`
```

### 🧪 Testing Workflows

```javascript
import { describe, it, expect } from 'vitest';
import { WorkflowExecutor } from '@gitvan/workflow';

describe('My Workflow', () => {
  it('should execute all steps successfully', async () => {
    const executor = new WorkflowExecutor({
      graphDir: './test-workflows',
      logger: console
    });

    const result = await executor.execute('http://example.org/test-workflow', {
      testData: 'sample'
    });

    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(3);
    
    // Verify step outputs
    expect(result.steps[0].outputs.type).toBe('select');
    expect(result.steps[1].outputs.outputPath).toBe('reports/test-report.md');
    expect(result.steps[2].outputs.operation).toBe('write');
  });
});
```

### 📚 Real-World Examples

#### Data Processing Pipeline
```javascript
const dataPipeline = {
  hooks: [{ id: "data-pipeline", title: "Data Processing", pipelines: ["main"] }],
  pipelines: [{ id: "main", steps: ["fetch", "process", "report", "notify"] }],
  steps: [
    {
      id: "fetch",
      type: "http",
      config: { url: "https://api.data.com/export", method: "GET" }
    },
    {
      id: "process", 
      type: "sparql",
      config: { query: "SELECT ?item WHERE { ?item rdf:type gv:DataItem }" },
      dependsOn: ["fetch"]
    },
    {
      id: "report",
      type: "template", 
      config: { template: "# Data Report\nProcessed {{ count }} items", outputPath: "reports/data.md" },
      dependsOn: ["process"]
    },
    {
      id: "notify",
      type: "cli",
      config: { command: "echo 'Data processing complete: {{ count }} items processed'" },
      dependsOn: ["report"]
    }
  ]
};
```

#### CI/CD Automation
```javascript
const cicdWorkflow = {
  hooks: [{ id: "cicd-pipeline", title: "CI/CD Pipeline", pipelines: ["deploy"] }],
  pipelines: [{ id: "deploy", steps: ["test", "build", "deploy", "verify"] }],
  steps: [
    {
      id: "test",
      type: "cli",
      config: { command: "npm test" }
    },
    {
      id: "build",
      type: "cli", 
      config: { command: "npm run build" },
      dependsOn: ["test"]
    },
    {
      id: "deploy",
      type: "cli",
      config: { command: "docker push myapp:{{ version }}" },
      dependsOn: ["build"]
    },
    {
      id: "verify",
      type: "http",
      config: { url: "https://api.myservice.com/health", method: "GET" },
      dependsOn: ["deploy"]
    }
  ]
};
```

### 🎯 Workflow System Benefits

#### ✅ **Simplicity**
- **Pure JavaScript**: No complex RDF parsing or Turtle file management
- **Intuitive Structure**: Clear, readable workflow definitions
- **Easy Debugging**: Step-by-step execution with detailed logging

#### ✅ **Reliability**
- **Dependency Management**: Automatic execution order based on step dependencies
- **Error Handling**: Graceful failure handling with rollback capabilities
- **Context Preservation**: Full context passing between steps

#### ✅ **Extensibility**
- **Modular Step Handlers**: Easy to add new step types
- **Template System**: Rich templating with Nunjucks filters
- **API Integration**: Built-in HTTP and CLI step support

#### ✅ **Testing**
- **Built-in Testing**: Comprehensive testing utilities
- **Validation**: Workflow validation before execution
- **Mocking**: Easy mocking for testing environments

### 🚀 Use Cases

#### **Data Processing Pipelines**
- Extract data from APIs
- Process with SPARQL queries
- Generate reports with templates
- Store results in files

#### **CI/CD Automation**
- Run tests
- Build applications
- Deploy to environments
- Verify deployments

#### **Documentation Generation**
- Query project data
- Generate documentation
- Create reports
- Update websites

#### **Business Intelligence**
- Collect metrics
- Analyze data
- Generate dashboards
- Send notifications

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