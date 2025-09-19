# StepRunner Architecture - Sequence Diagrams

This document provides sequence diagrams breaking down the StepRunner into its component parts, showing the flow and interactions between different step types.

## 0. Graph Composable Architecture Overview

```mermaid
sequenceDiagram
    participant App as Application
    participant Graph as useGraph
    participant RE as RdfEngine
    participant Store as N3.Store
    participant QE as Comunica QueryEngine
    participant SHACL as SHACL Validator
    participant CF as Clownface
    
    App->>Graph: useGraph(store)
    Graph->>RE: Create RdfEngine instance
    RE->>QE: Initialize QueryEngine
    RE->>SHACL: Initialize SHACL Validator
    RE->>CF: Initialize Clownface
    
    Note over Graph: Graph composable provides:<br/>- SPARQL query execution<br/>- SHACL validation<br/>- Graph operations (union, intersection, difference)<br/>- Serialization (Turtle, N-Quads)<br/>- Clownface integration<br/>- Statistics and isomorphism checking
    
    App->>Graph: query(sparql)
    Graph->>RE: query(store, sparql, options)
    RE->>QE: Execute SPARQL query
    QE-->>RE: Query results
    RE-->>Graph: Formatted results
    Graph-->>App: Query results
    
    App->>Graph: validate(shapes)
    Graph->>RE: validateShacl(store, shapes)
    RE->>SHACL: Validate against shapes
    SHACL-->>RE: Validation report
    RE-->>Graph: Validation results
    Graph-->>App: Validation report
```

## 1. Main StepRunner Execution Flow

```mermaid
sequenceDiagram
    participant WE as WorkflowExecutor
    participant SR as StepRunner
    participant CM as ContextManager
    participant Graph as useGraph
    participant Turtle as useTurtle
    
    WE->>SR: executeStep(step, contextManager, graph, turtle, options)
    SR->>SR: Start timing (performance.now())
    SR->>SR: Log step execution start
    
    SR->>CM: _getStepInputs(step, contextManager)
    CM-->>SR: inputs object
    
    alt step.type == "sparql"
        SR->>Graph: _executeSparqlStep(step, inputs, graph)
        Graph-->>SR: sparql result with type-specific data
    else step.type == "template"
        SR->>SR: _executeTemplateStep(step, inputs, turtle)
        SR-->>SR: template result with rendered content
    else step.type == "file"
        SR->>SR: _executeFileStep(step, inputs)
        SR-->>SR: file operation result
    else step.type == "http"
        SR->>SR: _executeHttpStep(step, inputs)
        SR-->>SR: http response result
    else step.type == "git"
        SR->>SR: _executeGitStep(step, inputs)
        SR-->>SR: git command result
    else step.type == "database"
        SR->>SR: _executeDatabaseStep(step, inputs)
        SR-->>SR: mock database result
    else step.type == "filesystem"
        SR->>SR: _executeFilesystemStep(step, inputs)
        SR-->>SR: filesystem operation result
    else step.type == "conditional"
        SR->>SR: _executeConditionalStep(step, inputs, contextManager)
        SR-->>SR: conditional execution result
    else step.type == "loop"
        SR->>SR: _executeLoopStep(step, inputs, contextManager)
        SR-->>SR: loop execution result
    else step.type == "parallel"
        SR->>SR: _executeParallelStep(step, inputs, contextManager)
        SR-->>SR: parallel execution result
    else step.type == "error-handling"
        SR->>SR: _executeErrorHandlingStep(step, inputs, contextManager)
        SR-->>SR: error handling result
    else step.type == "notification"
        SR->>SR: _executeNotificationStep(step, inputs)
        SR-->>SR: notification result
    end
    
    SR->>CM: _storeStepOutputs(step, result, contextManager)
    SR->>SR: Calculate duration (endTime - startTime)
    SR->>SR: Log step completion with duration
    
    SR-->>WE: step result with success, duration, outputs, timestamp
```

## 2. SPARQL Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant Graph as useGraph
    participant RE as RdfEngine
    participant QE as QueryEngine
    
    SR->>SR: _executeSparqlStep(step, inputs, graph)
    SR->>SR: Extract query from step.config
    SR->>SR: Replace variables in query with inputs
    
    SR->>Graph: query(query)
    Graph->>RE: query(store, sparql, options)
    RE->>RE: Parse query type (SELECT/ASK/CONSTRUCT/DESCRIBE)
    RE->>QE: Execute query with Comunica engine
    
    alt ASK query
        QE->>QE: queryBoolean(query, context)
        QE-->>RE: boolean result
        RE-->>Graph: {type: "ask", boolean}
    else SELECT query
        QE->>QE: queryBindings(query, context)
        QE-->>RE: bindings stream
        RE->>RE: Process bindings to rows
        RE-->>Graph: {type: "select", variables, results}
    else CONSTRUCT query
        QE->>QE: queryQuads(query, context)
        QE-->>RE: quad stream
        RE->>RE: Collect quads into store
        RE-->>Graph: {type: "construct", store, quads}
    else DESCRIBE query
        QE->>QE: queryQuads(query, context)
        QE-->>RE: quad stream
        RE->>RE: Collect quads into store
        RE-->>Graph: {type: "describe", store, quads}
    end
    
    Graph-->>SR: query result
    SR->>SR: Transform result based on query type
    SR-->>SR: Processed result with type-specific data
