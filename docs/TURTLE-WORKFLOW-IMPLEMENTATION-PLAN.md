# Turtle Workflow System - Implementation File Changes

## Overview
This document lists all the file changes required to implement the definitive Turtle Workflow System based on the C4 architecture diagrams. These changes will transform the current system into a fully functional workflow engine.

## Critical File Changes Required

### 1. **Fix Integration Test Turtle File** ⚠️ **CRITICAL**

#### File: `tests/integration/all-steps-integration.ttl`
**Current Status**: ❌ **BROKEN** - Uses incorrect Turtle structure
**Required Changes**: Complete rewrite to match expected format

**Current (Incorrect) Structure**:
```turtle
ex:sparqlStep a gv:Step ;
    gv:stepType "sparql" ;
    gv:hasConfig [ ... ] .
```

**Required (Correct) Structure**:
```turtle
ex:sparqlStep rdf:type gv:SparqlStep ;
    gv:text "SELECT ?s ?p ?o WHERE { ?s ?p ?o }" ;
    gv:outputMapping '{"results": "results"}' .
```

**Complete Rewrite Needed**:
```turtle
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix op: <https://gitvan.dev/op#> .

# Integration test workflow hook
ex:AllStepsIntegrationWorkflow rdf:type gh:Hook ;
    dct:title "All Steps Integration Test" ;
    gh:hasPredicate ex:integrationTestPredicate ;
    gh:orderedPipelines ex:integrationPipeline .

# Pipeline
ex:integrationPipeline rdf:type op:Pipeline ;
    op:steps ex:sparqlStep, ex:templateStep, ex:fileStep, ex:httpStep, ex:cliStep .

# SPARQL Step
ex:sparqlStep rdf:type gv:SparqlStep ;
    gv:text """
        PREFIX ex: <http://example.org/>
        PREFIX gh: <https://gitvan.dev/graph-hook#>
        
        SELECT ?workflow ?title WHERE {
            ?workflow rdf:type gh:Hook ;
                dct:title ?title .
        }
    """ ;
    gv:outputMapping '{"workflowResults": "results"}' .

# Template Step
ex:templateStep rdf:type gv:TemplateStep ;
    gv:text """
# GitVan Integration Test Results

## Workflow: {{ workflowName }}
**Status**: {{ status }}
**Timestamp**: {{ timestamp }}

## SPARQL Query Results
{% if workflowResults %}
Found {{ workflowResults.length }} workflows:
{% for result in workflowResults %}
- **{{ result.title }}** ({{ result.workflow }})
{% endfor %}
{% else %}
No workflows found.
{% endif %}

## Test Configuration
- **Environment**: {{ env }}
- **Version**: {{ version }}
- **Test Type**: Integration Test
    """ ;
    gv:filePath "test-results/integration-report.md" ;
    gv:dependsOn ex:sparqlStep .

# File Step
ex:fileStep rdf:type gv:FileStep ;
    gv:filePath "test-results/test-data.json" ;
    gv:operation "write" ;
    gv:content """
{
  "testName": "All Steps Integration Test",
  "timestamp": "{{ timestamp }}",
  "steps": [
    {
      "name": "sparql",
      "status": "completed",
      "description": "Query workflow data"
    },
    {
      "name": "template", 
      "status": "completed",
      "description": "Generate documentation"
    },
    {
      "name": "file",
      "status": "running",
      "description": "Create test files"
    },
    {
      "name": "http",
      "status": "pending",
      "description": "Test HTTP requests"
    },
    {
      "name": "cli",
      "status": "pending", 
      "description": "Execute CLI commands"
    }
  ],
  "metadata": {
    "environment": "test",
    "version": "2.0.1",
    "testType": "integration"
  }
}
    """ ;
    gv:dependsOn ex:templateStep .

# HTTP Step
ex:httpStep rdf:type gv:HttpStep ;
    gv:httpUrl "https://httpbin.org/json" ;
    gv:httpMethod "GET" ;
    gv:dependsOn ex:fileStep .

# CLI Step
ex:cliStep rdf:type gv:CliStep ;
    gv:cliCommand "echo 'Integration test completed successfully at {{ timestamp }}'" ;
    gv:dependsOn ex:httpStep .
```

