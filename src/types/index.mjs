/**
 * @fileoverview GitVan v2 — Comprehensive Type Exports
 *
 * This module provides comprehensive type exports for the entire GitVan system.
 * It serves as the central hub for all TypeScript definitions and JSDoc documentation,
 * enabling full type safety and IntelliSense support across the entire codebase.
 *
 * @version 2.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// ============================================================================
// CORE TYPES AND INTERFACES
// ============================================================================

/**
 * @typedef {Object} RunContext
 * @description GitVan runtime context providing access to all composables and services
 * @property {string} root - Repository root directory path
 * @property {string} [repoRoot] - Git repository root (may differ from root in worktrees)
 * @property {string} [worktreeRoot] - Worktree root directory
 * @property {Record<string, string>} [env] - Environment variables
 * @property {() => string} [now] - Timestamp function for consistent time handling
 * @property {any} [payload] - Event payload data
 * @property {Map<string, JobDef>} [jobs] - Registry of available jobs
 * @property {Object} [llm] - LLM configuration for AI-powered features
 * @property {string} [llm.provider] - LLM provider identifier
 * @property {string} [llm.baseURL] - Base URL for LLM API
 * @property {string[]} [llm.modelAllow] - Allowed model names
 * @property {number} [llm.budgetTokens] - Token budget for requests
 * @property {number} [llm.seed] - Random seed for reproducible outputs
 * @property {Object} [worktree] - Worktree information
 * @property {string} worktree.id - Worktree identifier
 * @property {string} [worktree.branch] - Branch name
 */

/**
 * @typedef {Object} JobRunArgs
 * @description Arguments passed to job execution functions
 * @property {any} [payload] - Optional payload data
 * @property {RunContext} ctx - Runtime context
 */

/**
 * @typedef {Object} JobResult
 * @description Result returned from job execution
 * @property {boolean} ok - Whether the job completed successfully
 * @property {string} [artifact] - Optional artifact path created by the job
 * @property {string} [stdout] - Standard output from job execution
 * @property {string} [stderr] - Standard error from job execution
 * @property {any} [meta] - Additional metadata
 * @property {string} [error] - Error message if job failed
 */

/**
 * @typedef {Object} JobDef
 * @description Defines a job with its metadata and execution logic
 * @property {JobKind} [kind] - Job type classification
 * @property {Record<string, any>} [meta] - Job metadata
 * @property {Function} [run] - Job execution function
 * @property {ExecSpec} [action] - Alternative execution specification
 */

/**
 * @typedef {'atomic'|'pipeline'|'fanout'|'gate'} JobKind
 * @description Classification of job types for execution planning
 */

// ============================================================================
// EXECUTION SPECIFICATIONS
// ============================================================================

/**
 * @typedef {Object} ExecCLI
 * @description Defines a command-line execution
 * @property {'cli'} exec - Execution type identifier
 * @property {string} cmd - Command to execute
 * @property {string[]} [args] - Command arguments
 * @property {Record<string, string|number>} [env] - Environment variables
 */

/**
 * @typedef {Object} ExecJS
 * @description Defines a JavaScript module execution
 * @property {'js'} exec - Execution type identifier
 * @property {string} module - Module path
 * @property {string} [export] - Export name to call
 * @property {any} [input] - Input data
 * @property {Record<string, string|number>} [env] - Environment variables
 */

/**
 * @typedef {Object} ExecTemplate
 * @description Defines a template rendering execution
 * @property {'tmpl'} exec - Execution type identifier
 * @property {string} template - Template content or path
 * @property {string} [out] - Output file path
 * @property {any} [data] - Template data
 * @property {boolean} [autoescape] - HTML auto-escape setting
 * @property {string[]} [paths] - Additional template search paths
 */

/**
 * @typedef {ExecCLI|ExecJS|ExecTemplate} ExecSpec
 * @description All supported execution specification types
 */

/**
 * @typedef {Object} ExecResult
 * @description Result returned from execution specifications
 * @property {boolean} ok - Whether execution succeeded
 * @property {number} [code] - Exit code (for CLI executions)
 * @property {string} [stdout] - Standard output
 * @property {string} [stderr] - Standard error (CLI only)
 * @property {string} [artifact] - Output artifact path
 * @property {Object} [meta] - Additional metadata
 */

// ============================================================================
// GIT API INTERFACE
// ============================================================================