```

## 2.1. RdfEngine Query Processing Detail

```mermaid
sequenceDiagram
    participant RE as RdfEngine
    participant QE as Comunica QueryEngine
    participant Store as N3.Store
    
    RE->>RE: query(store, sparql, options)
    RE->>RE: Parse query type using regex
    RE->>RE: Set up context with sources: [store]
    
    alt Query type is ASK
        RE->>QE: queryBoolean(sparql, context)
        QE->>Store: Execute boolean query
        Store-->>QE: Boolean result
        QE-->>RE: boolean value
        RE-->>RE: {type: "ask", boolean}
    else Query type is SELECT
        RE->>QE: queryBindings(sparql, context)
        QE->>Store: Execute select query
        Store-->>QE: Bindings stream
        QE-->>RE: Bindings iterator
        RE->>RE: Process bindings to rows
        RE->>RE: Extract variables and sort
        RE->>RE: Apply deterministic sorting if enabled
        RE-->>RE: {type: "select", variables, results}
    else Query type is CONSTRUCT
        RE->>QE: queryQuads(sparql, context)
        QE->>Store: Execute construct query
        Store-->>QE: Quad stream
        QE-->>RE: Quad iterator
        RE->>RE: Collect quads into new Store
        RE->>RE: Apply deterministic sorting if enabled
        RE-->>RE: {type: "construct", store, quads}
    else Query type is DESCRIBE
        RE->>QE: queryQuads(sparql, context)
        QE->>Store: Execute describe query
        Store-->>QE: Quad stream
        QE-->>RE: Quad iterator
        RE->>RE: Collect quads into new Store
        RE->>RE: Apply deterministic sorting if enabled
        RE-->>RE: {type: "describe", store, quads}
    else Query type is UPDATE
        RE->>QE: queryVoid(sparql, {context, destination: store})
        QE->>Store: Execute update query
        Store-->>QE: Update confirmation
        QE-->>RE: Update success
        RE-->>RE: {type: "update", ok: true}
    end
    
    RE->>RE: Apply timeout wrapper
    RE-->>RE: Final query result
```

## 3. Template Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant Template as useTemplate
    participant FS as FileSystem
    
    SR->>SR: _executeTemplateStep(step, inputs, turtle)
    SR->>SR: Extract template from step.config
    
    alt template is file path
        SR->>FS: readFile(templatePath, "utf8")
        FS-->>SR: template content
    else template is inline content
        SR->>SR: Use template content directly
    end
    
    SR->>Template: renderString(templateContent, inputs)
    Template-->>SR: rendered content
    
    alt filePath specified
        SR->>SR: Resolve file path with variables
        SR->>FS: mkdir(resolvedPath, "..")
        SR->>FS: writeFile(resolvedPath, rendered, "utf8")
    end
    
    SR-->>SR: template result
```

## 4. File Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant FS as FileSystem
    participant Template as useTemplate
    
    SR->>SR: _executeFileStep(step, inputs)
    SR->>SR: Extract filePath and operation from step.config
    SR->>SR: Resolve file path with variables
    
    alt operation == "read"
        SR->>FS: readFile(resolvedPath, "utf8")
        FS-->>SR: file content
        SR-->>SR: read result
    else operation == "write"
        SR->>SR: Extract content from step.config
        alt content contains template variables
            SR->>Template: renderString(content, inputs)
            Template-->>SR: rendered content
        end
        SR->>FS: mkdir(resolvedPath, "..")
        SR->>FS: writeFile(resolvedPath, content, "utf8")
        SR-->>SR: write result
    else operation == "copy"
        SR->>SR: Extract sourcePath from step.config
        SR->>FS: mkdir(resolvedPath, "..")
        SR->>FS: copyFile(sourcePath, resolvedPath)
        SR-->>SR: copy result
    else operation == "delete"
        SR->>FS: unlink(resolvedPath)
        SR-->>SR: delete result
    end
