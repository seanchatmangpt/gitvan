# GitVan Graph Persistence Documentation

## Overview

The GitVan Graph Persistence feature implements the "default graph location with save/load" functionality as described in the C4 model. This feature provides a robust, atomic, and reliable way to persist RDF graph data to Turtle files with comprehensive error handling and validation.

## Architecture

The persistence system follows the C4 model architecture with four levels:

### Level 1 - System Context
- **Developer** interacts with **GitVan** workflow engine
- **GitVan** reads/writes RDF Turtle files from/to the **File System**
- **GitVan** commits snapshots and receipts to the **Git Repository**

### Level 2 - Containers
- **Workflow Engine** (Node.js) executes workflows
- **Configuration** (JS/JSON) defines directories and defaults
- **Graph Module** (N3.js + RDF) loads, queries, and saves RDF graphs
- **FS I/O Adapter** (Node:fs) ensures directories and saves TTL files

### Level 3 - Components
- **RdfEngine** - Serializes/parses RDF with Turtle/N-Quads support
- **useTurtle** - Composable that loads .ttl directories and manages URI roots
- **useGraph** - Ergonomic graph API (SPARQL, SHACL, stats)
- **PersistenceHelper** - Ensures directories and writes default.ttl

### Level 4 - Code/Sequence
The save flow follows this sequence:
1. Developer triggers save workflow
2. `useTurtle.saveGraph()` calls `RdfEngine.serializeTurtle()`
3. `RdfEngine` returns TTL string to `PersistenceHelper`
4. `PersistenceHelper` ensures directory and writes file atomically
5. File system acknowledges the write
6. Success response with path and bytes written

## Components

### PersistenceHelper Class

The `PersistenceHelper` class provides the core file system operations for graph persistence.

#### Location
`src/utils/persistence-helper.mjs`

#### Key Features
- **Atomic Writes**: Uses temporary files and atomic renames for data safety
- **Directory Management**: Automatically creates directories as needed
- **Turtle Validation**: Validates Turtle content before writing
- **Backup Support**: Creates backups when requested
- **Error Handling**: Comprehensive error handling with meaningful messages

#### Methods

##### Directory Operations
```javascript
// Ensure directory exists, creating it if necessary
await persistence.ensureDirectory(dirPath)

// Check if directory exists
await persistence.directoryExists(dirPath)
```

##### File Operations
```javascript
// Write Turtle content to file with atomic operation
await persistence.writeTurtleFile(filePath, content, options)

// Read Turtle content from file
await persistence.readTurtleFile(filePath, options)

// Check if file exists
await persistence.fileExists(filePath)

// Get file statistics
await persistence.getFileStats(filePath)

// Create backup of file
await persistence.createBackup(filePath, backupPath)

// Remove file safely
await persistence.removeFile(filePath)
```

##### Default Graph Operations
```javascript
// Write default.ttl file to graph directory
await persistence.writeDefaultGraph(graphDir, content, options)

// Read default.ttl file from graph directory
await persistence.readDefaultGraph(graphDir, options)
```

##### RDF Operations
```javascript
// Serialize N3 Store to Turtle string
await persistence.serializeStore(store, options)

// Parse Turtle string to N3 Store
persistence.parseTurtle(turtle, options)

// Validate Turtle content
await persistence.validateTurtleContent(content)
```

##### File System Queries
```javascript
// List Turtle files in directory
await persistence.listTurtleFiles(dirPath)
```

### Enhanced useTurtle Composable

The `useTurtle` composable has been enhanced with comprehensive persistence methods.

#### Location
`src/composables/turtle.mjs`

#### New Persistence Methods

##### Graph Save Operations
```javascript
// Save the current store to a Turtle file
await turtle.saveGraph(fileName, options)

// Save the current store to the default.ttl file
await turtle.saveDefaultGraph(options)
```

##### Graph Load Operations
```javascript
// Load a Turtle file into the current store
await turtle.loadGraph(fileName, options)

// Load the default.ttl file into the current store
await turtle.loadDefaultGraph(options)
```

##### Default Graph Initialization
```javascript
// Initialize default graph with template content if it doesn't exist
await turtle.initializeDefaultGraph(options)
```

##### File Management
```javascript
// Get list of available Turtle files in the graph directory
await turtle.listGraphFiles()

// Get statistics about the current store
turtle.getStoreStats()

// Get the persistence helper instance
turtle.getPersistenceHelper()
```

