# GitVan CLI Architecture - C4 Model Diagrams

## Current Problem Analysis

GitVan currently has a **mixed CLI architecture** that is inconsistent and problematic:

1. **Some commands use Citty** (`defineCommand`) - modern, type-safe, declarative
2. **Some commands use legacy handlers** - manual argument parsing, inconsistent patterns
3. **Multiple CLI entry points** - `cli.mjs`, `cli-old.mjs`, `cli-core.mjs`
4. **Inconsistent command registration** - some in objects, some as functions
5. **No unified command structure** - each command implements its own patterns

## C4 Model: Corrected GitVan CLI Architecture

### Level 1: System Context

```plantuml
@startuml GitVan_CLI_Context
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

title GitVan CLI - System Context

Person(developer, "Developer", "Uses GitVan CLI for development automation")
System(gitvan_cli, "GitVan CLI", "Command-line interface for Git-native development automation")
System(git_repo, "Git Repository", "Local Git repository with GitVan configuration")
System(file_system, "File System", "Project files, workflows, and persistent data")

developer --> gitvan_cli : "Uses CLI commands"
gitvan_cli --> git_repo : "Reads/writes Git metadata"
gitvan_cli --> file_system : "Manages project files"

@enduml
```

### Level 2: Container Diagram

```plantuml
@startuml GitVan_CLI_Containers
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

title GitVan CLI - Container Diagram

Person(developer, "Developer")

System_Boundary(gitvan_cli, "GitVan CLI System") {
    Container(cli_runner, "CLI Runner", "Citty", "Main CLI entry point and command routing")
    Container(command_registry, "Command Registry", "Citty", "Command definitions and registration")
    Container(graph_module, "Graph Module", "Node.js", "Graph persistence and operations")
    Container(workflow_module, "Workflow Module", "Node.js", "Workflow execution and management")
    Container(daemon_module, "Daemon Module", "Node.js", "Background service management")
    Container(pack_module, "Pack Module", "Node.js", "Package and dependency management")
}

System_Ext(git_repo, "Git Repository")
System_Ext(file_system, "File System")

developer --> cli_runner : "Executes commands"
cli_runner --> command_registry : "Routes to commands"
command_registry --> graph_module : "Graph operations"
command_registry --> workflow_module : "Workflow operations"
command_registry --> daemon_module : "Daemon operations"
command_registry --> pack_module : "Pack operations"

graph_module --> file_system : "Persists graph data"
workflow_module --> git_repo : "Reads Git metadata"
daemon_module --> git_repo : "Monitors Git events"

@enduml
```

### Level 3: Component Diagram - CLI Runner

```plantuml
@startuml GitVan_CLI_Runner_Components
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

title GitVan CLI Runner - Component Diagram

Container_Boundary(cli_runner, "CLI Runner") {
    Component(main_cli, "Main CLI", "Citty CLI", "Primary CLI entry point")
    Component(command_router, "Command Router", "Citty", "Routes commands to handlers")
    Component(option_parser, "Option Parser", "Citty", "Parses command-line arguments")
    Component(error_handler, "Error Handler", "Citty", "Handles CLI errors and validation")
    Component(help_generator, "Help Generator", "Citty", "Generates command help")
}

Container(graph_module, "Graph Module")
Container(workflow_module, "Workflow Module")
Container(daemon_module, "Daemon Module")

main_cli --> command_router : "Routes commands"
command_router --> option_parser : "Parses arguments"
command_router --> error_handler : "Handles errors"
command_router --> help_generator : "Shows help"

command_router --> graph_module : "Graph commands"
command_router --> workflow_module : "Workflow commands"
command_router --> daemon_module : "Daemon commands"

@enduml
```

### Level 4: Code Diagram - Graph Command Implementation

```plantuml
@startuml GitVan_Graph_Command_Code
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

title GitVan Graph Command - Code Level

Container_Boundary(graph_command, "Graph Command") {
    Component(graph_cmd, "Graph Command", "Citty defineCommand", "Main graph command definition")
    Component(save_subcmd, "Save Subcommand", "Citty defineCommand", "Save graph to file")
    Component(load_subcmd, "Load Subcommand", "Citty defineCommand", "Load graph from file")
    Component(init_subcmd, "Init Subcommand", "Citty defineCommand", "Initialize default graph")
    Component(stats_subcmd, "Stats Subcommand", "Citty defineCommand", "Show graph statistics")
    Component(list_subcmd, "List Subcommand", "Citty defineCommand", "List graph files")
}

Container_Boundary(graph_module, "Graph Module") {
    Component(use_turtle, "useTurtle", "Composable", "Turtle file operations")
    Component(persistence_helper, "PersistenceHelper", "Class", "File system operations")
    Component(rdf_engine, "RdfEngine", "Class", "RDF serialization/parsing")
}

Container(file_system, "File System")

graph_cmd --> save_subcmd : "save"
graph_cmd --> load_subcmd : "load"
graph_cmd --> init_subcmd : "init-default"
graph_cmd --> stats_subcmd : "stats"
graph_cmd --> list_subcmd : "list-files"

save_subcmd --> use_turtle : "saveGraph()"
load_subcmd --> use_turtle : "loadGraph()"
init_subcmd --> use_turtle : "initializeDefaultGraph()"
stats_subcmd --> use_turtle : "getStoreStats()"
list_subcmd --> use_turtle : "listGraphFiles()"

use_turtle --> persistence_helper : "File operations"
use_turtle --> rdf_engine : "RDF operations"
persistence_helper --> file_system : "Read/write files"

@enduml
```