```

## 5. HTTP Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant HTTP as Fetch API
    participant AC as AbortController
    
    SR->>SR: _executeHttpStep(step, inputs)
    SR->>SR: Extract httpUrl, method, headers, body from step.config
    SR->>SR: Replace variables in URL, headers, body
    
    SR->>AC: new AbortController()
    SR->>SR: setTimeout(timeout)
    
    SR->>HTTP: fetch(resolvedUrl, {method, headers, body, signal})
    
    alt request succeeds
        HTTP-->>SR: Response object
        SR->>SR: response.text()
        SR->>SR: clearTimeout(timeoutId)
        SR-->>SR: http success result
    else request fails
        HTTP-->>SR: Error
        SR->>SR: clearTimeout(timeoutId)
        SR-->>SR: http error result
    end
```

## 6. Git Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant Exec as execAsync
    participant Git as Git CLI
    
    SR->>SR: _executeGitStep(step, inputs)
    SR->>SR: Extract gitCommand, workingDir, timeout from step.config
    SR->>SR: Replace variables in command
    
    SR->>Exec: execAsync(resolvedCommand, {cwd: workingDir, timeout})
    Exec->>Git: Execute git command
    Git-->>Exec: stdout, stderr
    
    alt command succeeds
        Exec-->>SR: {stdout, stderr, success: true}
        SR-->>SR: git success result
    else command fails
        Exec-->>SR: {stdout, stderr, success: false, error}
        SR-->>SR: git error result
    end
```

## 7. Database Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant DB as Database (Mock)
    
    SR->>SR: _executeDatabaseStep(step, inputs)
    SR->>SR: Extract databaseUrl, query, operation from step.config
    
    alt operation == "query"
        SR->>DB: Execute query
        DB-->>SR: Mock results (empty array)
        SR-->>SR: query result
    else operation == "insert"
        SR->>DB: Insert data
        DB-->>SR: Mock affectedRows: 1
        SR-->>SR: insert result
    else operation == "update"
        SR->>DB: Update data
        DB-->>SR: Mock affectedRows: 1
        SR-->>SR: update result
    else operation == "delete"
        SR->>DB: Delete data
        DB-->>SR: Mock affectedRows: 1
        SR-->>SR: delete result
    end
```

## 8. Filesystem Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant FS as FileSystem
    
    SR->>SR: _executeFilesystemStep(step, inputs)
    SR->>SR: Extract operation, sourcePath, targetPath from step.config
    
    alt operation == "copy"
        SR->>FS: copyFile(sourcePath, targetPath)
        SR-->>SR: copy result
    else operation == "move"
        SR->>FS: rename(sourcePath, targetPath)
        SR-->>SR: move result
    else operation == "delete"
        SR->>FS: unlink(sourcePath)
        SR-->>SR: delete result
    else operation == "mkdir"
        SR->>FS: mkdir(sourcePath, {recursive: true})
        SR-->>SR: mkdir result
    else operation == "readdir"
        SR->>FS: readdir(sourcePath)
        FS-->>SR: files array
        SR-->>SR: readdir result
    else operation == "stat"
        SR->>FS: stat(sourcePath)
        FS-->>SR: stats object
        SR-->>SR: stat result
    end
```

## 9. Conditional Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant CM as ContextManager
    
    SR->>SR: _executeConditionalStep(step, inputs, contextManager)
    SR->>SR: Extract condition, trueSteps, falseSteps from step.config
    
    SR->>SR: _evaluateCondition(condition, inputs, contextManager)
    SR-->>SR: conditionResult (boolean)
    
    alt conditionResult == true
        SR->>SR: executedSteps = trueSteps
        SR->>SR: Log "executing true branch"
    else conditionResult == false
        SR->>SR: executedSteps = falseSteps
        SR->>SR: Log "executing false branch"
    end
    
    loop for each subStep in executedSteps
        SR->>CM: executeStep(subStep, contextManager, null, null)
        CM-->>SR: subStep result
    end
    
    SR-->>SR: conditional result with branch info
```

## 10. Loop Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant CM as ContextManager
    
    SR->>SR: _executeLoopStep(step, inputs, contextManager)
    SR->>SR: Extract iterations, steps from step.config
    
    SR->>SR: Initialize loop variables
    SR->>SR: Log loop start
    
    loop for each iteration
        SR->>SR: Update loop variables
        SR->>SR: Log iteration start
        
        loop for each subStep in steps
            SR->>CM: executeStep(subStep, contextManager, null, null)
            CM-->>SR: subStep result
        end
        
        SR->>SR: Log iteration completion
    end
    
    SR->>SR: Log loop completion
    SR-->>SR: loop result with iteration count
```

## 11. Parallel Step Execution Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant CM as ContextManager
    participant Promise as Promise.all
    
    SR->>SR: _executeParallelStep(step, inputs, contextManager)
    SR->>SR: Extract steps from step.config
    
    SR->>SR: Log parallel execution start
    SR->>SR: Create execution promises
    
    loop for each subStep in steps
        SR->>CM: executeStep(subStep, contextManager, null, null)
        CM-->>SR: subStep promise
    end
    
    SR->>Promise: Promise.all(subStep promises)
    Promise-->>SR: all results
    
    SR->>SR: Log parallel completion
    SR-->>SR: parallel result with all results
```

