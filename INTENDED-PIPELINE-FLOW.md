# GitVan RDF → Zod → Ollama Pipeline: Intended Architecture

## 🎯 **The Intended Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT LAYER                              │
│  Natural Language Description                              │
│  "Create a data processing workflow with SPARQL and templates" │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                    RDF GENERATION LAYER                   │
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
│                    ZOD SCHEMA LAYER                       │
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
│                    DATA GENERATION LAYER                 │
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
│                    VALIDATION LAYER                       │
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
│                    EXECUTION LAYER                        │
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

## 🔄 **Intended Benefits**

1. **Semantic Understanding**: RDF provides rich semantic modeling
2. **Type Safety**: Zod schemas ensure runtime type safety  
3. **AI-Powered**: Ollama generates complex structures from natural language
4. **Validation**: Multi-layer validation ensures correctness
5. **Integration**: Seamless connection to GitVan's execution engine
6. **Extensibility**: Easy to add new step types and workflow patterns

## 🎯 **Intended Use Cases**

- **Workflow Generation**: "Create a CI/CD pipeline for Node.js projects"
- **Data Processing**: "Build an ETL workflow for customer data"  
- **Automation**: "Generate a deployment workflow with rollback"
- **Integration**: "Create a workflow that processes webhooks and sends notifications"

## 🚀 **The Vision**

This pipeline is intended to be a **complete AI-powered workflow generation system** that bridges:
- Natural language descriptions
- Semantic RDF modeling
- Type-safe schema generation
- Concrete workflow instantiation
- Validation and quality assurance
- Executable workflow execution

The goal is to make workflow creation as simple as describing what you want in natural language, while maintaining the power and flexibility of semantic modeling and type safety.

