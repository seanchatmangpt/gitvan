import { createStore, executeQuery } from "@unrdf/core";
import n3 from "n3";
import { useLog } from "../composables/log.mjs";
import { createActuationBroker } from "../enterprise/actuation-broker.mjs";
import { StepRunner } from "./step-runner.mjs";
import { ContextManager } from "./context-manager.mjs";

const { Parser, DataFactory } = n3;
const { namedNode } = DataFactory;

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const LEGACY_HOOK = "http://example.org/git-hooks#Hook";
const GITVAN_HOOK = "https://gitvan.dev/graph-hook#Hook";
const GITVAN_TITLE = "https://gitvan.dev/ontology#title";
const LEGACY_PIPELINE = "http://example.org/operations#hasPipeline";
const GITVAN_PIPELINE = "https://gitvan.dev/graph-hook#orderedPipelines";
const LEGACY_STEP = "http://example.org/operations#hasStep";
const GITVAN_STEP = "https://gitvan.dev/op#steps";

function termValue(term) {
  return term?.value ?? term ?? null;
}

function localName(iri) {
  const value = String(iri || "");
  const hash = value.lastIndexOf("#");
  const slash = value.lastIndexOf("/");
  const colon = value.lastIndexOf(":");
  return value.slice(Math.max(hash, slash, colon) + 1);
}

function termToValue(term) {
  if (!term) return null;
  if (term.termType === "Literal") return term.value;
  return term.value ?? String(term);
}

function queryVariables(rows) {
  const names = new Set();
  for (const row of rows || []) {
    for (const key of Object.keys(row || {})) {
      if (key !== "get") names.add(key);
    }
  }
  return [...names];
}

/**
 * WorkflowEngine loads admitted Turtle observations into an in-memory RDF store
 * and derives workflow execution from graph edges. The graph is the canonical
 * topology; generated query strings are not used to select actuation targets.
 */
export class WorkflowEngine {
  constructor(options = {}) {
    this.graphDir = options.graphDir || "./workflows";
    this.logger = options.logger || useLog();
    this.enterprisePolicy = options.enterprisePolicy || {};
    this.store = null;
    this.observationReceipts = [];
    this.stepRunner = new StepRunner({
      logger: this.logger,
      enterprisePolicy: this.enterprisePolicy,
    });
    this.contextManager = new ContextManager();
  }

  async _observedFileRead(id, filePath, reader) {
    const broker = createActuationBroker(
      {
        id,
        type: "file",
        config: { operation: "read", filePath },
      },
      this.enterprisePolicy
    );
    const admission = broker.admit();
    if (!admission.admitted) throw admission.error;

    const startedAt = performance.now();
    try {
      const value = await reader(admission.step.config.filePath);
      broker.complete({ success: true, duration: performance.now() - startedAt });
      this.observationReceipts.push(...broker.receipts());
      return { value, path: admission.step.config.filePath };
    } catch (error) {
      broker.complete({
        success: false,
        error: error.message,
        errorCode: error.code,
        duration: performance.now() - startedAt,
      });
      this.observationReceipts.push(...broker.receipts());
      throw error;
    }
  }