## Configuration

### Default Configuration

The persistence system uses GitVan's configuration system with these defaults:

```javascript
// From src/config/defaults.mjs
graph: {
  dir: "graph",                    // Default graph directory
  snapshotsDir: ".gitvan/graphs/snapshots",
  uriRoots: {
    "graph://": "graph/",
    "templates://": "templates/",
    "queries://": "queries/",
  },
  autoLoad: true,
  validateOnLoad: false,
}
```

### Options

#### PersistenceHelper Options
```javascript
const persistence = createPersistenceHelper({
  logger: console,              // Logger instance
  atomicWrites: true,           // Enable atomic writes (default: true)
  rdfEngine: rdfEngineInstance  // Custom RDF engine instance
});
```

#### Save Options
```javascript
await turtle.saveGraph('my-graph', {
  validate: true,        // Validate Turtle content (default: true)
  createBackup: false,   // Create backup file (default: false)
  prefixes: {            // Custom prefixes for serialization
    'ex': 'http://example.org/'
  }
});
```

#### Load Options
```javascript
await turtle.loadGraph('my-graph', {
  validate: true,        // Validate Turtle content (default: true)
  merge: true,          // Merge with existing store (default: true)
  baseIRI: 'http://example.org/'  // Base IRI for parsing
});
```

## Default Graph Template

### Location
`templates/default.ttl`

### Content
The default template provides a basic RDF structure for GitVan projects:

```turtle
# GitVan Default Graph Template
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .

# Project Information
<https://gitvan.dev/project/> a gv:Project ;
    dct:title "GitVan Project" ;
    dct:description "A GitVan-powered development automation project" ;
    dct:created "2024-01-01T00:00:00Z"^^xsd:dateTime ;
    dct:modified "2024-01-01T00:00:00Z"^^xsd:dateTime ;
    gv:version "1.0.0" ;
    gv:status gv:Active .

# Default Graph Configuration
<https://gitvan.dev/graph/default/> a gv:Graph ;
    dct:title "Default Graph" ;
    dct:description "Default graph location for GitVan operations" ;
    gv:graphType gv:DefaultGraph ;
    gv:baseIRI "https://gitvan.dev/graph/default/" ;
    gv:persistenceEnabled true ;
    gv:autoSave true .

# Knowledge Hooks Configuration
<https://gitvan.dev/hooks/default/> a gh:KnowledgeHookSet ;
    dct:title "Default Knowledge Hooks" ;
    dct:description "Default set of knowledge hooks for GitVan operations" ;
    gh:hookType gh:DefaultHookSet ;
    gh:enabled true .

# Operations Configuration
<https://gitvan.dev/ops/default/> a op:OperationSet ;
    dct:title "Default Operations" ;
    dct:description "Default set of operations available in this graph" ;
    op:operationType op:DefaultOperationSet ;
    op:enabled true .

# Graph Metadata
<https://gitvan.dev/meta/graph/> a gv:GraphMetadata ;
    dct:title "Graph Metadata" ;
    dct:description "Metadata about this graph instance" ;
    gv:created "2024-01-01T00:00:00Z"^^xsd:dateTime ;
    gv:lastModified "2024-01-01T00:00:00Z"^^xsd:dateTime ;
    gv:version "1.0.0" ;
    gv:format "Turtle" ;
    gv:encoding "UTF-8" ;
    gv:namespace "https://gitvan.dev/" .
```

## Usage Examples

### Basic Usage

```javascript
import { useTurtle } from '../src/composables/turtle.mjs';
import { withGitVan } from '../src/composables/ctx.mjs';

await withGitVan(context, async () => {
  const turtle = await useTurtle({ graphDir: './my-graph' });
  
  // Initialize default graph
  await turtle.initializeDefaultGraph();
  
  // Add some data to the store
  const { Store, DataFactory } = await import('n3');
  const { namedNode } = DataFactory;
  turtle.store.addQuad(
    namedNode('http://example.org/test'),
    namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    namedNode('http://example.org/Resource')
  );
  
  // Save to a named file
  const result = await turtle.saveGraph('my-data');
  console.log(`Saved to: ${result.path} (${result.bytes} bytes)`);
  
  // Save to default location
  await turtle.saveDefaultGraph();
  
  // Load from file
  await turtle.loadGraph('my-data');
  
  // Load from default location
  await turtle.loadDefaultGraph();
});
```

### Advanced Usage with Options

