# Turtle Workflow System - Document Review

## Overview
This document provides a comprehensive review of all Turtle workflow files created in the GitVan project, analyzing their structure, patterns, and identifying what needs to be done to make the workflow system fully functional.

## Current Turtle Workflow Files Analysis

### 1. Test Data Files (`tests/turtle-test-data/`)

#### `test1.ttl` - Basic Hook Structure
```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix op: <https://gitvan.dev/op#> .

<https://example.org/hook1> a gh:Hook ;
    dct:title "Test Hook" ;
    gh:hasPredicate <https://example.org/predicate1> ;
    gh:orderedPipelines _:pipelineList1 .
```

**Key Patterns:**
- Uses `gh:Hook` as the main workflow entity
- Defines `gh:hasPredicate` for trigger conditions
- Uses `gh:orderedPipelines` with RDF lists
- Defines `op:Pipeline` with `op:steps`
- Uses `gv:Step` types for individual steps

#### `test2.ttl` - Minimal Hook
```turtle
<https://example.org/hook2> a gh:Hook ;
    gh:hasPredicate <https://example.org/predicate2> .
```

**Issues Identified:**
- Missing pipeline definition
- No steps defined
- Incomplete workflow structure

### 2. Integration Test Files

#### `tests/integration/all-steps-integration.ttl` - Comprehensive Integration Test
```turtle
ex:AllStepsIntegrationWorkflow a gh:Hook ;
    dct:title "All Steps Integration Test" ;
    gh:hasPredicate ex:integrationTestPredicate ;
    gh:orderedPipelines _:pipelineList1 .
```

**Structure Analysis:**
- ✅ Proper hook definition with `gh:Hook`
- ✅ Pipeline structure with RDF lists
- ✅ Step definitions for all handler types
- ❌ **CRITICAL ISSUE**: Uses `gv:Step` instead of specific step types
- ❌ **CRITICAL ISSUE**: Uses `gv:stepType` property instead of RDF type
- ❌ **CRITICAL ISSUE**: Uses `gv:hasConfig` instead of direct properties

### 3. Existing Working Examples

#### From `tests/turtle-workflow-system.test.mjs`:
```turtle
ex:simple-workflow rdf:type gh:Hook ;
    gv:title "Simple Test Workflow" ;
    gh:hasPredicate ex:simple-predicate ;
    gh:orderedPipelines ex:simple-pipeline .

ex:simple-pipeline rdf:type op:Pipeline ;
    op:steps ex:read-step, ex:process-step, ex:write-step .

ex:read-step rdf:type gv:FileStep ;
    gv:filePath "data/input.json" ;
    gv:operation "read" .
```

**Correct Patterns:**
- ✅ Uses `rdf:type` instead of `a`
- ✅ Uses specific step types: `gv:FileStep`, `gv:TemplateStep`, `gv:SparqlStep`
- ✅ Uses direct properties: `gv:filePath`, `gv:operation`, `gv:text`
- ✅ Uses `op:steps` with comma-separated list

## Critical Issues Identified

### 1. Step Type Definition Mismatch

**Current (Incorrect):**
```turtle
ex:sparqlStep a gv:Step ;
    gv:stepType "sparql" .
```

**Should Be:**
```turtle
ex:sparqlStep rdf:type gv:SparqlStep .
```

### 2. Configuration Structure Mismatch

**Current (Incorrect):**
```turtle
gv:hasConfig [
    gv:query "SELECT ?s ?p ?o WHERE { ?s ?p ?o }"
] .
```

**Should Be:**
```turtle
gv:text "SELECT ?s ?p ?o WHERE { ?s ?p ?o }" .
```

### 3. Property Names Mismatch

**Current (Incorrect):**
```turtle
gv:outputPath "test-results/integration-report.md"
```

**Should Be:**
```turtle
gv:filePath "test-results/integration-report.md"
```

### 4. Missing Step Types

The WorkflowParser expects these step types:
- `gv:SparqlStep` ✅
- `gv:TemplateStep` ✅  
- `gv:FileStep` ✅
- `gv:HttpStep` ❌ (Missing)
- `gv:GitStep` ❌ (Missing)
- `gv:CliStep` ❌ (Missing - we created CliStepHandler but no Turtle type)

## Required Actions

### 1. Fix Integration Test Turtle File

The `all-steps-integration.ttl` needs to be completely rewritten to match the expected structure:

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
        SELECT ?workflow ?label WHERE {
            ?workflow rdf:type gh:Hook ;
                dct:title ?label .
        }
    """ ;
    gv:outputMapping '{"workflowResults": "results"}' .

# Template Step  
ex:templateStep rdf:type gv:TemplateStep ;
    gv:text """
# GitVan Integration Test Results
## Workflow: {{ workflowName }}
**Status**: {{ status }}
""" ;
    gv:filePath "test-results/integration-report.md" ;
    gv:dependsOn ex:sparqlStep .

# File Step
ex:fileStep rdf:type gv:FileStep ;
    gv:filePath "test-results/test-data.json" ;
    gv:operation "write" ;
    gv:content '{"testName": "All Steps Integration Test"}' ;
    gv:dependsOn ex:templateStep .

# HTTP Step
ex:httpStep rdf:type gv:HttpStep ;
    gv:httpUrl "https://httpbin.org/json" ;
    gv:httpMethod "GET" ;
    gv:dependsOn ex:fileStep .

# CLI Step (Need to define gv:CliStep type)
ex:cliStep rdf:type gv:CliStep ;
    gv:cliCommand "echo 'Integration test completed'" ;
    gv:dependsOn ex:httpStep .
```

### 2. Extend WorkflowParser

The WorkflowParser needs to be updated to handle:
- `gv:HttpStep` type
- `gv:CliStep` type  
- HTTP-specific properties: `gv:httpUrl`, `gv:httpMethod`
- CLI-specific properties: `gv:cliCommand`

### 3. Update Step Handler Registry

The StepHandlerRegistry needs to map the new Turtle step types:
- `gv:HttpStep` → `HttpStepHandler`
- `gv:CliStep` → `CliStepHandler`

### 4. Test Environment Integration

The integration test needs to:
- Use the correct Turtle structure
- Handle the MemFS/Native filesystem split properly
- Verify that all step handlers work together
- Check that files are created in the test environment

## Current Status Summary

### ✅ What Works
- Basic hook structure parsing
- SPARQL step execution
- Template step execution  
- File step execution
- Step handler architecture
- Test environment setup

### ❌ What's Broken
- Integration test Turtle file structure
- Missing step type definitions in Turtle
- Incorrect property names in Turtle
- WorkflowParser doesn't handle all step types
- Test expectations don't match actual step output structure

### 🔧 What Needs to Be Done
1. **Fix the integration test Turtle file** to use correct structure
2. **Update WorkflowParser** to handle HttpStep and CliStep
3. **Run the integration test** to verify all step handlers work together
4. **Clean up temporary test files** created during development

## Next Steps

1. **Immediate**: Fix `all-steps-integration.ttl` with correct Turtle structure
2. **Short-term**: Update WorkflowParser to handle missing step types
3. **Medium-term**: Run integration test and fix any remaining issues
4. **Long-term**: Create comprehensive Turtle workflow examples for documentation

The core architecture is sound, but the Turtle file structure needs to be corrected to match what the WorkflowParser expects.
