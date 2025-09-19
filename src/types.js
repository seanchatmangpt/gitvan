/**
 * ============================
 * GitVan / ByteGit Global Types
 * ============================
 */

/** @typedef {"high"|"medium"|"low"} JobPriority */
/** @typedef {">"|">="|"<"|"<="|"=="|"!="} ThresholdOperator */

/**
 * @typedef {Object} QueueConfig
 * @property {number} concurrency
 * @property {number} interval
 * @property {number} intervalCap
 */

/**
 * @typedef {Object} WorkerConfig
 * @property {number} threads
 * @property {number} maxJobs
 * @property {number} timeout
 */

/**
 * @typedef {Object} FSConfig
 * @property {number} retryDelay
 * @property {boolean} maxOpenFDsGuard
 */

/**
 * @typedef {Object} PathConfig
 * @property {string} tmp
 * @property {string} queue
 * @property {string} cache
 * @property {string} artifacts
 * @property {string} notesRef
 * @property {string} locksRef
 * @property {string} execRef
 */

/**
 * @typedef {Object} GitConfig
 * @property {number} notesBatchSize
 * @property {boolean} gcAuto
 * @property {boolean} shardQueues
 */

/**
 * @typedef {Object} GitNativeIOOptions
 * @property {string} [cwd]
 * @property {Console} [logger]
 * @property {{queue?:QueueConfig,workers?:WorkerConfig,fs?:FSConfig,paths?:PathConfig,git?:GitConfig}} [config]
 */

/**
 * @typedef {Object} JobMetadata
 * @property {string} [name]
 * @property {Record<string,any>} [tags]
 */

/**
 * @typedef {Object} JobRecord
 * @property {string} id
 * @property {JobPriority} priority
 * @property {"queued"|"running"|"completed"|"failed"} status
 * @property {number} timestamp
 * @property {number} [startedAt]
 * @property {number} [completedAt]
 * @property {boolean} [recovered]
 * @property {number} [recoveredAt]
 * @property {JobMetadata} [metadata]
 * @property {any} [result]
 * @property {string} [error]
 */

/**
 * @typedef {Object} QueueStatus
 * @property {number} pending
 * @property {number} size
 * @property {boolean} isPaused
 * @property {number} concurrency
 */

/**
 * @typedef {Object} ReceiptStats
 * @property {number} totalReceipts
 * @property {number} totalMetrics
 * @property {number} totalExecutions
 * @property {number} pendingResults
 * @property {number} pendingMetrics
 * @property {number} pendingExecutions
 */

/**
 * @typedef {Object} SnapshotStats
 * @property {number} hits
 * @property {number} misses
 * @property {number} size
 * @property {number} entries
 * @property {number} hitRate
 * @property {number} maxSize
 * @property {number} sizeMB
 */

/**
 * @typedef {Object} SystemStatus
 * @property {{high:QueueStatus,medium:QueueStatus,low:QueueStatus}} queue
 * @property {Array<LockRecord>} locks
 * @property {ReceiptStats} receipts
 * @property {SnapshotStats} snapshots
 * @property {{total:number,active:number,available:number}} workers
 */

/**
 * ============================
 * Git-Native: Lock / Notes / Snapshots
 * ============================
 */

/**
 * @typedef {Object} LockOptions
 * @property {number} [timeout]
 * @property {string|null} [fingerprint]
 * @property {boolean} [exclusive=true]
 */

/**
 * @typedef {Object} LockRecord
 * @property {string} name
 * @property {string} ref
 * @property {string} id
 * @property {number} acquiredAt
 * @property {number} timeout
 * @property {string} fingerprint
 * @property {boolean} exclusive
 * @property {number} pid
 */

/**
 * @typedef {Object} ReceiptOptions
 * @property {number} [notesBatchSize=100]
 * @property {string} [notesRef]
 * @property {string} [metricsRef]
 * @property {string} [executionsRef]
 */

/**
 * @typedef {Object} ResultReceipt
 * @property {string} hookId
 * @property {string} timestamp
 * @property {any} result
 * @property {Record<string,any>} metadata
 * @property {string} commit
 * @property {string} branch
 */

/**
 * @typedef {Object} MetricEntry
 * @property {string} timestamp
 * @property {string} commit
 * @property {string} branch
 * @property {Record<string,any>} [values]
 */

/**
 * @typedef {Object} ExecutionEntry
 * @property {string} executionId
 * @property {string} timestamp
 * @property {string} commit
 * @property {string} branch
 * @property {Record<string,any>} details
 */

/**
 * @typedef {Object} SnapshotOptions
 * @property {string} [cacheDir]
 * @property {string} [tempDir]
 * @property {number} [maxCacheSize]
 * @property {boolean} [compressionEnabled]
 */