/**
 * @typedef {Object} GitAPI
 * @description Comprehensive interface for Git operations within GitVan
 * @property {string} root - Repository root directory
 * @property {() => string} head - Get current HEAD commit SHA
 * @property {() => string} branch - Get current branch name
 * @property {(args: string) => string} run - Run arbitrary Git command
 * @property {(ref: string, msg: string, sha?: string) => string} note - Add note to Git object
 * @property {(ref: string, msg: string, sha?: string) => string} appendNote - Append note to Git object
 * @property {(ref: string, sha: string) => string} setRef - Set Git reference
 * @property {(ref: string) => string} delRef - Delete Git reference
 * @property {(prefix: string) => string[]} listRefs - List Git references with prefix
 * @property {() => string} init - Initialize repository
 * @property {(url: string, path?: string) => string} clone - Clone repository
 * @property {(files: string|string[]) => string} add - Add files to staging
 * @property {(message: string, options?: Object) => string} commit - Commit changes
 * @property {(options?: Object) => string} push - Push changes
 * @property {(options?: Object) => string} pull - Pull changes
 * @property {(options?: Object) => string} fetch - Fetch changes
 * @property {(name: string, startPoint?: string) => string} branchCreate - Create branch
 * @property {(name: string, force?: boolean) => string} branchDelete - Delete branch
 * @property {(options?: Object) => string[]} branchList - List branches
 * @property {(branch: string, create?: boolean) => string} checkout - Switch branch
 * @property {(branch: string, options?: Object) => string} merge - Merge branch
 * @property {(branch: string, options?: Object) => string} rebase - Rebase branch
 * @property {(path: string, branch?: string) => string} worktreeAdd - Create worktree
 * @property {(path: string, force?: boolean) => string} worktreeRemove - Remove worktree
 * @property {() => string[]} worktreeList - List worktrees
 * @property {(name: string, message?: string, commit?: string) => string} tagCreate - Create tag
 * @property {(name: string) => string} tagDelete - Delete tag
 * @property {() => string[]} tagList - List tags
 * @property {(url: string, path: string) => string} submoduleAdd - Add submodule
 * @property {(options?: Object) => string} submoduleUpdate - Update submodule
 * @property {() => string} nowISO - Get current timestamp in ISO format
 * @property {(sha?: string) => boolean} verifyCommit - Verify commit exists
 * @property {() => string} worktreeId - Get worktree identifier
 */

// ============================================================================
// TEMPLATE API INTERFACE
// ============================================================================

/**
 * @typedef {Object} TemplateAPI
 * @description Interface for template rendering operations
 * @property {(template: string, data?: any) => string} render - Render template string
 * @property {(template: string, out: string, data?: any) => Object} renderToFile - Render template to file
 * @property {any} env - Template environment
 */

// ============================================================================
// KNOWLEDGE HOOKS SYSTEM
// ============================================================================

/**
 * @typedef {Object} KnowledgeHook
 * @description Defines a knowledge hook with predicate and workflow
 * @property {string} id - Hook identifier
 * @property {string} title - Hook title
 * @property {string} [description] - Hook description
 * @property {PredicateDefinition} predicate - Predicate definition
 * @property {WorkflowDefinition[]} workflows - Workflow definitions
 * @property {Record<string, any>} [meta] - Hook metadata
 */

/**
 * @typedef {Object} PredicateDefinition
 * @description Defines how a hook predicate is evaluated
 * @property {PredicateType} type - Predicate type
 * @property {string} queryText - SPARQL query text
 * @property {number} [threshold] - Threshold for threshold-based predicates
 * @property {Record<string, any>} [options] - Additional predicate options
 */

/**
 * @typedef {'ASKPredicate'|'SELECTThreshold'|'SELECTCount'|'CONSTRUCTPredicate'} PredicateType
 * @description Types of predicates supported by knowledge hooks
 */

/**
 * @typedef {Object} WorkflowDefinition
 * @description Defines a workflow to execute when hook triggers
 * @property {string} id - Workflow identifier
 * @property {string} name - Workflow name
 * @property {WorkflowStep[]} steps - Workflow steps
 * @property {Record<string, any>} [meta] - Workflow metadata
 */

/**
 * @typedef {Object} WorkflowStep
 * @description Defines a single step in a workflow
 * @property {string} id - Step identifier
 * @property {StepType} type - Step type
 * @property {Record<string, any>} config - Step configuration
 * @property {string[]} [dependsOn] - Step dependencies
 */

/**
 * @typedef {'sparql'|'template'|'file'|'http'|'git'} StepType
 * @description Types of workflow steps supported
 */

// ============================================================================
// GIT-NATIVE I/O SYSTEM
// ============================================================================

/**
 * @typedef {Object} QueueManager
 * @description Manages job queues using Git refs and file system
 * @property {(job: QueueJob, priority?: QueuePriority) => Promise<void>} addJob - Add job to queue
 * @property {() => Promise<void>} processJobs - Process jobs from queue
 * @property {() => Promise<QueueStatus>} getStatus - Get queue status
 * @property {() => Promise<void>} reconcile - Reconcile interrupted jobs
 */

