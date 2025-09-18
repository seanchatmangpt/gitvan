# GitVan Internal Default Graph Architecture

## 🎯 **Architecture Overview**

GitVan's internal default graph architecture integrates the **useGraph** composable as a core component, providing a comprehensive graph-based data processing system that powers AI template loops, pack management, marketplace operations, and daemon functionality.

## 🏗️ **Core Components**

### **1. GitVan Graph Registry**
- **Purpose**: Manages all graph instances and their lifecycle
- **Features**: 
  - Graph registration and retrieval
  - Metadata tracking
  - Dependency management
  - Snapshot coordination
- **Location**: `src/core/graph-architecture.mjs`

### **2. GitVan Graph Manager**
- **Purpose**: High-level graph operations and management
- **Features**:
  - Default graph initialization
  - Custom graph creation
  - Graph-based job execution
  - Lifecycle management
- **Default Graphs**:
  - `project` - Project metadata and structure
  - `jobs` - Job execution and results
  - `packs` - Pack metadata and dependencies
  - `ai` - AI template loop data and learning
  - `marketplace` - Marketplace data and metrics

### **3. GitVan AI Graph Loop**
- **Purpose**: Integrates useGraph with AI template learning and generation
- **Features**:
  - Template learning system integration
  - Prompt evolution engine
  - Context-aware AI generation
  - Enhanced template processing
- **Integration**: Works with AI Template Loop Enhancement system

### **4. GitVan Graph Pack System**
- **Purpose**: Manages packs using graph-based metadata and dependencies
- **Features**:
  - Pack registration and tracking
  - Dependency analysis
  - Compatibility checking
  - Graph-based pack queries

### **5. GitVan Graph Marketplace**
- **Purpose**: Manages marketplace data using graph-based queries and analytics
- **Features**:
  - Marketplace data indexing
  - Graph-based search
  - Analytics generation
  - Performance metrics

### **6. GitVan Graph Daemon**
- **Purpose**: Integrates graph system with GitVan daemon
- **Features**:
  - Git event processing
  - Graph-based job execution
  - Event tracking and analysis
  - Real-time graph updates

## 🔄 **Data Flow Architecture**

```
Git Events → Graph Daemon → Graph Registry → Graph Manager
     ↓
Graph-Based Jobs → AI Graph Loop → Enhanced Templates
     ↓
Pack System → Marketplace → Analytics & Reports
     ↓
Graph Snapshots → Commit-Scoped Storage → Audit Trail
```

## 📊 **Default Graph Schema**

### **Project Graph** (`https://gitvan.dev/project/`)
```turtle
@prefix gv: <https://gitvan.dev/project/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gv:GitEvent rdf:type rdfs:Class .
gv:ProjectAnalysis rdf:type rdfs:Class .

gv:eventType rdf:type rdf:Property .
gv:sha rdf:type rdf:Property .
gv:message rdf:type rdf:Property .
gv:author rdf:type rdf:Property .
gv:timestamp rdf:type rdf:Property .
gv:files rdf:type rdf:Property .
```

### **Jobs Graph** (`https://gitvan.dev/jobs/`)
```turtle
@prefix gv: <https://gitvan.dev/jobs/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gv:Job rdf:type rdfs:Class .
gv:JobExecution rdf:type rdfs:Class .

gv:jobId rdf:type rdf:Property .
gv:status rdf:type rdf:Property .
gv:createdAt rdf:type rdf:Property .
gv:completedAt rdf:type rdf:Property .
gv:result rdf:type rdf:Property .
gv:error rdf:type rdf:Property .
```

### **Packs Graph** (`https://gitvan.dev/packs/`)
```turtle
@prefix gv: <https://gitvan.dev/packs/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gv:Pack rdf:type rdfs:Class .
gv:PackDependency rdf:type rdfs:Class .

gv:packId rdf:type rdf:Property .
gv:name rdf:type rdf:Property .
gv:version rdf:type rdf:Property .
gv:description rdf:type rdf:Property .
gv:dependencies rdf:type rdf:Property .
gv:jobs rdf:type rdf:Property .
```