/**
 * @typedef {Object} SnapshotHeader
 * @property {string} key
 * @property {string} contentHash
 * @property {number} timestamp
 * @property {Record<string,any>} metadata
 * @property {string} commit
 * @property {string} branch
 */

/**
 * ============================
 * Knowledge Hooks: Model / Predicates / Plans
 * ============================
 */

/** @typedef {string} HookId */

/** @typedef {"ask"|"selectThreshold"|"resultDelta"|"shaclAllConform"} PredicateKind */

/**
 * @typedef {Object} AskPredicate
 * @property {"ask"} type
 * @property {{query:string}} definition
 */

/**
 * @typedef {Object} SelectThresholdPredicate
 * @property {"selectThreshold"} type
 * @property {{query:string,threshold:number,operator:ThresholdOperator}} definition
 */

/**
 * @typedef {Object} ResultDeltaPredicate
 * @property {"resultDelta"} type
 * @property {{query:string}} definition
 */

/**
 * @typedef {Object} ShaclAllConformPredicate
 * @property {"shaclAllConform"} type
 * @property {{shapesText?:string,shapesPath?:string}} definition
 */

/** @typedef {AskPredicate|SelectThresholdPredicate|ResultDeltaPredicate|ShaclAllConformPredicate} PredicateDefinition */

/**
 * @typedef {Object} HookMeta
 * @property {HookId} id
 * @property {string} title
 * @property {string} [description]
 */

/**
 * @typedef {Object} HookDefinition
 * @property {HookMeta} meta
 * @property {PredicateDefinition} predicateDefinition
 * @property {Array<WorkflowSpec>} workflows
 */

/** @typedef {"TemplateStep"|"ShellStep"|"HttpStep"|"SparqlStep"|"CustomStep"} StepKind */

/**
 * @typedef {Object} BaseStep
 * @property {string} id
 * @property {StepKind} kind
 * @property {string[]} [dependsOn]
 * @property {Record<string,any>} [inputs]
 * @property {Record<string,any>} [outputs]
 * @property {string} [description]
 */

/** @typedef {BaseStep & {kind:"TemplateStep", template:string, filePath:string}} TemplateStep */
/** @typedef {BaseStep & {kind:"ShellStep", command:string, env?:Record<string,string>}} ShellStep */
/** @typedef {BaseStep & {kind:"HttpStep", url:string, method?:string, headers?:Record<string,string>, body?:string}} HttpStep */
/** @typedef {BaseStep & {kind:"SparqlStep", query:string, outputMapping?:Record<string,string>}} SparqlStep */
/** @typedef {BaseStep & {kind:"CustomStep", handler:string}} CustomStep */

/** @typedef {TemplateStep|ShellStep|HttpStep|SparqlStep|CustomStep} StepSpec */

/**
 * @typedef {Object} WorkflowSpec
 * @property {string} id
 * @property {string} [title]
 * @property {StepSpec[]} steps
 */

/**
 * @typedef {Object} PlanNode
 * @property {string} stepId
 * @property {string[]} after
 */

/**
 * @typedef {Object} Plan
 * @property {string} workflowId
 * @property {PlanNode[]} order
 */

/**
 * @typedef {Object} ExecutionContext
 * @property {Record<string,any>} state
 * @property {Record<string,any>} metadata
 */

/**
 * @typedef {Object} StepResult
 * @property {string} stepId
 * @property {"ok"|"error"} status
 * @property {any} [data]
 * @property {string} [error]
 * @property {number} startedAt
 * @property {number} completedAt
 */

/**
 * @typedef {Object} PredicateEvaluationResult
 * @property {PredicateKind} predicateType
 * @property {boolean} result
 * @property {Record<string,any>} context
 * @property {number} evaluationTime
 */

/**
 * @typedef {Object} OrchestratorStats
 * @property {number} hooksLoaded
 * @property {boolean} contextInitialized
 * @property {number} [runs]
 */

/**
 * ============================
 * RDF Engine / Turtle API
 * ============================
 */

/**
 * @typedef {Object} RdfEngineOptions
 * @property {string} [baseIRI]
 * @property {boolean} [deterministic]
 * @property {number} [timeoutMs]
 * @property {(m:{event:string;data?:any;durMs?:number})=>void} [onMetric]
 * @property {{debug:Function,info:Function,warn:Function,error:Function}} [logger]
 */

/** @typedef {"NamedNode"|"BlankNode"|"Literal"|"DefaultGraph"} TermType */

/**
 * @typedef {Object} TermJSON
 * @property {TermType} termType
 * @property {string} value
 * @property {string} [language]
 * @property {string} [datatype]
 */

/**
 * @typedef {Object} AskQueryOutput
 * @property {"ask"} type
 * @property {boolean} boolean
 */

/**
 * @typedef {Object} SelectQueryOutput
 * @property {"select"} type
 * @property {string[]} variables
 * @property {Array<Record<string,TermJSON|null>>} results
 */

