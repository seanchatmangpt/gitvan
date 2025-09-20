# GitVan v3.0: Turtle → JavaScript Object Conversion Architecture

## 🎯 **The Correct Architecture**

The WorkflowEngine correctly implements the **Turtle → JavaScript Object** conversion pattern:

### **1. Turtle File Definition**
```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix op: <https://gitvan.dev/op#> .

ex:my-workflow rdf:type gv:Hook ;
    gv:title "Data Processing Workflow" ;
    op:steps ex:my-pipeline .

ex:my-pipeline rdf:type op:Pipeline ;
    op:steps ex:step1, ex:step2 .

ex:step1 rdf:type gv:SparqlStep ;
    gv:text "SELECT ?item WHERE { ?item rdf:type ex:Item }" ;
    gv:outputMapping '{"items": "results"}' .

ex:step2 rdf:type gv:TemplateStep ;
    gv:text "Hello {{ name }}" ;
    gv:outputPath "./output.txt" .
```

### **2. SPARQL Query to Extract Data**
```sparql
PREFIX op: <https://gitvan.dev/op#>
PREFIX gv: <https://gitvan.dev/ontology#>
SELECT ?step ?stepType ?configProp ?configValue WHERE {
  <ex:my-pipeline> op:steps ?step .
  ?step a ?stepType .
  OPTIONAL {
    ?step ?configProp ?configValue .
    FILTER(?configProp != rdf:type)
  }
}
```

### **3. JavaScript Object Conversion**
```javascript
// Turtle data is converted to JavaScript objects:
const steps = [
  {
    id: "http://example.org/step1",
    type: "sparql",  // Extracted from gv:SparqlStep
    config: {
      query: "SELECT ?item WHERE { ?item rdf:type ex:Item }",  // gv:text → query
      outputMapping: '{"items": "results"}'  // gv:outputMapping → outputMapping
    }
  },
  {
    id: "http://example.org/step2", 
    type: "template",  // Extracted from gv:TemplateStep
    config: {
      template: "Hello {{ name }}",  // gv:text → template
      outputPath: "./output.txt"    // gv:outputPath → outputPath
    }
  }
];
```

## 🔄 **The Conversion Process**

### **Step 1: Load Turtle Files**
```javascript
// WorkflowEngine.initialize()
const store = new N3.Store();
const parser = new N3.Parser();
for (const file of files) {
  store.addQuads(parser.parse(file.content));
}
this.graph = await useGraph(store);
```

### **Step 2: Query with SPARQL**
```javascript
// WorkflowEngine._parseWorkflowSteps()
const query = `SELECT ?step ?stepType ?configProp ?configValue WHERE {
  <${pipelineId}> op:steps ?step .
  ?step a ?stepType .
  OPTIONAL {
    ?step ?configProp ?configValue .
    FILTER(?configProp != rdf:type)
  }
}`;
const results = await this.graph.query(query);
```

### **Step 3: Convert to JavaScript Objects**
```javascript
// Group results by step and convert to JavaScript objects
const stepMap = new Map();
for (const result of results.results) {
  const stepId = result.step.value;
  const stepType = result.stepType.value;
  
  // Extract type: gv:SparqlStep → "sparql"
  let type = stepType.split("#")[1].replace("Step", "").toLowerCase();
  
  // Map properties: gv:text → "query" for sparql steps
  const mappedProp = this._mapPropertyName(prop, type);
  stepMap.get(stepId).config[mappedProp] = value;
}
```

### **Step 4: Execute JavaScript Objects**
```javascript
// Execute each step using the JavaScript object
for (const step of steps) {
  const result = await this.stepRunner.executeStep(
    step,        // JavaScript object
    this.contextManager,
    this.graph,
    null,
    {}
  );
}
```

## 🎯 **Property Mapping System**

The `_mapPropertyName` method handles Turtle → JavaScript property conversion:

```javascript
_mapPropertyName(turtleProp, stepType) {
  const mappings = {
    sparql: {
      text: "query",           // gv:text → query
      outputMapping: "outputMapping"
    },
    template: {
      text: "template",        // gv:text → template  
      outputPath: "outputPath"
    },
    file: {
      filePath: "filePath",
      operation: "operation"
    },
    http: {
      httpUrl: "url",          // gv:httpUrl → url
      httpMethod: "method",    // gv:httpMethod → method
      headers: "headers",
      body: "body"
    },
    cli: {
      command: "command"
    }
  };
  return mappings[stepType]?.[turtleProp] || turtleProp;
}
```

## ✅ **Why This Architecture Works**

1. **Turtle-First**: All workflows defined in semantic Turtle files
2. **SPARQL Queries**: Extract structured data from RDF graphs
3. **JavaScript Objects**: Convert to executable step configurations
4. **Property Mapping**: Handle different naming conventions
5. **Type Safety**: Validate step types and configurations
6. **Execution**: Run steps using JavaScript objects

This is exactly the **Turtle → JavaScript Object** conversion pattern you described! The WorkflowEngine correctly loads Turtle files, queries them with SPARQL, and converts the results to JavaScript objects for execution.