## 12. Context Management Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant CM as ContextManager
    
    SR->>CM: _getStepInputs(step, contextManager)
    
    alt step.config.inputMapping exists
        SR->>SR: Parse inputMapping JSON
        loop for each [key, source] in mapping
            SR->>CM: getOutput(source)
            CM-->>SR: value
            SR->>SR: inputs[key] = value
        end
    else no inputMapping
        SR->>SR: inputs = {} (empty)
    end
    
    CM-->>SR: inputs object
    
    Note over SR: After step execution
    SR->>CM: _storeStepOutputs(step, result, contextManager)
    
    alt step.config.outputMapping exists
        SR->>SR: Parse outputMapping JSON
        loop for each [key, source] in mapping
            SR->>SR: _extractValue(result, source)
            SR->>CM: setOutput(key, value)
        end
    else no outputMapping
        SR->>CM: setOutput(step.id, result)
    end
```

## 13. Error Handling Flow

```mermaid
sequenceDiagram
    participant SR as StepRunner
    participant Logger as Logger
    
    SR->>SR: executeStep() try block
    
    alt step execution succeeds
        SR->>SR: Calculate duration
        SR->>Logger: Log step completion
        SR-->>SR: success result
    else step execution fails
        SR->>SR: Calculate duration
        SR->>Logger: Log step failure with error
        SR-->>SR: error result with error message
    end
    
    Note over SR: Error result includes:<br/>- stepId<br/>- success: false<br/>- duration<br/>- error message<br/>- timestamp
```

## Component Breakdown Summary

The StepRunner can be broken down into these main components:

### Core Components:
1. **Main Execution Engine** - Orchestrates step execution with timing and logging
2. **Input/Output Management** - Handles context data flow via ContextManager
3. **Step Type Dispatcher** - Routes to appropriate step handlers via switch statement
4. **Error Handling** - Manages failures and timeouts with comprehensive error reporting

### Step Type Handlers:
1. **SPARQL Step Handler** - Executes RDF queries via useGraph composable
2. **Template Step Handler** - Renders templates with data via useTemplate composable
3. **File Step Handler** - File system operations (read/write/copy/delete)
4. **HTTP Step Handler** - Web API calls with timeout and abort control
5. **Git Step Handler** - Git command execution via execAsync
6. **Database Step Handler** - Database operations (currently mock implementation)
7. **Filesystem Step Handler** - Advanced file operations (copy/move/delete/mkdir/readdir/stat)
8. **Conditional Step Handler** - Branching logic with sub-step execution
9. **Loop Step Handler** - Iteration logic with sub-step execution
10. **Parallel Step Handler** - Concurrent execution with Promise.all
11. **Error Handling Step Handler** - Error recovery and handling
12. **Notification Step Handler** - Notification delivery

### Supporting Integrations:
1. **Context Manager Integration** - Data flow between steps via inputMapping/outputMapping
2. **Template Engine Integration** - Nunjucks rendering with variable substitution
3. **Graph Integration** - RDF/SPARQL operations via RdfEngine and Comunica QueryEngine
4. **File System Integration** - Node.js fs.promises operations
5. **Git Integration** - Command execution via child_process.exec
6. **HTTP Integration** - Fetch API calls with AbortController timeout
7. **RdfEngine Integration** - Production-grade RDF processing with SHACL validation
8. **Comunica QueryEngine Integration** - SPARQL 1.1 query execution

### Key Architectural Features:
- **Extensible Design** - Easy to add new step types by implementing new handlers
- **Consistent Pattern** - All step types follow the same execution pattern
- **Comprehensive Error Handling** - Robust error handling across all step types
- **Performance Monitoring** - Built-in timing and duration tracking
- **Context Management** - Sophisticated input/output mapping system
- **Production-Grade RDF** - Real SPARQL execution with Comunica engine
- **Template Integration** - Real Nunjucks template rendering
- **File Operations** - Real file system operations with directory creation
- **Git Integration** - Real Git command execution
- **HTTP Operations** - Real web API calls with timeout handling

### Implementation Quality:
- **Real vs Mock**: Most implementations are real, only database operations are mock
- **Production Ready**: Core components are production-ready with proper error handling
- **Extensible**: Architecture supports easy addition of new step types
- **Maintainable**: Clear separation of concerns and consistent patterns
- **Testable**: Each component can be tested independently

This architecture provides a solid foundation for workflow execution with real implementations for most operations, making it suitable for production use with the exception of database operations which need real database drivers.
