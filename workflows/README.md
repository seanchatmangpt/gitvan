# Example Workflow Definitions for GitVan Turtle as Workflow Engine

This directory contains example workflow definitions that demonstrate the capabilities of the Turtle as Workflow engine.

## Workflow Structure

Workflows are defined in Turtle (.ttl) format using GitVan's ontology. Each workflow consists of:

1. **Workflow Hook**: The main workflow definition
2. **Pipeline Steps**: Individual steps that make up the workflow
3. **Dependencies**: Step dependencies and execution order
4. **Configuration**: Step-specific configuration and parameters

## Example Workflows

### 1. Data Processing Pipeline (`data-processing.ttl`)

A comprehensive data processing workflow that demonstrates:
- SPARQL queries for data analysis
- Template rendering for reports
- File operations for data transformation
- HTTP calls for external data integration

### 2. Code Generation Workflow (`code-generation.ttl`)

An automated code generation workflow that:
- Analyzes existing code structure
- Generates new code based on templates
- Validates generated code
- Commits changes to Git

### 3. Documentation Workflow (`documentation.ttl`)

A documentation generation workflow that:
- Extracts information from code
- Generates API documentation
- Creates user guides
- Publishes to external systems

### 4. Testing Workflow (`testing.ttl`)

An automated testing workflow that:
- Runs unit tests
- Generates test reports
- Validates code coverage
- Updates test documentation

## Workflow Definition Format

```turtle
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# Workflow Hook Definition
ex:data-processing-workflow rdf:type gh:Hook ;
    gv:title "Data Processing Pipeline" ;
    gh:hasPredicate ex:processData ;
    gh:orderedPipelines ex:data-pipeline .

# Pipeline Definition
ex:data-pipeline rdf:type op:Pipeline ;
    op:steps ex:load-data, ex:analyze-data, ex:generate-report, ex:save-results .

# Step Definitions
ex:load-data rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        SELECT ?data ?source WHERE {
            ?data ex:source ?source .
            ?data ex:status "pending" .
        }
    """ ;
    gv:outputMapping '{"data": "results"}' .

ex:analyze-data rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        CONSTRUCT {
            ?data ex:analysis ?analysis .
            ?data ex:status "analyzed" .
        } WHERE {
            ?data ex:source ?source .
            BIND(CONCAT("Analysis of ", ?source) AS ?analysis)
        }
    """ ;
    gv:dependsOn ex:load-data ;
    gv:outputMapping '{"analysis": "quads"}' .

ex:generate-report rdf:type gv:TemplateStep ;
    gv:text """
        # Data Processing Report
        
        ## Summary
        Processed {{ data | length }} data items.
        
        ## Analysis Results
        {% for item in analysis %}
        - {{ item.data }}: {{ item.analysis }}
        {% endfor %}
    """ ;
    gv:dependsOn ex:analyze-data ;
    gv:filePath "./reports/data-processing-report.md" .

ex:save-results rdf:type gv:FileStep ;
    gv:filePath "./output/processed-data.json" ;
    gv:operation "write" ;
    gv:content "{{ analysis | tojson }}" ;
    gv:dependsOn ex:generate-report .
```

## Usage

To run a workflow:

```bash
# List available workflows
gitvan workflow list

# Execute a specific workflow
gitvan workflow run data-processing-workflow

# Execute with inputs
gitvan workflow run data-processing-workflow --input source=./data/sample.csv

# Validate a workflow
gitvan workflow validate data-processing-workflow
```

## Step Types

### SPARQL Steps (`gv:SparqlStep`)
Execute SPARQL queries against the knowledge graph.

**Configuration:**
- `gv:text`: SPARQL query text
- `gv:outputMapping`: JSON mapping of query results to context variables

### Template Steps (`gv:TemplateStep`)
Render templates using Nunjucks templating engine.

**Configuration:**
- `gv:text`: Template content
- `gv:filePath`: Output file path
- `gv:outputMapping`: Mapping of template variables

### File Steps (`gv:FileStep`)
Perform file operations (read, write, copy, delete).

**Configuration:**
- `gv:filePath`: File path
- `gv:operation`: Operation type (read, write, copy, delete)
- `gv:content`: Content for write operations
- `gv:sourcePath`: Source path for copy operations

### HTTP Steps (`gv:HttpStep`)
Make HTTP requests to external APIs.

**Configuration:**
- `gv:httpUrl`: Request URL
- `gv:httpMethod`: HTTP method (GET, POST, PUT, DELETE)
- `gv:headers`: Request headers
- `gv:body`: Request body

### Git Steps (`gv:GitStep`)
Execute Git commands.

**Configuration:**
- `gv:gitCommand`: Git command to execute
- `gv:workingDir`: Working directory for the command

## Dependencies

Steps can depend on other steps using `gv:dependsOn`. The workflow engine will automatically:
- Resolve dependencies
- Create execution order
- Handle parallel execution where possible
- Detect circular dependencies

## Input/Output Mapping

Steps can map their inputs and outputs using JSON configuration:

```turtle
gv:inputMapping '{"variable": "context.key"}' .
gv:outputMapping '{"result": "query.results"}' .
```

This allows for flexible data flow between steps and integration with external systems.
