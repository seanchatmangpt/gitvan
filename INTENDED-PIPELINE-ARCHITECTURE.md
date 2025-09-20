# GitVan RDF → Zod → Ollama Pipeline: Intended Architecture

## 🎯 **What This Pipeline Is Supposed To Do**

### **Core Purpose**
Transform natural language descriptions into structured, type-safe workflow definitions using AI-powered semantic processing.

### **Intended Flow**

```
Natural Language Description
    ↓
"Create a data processing workflow with SPARQL queries and templates"
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    RDF Generation Layer                    │
│  useOllamaRDF.generateOntology()                          │
│  ↓                                                         │
│  OllamaRDF.generateOntology()                             │
│  ↓                                                         │
│  Vercel AI SDK + Ollama                                    │
│  ↓                                                         │
│  Turtle RDF Ontology                                      │
│  @prefix ex: <http://example.org/> .                      │
│  ex:Workflow rdf:type owl:Class ;                         │
│      rdfs:label "Data Processing Workflow" ;              │
│      ex:hasStep ex:SPARQLStep, ex:TemplateStep .          │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Zod Schema Layer                        │
│  useOllamaRDF.generateZodSchemaFromOntology()            │
│  ↓                                                         │
│  OllamaRDF.generateZodSchemaFromOntology()               │
│  ↓                                                         │
│  Vercel AI SDK + Ollama                                    │
│  ↓                                                         │
│  TypeScript Zod Schema                                     │
│  const WorkflowSchema = z.object({                         │
│    id: z.string(),                                         │
│    steps: z.array(z.object({                               │
│      type: z.enum(['sparql', 'template']),                │
│      config: z.record(z.any())                             │
│    }))                                                     │
│  });                                                       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Generation Layer                   │
│  useOllamaRDF.generateRDFFromDescription()               │
│  ↓                                                         │
│  OllamaRDF.generateRDFFromDescription()                  │
│  ↓                                                         │
│  Vercel AI SDK + Ollama                                    │
│  ↓                                                         │
│  Concrete RDF Data                                         │
│  ex:my-workflow rdf:type ex:Workflow ;                    │
│      ex:hasStep ex:step1, ex:step2 .                      │
│  ex:step1 rdf:type ex:SPARQLStep ;                        │
│      ex:query "SELECT ?item WHERE { ?item rdf:type ex:Item }" . │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Validation Layer                       │
│  useOllamaRDF.validateRDFData()                          │
│  ↓                                                         │
│  OllamaRDF.validateRDFData()                             │
│  ↓                                                         │
│  Vercel AI SDK + Ollama                                    │
│  ↓                                                         │
│  Validation Result                                          │
│  {                                                         │
│    isValid: true,                                          │
│    score: 95,                                              │
│    issues: []                                              │
│  }                                                         │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│                    Integration Layer                      │
│  WorkflowEngine.loadTurtleFile()                         │
│  ↓                                                         │
│  useGraph.parseWorkflow()                                 │
│  ↓                                                         │
│  StepRunner.executeWorkflow()                             │
│  ↓                                                         │
│  Executable Workflow                                       │
│  - SPARQL queries executed                                │
│  - Templates rendered                                      │
│  - Files processed                                         │
│  - HTTP calls made                                         │
│  - CLI commands run                                        │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 **Complete Intended Workflow**

### **1. Natural Language → RDF Ontology**
- **Input**: "Create a data processing workflow"
- **Process**: AI generates semantic ontology with classes, properties, constraints
- **Output**: Turtle RDF ontology defining workflow structure

### **2. RDF Ontology → Zod Schema**
- **Input**: RDF ontology from step 1
- **Process**: AI converts RDF structure to TypeScript Zod schema
- **Output**: Type-safe schema for validation and code generation

### **3. Description → Concrete RDF Data**
- **Input**: Natural language description + ontology
- **Process**: AI generates specific workflow instances
- **Output**: Concrete RDF data representing actual workflow

### **4. RDF Data → Validation**
- **Input**: Generated RDF data + ontology
- **Process**: AI validates data against ontology
- **Output**: Validation score and issue report

### **5. RDF Data → Executable Workflow**
- **Input**: Validated RDF data
- **Process**: WorkflowEngine parses and executes
- **Output**: Running workflow with real results

## 🎯 **Key Benefits of This Architecture**

1. **Semantic Understanding**: RDF provides rich semantic modeling
2. **Type Safety**: Zod schemas ensure runtime type safety
3. **AI-Powered**: Ollama generates complex structures from natural language
4. **Validation**: Multi-layer validation ensures correctness
5. **Integration**: Seamless connection to GitVan's execution engine
6. **Extensibility**: Easy to add new step types and workflow patterns

## 🚀 **Intended Use Cases**

- **Workflow Generation**: "Create a CI/CD pipeline for Node.js projects"
- **Data Processing**: "Build an ETL workflow for customer data"
- **Automation**: "Generate a deployment workflow with rollback"
- **Integration**: "Create a workflow that processes webhooks and sends notifications"

This is the **intended** architecture - a complete AI-powered workflow generation system that bridges natural language, semantic modeling, type safety, and execution.