## Corrected Architecture Implementation

### 1. Unified Citty-Based CLI Structure

```javascript
// src/cli/index.mjs - Main CLI entry point
import { createCLI } from 'citty';
import { graphCommand } from './commands/graph.mjs';
import { workflowCommand } from './commands/workflow.mjs';
import { daemonCommand } from './commands/daemon.mjs';
import { packCommand } from './commands/pack.mjs';

export const cli = createCLI({
  meta: {
    name: 'gitvan',
    version: '3.0.0',
    description: 'Git-native development automation'
  },
  subCommands: {
    graph: graphCommand,
    workflow: workflowCommand,
    daemon: daemonCommand,
    pack: packCommand,
    // ... other commands
  }
});

// src/cli/commands/graph.mjs - Proper Citty graph command
import { defineCommand } from 'citty';

export const graphCommand = defineCommand({
  meta: {
    name: 'graph',
    description: 'Graph persistence and operations'
  },
  subCommands: {
    save: defineCommand({
      meta: { name: 'save', description: 'Save graph to file' },
      args: {
        fileName: { type: 'string', required: true },
        'graph-dir': { type: 'string', default: 'graph' },
        backup: { type: 'boolean', default: false },
        validate: { type: 'boolean', default: true }
      },
      async run({ args }) {
        // Implementation using useTurtle composable
      }
    }),
    load: defineCommand({
      meta: { name: 'load', description: 'Load graph from file' },
      args: {
        fileName: { type: 'string', required: true },
        'graph-dir': { type: 'string', default: 'graph' },
        merge: { type: 'boolean', default: true },
        validate: { type: 'boolean', default: true }
      },
      async run({ args }) {
        // Implementation using useTurtle composable
      }
    }),
    'init-default': defineCommand({
      meta: { name: 'init-default', description: 'Initialize default graph' },
      args: {
        'graph-dir': { type: 'string', default: 'graph' },
        'template-path': { type: 'string' },
        validate: { type: 'boolean', default: true }
      },
      async run({ args }) {
        // Implementation using useTurtle composable
      }
    }),
    stats: defineCommand({
      meta: { name: 'stats', description: 'Show graph statistics' },
      args: {
        'graph-dir': { type: 'string', default: 'graph' }
      },
      async run({ args }) {
        // Implementation using useTurtle composable
      }
    }),
    'list-files': defineCommand({
      meta: { name: 'list-files', description: 'List available Turtle files' },
      args: {
        'graph-dir': { type: 'string', default: 'graph' }
      },
      async run({ args }) {
        // Implementation using useTurtle composable
      }
    })
  }
});
```

### 2. Key Architectural Improvements

1. **Unified Citty Framework**: All commands use `defineCommand` for consistency
2. **Type-Safe Arguments**: Citty provides automatic argument parsing and validation
3. **Declarative Command Structure**: Commands are defined declaratively, not imperatively
4. **Consistent Error Handling**: Citty handles errors uniformly across all commands
5. **Automatic Help Generation**: Citty generates help text from command definitions
6. **Subcommand Support**: Proper hierarchical command structure
7. **Single Entry Point**: One main CLI file that registers all commands

### 3. Benefits of Corrected Architecture

- **Consistency**: All commands follow the same patterns
- **Type Safety**: Argument validation and type checking
- **Maintainability**: Declarative command definitions are easier to maintain
- **Extensibility**: Easy to add new commands and subcommands
- **User Experience**: Consistent help, error messages, and argument parsing
- **Testing**: Easier to test commands with consistent interfaces

### 4. Migration Strategy

1. **Phase 1**: Create new Citty-based commands alongside existing ones
2. **Phase 2**: Migrate high-priority commands (graph, workflow, daemon)
3. **Phase 3**: Migrate remaining commands
4. **Phase 4**: Remove legacy CLI code
5. **Phase 5**: Update documentation and examples

This corrected architecture provides a solid foundation for GitVan's CLI that is consistent, maintainable, and follows modern CLI best practices.