  async initialize() {
    const { readdir, readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");

    this.logger.info(`🚀 Initializing WorkflowEngine with graphDir: ${this.graphDir}`);
    this.store = await createStore();
    this.observationReceipts = [];

    const directory = await this._observedFileRead(
      "workflow-source-directory",
      this.graphDir,
      (path) => readdir(path)
    );
    const fileNames = directory.value.filter((name) => name.endsWith(".ttl")).sort();
    let loadedFiles = 0;

    for (const name of fileNames) {
      const requestedPath = join(directory.path, name);
      const source = await this._observedFileRead(
        `workflow-source:${name}`,
        requestedPath,
        (path) => readFile(path, "utf8")
      );
      try {
        const quads = new Parser({ baseIRI: `file://${source.path}` }).parse(source.value);
        for (const quad of quads) this.store.addQuad(quad);
        loadedFiles += 1;
      } catch (error) {
        const wrapped = new Error(`Invalid workflow Turtle ${name}: ${error.message}`);
        wrapped.code = "WORKFLOW_TURTLE_REFUSED";
        throw wrapped;
      }
    }

    this.logger.info(`📁 Loaded ${loadedFiles} Turtle workflow files from admitted source directory`);
    this.logger.info(`📊 Workflow graph initialized with ${this.store.size} quads`);
    return this;
  }

  _ensureStore() {
    if (!this.store) throw new Error("WorkflowEngine is not initialized");
  }

  _objects(subject, predicates) {
    const result = [];
    for (const predicate of predicates) {
      for (const quad of this.store.getQuads(subject, namedNode(predicate), null, null)) {
        result.push(quad.object);
      }
    }
    return result;
  }

  _firstObject(subject, predicates) {
    return this._objects(subject, predicates)[0] || null;
  }

  _hookSubjects() {
    const subjects = new Map();
    for (const type of [LEGACY_HOOK, GITVAN_HOOK]) {
      for (const quad of this.store.getQuads(null, namedNode(RDF_TYPE), namedNode(type), null)) {
        subjects.set(quad.subject.value, quad.subject);
      }
    }
    return [...subjects.values()];
  }

  _graphAdapter() {
    return {
      store: this.store,
      stats: { quadCount: this.store.size },
      query: async (sparql) => {
        const result = await executeQuery(this.store, sparql);
        if (typeof result === "boolean") {
          return { type: "ask", boolean: result };
        }
        if (Array.isArray(result) && result.type === "select") {
          const rows = result.rows || result;
          return {
            type: "select",
            variables: queryVariables(rows),
            results: rows,
          };
        }
        if (Array.isArray(result) && (result.type === "construct" || result.type === "describe")) {
          const quads = result.quads || result;
          return { type: result.type, quads, store: quads };
        }
        return { type: "unknown", result };
      },
    };
  }

  async listWorkflows() {
    if (!this.store) await this.initialize();
    return this._hookSubjects().map((subject) => {
      const title = this._firstObject(subject, [RDFS_LABEL, GITVAN_TITLE]);
      const pipelines = this._objects(subject, [LEGACY_PIPELINE, GITVAN_PIPELINE]);
      return {
        id: subject.value,
        title: termValue(title) || subject.value,
        predicate: null,
        pipelineCount: pipelines.length,
      };
    });
  }

  _resolveWorkflowSubject(workflowId) {
    const exact = this._hookSubjects().find((subject) => subject.value === workflowId);
    if (exact) return exact;

    const candidates = this._hookSubjects().filter((subject) => localName(subject.value) === workflowId);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      const error = new Error(`Workflow ID is ambiguous: ${workflowId}`);
      error.code = "WORKFLOW_ID_AMBIGUOUS_REFUSED";
      throw error;
    }
    return null;
  }