### **AI Graph** (`https://gitvan.dev/ai/`)
```turtle
@prefix gv: <https://gitvan.dev/ai/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

gv:Template rdf:type rdfs:Class .
gv:AILearning rdf:type rdfs:Class .
gv:PromptEvolution rdf:type rdfs:Class .

gv:templateId rdf:type rdf:Property .
gv:content rdf:type rdf:Property .
gv:context rdf:type rdf:Property .
gv:processedAt rdf:type rdf:Property .
gv:aiEnhanced rdf:type rdf:Property .
```

### **Marketplace Graph** (`https://gitvan.dev/marketplace/`)
```turtle
@prefix gv: <https://gitvan.dev/marketplace/> .
@prefix rdf: <http://www.w3.org/1999/02/22/rdf-syntax-ns#> .

gv:MarketplaceItem rdf:type rdfs:Class .
gv:MarketplaceAnalytics rdf:type rdfs:Class .

gv:itemId rdf:type rdf:Property .
gv:name rdf:type rdf:Property .
gv:type rdf:type rdf:Property .
gv:category rdf:type rdf:Property .
gv:downloads rdf:type rdf:Property .
gv:rating rdf:type rdf:Property .
```

## 🚀 **Graph-Based Jobs**

### **Available Jobs**
- `project:analysis` - Analyze project structure using graph queries
- `ai:template-processing` - Process templates with AI enhancement
- `pack:dependency-analysis` - Analyze pack dependencies
- `marketplace:index` - Index marketplace data
- `graph:analytics` - Generate analytics from graph data
- `graph:report-generation` - Generate reports using templates
- `graph:data-migration` - Migrate data between graphs

### **Job Execution Flow**
1. **Job Registration**: Job registered in jobs graph
2. **Event Trigger**: Git event triggers job execution
3. **Graph Context**: Job receives graph context
4. **Data Processing**: Job processes data using graph queries
5. **Result Storage**: Results stored in appropriate graph
6. **Snapshot Creation**: Commit-scoped snapshot created

## 🔧 **CLI Interface**

### **Graph Commands**
```bash
# Status & Management
gitvan graph status                    # Show graph architecture status
gitvan graph query <graphId> <query>   # Execute SPARQL query
gitvan graph add <graphId> <data>      # Add data to graph
gitvan graph snapshot <graphId>       # Create snapshot

# Templates & Analytics
gitvan graph template <graphId> <path> # Render template
gitvan graph analytics <graphId>       # Generate analytics

# Jobs & AI
gitvan graph job <jobName>             # Run graph-based job
gitvan graph ai <templateId> <data>    # Process AI template

# Packs & Marketplace
gitvan graph pack register <id> <data> # Register pack
gitvan graph pack analyze <id>         # Analyze pack
gitvan graph marketplace search <q>   # Search marketplace
gitvan graph marketplace index <data> # Index marketplace

# Daemon
gitvan graph daemon start              # Start graph daemon
gitvan graph daemon process <event>    # Process Git event
```

## 📸 **Snapshot Architecture**

### **Snapshot Structure**
```
.gitvan/graphs/
├── project/snapshots/
│   ├── graph/<sha>/data/
│   ├── graph/<sha>/shapes/
│   ├── query/<sha>/result.json
│   ├── reports/<sha>/report.md
│   └── receipts/<sha>/project.json
├── jobs/snapshots/
├── packs/snapshots/
├── ai/snapshots/
└── marketplace/snapshots/
```

### **Commit-Scoped Snapshots**
- Each graph operation creates commit-scoped snapshots
- Snapshots tied to Git commit SHA
- Complete audit trail for all operations
- Receipt system for tracking dependencies

## 🤖 **AI Integration**

### **AI Template Loop Enhancement**
- **Template Learning**: Tracks execution patterns and learns from success/failure
- **Prompt Evolution**: Evolves AI prompts based on execution results
- **Context-Aware Generation**: Generates templates with rich project context
- **Continuous Optimization**: Continuously improves templates based on metrics