### 2. **Update WorkflowParser** ⚠️ **CRITICAL**

#### File: `src/workflow/WorkflowParser.mjs`
**Current Status**: ❌ **INCOMPLETE** - Missing step type support
**Required Changes**: Add support for HttpStep and CliStep

**Changes Needed**:

1. **Update `_extractStepType` method** (around line 132):
```javascript
// ADD these step types:
} else if (turtle.isA(stepNode, GV + "HttpStep")) {
  return "http";
} else if (turtle.isA(stepNode, GV + "CliStep")) {
  return "cli";
```

2. **Update `_extractStepConfig` method** (around line 155):
```javascript
// ADD HTTP configuration extraction:
const httpUrl = turtle.getOne(stepNode, GV + "httpUrl");
if (httpUrl) {
  config.url = httpUrl.value; // Note: use 'url' not 'httpUrl'
}

const httpMethod = turtle.getOne(stepNode, GV + "httpMethod");
if (httpMethod) {
  config.method = httpMethod.value; // Note: use 'method' not 'httpMethod'
}

// ADD CLI configuration extraction:
const cliCommand = turtle.getOne(stepNode, GV + "cliCommand");
if (cliCommand) {
  config.command = cliCommand.value; // Note: use 'command' not 'cliCommand'
}
```

3. **Update property mapping** to match step handler expectations:
```javascript
// Change these property mappings:
// FROM: gv:httpUrl -> config.httpUrl
// TO:   gv:httpUrl -> config.url

// FROM: gv:httpMethod -> config.httpMethod  
// TO:   gv:httpMethod -> config.method

// FROM: gv:cliCommand -> config.cliCommand
// TO:   gv:cliCommand -> config.command
```

### 3. **Update Step Handler Registry** ⚠️ **CRITICAL**

#### File: `src/workflow/step-handlers/step-handler-registry.mjs`
**Current Status**: ✅ **WORKING** - Already has all handlers
**Required Changes**: Verify all handlers are registered correctly

**Verify Registration** (around line 30):
```javascript
registerDefaultHandlers() {
  const handlerOptions = {
    logger: this.logger,
  };

  // Verify all handlers are registered:
  this.register("sparql", new SparqlStepHandler(handlerOptions));
  this.register("template", new TemplateStepHandler(handlerOptions));
  this.register("file", new FileStepHandler(handlerOptions));
  this.register("http", new HttpStepHandler(handlerOptions));  // ✅ Already exists
  this.register("cli", new CliStepHandler(handlerOptions));    // ✅ Already exists
}
```

### 4. **Update Integration Test Expectations** ⚠️ **CRITICAL**

#### File: `tests/integration/all-steps-integration.test.mjs`
**Current Status**: ❌ **BROKEN** - Wrong expectations
**Required Changes**: Update test expectations to match actual step output structure

**Changes Needed**:

1. **Update step result expectations** (around line 57):
```javascript
// CHANGE FROM:
expect(stepResults[0].outputs.type).toBe("select");

// CHANGE TO:
expect(stepResults[0].data.type).toBe("select");
```

2. **Update all step result checks**:
```javascript
// SPARQL Step
expect(stepResults[0].success).toBe(true);
expect(stepResults[0].data.type).toBe("select");
expect(stepResults[0].data.results).toBeDefined();

// Template Step
expect(stepResults[1].success).toBe(true);
expect(stepResults[1].data.outputPath).toBe("test-results/integration-report.md");

// File Step
expect(stepResults[2].success).toBe(true);
expect(stepResults[2].data.operation).toBe("write");
expect(stepResults[2].data.filePath).toBe("test-results/test-data.json");

// HTTP Step
expect(stepResults[3].success).toBe(true);
expect(stepResults[3].data.status).toBe(200);
expect(stepResults[3].data.responseData).toBeDefined();

// CLI Step
expect(stepResults[4].success).toBe(true);
expect(stepResults[4].data.exitCode).toBe(0);
expect(stepResults[4].data.stdout).toContain("Integration test completed successfully");
```