/**
 * @typedef {Object} ConstructQueryOutput
 * @property {"construct"|"describe"} type
 * @property {any} store
 * @property {any[]} quads
 */

/**
 * @typedef {Object} UpdateQueryOutput
 * @property {"update"} type
 * @property {true} ok
 */

/** @typedef {AskQueryOutput|SelectQueryOutput|ConstructQueryOutput|UpdateQueryOutput} RdfQueryOutput */

/**
 * @typedef {Object} ShaclViolation
 * @property {string|null} focusNode
 * @property {string|null} path
 * @property {string|null} message
 * @property {string|null} severity
 * @property {string|null} sourceShape
 * @property {string|null} value
 */

/**
 * @typedef {Object} ShaclReport
 * @property {boolean} conforms
 * @property {ShaclViolation[]} results
 */

/**
 * @typedef {Object} TurtleAPI
 * @property {any} store
 * @property {{root:string,graphDir:string,uriRoots:Record<string,string>}} config
 * @property {(head:any)=>any[]} readList
 * @property {(subject:any,type:string)=>boolean} isA
 * @property {(subject:any,predicate:string)=>any} getOne
 * @property {(subject:any,predicate:string)=>any[]} getAll
 * @property {()=>Array<{node:any,id:string,title:string,pred:any,pipelines:any[]}>} getHooks
 * @property {(pipelineNode:any)=>any[]} getPipelineSteps
 * @property {(maybeUri:string)=>Promise<string>} resolveText
 * @property {(queryNode:any)=>Promise<string>} getQueryText
 * @property {(templateNode:any)=>Promise<string>} getTemplateText
 * @property {()=>string} getGraphDir
 * @property {()=>Record<string,string>} getUriRoots
 * @property {()=>boolean} isAutoLoadEnabled
 * @property {()=>boolean} isValidationEnabled
 */

/**
 * ============================
 * OllamaRDF / AI Composable
 * ============================
 */

/**
 * @typedef {Object} OllamaRDFOptions
 * @property {string} [model]
 * @property {string} [baseURL]
 * @property {Record<string,string>} [namespaces]
 */

/**
 * @typedef {Object} RDFValidationReport
 * @property {boolean} isValid
 * @property {string[]} syntaxErrors
 * @property {string[]} semanticErrors
 * @property {string[]} typeErrors
 * @property {string[]} cardinalityErrors
 * @property {string[]} recommendations
 * @property {number} score
 */

/**
 * @typedef {Object} KnowledgeHookGenBundle
 * @property {string} hookDefinition  // Turtle
 * @property {string} sparqlQuery     // SPARQL
 * @property {string} zodSchema       // code string
 * @property {string} description
 */

/**
 * @typedef {Object} KnowledgeHookSystemGen
 * @property {string} ontology
 * @property {string[]} hooks
 * @property {string[]} queries
 * @property {string[]} schemas
 * @property {string} sampleData
 * @property {string} documentation
 * @property {string} description
 */

/**
 * ============================
 * Packs / Manifests
 * ============================
 */

/**
 * @typedef {Object} PackManifest
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {string} author
 * @property {string} license
 * @property {string[]} jobs
 * @property {string[]} templates
 * @property {string[]} [features]
 * @property {string[]} [tech_stack]
 * @property {string[]} [ai_features]
 * @property {string[]} [performance_features]
 * @property {string[]} [security_features]
 */

/**
 * @typedef {Object} PackJobSpec
 * @property {string} name
 * @property {string} [description]
 * @property {Record<string,any>} [defaults]
 * @property {Record<string,"string"|"number"|"boolean"|"enum"|"json">} [args]
 */

/**
 * ============================
 * ByteStar / ByteGit (Deterministic Kernel IR)
 * ============================
 */

/**
 * @typedef {Object} KernelSpec
 * @property {string} id                 // e.g., "k_bloom8"
 * @property {number} ticks              // <= 8
 * @property {boolean} branchFree        // true
 * @property {number} inputs             // bytes in
 * @property {number} outputs            // bytes out
 * @property {string} cSymbol            // exported C symbol
 */

/**
 * @typedef {Object} Envelope64
 * @property {Uint8Array} bytes          // 64-byte immutable payload
 * @property {string} digest             // content address (e.g., blake3)
 */

/**
 * @typedef {Object} PlanSpec
 * @property {string} id                 // kvm:Plan id
 * @property {Array<{kernel:string, in:string[], out:string[]}>} steps
 * @property {Record<string,string>} [env] // explicit dataflow bindings
 */

/**
 * @typedef {Object} SLA
 * @property {number} p50_ns
 * @property {number} p99_ns
 * @property {number} hops               // <= 8
 * @property {number} ticksPerKernel     // <= 8
 */