### **AI Graph Processing**
- AI-generated templates stored in AI graph
- Learning data tracked and analyzed
- Prompt evolution based on graph queries
- Enhanced template generation using graph context

## 📦 **Pack System Integration**

### **Graph-Based Pack Management**
- Pack metadata stored in packs graph
- Dependency analysis using graph queries
- Compatibility checking through graph traversal
- Pack lifecycle tracking

### **Pack Operations**
- **Registration**: Pack registered with graph metadata
- **Dependency Analysis**: Graph queries analyze dependencies
- **Compatibility Check**: Graph traversal checks compatibility
- **Lifecycle Tracking**: Complete pack lifecycle in graph

## 🏪 **Marketplace Integration**

### **Graph-Based Marketplace**
- Marketplace data indexed in graph
- Search using SPARQL queries
- Analytics generated from graph data
- Performance metrics tracked

### **Marketplace Operations**
- **Indexing**: Data indexed using graph storage
- **Search**: SPARQL-based search functionality
- **Analytics**: Graph-based analytics generation
- **Metrics**: Performance metrics tracked

## 🔄 **Daemon Integration**

### **Graph-Based Event Processing**
- Git events processed through graph system
- Event data stored in project graph
- Job execution based on graph queries
- Real-time graph updates

### **Event Processing Flow**
1. **Git Event**: Event received by daemon
2. **Graph Storage**: Event stored in project graph
3. **Job Discovery**: Relevant jobs found using graph queries
4. **Job Execution**: Jobs executed with graph context
5. **Result Storage**: Results stored in appropriate graph
6. **Snapshot**: Commit-scoped snapshot created

## 🎯 **Benefits of Graph Architecture**

### **1. Unified Data Model**
- All GitVan data stored in consistent RDF format
- Cross-system data relationships easily expressed
- Unified query language (SPARQL) for all data

### **2. Enhanced AI Integration**
- AI learning data stored in graph
- Template evolution based on graph analysis
- Context-aware generation using graph queries

### **3. Improved Analytics**
- Graph-based analytics and reporting
- Cross-system metrics and insights
- Real-time data analysis

### **4. Better Pack Management**
- Dependency analysis through graph traversal
- Compatibility checking using graph queries
- Pack lifecycle tracking

### **5. Scalable Architecture**
- Graph-based scaling
- Efficient data storage and retrieval
- Optimized query performance

## 🚀 **Getting Started**

### **1. Initialize Graph Architecture**
```javascript
import { GitVanGraphArchitecture } from './src/core/graph-architecture.mjs'

const graphArch = new GitVanGraphArchitecture()
await graphArch.initialize()
```

### **2. Use Graph-Based Jobs**
```javascript
import { graphJobs } from './src/jobs/graph-based-jobs.mjs'

// Run project analysis job
const result = await graphJobs.projectAnalysis.run({
  inputs: { files: ['src/**/*.mjs'] }
})
```

### **3. Process AI Templates**
```javascript
const result = await graphArch.processAITemplate(
  'template-id',
  { content: 'template content' },
  { context: 'additional context' }
)
```

### **4. Query Graph Data**
```javascript
const graph = await graphArch.graphManager.registry.getGraph('project')
await graph.setQuery('SELECT ?event WHERE { ?event rdf:type gv:GitEvent }')
const events = await graph.select()
```

## 📋 **Architecture Summary**

The GitVan Internal Default Graph Architecture provides:

- **Unified Data Model**: All data stored in RDF format
- **Graph-Based Processing**: SPARQL queries for all operations
- **AI Integration**: Enhanced template processing with learning
- **Pack Management**: Graph-based dependency analysis
- **Marketplace**: Graph-based search and analytics
- **Daemon Integration**: Graph-based event processing
- **CLI Interface**: Comprehensive graph management commands
- **Snapshot System**: Commit-scoped audit trail

This architecture transforms GitVan into a powerful graph-based development automation platform, providing sophisticated data processing capabilities while maintaining the simplicity and power of the original GitVan vision.