  async executeWorkflow(workflowId, options = {}) {
    if (!this.store) await this.initialize();

    const workflow = this._resolveWorkflowSubject(workflowId);
    if (!workflow) {
      const error = new Error(`Workflow not found: ${workflowId}`);
      error.code = "WORKFLOW_NOT_FOUND";
      throw error;
    }

    const title = termValue(this._firstObject(workflow, [RDFS_LABEL, GITVAN_TITLE])) || workflow.value;
    const pipelines = this._objects(workflow, [LEGACY_PIPELINE, GITVAN_PIPELINE]);
    if (pipelines.length === 0) {
      const error = new Error(`Workflow has no pipeline: ${workflow.value}`);
      error.code = "WORKFLOW_PIPELINE_REFUSED";
      throw error;
    }
    if (pipelines.length > 1) {
      const error = new Error(`Workflow has multiple pipelines without an admitted ordering: ${workflow.value}`);
      error.code = "WORKFLOW_PIPELINE_AMBIGUOUS_REFUSED";
      throw error;
    }

    const steps = this._parseWorkflowSteps(pipelines[0]);
    if (steps.length === 0) {
      const error = new Error(`Workflow pipeline has no executable steps: ${termValue(pipelines[0])}`);
      error.code = "WORKFLOW_EMPTY_PIPELINE_REFUSED";
      throw error;
    }

    this.logger.info(`🎯 Executing workflow: ${workflow.value}`);
    const stepResults = [];
    const graph = this._graphAdapter();

    for (const step of steps) {
      const result = await this.stepRunner.executeStep(
        step,
        this.contextManager,
        graph,
        null,
        options
      );
      stepResults.push(result);
      if (!result.success) {
        this.logger.error(`❌ Step ${step.id} ended with standing ${result.standing}`);
        break;
      }
      this.logger.info(`✅ Step executed: ${step.id}`);
    }

    const success = stepResults.length === steps.length && stepResults.every((result) => result.success);
    return {
      workflowId: workflow.value,
      title,
      status: success ? "completed" : "failed",
      standing: success ? "EXECUTED" : stepResults.at(-1)?.standing || "FAILED",
      steps: stepResults,
      totalSteps: steps.length,
      executedSteps: stepResults.length,
      observationReceipts: [...this.observationReceipts],
      executedAt: new Date().toISOString(),
    };
  }

  _parseWorkflowSteps(pipeline) {
    this._ensureStore();
    const stepTerms = this._objects(pipeline, [LEGACY_STEP, GITVAN_STEP]);

    return stepTerms.map((stepTerm) => {
      const typeTerms = this._objects(stepTerm, [RDF_TYPE]);
      const stepType = typeTerms.map((term) => localName(term.value)).find((name) => name.endsWith("Step"));
      if (!stepType) {
        const error = new Error(`Workflow step has no recognized *Step RDF type: ${stepTerm.value}`);
        error.code = "WORKFLOW_STEP_TYPE_REFUSED";
        throw error;
      }

      const type = stepType.slice(0, -"Step".length).toLowerCase();
      const config = {};
      for (const quad of this.store.getQuads(stepTerm, null, null, null)) {
        if (quad.predicate.value === RDF_TYPE) continue;
        const property = localName(quad.predicate.value);
        const mapped = this._mapPropertyName(property, type);
        const value = termToValue(quad.object);
        if (config[mapped] === undefined) config[mapped] = value;
        else if (Array.isArray(config[mapped])) config[mapped].push(value);
        else config[mapped] = [config[mapped], value];
      }
      return { id: stepTerm.value, type, config };
    });
  }

  _mapPropertyName(turtleProp, stepType) {
    const mappings = {
      sparql: { text: "query", outputMapping: "outputMapping" },
      template: { template: "template", text: "template", outputPath: "outputPath" },
      file: { filePath: "filePath", operation: "operation", content: "content", sourcePath: "sourcePath", targetPath: "targetPath" },
      http: { url: "url", httpUrl: "url", method: "method", httpMethod: "method", headers: "headers", body: "body" },
      cli: { command: "command", cwd: "cwd", timeout: "timeout" },
    };
    return mappings[stepType]?.[turtleProp] || turtleProp;
  }

  async runQuery(sparqlQuery) {
    if (!this.store) await this.initialize();
    return executeQuery(this.store, sparqlQuery);
  }

  async validate() {
    const error = new Error(
      "Workflow SHACL validation is not admitted in this runtime profile; existence checks are available through workflow validate"
    );
    error.code = "WORKFLOW_SHACL_VALIDATION_UNSUPPORTED";
    throw error;
  }

  async getStats() {
    if (!this.store) await this.initialize();
    return {
      quadCount: this.store.size,
      initialized: true,
      workflows: this._hookSubjects().length,
      observationReceiptCount: this.observationReceipts.length,
    };
  }

  async cleanup() {
    this.store = null;
    this.observationReceipts = [];
    this.contextManager = new ContextManager();
  }
}

export async function createWorkflowEngine(options = {}) {
  const engine = new WorkflowEngine(options);
  await engine.initialize();
  return engine;
}