### 5. **Verify Step Handler Implementations** ✅ **VERIFY**

#### Files to Verify (should already be working):
- `src/workflow/step-handlers/sparql-step-handler.mjs` ✅
- `src/workflow/step-handlers/template-step-handler.mjs` ✅
- `src/workflow/step-handlers/file-step-handler.mjs` ✅
- `src/workflow/step-handlers/http-step-handler.mjs` ✅
- `src/workflow/step-handlers/cli-step-handler.mjs` ✅
- `src/workflow/step-handlers/base-step-handler.mjs` ✅

**Status**: These should already be working based on individual tests

### 6. **Clean Up Temporary Files** 🧹 **CLEANUP**

#### Files to Delete:
- `test-integration-*/` directories (temporary test directories)
- `test-sparql-*/` directories (temporary SPARQL test directories)
- `test-turtle-*/` directories (temporary Turtle test directories)
- `test-knowledge-hooks-*/` directories (temporary knowledge hooks directories)
- `test-millisecond-timers/` directory (temporary timer test directory)

**Command to clean up**:
```bash
# Remove all temporary test directories
find /Users/sac/gitvan -name "test-*" -type d -exec rm -rf {} + 2>/dev/null || true
```

## Implementation Order

### **Phase 1: Critical Fixes** (Must be done first)
1. ✅ **Fix `all-steps-integration.ttl`** - Complete rewrite with correct structure
2. ✅ **Update `WorkflowParser.mjs`** - Add HttpStep and CliStep support
3. ✅ **Update integration test expectations** - Match actual output structure

### **Phase 2: Validation** (After Phase 1)
4. ✅ **Run integration test** - Verify all components work together
5. ✅ **Fix any remaining issues** - Address test failures

### **Phase 3: Cleanup** (After Phase 2)
6. ✅ **Clean up temporary files** - Remove test artifacts
7. ✅ **Update documentation** - Reflect working system

## Expected Results After Implementation

### **Integration Test Should Pass**
```bash
pnpm test tests/integration/all-steps-integration.test.mjs
```

**Expected Output**:
```
✅ All step handlers working together successfully!
📊 Workflow executed 5 steps
📁 Generated files in test-results/
```

### **Files Created**
- `test-results/integration-report.md` - Template-generated report
- `test-results/test-data.json` - File step output

### **Step Execution Order**
1. **SPARQL Step** - Query workflow data
2. **Template Step** - Generate documentation (depends on SPARQL)
3. **File Step** - Create test data file (depends on Template)
4. **HTTP Step** - Test API call (depends on File)
5. **CLI Step** - Execute command (depends on HTTP)

## Risk Assessment

### **Low Risk Changes**
- ✅ **Step Handler Registry** - Already working
- ✅ **Step Handler Implementations** - Already tested individually
- ✅ **Cleanup** - Just removing temporary files

### **Medium Risk Changes**
- ⚠️ **WorkflowParser Updates** - Need to match step handler expectations
- ⚠️ **Integration Test Updates** - Need to match actual output structure

### **High Risk Changes**
- ⚠️ **Turtle File Rewrite** - Complete structure change, must be correct

## Success Criteria

1. ✅ **Integration test passes** - All 5 steps execute successfully
2. ✅ **Files are created** - Template and file steps produce outputs
3. ✅ **Data flows correctly** - SPARQL results flow to template step
4. ✅ **Dependencies work** - Steps execute in correct order
5. ✅ **Error handling works** - Graceful failure if any step fails

## Rollback Plan

If implementation fails:
1. **Revert Turtle file** - Restore original `all-steps-integration.ttl`
2. **Revert WorkflowParser** - Restore original `WorkflowParser.mjs`
3. **Revert test file** - Restore original integration test
4. **Run individual tests** - Verify step handlers still work individually

This implementation plan will transform the Turtle Workflow System into a fully functional workflow engine that can execute complex multi-step workflows defined in Turtle files.
