# GitVan SHACL Configuration Guide

## Overview

This guide explains how to use SHACL (Shapes Constraint Language) shapes to validate GitVan configurations. GitVan uses RDF and SHACL for declarative configuration management, enabling semantic validation, extensibility, and integration with the broader linked data ecosystem.

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Configuration Structure](#configuration-structure)
5. [Validation Rules](#validation-rules)
6. [Using SHACL Validation](#using-shacl-validation)
7. [Common Validation Patterns](#common-validation-patterns)
8. [Extending Shapes](#extending-shapes)
9. [SPARQL Constraints](#sparql-constraints)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

## Introduction

GitVan stores configuration in Turtle format (RDF/Turtle) and validates it using SHACL shapes. This approach provides:

- **Declarative validation**: Describe constraints in RDF, not code
- **Extensibility**: Add new configuration options without changing validation code
- **Semantic richness**: Use standard ontologies and namespaces
- **Integration**: Query and reason about configurations using SPARQL
- **Graph-native**: Configuration is versioned in Git as RDF graphs
- **Automation**: SHACL violations can trigger automated remediation

## Architecture

### Files

- **config-ontology.ttl**: Complete ontology and SHACL shapes for all configuration options
- **example-valid-config.ttl**: Examples of valid configurations
- **example-invalid-config.ttl**: Examples of invalid configurations (for testing)
- **SHACL_CONFIG_GUIDE.md**: This documentation file

### Namespaces

The configuration ontology uses standard namespaces:

```
@prefix gvc: <https://gitvan.dev/ontology/config#>
@prefix sh:  <http://www.w3.org/ns/shacl#>
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>
@prefix dct: <http://purl.org/dc/terms#>
```

## Core Concepts

### SHACL Fundamentals

SHACL validates RDF graphs using shapes. A shape is defined with `sh:NodeShape` and contains:

- **sh:targetClass**: RDF type(s) to validate
- **sh:property**: Property shapes for each property to validate

### Property Shapes

Each property shape defines constraints for a single property:

```turtle
gvc:JobsDirPropertyShape a sh:PropertyShape ;
    sh:path gvc:jobsDir ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:message "Jobs directory must be a non-empty string" .
```

### Key Constraint Types

| Constraint | Purpose | Example |
|-----------|---------|---------|
| sh:datatype | Specify data type | xsd:string, xsd:integer, xsd:boolean |
| sh:minCount | Minimum occurrences | 1 (required) |
| sh:maxCount | Maximum occurrences | 1 (single-valued) |
| sh:minInclusive | Minimum numeric value | 0, 100 |
| sh:maxInclusive | Maximum numeric value | 100, 360000 |
| sh:in | Enumeration values | ("value1" "value2" "value3") |
| sh:pattern | Regular expression | "^refs/" |
| sh:class | Expected RDF type | gvc:JobsConfig |
| sh:message | Custom error message | "Custom validation error" |

## Configuration Structure

### Root Configuration

The root configuration object contains all configuration sections:

```turtle
ex:config a gvc:Configuration ;
    gvc:hasRootDir "/path/to/project" ;
    gvc:hasJobsConfig ex:jobs ;
    gvc:hasTemplateConfig ex:templates ;
    gvc:hasReceiptConfig ex:receipts ;
    gvc:hasLockConfig ex:locks ;
    gvc:hasAIConfig ex:ai ;
    gvc:hasRuntimeConfig ex:runtime ;
    gvc:hasHooksConfig ex:hooks ;
    gvc:hasDaemonConfig ex:daemon ;
    gvc:hasEventsConfig ex:events ;
    gvc:hasGraphConfig ex:graph .
```

### Configuration Sections

#### Jobs Configuration

Defines job discovery and loading behavior:

```turtle
ex:jobs a gvc:JobsConfig ;
    gvc:jobsDir "jobs" ;
    gvc:jobScanPatterns (
        "jobs/**/*.mjs"
        "jobs/**/*.cron.mjs"
    ) ;
    gvc:jobIgnorePatterns (
        "node_modules/**"
        ".git/**"
    ) .
```

**Validations**:
- `jobsDir`: Required string
- `jobScanPatterns`: Required, at least one pattern
- `jobIgnorePatterns`: Optional, glob patterns

#### Template Configuration

Configures the Nunjucks template engine:

```turtle
ex:templates a gvc:TemplateConfig ;
    gvc:templateEngine "nunjucks" ;
    gvc:templateDirs ( "templates" ) ;
    gvc:templateAutoescape false ;
    gvc:templateNoCache false ;
    gvc:templateFilters ( "inflection" "json" "slug" ) .
```

**Validations**:
- `templateEngine`: Required, must be one of: "nunjucks", "handlebars", "ejs"
- `templateDirs`: Required, at least one directory
- `templateAutoescape`: Required boolean
- `templateNoCache`: Required boolean
- `templateFilters`: Optional list of filter names

#### Receipt Configuration

Configures execution receipt storage:

```turtle
ex:receipts a gvc:ReceiptConfig ;
    gvc:receiptRef "refs/notes/gitvan/results" ;
    gvc:receiptEnabled true ;
    gvc:receiptCompress false .
```

**Validations**:
- `receiptRef`: Required, must match pattern `^refs/`
- `receiptEnabled`: Required boolean
- `receiptCompress`: Required boolean

#### Lock Configuration

Configures distributed locking:

```turtle
ex:locks a gvc:LockConfig ;
    gvc:lockRef "refs/gitvan/locks" ;
    gvc:lockTimeout 30000 ;
    gvc:lockRetries 3 .
```

**Validations**:
- `lockRef`: Required, must match pattern `^refs/`
- `lockTimeout`: Required integer, 1-300000 ms (5 minutes max)
- `lockRetries`: Required integer, 0-100 retries

#### AI Configuration

Configures AI provider integration:

```turtle
ex:ai a gvc:AIConfig ;
    gvc:aiProvider "ollama" ;
    gvc:aiModel "qwen3-coder:30b" ;
    gvc:aiBaseUrl "http://localhost:11434" ;
    gvc:aiTemperature 0.7 ;
    gvc:aiMaxTokens 4096 ;
    gvc:aiTopP 0.8 ;
    gvc:aiTopK 20 ;
    gvc:aiRepeatPenalty 1.05 .
```

**Validations**:
- `aiProvider`: Required, one of: "ollama", "anthropic", "openai", "local"
- `aiModel`: Required string
- `aiBaseUrl`: Optional, must be valid HTTP(S) URL
- `aiTemperature`: Required decimal, 0.0-2.0
- `aiMaxTokens`: Required integer, 1-1000000
- `aiTopP`: Optional decimal, 0.0-1.0
- `aiTopK`: Optional positive integer
- `aiRepeatPenalty`: Optional non-negative decimal
- `aiApiKey`: Required if provider is "anthropic"

#### Runtime Configuration

Configures runtime environment:

```turtle
ex:runtime a gvc:RuntimeConfig ;
    gvc:runtimeTimezone "UTC" ;
    gvc:runtimeLocale "en-US" ;
    gvc:runtimeDeterministic true ;
    gvc:runtimeSandbox true .
```

**Validations**:
- `runtimeTimezone`: Required string (IANA timezone)
- `runtimeLocale`: Required string, BCP 47 format (e.g., "en-US")
- `runtimeDeterministic`: Required boolean
- `runtimeSandbox`: Required boolean

#### Daemon Configuration

Configures background daemon polling:

```turtle
ex:daemon a gvc:DaemonConfig ;
    gvc:daemonPollMs 1500 ;
    gvc:daemonLookback 600 ;
    gvc:daemonMaxPerTick 50 .
```

**Validations**:
- `daemonPollMs`: Required integer, 100-60000 ms
- `daemonLookback`: Required integer, 1-3600 seconds
- `daemonMaxPerTick`: Required integer, 1-1000 jobs/tick
- Constraint: poll interval should not exceed lookback window

#### Events Configuration

Configures event system:

```turtle
ex:events a gvc:EventsConfig ;
    gvc:eventsDirectory "events" .
```

**Validations**:
- `eventsDirectory`: Required string

#### Graph Configuration

Configures RDF graph management:

```turtle
ex:graph a gvc:GraphConfig ;
    gvc:graphDir "graph" ;
    gvc:graphSnapshotsDir ".gitvan/graphs/snapshots" ;
    gvc:graphAutoLoad true ;
    gvc:graphValidateOnLoad false .
```

**Validations**:
- `graphDir`: Required string
- `graphSnapshotsDir`: Required string
- `graphAutoLoad`: Required boolean
- `graphValidateOnLoad`: Required boolean

#### Hooks Configuration

Configures Git lifecycle hooks (extensible):

```turtle
ex:hooks a gvc:HooksConfig .
```

**Note**: Hooks configuration is extensible and ready for custom properties.

## Validation Rules

### Type Constraints

Properties have strict type constraints using `sh:datatype`:

```turtle
sh:datatype xsd:string    # UTF-8 text
sh:datatype xsd:integer   # Whole numbers
sh:datatype xsd:boolean   # true/false
sh:datatype xsd:decimal   # Floating point (0.7)
```

### Cardinality Constraints

Control how many times a property can appear:

```turtle
sh:minCount 1     # Required (at least 1)
sh:maxCount 1     # Single-valued (0 or 1)
sh:minCount 0     # Optional
sh:maxCount 3     # Multiple but limited
```

### Value Constraints

Restrict allowed values:

```turtle
# Enumeration
sh:in ( "value1" "value2" "value3" )

# Range (integers)
sh:minInclusive 1
sh:maxInclusive 100

# Range (decimals)
sh:minInclusive 0.0
sh:maxInclusive 2.0

# Pattern matching (regex)
sh:pattern "^refs/"
sh:pattern "^[a-z]{2}(-[A-Z]{2})?$"  # BCP 47 locale
```

### Class Constraints

Ensure properties link to specific RDF types:

```turtle
sh:class gvc:JobsConfig
```

## Using SHACL Validation

### Validation with UnRDF

GitVan uses UnRDF for SHACL validation. Basic validation:

```javascript
import { useRDF } from '@/rdf/index.mjs';

const rdf = useRDF();
const config = await rdf.load('config.ttl');
const shapes = await rdf.load('config-ontology.ttl');

const report = await rdf.validate(config, shapes);

if (report.conforms) {
    console.log('Configuration is valid!');
} else {
    for (const violation of report.results) {
        console.log(`Violation: ${violation.message}`);
    }
}
```

### SPARQL Query Examples

Query valid configurations:

```sparql
PREFIX gvc: <https://gitvan.dev/ontology/config#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?config ?provider ?temperature
WHERE {
    ?config a gvc:Configuration .
    ?config gvc:hasAIConfig ?ai .
    ?ai gvc:aiProvider ?provider ;
        gvc:aiTemperature ?temp .
    FILTER (?temp < 1.0)  # Conservative configurations
}
ORDER BY ?temperature
```

Find configurations by provider:

```sparql
PREFIX gvc: <https://gitvan.dev/ontology/config#>

SELECT ?config ?model ?baseUrl
WHERE {
    ?config a gvc:Configuration ;
        gvc:hasAIConfig ?ai .
    ?ai gvc:aiProvider "anthropic" ;
        gvc:aiModel ?model ;
        gvc:aiBaseUrl ?baseUrl .
}
```

## Common Validation Patterns

### Pattern 1: Conditional Constraints

Constraints that depend on other property values:

```turtle
# If aiProvider is "anthropic", apiKey is required
sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "If aiProvider is 'anthropic', aiApiKey must be provided" ;
    sh:prefixes gvc: ;
    sh:select """
        PREFIX gvc: <https://gitvan.dev/ontology/config#>
        SELECT $this
        WHERE {
            $this gvc:aiProvider ?provider .
            FILTER (?provider = "anthropic")
            FILTER NOT EXISTS { $this gvc:aiApiKey ?key . }
        }
    """
] .
```

### Pattern 2: Cross-Property Constraints

Constraints involving multiple properties:

```turtle
# Daemon poll should not exceed lookback window
sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Daemon poll interval should not exceed lookback window" ;
    sh:prefixes gvc: ;
    sh:select """
        PREFIX gvc: <https://gitvan.dev/ontology/config#>
        SELECT $this
        WHERE {
            $this gvc:daemonPollMs ?poll .
            $this gvc:daemonLookback ?lookback .
            BIND (?lookback * 1000 AS ?maxPoll)
            FILTER (?poll > ?maxPoll)
        }
    """
] .
```

### Pattern 3: Enumeration with Validation

Controlled vocabularies:

```turtle
gvc:AIProviderPropertyShape a sh:PropertyShape ;
    sh:path gvc:aiProvider ;
    sh:datatype xsd:string ;
    sh:in ( "ollama" "anthropic" "openai" "local" ) ;
    sh:message "AI provider must be one of: ollama, anthropic, openai, local" .
```

### Pattern 4: Regex Pattern Matching

Validate format with regular expressions:

```turtle
# Git refs must start with "refs/"
sh:pattern "^refs/"

# Locale must match BCP 47 (e.g., en-US)
sh:pattern "^[a-z]{2}(-[A-Z]{2})?$"

# URL pattern
sh:pattern "^(https?://)?"
```

### Pattern 5: Range Constraints

Numeric boundaries:

```turtle
# Timeout between 1ms and 5 minutes
sh:minInclusive 1
sh:maxInclusive 300000

# Temperature between 0.0 and 2.0
sh:minInclusive 0.0
sh:maxInclusive 2.0
```

## Extending Shapes

### Adding New Configuration Options

To add a new configuration option:

1. **Define the property in the ontology**:

```turtle
gvc:myNewProperty a owl:DatatypeProperty ;
    rdfs:label "My New Property" ;
    rdfs:comment "Description of the new property" ;
    rdfs:domain gvc:MyConfigSection ;
    rdfs:range xsd:string .
```

2. **Define the property shape**:

```turtle
gvc:MyNewPropertyShape a sh:PropertyShape ;
    sh:path gvc:myNewProperty ;
    sh:datatype xsd:string ;
    sh:maxCount 1 ;
    sh:minCount 1 ;
    sh:message "My new property must be a non-empty string" ;
    rdfs:label "My New Property Shape" ;
    rdfs:comment "Validates the new property" .
```

3. **Add to the node shape**:

```turtle
gvc:MyConfigSectionNodeShape a sh:NodeShape ;
    sh:targetClass gvc:MyConfigSection ;
    sh:property gvc:MyNewPropertyShape ;
    # ... other properties ...
    .
```

4. **Create examples**:

```turtle
ex:myConfig a gvc:MyConfigSection ;
    gvc:myNewProperty "value" .
```

### Creating Custom Shapes

Extend the ontology with domain-specific shapes:

```turtle
@prefix custom: <http://my-org.com/custom-config#> .

# Define custom configuration section
custom:MyCustomConfig a owl:Class ;
    rdfs:subClassOf gv:ConfigSection ;
    rdfs:label "My Custom Configuration" ;
    rdfs:comment "Organization-specific configuration" .

# Define custom property
custom:myProperty a owl:DatatypeProperty ;
    rdfs:domain custom:MyCustomConfig ;
    rdfs:range xsd:string .

# Define shape
custom:MyPropertyShape a sh:PropertyShape ;
    sh:path custom:myProperty ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:message "My property must be provided" .

# Define node shape
custom:MyCustomConfigShape a sh:NodeShape ;
    sh:targetClass custom:MyCustomConfig ;
    sh:property custom:MyPropertyShape .
```

### Adding Constraints to Existing Shapes

Add additional constraints without modifying core shapes:

```turtle
# Add a new property shape to existing config section
custom:AdditionalPropertyShape a sh:PropertyShape ;
    sh:path gvc:jobsDir ;
    sh:minLength 1 ;
    sh:message "Jobs directory path must be non-empty" .
```

## SPARQL Constraints

SPARQL constraints enable complex validation logic:

### Basic SPARQL Constraint

```turtle
sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Custom validation message" ;
    sh:prefixes gvc: ;
    sh:select """
        PREFIX gvc: <https://gitvan.dev/ontology/config#>
        SELECT $this
        WHERE {
            # Constraint logic here
            # If results are returned, constraint is violated
        }
    """
] .
```

### Constraint Components

- `sh:message`: Message shown when constraint is violated
- `sh:prefixes`: Namespace prefixes for the SPARQL query
- `sh:select`: SPARQL SELECT query that returns violations
- `$this`: The resource being validated

### Examples

Check that values exist:

```turtle
# Anthropic configs must have API key
FILTER NOT EXISTS { $this gvc:aiApiKey ?key . }
```

Check numeric relationships:

```turtle
# Poll interval less than lookback
?this gvc:daemonPollMs ?poll .
?this gvc:daemonLookback ?lookback .
BIND (?lookback * 1000 AS ?maxPoll)
FILTER (?poll > ?maxPoll)
```

Check string patterns:

```turtle
# Provider must match allowed values
?this gvc:aiProvider ?provider .
FILTER NOT EXISTS {
    VALUES ?allowed { "ollama" "anthropic" "openai" "local" }
    FILTER (?provider = ?allowed)
}
```

## Troubleshooting

### Validation Fails with Type Error

**Problem**: "Expected xsd:string but got xsd:integer"

**Solution**: Ensure all property values match declared datatypes:

```turtle
# Wrong (will fail)
gvc:lockTimeout "30000"  # String, should be integer

# Correct
gvc:lockTimeout 30000  # Integer
```

### Cardinality Violation

**Problem**: "Cardinality violation: expected maxCount=1 but found 2"

**Solution**: Remove duplicate properties or increase maxCount:

```turtle
# Wrong - two AI configs
ex:config gvc:hasAIConfig ex:ai1 ;
          gvc:hasAIConfig ex:ai2 .

# Correct - one AI config
ex:config gvc:hasAIConfig ex:ai1 .
```

### Missing Required Property

**Problem**: "Cardinality violation: expected minCount=1 but found 0"

**Solution**: Add the missing required property:

```turtle
# Before (missing jobsDir)
ex:jobsConfig a gvc:JobsConfig ;
    gvc:jobScanPatterns ( "jobs/**/*.mjs" ) .

# After (includes jobsDir)
ex:jobsConfig a gvc:JobsConfig ;
    gvc:jobsDir "jobs" ;
    gvc:jobScanPatterns ( "jobs/**/*.mjs" ) .
```

### Pattern Not Matching

**Problem**: "Pattern matching failed: expected ^refs/"

**Solution**: Ensure string matches regex pattern:

```turtle
# Wrong
gvc:receiptRef "heads/master"  # Doesn't start with "refs/"

# Correct
gvc:receiptRef "refs/notes/gitvan/results"
```

### SPARQL Constraint Not Triggering

**Problem**: Constraint should fail but doesn't

**Solution**: Check SPARQL query syntax and prefix declarations:

```turtle
# Ensure prefixes are declared
sh:prefixes gvc: ;  # gvc prefix must be used

# Test query independently
# If query returns results, constraint is violated
```

### Validation Reports Empty

**Problem**: Validator returns no report or results

**Solution**: Ensure:
1. Configuration and shapes are in same graph or imported
2. RDF is valid Turtle syntax
3. Configuration includes required rdf:type declarations
4. Shapes target correct classes with sh:targetClass

## Best Practices

### 1. Use Meaningful Labels and Comments

```turtle
gvc:JobsDirPropertyShape a sh:PropertyShape ;
    rdfs:label "Jobs Directory Property Shape" ;
    rdfs:comment "Validates the directory path for job discovery. The directory should be relative to the project root and contain *.mjs files." ;
    sh:message "Jobs directory must be a non-empty string" ;
    # ... constraints ...
```

### 2. Organize Shapes in Sections

Group related shapes:

```turtle
# ============================================================================
# Jobs Configuration Shape
# ============================================================================

gvc:JobsConfigNodeShape a sh:NodeShape ;
    # ... jobs config shape ...
    .

gvc:JobsDirPropertyShape a sh:PropertyShape ;
    # ... jobs dir property ...
    .

gvc:JobScanPatternsPropertyShape a sh:PropertyShape ;
    # ... job patterns property ...
    .
```

### 3. Use Examples

Provide both valid and invalid examples:

```turtle
# Valid example
ex:validJobsConfig a gvc:JobsConfig ;
    gvc:jobsDir "jobs" ;
    gvc:jobScanPatterns ( "jobs/**/*.mjs" ) .

# Invalid example (missing required jobsDir)
ex:invalidJobsConfig a gvc:JobsConfig ;
    gvc:jobScanPatterns ( "jobs/**/*.mjs" ) .
```

### 4. Document Constraints

Explain constraints in comments:

```turtle
gvc:LockTimeoutPropertyShape a sh:PropertyShape ;
    sh:path gvc:lockTimeout ;
    sh:datatype xsd:integer ;
    sh:minCount 1 ;
    sh:minInclusive 1 ;      # At least 1 millisecond
    sh:maxInclusive 300000 ; # At most 5 minutes
    sh:message "Lock timeout must be an integer between 1 and 300000 milliseconds" ;
    rdfs:comment "Timeout for lock acquisition attempts. Values typically range from 100ms (fast, local) to 300000ms (5 minutes, remote). Default is 30000ms (30 seconds)." .
```

### 5. Validate Before Deployment

Run validation in CI/CD:

```bash
# Run SHACL validation
node -e "
  import { useRDF } from './src/rdf/index.mjs';
  const rdf = useRDF();
  const config = await rdf.load('gitvan.config.ttl');
  const shapes = await rdf.load('src/config/config-ontology.ttl');
  const report = await rdf.validate(config, shapes);
  if (!report.conforms) {
    console.error('Configuration validation failed');
    process.exit(1);
  }
"
```

### 6. Use SPARQL for Complex Validation

Use SPARQL constraints for business logic:

```turtle
sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Development configs should use local providers (ollama)" ;
    sh:select """
        PREFIX gvc: <https://gitvan.dev/ontology/config#>
        PREFIX ex: <http://example.org/>
        SELECT $this
        WHERE {
            $this a gvc:Configuration ;
                ex:environment "development" .
            ?this gvc:hasAIConfig ?ai .
            ?ai gvc:aiProvider ?provider .
            FILTER (?provider != "ollama")
        }
    """
] .
```

### 7. Create Configuration Profiles

Define pre-validated profiles:

```turtle
# Development profile
ex:devProfile a gvc:Configuration ;
    dct:title "Development Configuration Profile" ;
    dct:description "Optimized for development with local AI provider" ;
    gvc:hasAIConfig ex:devAI ;
    gvc:hasDaemonConfig ex:devDaemon ;
    # ... development values ...
    .

# Production profile
ex:prodProfile a gvc:Configuration ;
    dct:title "Production Configuration Profile" ;
    dct:description "Optimized for production with conservative settings" ;
    gvc:hasAIConfig ex:prodAI ;
    gvc:hasDaemonConfig ex:prodDaemon ;
    # ... production values ...
    .
```

### 8. Version Your Ontology

Track ontology changes:

```turtle
gvc: a owl:Ontology ;
    dct:version "4.0.0" ;
    dct:created "2025-01-10"^^xsd:date ;
    dct:modified "2025-01-10"^^xsd:date ;
    dct:versionNotes "Added support for anthropic provider with conditional API key requirement" .
```

## Summary

SHACL provides a powerful, declarative way to validate GitVan configurations:

- **Type safety**: Enforce correct data types
- **Cardinality**: Ensure required properties are present
- **Value constraints**: Restrict values to valid ranges, patterns, or enumerations
- **Complex logic**: Use SPARQL for sophisticated validation
- **Extensibility**: Add new configuration options without code changes
- **Documentability**: Self-documenting constraints and validation rules

For more information on SHACL, see the [W3C SHACL specification](https://www.w3.org/TR/shacl/).