```javascript
// Save with custom options
await turtle.saveGraph('project-data', {
  validate: true,
  createBackup: true,
  prefixes: {
    'ex': 'http://example.org/',
    'gv': 'https://gitvan.dev/ontology#'
  }
});

// Load with merge disabled (replace existing data)
await turtle.loadGraph('project-data', {
  validate: true,
  merge: false,
  baseIRI: 'http://example.org/'
});

// Initialize with custom template
await turtle.initializeDefaultGraph({
  templatePath: './custom-template.ttl',
  validate: true
});
```

### Error Handling

```javascript
try {
  await turtle.saveGraph('my-data');
} catch (error) {
  console.error('Save failed:', error.message);
  // Handle error appropriately
}

try {
  await turtle.loadGraph('non-existent');
} catch (error) {
  console.error('Load failed:', error.message);
  // Handle error appropriately
}
```

## Testing

### Test Coverage

The persistence functionality is comprehensively tested in `tests/graph-persistence.test.mjs` with 37 test cases covering:

- **PersistenceHelper Class**: Directory operations, file operations, default graph operations, RDF operations, file system queries, file statistics, backup operations, file removal
- **useTurtle Integration**: Graph save operations, graph load operations, default graph initialization, file listing, store statistics, persistence helper access
- **C4 Model Integration**: Complete C4 model flow implementation, default graph location pattern

### Running Tests

```bash
# Run persistence tests
pnpm test tests/graph-persistence.test.mjs

# Run all tests
pnpm test
```

## Error Handling

The persistence system provides comprehensive error handling:

### Common Error Scenarios

1. **File Not Found**: Returns `null` for read operations, throws error for required operations
2. **Invalid Turtle Content**: Validates content and throws descriptive errors
3. **Directory Creation Failure**: Provides meaningful error messages
4. **Permission Issues**: Handles file system permission errors gracefully
5. **Atomic Write Failures**: Ensures data integrity even on partial failures

### Error Messages

All error messages are descriptive and actionable:

```javascript
// Example error messages
"Failed to create directory /path/to/dir: EACCES: permission denied"
"Invalid Turtle content: Unexpected token at line 5"
"Failed to write Turtle file /path/file.ttl: ENOSPC: no space left on device"
```

## Performance Considerations

### Atomic Writes
- Uses temporary files and atomic renames to prevent data corruption
- Ensures data integrity even during system crashes
- Slightly slower than direct writes but much safer

### Validation
- Turtle validation can be disabled for performance-critical operations
- Validation is enabled by default for data safety
- Use `validate: false` option when performance is critical

### Caching
- RDF engine instances are reused for efficiency
- File system operations are optimized for common patterns
- Directory creation is batched when possible

## Security Considerations

### File System Security
- All file operations respect system permissions
- No arbitrary file system access beyond configured directories
- Atomic writes prevent partial file corruption

### Data Validation
- Turtle content is validated before writing
- Prevents injection of malformed RDF data
- Ensures data integrity and consistency

### Backup Safety
- Backup files are created with proper permissions
- Backup operations are atomic and safe
- No data loss during backup creation

## Future Enhancements

### Planned Features
1. **Compression Support**: Optional compression for large graph files
2. **Encryption**: Optional encryption for sensitive graph data
3. **Remote Storage**: Support for remote graph storage (S3, etc.)
4. **Incremental Saves**: Only save changed portions of large graphs
5. **Graph Versioning**: Built-in versioning and diff capabilities

### Extension Points
The persistence system is designed to be extensible:

- Custom persistence helpers can be created
- Different serialization formats can be supported
- Custom validation rules can be added
- Integration with external storage systems is possible

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the process has write permissions to the graph directory
2. **Invalid Turtle**: Check Turtle syntax and validate content manually
3. **Directory Not Created**: Verify the parent directory exists and is writable
4. **Atomic Write Failures**: Check disk space and file system permissions

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
const persistence = createPersistenceHelper({
  logger: {
    debug: console.log,
    error: console.error,
    warn: console.warn
  }
});
```

### Validation Testing

Test Turtle content manually:

```javascript
// Test Turtle content
try {
  await persistence.validateTurtleContent(myTurtleContent);
  console.log('Turtle content is valid');
} catch (error) {
  console.error('Invalid Turtle:', error.message);
}
```

This documentation provides comprehensive coverage of the GitVan Graph Persistence feature, following the C4 model architecture and providing practical examples for developers.