/**
 * @typedef {Object} QueueJob
 * @description Defines a job in the queue
 * @property {string} id - Job identifier
 * @property {string} type - Job type
 * @property {any} payload - Job payload
 * @property {Record<string, any>} [meta] - Job metadata
 * @property {QueuePriority} [priority] - Job priority
 * @property {number} timestamp - Job timestamp
 */

/**
 * @typedef {'high'|'medium'|'low'} QueuePriority
 * @description Priority levels for queue jobs
 */

/**
 * @typedef {Object} QueueStatus
 * @description Current status of the queue system
 * @property {number} totalJobs - Total jobs in queue
 * @property {Record<QueuePriority, number>} jobsByPriority - Jobs by priority
 * @property {boolean} processing - Processing status
 * @property {number} [lastProcessed] - Last processed timestamp
 */

/**
 * @typedef {Object} LockManager
 * @description Manages distributed locks using Git refs
 * @property {(name: string, ttl?: number) => Promise<boolean>} acquireLock - Acquire lock
 * @property {(name: string) => Promise<void>} releaseLock - Release lock
 * @property {(name: string) => Promise<boolean>} isLocked - Check if locked
 * @property {(name: string) => Promise<LockInfo|null>} getLockInfo - Get lock information
 * @property {() => Promise<string[]>} listLocks - List all locks
 * @property {() => Promise<void>} clearAllLocks - Clear all locks
 */

/**
 * @typedef {Object} LockInfo
 * @description Information about an active lock
 * @property {string} name - Lock name
 * @property {string} holder - Lock holder identifier
 * @property {number} createdAt - Lock creation timestamp
 * @property {number} [expiresAt] - Lock expiration timestamp
 * @property {Record<string, any>} [meta] - Lock metadata
 */

// ============================================================================
// RDF TO ZOD CONVERSION
// ============================================================================

/**
 * @typedef {Object} RDFToZodConverter
 * @description Converts RDF/SPARQL results to Zod-validated objects
 * @property {(query: string, schema: any, options?: QueryOptions) => Promise<any[]>} queryToZod - Convert SPARQL query results to Zod-validated objects
 * @property {(classUri: string, options?: SchemaOptions) => Promise<any>} generateSchemaFromClass - Generate Zod schema from RDF class definition
 * @property {(property: any, cardinality: any) => any} createZodField - Create Zod field from RDF property
 * @property {(term: any) => any} rdfTermToValue - Convert RDF term to JavaScript value
 */

/**
 * @typedef {Object} QueryOptions
 * @description Options for SPARQL query execution
 * @property {number} [timeout] - Query timeout in milliseconds
 * @property {Record<string, any>} [parameters] - Additional query parameters
 * @property {Object} [validation] - Validation options
 * @property {boolean} [validation.strict] - Strict validation mode
 * @property {boolean} [validation.allowUnknown] - Allow unknown properties
 */

/**
 * @typedef {Object} SchemaOptions
 * @description Options for Zod schema generation
 * @property {boolean} [includeOptional] - Include optional fields
 * @property {Record<string, any>} [typeMappings] - Custom type mappings
 * @property {Object} [validation] - Schema validation options
 * @property {boolean} [validation.strict] - Strict validation mode
 * @property {boolean} [validation.coerce] - Coerce types
 */

// ============================================================================
// OLLAMA RDF INTEGRATION
// ============================================================================

/**
 * @typedef {Object} OllamaRDF
 * @description AI-powered RDF processing using Ollama
 * @property {(description: string, options?: OllamaOptions) => Promise<string>} generateOntology - Generate RDF ontology
 * @property {(description: string, options?: OllamaOptions) => Promise<string>} generateSPARQLQuery - Generate SPARQL query
 * @property {(ontology: string, options?: OllamaOptions) => Promise<string>} generateZodSchemaFromOntology - Generate Zod schema from ontology
 * @property {(schema: string, examples: any[], options?: OllamaOptions) => Promise<string>} generateRDFData - Generate RDF data
 * @property {(data: string, schema: string, options?: OllamaOptions) => Promise<ValidationResult>} validateRDFData - Validate RDF data
 * @property {(description: string, options?: OllamaOptions) => Promise<string>} generateKnowledgeHook - Generate knowledge hook
 * @property {(description: string, options?: OllamaOptions) => Promise<string>} generateKnowledgeHookSystem - Generate knowledge hook system
 */

/**
 * @typedef {Object} OllamaOptions
 * @description Options for Ollama AI operations
 * @property {string} [model] - Model name to use
 * @property {number} [temperature] - Temperature for generation
 * @property {number} [maxTokens] - Maximum tokens
 * @property {Record<string, any>} [parameters] - Additional parameters
 */

/**
 * @typedef {Object} ValidationResult
 * @description Result of RDF data validation
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} [errors] - Validation errors
 * @property {string[]} [warnings] - Validation warnings
 * @property {any} [data] - Validated data
 */

// ============================================================================
// COMPOSABLE FUNCTIONS
// ============================================================================

/**
 * @function useGit
 * @description Provides access to Git operations within GitVan context
 * @returns {GitAPI} Git operations interface
 */

/**
 * @function useTemplate
 * @description Provides access to template rendering within GitVan context
 * @param {Object} [options] - Template options
 * @param {boolean} [options.autoescape] - Enable HTML auto-escape
 * @param {string[]} [options.paths] - Additional template search paths
 * @returns {TemplateAPI} Template operations interface
 */

/**
 * @function useExec
 * @description Provides access to execution capabilities within GitVan context
 * @returns {Function} Execution runner function
 */

/**
 * @function useGitVan
 * @description Provides access to the complete GitVan runtime context
 * @returns {RunContext} Runtime context object
 */

/**
 * @function useTurtle
 * @description Provides access to Turtle/RDF operations within GitVan context
 * @param {Object} [options] - Turtle options
 * @param {string} [options.graphDir] - Directory containing Turtle files
 * @returns {Promise<Object>} Turtle operations interface
 */

/**
 * @function useGraph
 * @description Provides access to RDF graph operations within GitVan context
 * @returns {Object} Graph operations interface
 */

/**
 * @function useRDFToZod
 * @description Provides access to RDF to Zod conversion within GitVan context
 * @returns {RDFToZodConverter} RDF to Zod converter interface
 */

/**
 * @function useOllamaRDF
 * @description Provides access to Ollama RDF operations within GitVan context
 * @param {Object} [options] - Ollama options
 * @param {string} [options.model] - Model name
 * @param {string} [options.baseURL] - Ollama base URL
 * @returns {OllamaRDF} Ollama RDF interface
 */

// ============================================================================
// ADDITIONAL INTERFACES
// ============================================================================

/**
 * @typedef {Object} TurtleAPI
 * @description Interface for Turtle/RDF file operations
 * @property {(graphDir: string) => Promise<void>} loadFiles - Load Turtle files from directory
 * @property {() => KnowledgeHook[]} getHooks - Get hooks from loaded data
 * @property {(query: string) => Promise<any>} query - Query the loaded RDF store
 */

/**
 * @typedef {Object} GraphAPI
 * @description Interface for RDF graph operations
 * @property {(subject: string, predicate: string, object: string) => void} addTriple - Add triple to graph
 * @property {(subject: string, predicate: string, object: string) => void} removeTriple - Remove triple from graph
 * @property {(query: string) => Promise<any>} query - Query graph with SPARQL
 * @property {(format: 'turtle'|'n3'|'json-ld') => string} serialize - Serialize graph to format
 */

/**
 * @typedef {Function} ExecRunner
 * @description Function type for executing specifications
 * @param {ExecSpec} spec - Execution specification
 * @returns {Promise<ExecResult>} Execution result
 */

// ============================================================================
// MODULE DECLARATIONS
// ============================================================================

/**
 * @module gitvan/define
 * @description Module for defining jobs, configs, and plugins
 */

/**
 * @module gitvan/composables
 * @description Module for GitVan composable functions
 */

/**
 * @module gitvan/runtime
 * @description Module for GitVan runtime functions
 */

/**
 * @module gitvan
 * @description Main GitVan module with all exports
 */

// ============================================================================
// VERSION EXPORT
// ============================================================================

/**
 * @constant {string} version
 * @description Current GitVan version
 */

// Export all types for external use
export {
  // Core types
  RunContext,
  JobRunArgs,
  JobResult,
  JobDef,
  JobKind,

  // Execution types
  ExecCLI,
  ExecJS,
  ExecTemplate,
  ExecSpec,
  ExecResult,

  // API interfaces
  GitAPI,
  TemplateAPI,

  // Knowledge hooks
  KnowledgeHook,
  PredicateDefinition,
  PredicateType,
  WorkflowDefinition,
  WorkflowStep,
  StepType,

  // Git-native I/O
  QueueManager,
  QueueJob,
  QueuePriority,
  QueueStatus,
  LockManager,
  LockInfo,

  // RDF to Zod
  RDFToZodConverter,
  QueryOptions,
  SchemaOptions,

  // Ollama RDF
  OllamaRDF,
  OllamaOptions,
  ValidationResult,

  // Additional interfaces
  TurtleAPI,
  GraphAPI,
  ExecRunner,
};
