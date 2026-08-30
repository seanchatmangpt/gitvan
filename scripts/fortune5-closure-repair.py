from __future__ import annotations

import json
import re
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, value: str) -> None:
    Path(path).write_text(value)


def replace_once(path: str, old: str, new: str) -> None:
    value = read(path)
    count = value.count(old)
    if count != 1:
        raise SystemExit(
            f"{path}: expected exactly one match, got {count}: {old!r}"
        )
    write(path, value.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, *, flags: int = 0) -> None:
    value = read(path)
    updated, count = re.subn(
        pattern, lambda _match: replacement, value, count=1, flags=flags
    )
    if count != 1:
        raise SystemExit(
            f"{path}: expected exactly one regex match, got {count}: {pattern!r}"
        )
    write(path, updated)


# Dependency graph + generated lock inputs.
package_path = Path("package.json")
package = json.loads(package_path.read_text())
deps = package["dependencies"]
dev = package["devDependencies"]
for dead in ["@unrdf/knowledge-engine", "@unrdf/streaming", "tar"]:
    deps.pop(dead, None)
deps.pop("unbuild", None)
deps.update(
    {
        "@opentelemetry/api": "1.9.1",
        "@opentelemetry/auto-instrumentations-node": "0.79.0",
        "@opentelemetry/exporter-metrics-otlp-http": "0.221.0",
        "@opentelemetry/exporter-trace-otlp-http": "0.221.0",
        "@opentelemetry/resources": "2.10.0",
        "@opentelemetry/sdk-metrics": "2.10.0",
        "@opentelemetry/sdk-node": "0.221.0",
        "@opentelemetry/sdk-trace-base": "2.10.0",
        "@opentelemetry/semantic-conventions": "1.43.0",
        "defu": "6.1.7",
        "js-yaml": "4.3.1",
        "minimatch": "10.2.6",
        "n3": "2.2.0",
    }
)
dev["@types/node"] = "22.20.1"
dev["unbuild"] = "3.6.1"
package["dependencies"] = dict(sorted(deps.items()))
package["devDependencies"] = dict(sorted(dev.items()))
package_path.write_text(json.dumps(package, indent=2) + "\n")

replace_once(
    "src/unrdf-hooks/core/state.ts",
    "    const newValue = isFunction(setter) ? setter(this.value) : setter;\n",
    "    const newValue = typeof setter === 'function'\n"
    "      ? (setter as (prev: T) => T)(this.value)\n"
    "      : setter;\n",
)
replace_once(
    "src/unrdf-hooks/events/hooks.ts",
    "): AsyncGenerator<T, void, unknown> {\n",
    "): AsyncIterableIterator<T> {\n",
)
replace_once(
    "src/unrdf-hooks/examples/advanced-patterns.ts",
    "    return () => subscribers.delete(callback);\n",
    "    return () => {\n      subscribers.delete(callback);\n    };\n",
)
replace_once(
    "src/unrdf-hooks/repository/hooks.ts",
    "import { DEFAULT_REPOSITORY_STATE_OPTIONS } from './types.js';\n\n"
    "const execFileAsync = promisify(execFile);\n",
    "import { DEFAULT_REPOSITORY_STATE_OPTIONS } from './types.js';\n\n"
    "type MutableRemoteInfo = { -readonly [K in keyof RemoteInfo]?: RemoteInfo[K] };\n"
    "type MutableWorktreeInfo = { -readonly [K in keyof WorktreeInfo]?: WorktreeInfo[K] };\n\n"
    "const execFileAsync = promisify(execFile);\n",
)
replace_once(
    "src/unrdf-hooks/repository/hooks.ts",
    "        const remotes: Map<string, Partial<RemoteInfo>> = new Map();\n",
    "        const remotes: Map<string, MutableRemoteInfo> = new Map();\n",
)
replace_once(
    "src/unrdf-hooks/repository/hooks.ts",
    "        let current: Partial<WorktreeInfo> = {};\n",
    "        let current: MutableWorktreeInfo = {};\n",
)

hooks_build = Path(".github/workflows/hooks-build.yml")
hooks_text = hooks_build.read_text()
for dead in [
    "            '@unrdf/knowledge-engine',\n",
    "            '@unrdf/streaming',\n",
]:
    if hooks_text.count(dead) != 1:
        raise SystemExit(f"hooks-build expected one stale probe: {dead.strip()}")
    hooks_text = hooks_text.replace(dead, "", 1)
hooks_build.write_text(hooks_text)

workspace = Path("pnpm-workspace.yaml")
workspace_text = workspace.read_text()
workspace_text = workspace_text.replace("protobufjs: 7.5.5", "protobufjs: 7.6.5")
workspace_text = workspace_text.replace(
    "'protobufjs@7.5.5': false", "'protobufjs@7.6.5': false"
)
workspace_text = workspace_text.replace(
    "patched in protobufjs 7.5.5", "patched in protobufjs 7.6.5"
)
if "  esbuild: 0.28.1\n" not in workspace_text:
    anchor = "  protobufjs: 7.6.5\n"
    if workspace_text.count(anchor) != 1:
        raise SystemExit("pnpm-workspace protobufjs override anchor drifted")
    workspace_text = workspace_text.replace(
        anchor, anchor + "  esbuild: 0.28.1\n", 1
    )
if "  'esbuild@0.28.1': true\n" not in workspace_text:
    anchor = "  'esbuild@0.28.2': true\n"
    if workspace_text.count(anchor) != 1:
        raise SystemExit("pnpm-workspace esbuild minimum-age anchor drifted")
    workspace_text = workspace_text.replace(
        anchor, anchor + "  'esbuild@0.28.1': true\n", 1
    )
workspace.write_text(workspace_text)

telemetry = Path("src/telemetry/index.mjs")
telemetry_text = telemetry.read_text()
telemetry_text = telemetry_text.replace("SEMRESATTRS_SERVICE_NAME", "ATTR_SERVICE_NAME")
telemetry_text = telemetry_text.replace(
    "SEMRESATTRS_SERVICE_VERSION", "ATTR_SERVICE_VERSION"
)
telemetry_text = telemetry_text.replace(
    "SEMRESATTRS_DEPLOYMENT_ENVIRONMENT", "ATTR_DEPLOYMENT_ENVIRONMENT_NAME"
)
telemetry_text = telemetry_text.replace(
    "serviceVersion: '2.1.0'", "serviceVersion: '4.0.1'"
)
telemetry.write_text(telemetry_text)

# Predicate engine: normalize current UNRDF ASK + SELECT row result shapes.
replace_once(
    "src/hooks/PredicateEvaluator.mjs",
    '    const result = await this._executeQueryWithCache(queryWithPrefixes, currentGraph);\n'
    "    return result.boolean || false;\n",
    '    const result = await this._executeQueryWithCache(\n'
    "      queryWithPrefixes,\n"
    "      currentGraph\n"
    "    );\n\n"
    '    if (typeof result === "boolean") {\n'
    "      return result;\n"
    "    }\n"
    '    if (result && typeof result.boolean === "boolean") {\n'
    "      return result.boolean;\n"
    "    }\n\n"
    '    throw new Error("ASK query returned an unsupported result shape");\n',
)
regex_once(
    "src/hooks/PredicateEvaluator.mjs",
    r'''  _extractNumericValue\(result\) \{\n.*?\n  \}\n\n  /\*\*\n   \* Get evaluation statistics''',
    '''  _extractNumericValue(result) {
    if (!result) return 0;

    const rows = Array.isArray(result)
      ? result
      : Array.isArray(result.rows)
        ? result.rows
        : Array.isArray(result.results)
          ? result.results
          : [];

    if (rows.length === 0) return 0;

    const firstResult = rows[0];
    const values =
      firstResult instanceof Map
        ? Array.from(firstResult.values())
        : Object.values(firstResult).filter(
            (value) => typeof value !== "function"
          );

    if (values.length === 0) return 0;

    const firstValue = values[0];
    const rawValue = firstValue?.value ?? firstValue;
    const numericValue = Number.parseFloat(String(rawValue));
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  /**
   * Get evaluation statistics''',
    flags=re.S,
)

# Hook orchestration: capture authority root and make receipt truth authoritative.
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    'import { useChangeStream } from "../composables/useChangeStream.mjs";\n',
    'import { useChangeStream } from "../composables/useChangeStream.mjs";\n'
    'import { tryUseGitVan } from "../core/context.mjs";\n',
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    '    this.graphDir = options.graphDir || "./hooks";\n'
    "    this.context = options.context;\n"
    "    this.logger = options.logger || console;\n"
    "    this.timeoutMs = options.timeoutMs || 300000; // 5 minutes default\n"
    "    this.cwd = options.cwd || process.cwd();\n",
    '    this.graphDir = options.graphDir || "./hooks";\n'
    "    const activeContext = options.context || tryUseGitVan?.() || null;\n"
    "    this.context = activeContext;\n"
    "    this.logger = options.logger || console;\n"
    "    this.timeoutMs = options.timeoutMs || 300000; // 5 minutes default\n"
    "    this.cwd = options.cwd || activeContext?.cwd || process.cwd();\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "    this.predicateEvaluator = new PredicateEvaluator({ logger: this.logger });\n",
    "    this.predicateEvaluator = new PredicateEvaluator({\n"
    "      logger: this.logger,\n"
    "      cwd: this.cwd,\n"
    "    });\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "  async evaluate(options = {}) {\n    const startTime = performance.now();\n",
    "  async evaluate(options = {}) {\n"
    "    const startedAt = new Date().toISOString();\n"
    "    const startTime = performance.now();\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "      const evaluationResult = await this._finalizeEvaluation(\n"
    "        evaluationResults,\n"
    "        executionResults || [],\n"
    "        startTime\n"
    "      );\n",
    "      const evaluationResult = await this._finalizeEvaluation(\n"
    "        evaluationResults,\n"
    "        executionResults || [],\n"
    "        startTime,\n"
    "        startedAt\n"
    "      );\n",
)
regex_once(
    "src/hooks/HookOrchestrator.mjs",
    r'''      // Get the previous commit hash\n      const HEAD = await git\.symbolicRef\("HEAD"\);\n.*?      const previousCommit = logResult\[1\]\.hash;\n''',
    '''      const revisions = (await git.revList(["--max-count=2", "HEAD"]))
        .split("\\n")
        .map((revision) => revision.trim())
        .filter(Boolean);

      if (revisions.length < 2) {
        this.logger.info("📚 Only one commit in history, no previous state");
        this.previousGraph = null;
        return;
      }

      const previousCommit = revisions[1];
''',
    flags=re.S,
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "      const previousState = await this.gitNativeIO.loadSnapshot(\n"
    "        `graph-state-${previousCommit}`\n"
    "      );\n",
    "      const previousState = await this.gitNativeIO.getSnapshot(\n"
    "        `graph-state-${previousCommit}`\n"
    "      );\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "          const executionId = this._generateExecutionId();\n\n          try {\n",
    "          const executionId = this._generateExecutionId();\n"
    "          const executionStartedAt = Date.now();\n\n"
    "          try {\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "              // Initialize execution context\n"
    "              await this.contextManager.initialize({\n",
    "              // Isolate mutable context per concurrent workflow execution.\n"
    "              const contextManager = new ContextManager({ logger: this.logger });\n"
    "              await contextManager.initialize({\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "                      this.contextManager,\n"
    "                      this.graph,\n"
    "                      this.turtle,\n"
    "                      options\n",
    "                      contextManager,\n"
    "                      this.graph,\n"
    "                      this.turtle,\n"
    "                      { ...options, cwd: this.cwd }\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "              const executionResult = {\n"
    "                hookId: hook.id,\n"
    "                success: true,\n"
    "                stepResults,\n"
    "                outputs: this.contextManager.getOutputs(),\n"
    "                executionId,\n"
    "              };\n",
    "              const workflowSucceeded = stepResults.every(\n"
    "                (stepResult) => stepResult?.success === true\n"
    "              );\n"
    "              const executionResult = {\n"
    "                hookId: hook.id,\n"
    "                success: workflowSucceeded,\n"
    "                stepResults,\n"
    "                outputs: contextManager.getOutputs(),\n"
    "                executionId,\n"
    "              };\n",
)
value = read("src/hooks/HookOrchestrator.mjs")
old_duration = "                duration: Date.now() - evaluation.startTime,\n"
if value.count(old_duration) != 2:
    raise SystemExit(
        "HookOrchestrator expected two stale evaluation.startTime durations"
    )
write(
    "src/hooks/HookOrchestrator.mjs",
    value.replace(
        old_duration, "                duration: Date.now() - executionStartedAt,\n"
    ),
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "                stepsExecuted: stepResults.length,\n                success: true,\n",
    "                stepsExecuted: stepResults.length,\n"
    "                success: workflowSucceeded,\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "                this.logger.info(`✅ Workflow completed for hook: ${hook.id}`);\n",
    '                const icon = workflowSucceeded ? "✅" : "❌";\n'
    "                this.logger.info(\n"
    '                  `${icon} Workflow ${workflowSucceeded ? "completed" : "failed"} for hook: ${hook.id}`\n'
    "                );\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "  async _finalizeEvaluation(evaluationResults, executionResults, startTime) {\n"
    "    const endTime = performance.now();\n"
    "    const duration = endTime - startTime;\n",
    "  async _finalizeEvaluation(\n"
    "    evaluationResults,\n"
    "    executionResults,\n"
    "    startTime,\n"
    "    startedAt\n"
    "  ) {\n"
    "    const endTime = performance.now();\n"
    "    const endedAt = new Date().toISOString();\n"
    "    const duration = endTime - startTime;\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "    const result = {\n      success: true,\n      duration: Math.round(duration),\n",
    "    const result = {\n"
    "      success: executions.every((execution) => execution.success),\n"
    "      duration: Math.round(duration),\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "        startTime: new Date(startTime).toISOString(),\n"
    "        endTime: new Date(endTime).toISOString(),\n",
    "        startTime: startedAt,\n        endTime: endedAt,\n",
)
replace_once(
    "src/hooks/HookOrchestrator.mjs",
    "    // Write evaluation receipt to Git Notes\n"
    "    await this._writeEvaluationReceipt(result);\n\n"
    "    return result;\n",
    "    // Zero unreceipted actuation: durable execution receipts must exist\n"
    "    // before the evaluation can return standing.\n"
    "    await this.gitNativeIO.flushAll();\n"
    "    await this._writeEvaluationReceipt(result);\n\n"
    "    return result;\n",
)
regex_once(
    "src/hooks/HookOrchestrator.mjs",
    r'''  async _writeEvaluationReceipt\(result\) \{\n.*?\n  \}\n\n  /\*\*\n   \* Get predicate type from hook''',
    '''  async _writeEvaluationReceipt(result) {
    this.logger.info("📝 Writing evaluation receipt to Git Notes");

    const { useGit } = await import("../composables/git.mjs");
    const git = useGit({ cwd: this.cwd });

    const receiptData = {
      timestamp: new Date().toISOString(),
      duration: result.duration,
      hooksEvaluated: result.hooksEvaluated,
      hooksTriggered: result.hooksTriggered,
      workflowsExecuted: result.workflowsExecuted,
      workflowsSuccessful: result.workflowsSuccessful,
      triggeredHooks: result.triggeredHooks,
      executions: result.executions.map((execution) => ({
        hookId: execution.hookId,
        success: execution.success,
        error: execution.error,
      })),
    };

    const noteContent = JSON.stringify(receiptData, null, 2);
    await git.noteAppend("refs/notes/gitvan/hook-evaluations", noteContent);

    this.logger.info("✅ Evaluation receipt written to Git Notes");
  }

  /**
   * Get predicate type from hook''',
    flags=re.S,
)

# Step projection and filesystem authority.
replace_once(
    "src/hooks/HookParser.mjs",
    "    const filePath = turtle.getOne(stepNode, GV + \"filePath\");\n"
    "    if (filePath) {\n"
    "      config.filePath = filePath.value;\n"
    "    }\n",
    "    const filePath = turtle.getOne(stepNode, GV + \"filePath\");\n"
    "    if (filePath) {\n"
    "      config.filePath = filePath.value;\n"
    "      config.outputPath = filePath.value;\n"
    "    }\n",
)
replace_once(
    "src/workflow/step-handlers/template-step-handler.mjs",
    "    const { template, templatePath, outputPath, ...templateOptions } =\n"
    "      step.config;\n\n"
    "    try {\n",
    "    const { template, templatePath, outputPath, ...templateOptions } =\n"
    "      step.config;\n"
    "    const cwd = context.options?.cwd || process.cwd();\n\n"
    "    try {\n",
)
replace_once(
    "src/workflow/step-handlers/template-step-handler.mjs",
    '      const { dirname } = await import("node:path");\n\n',
    '      const { dirname, resolve } = await import("node:path");\n'
    "      const resolvedOutputPath = resolve(cwd, outputPath);\n\n",
)
value = read("src/workflow/step-handlers/template-step-handler.mjs")
replacements = [
    ("        const dir = dirname(outputPath);\n", "        const dir = dirname(resolvedOutputPath);\n"),
    ("        await fs.writeFile(outputPath, renderedContent);\n", "        await fs.writeFile(resolvedOutputPath, renderedContent);\n"),
    (
        "        await fs.mkdir(dirname(outputPath), { recursive: true });\n"
        '        await fs.writeFile(outputPath, renderedContent, "utf8");\n',
        "        await fs.mkdir(dirname(resolvedOutputPath), { recursive: true });\n"
        '        await fs.writeFile(resolvedOutputPath, renderedContent, "utf8");\n',
    ),
    ("        outputPath,\n        content: renderedContent,\n", "        outputPath: resolvedOutputPath,\n        content: renderedContent,\n"),
]
for old, new in replacements:
    if value.count(old) != 1:
        raise SystemExit(f"template-step-handler anchor drifted: {old!r}")
    value = value.replace(old, new, 1)
write("src/workflow/step-handlers/template-step-handler.mjs", value)

# Git notes use deterministic mutation identity and explicit cwd authority.
replace_once(
    "src/composables/git.mjs",
    "  const cwd = (ctx && ctx.cwd) || process.cwd();\n",
    "  const cwd = options.cwd || (ctx && ctx.cwd) || process.cwd();\n",
)
replace_once(
    "src/composables/git.mjs",
    "  const base = { cwd, env };\n  \n",
    "  const base = { cwd, env };\n"
    "  const notesBase = {\n"
    "    cwd,\n"
    "    env: {\n"
    "      ...env,\n"
    '      GIT_AUTHOR_NAME: env.GIT_AUTHOR_NAME || "GitVan Receipt",\n'
    '      GIT_AUTHOR_EMAIL: env.GIT_AUTHOR_EMAIL || "receipts@gitvan.dev",\n'
    '      GIT_COMMITTER_NAME: env.GIT_COMMITTER_NAME || "GitVan Receipt",\n'
    '      GIT_COMMITTER_EMAIL: env.GIT_COMMITTER_EMAIL || "receipts@gitvan.dev",\n'
    "    },\n"
    "  };\n  \n",
)
replace_once(
    "src/composables/git.mjs",
    '        ["notes", `--ref=${ref}`, "add", "-f", "-m", message, sha],\n'
    "        base\n",
    '        ["notes", `--ref=${ref}`, "add", "-f", "-m", message, sha],\n'
    "        notesBase\n",
)
replace_once(
    "src/composables/git.mjs",
    '        ["notes", `--ref=${ref}`, "append", "-m", message, sha],\n'
    "        base\n",
    '        ["notes", `--ref=${ref}`, "append", "-m", message, sha],\n'
    "        notesBase\n",
)

# ReceiptWriter: no shell interpolation, collision-free temp files, deterministic note identity.
replace_once(
    "src/git-native/ReceiptWriter.mjs",
    "import { promises as fs } from 'fs';\n"
    "import { join, dirname } from 'path';\n"
    "import { exec } from 'child_process';\n"
    "import { promisify } from 'util';\n\n"
    "const execAsync = promisify(exec);\n",
    'import { promises as fs } from "node:fs";\n'
    'import { join, dirname } from "node:path";\n'
    'import { execFile } from "node:child_process";\n'
    'import { randomUUID } from "node:crypto";\n'
    'import { promisify } from "node:util";\n\n'
    "const execFileAsync = promisify(execFile);\n",
)
replace_once(
    "src/git-native/ReceiptWriter.mjs",
    "      await execAsync('git rev-parse --git-dir', { cwd: this.cwd });\n",
    '      await this._git(["rev-parse", "--git-dir"]);\n',
)
regex_once(
    "src/git-native/ReceiptWriter.mjs",
    r'''    const \{ stdout \} = await execAsync\(`git log --oneline -n \$\{keepCommits\} --format="%H"`, \{ cwd: this\.cwd \}\);\n''',
    '''    const { stdout } = await this._git([
      "log",
      "--oneline",
      "-n",
      String(keepCommits),
      "--format=%H",
    ]);
''',
)
regex_once(
    "src/git-native/ReceiptWriter.mjs",
    r'''      // Create a temporary file for the content\n.*?      await fs\.unlink\(tempFile\);\n''',
    '''      const tempFile = join(
        this.cwd,
        ".gitvan",
        "tmp",
        `notes-${randomUUID()}.txt`
      );
      await fs.mkdir(dirname(tempFile), { recursive: true });
      await fs.writeFile(tempFile, content);

      try {
        await this._git(
          ["notes", `--ref=${notesRef}`, "append", "-F", tempFile],
          { identity: true }
        );
      } finally {
        await fs.rm(tempFile, { force: true });
      }
''',
    flags=re.S,
)
regex_once(
    "src/git-native/ReceiptWriter.mjs",
    r'''      const \{ stdout \} = await execAsync\(`git notes --ref=\$\{notesRef\} show \$\{commit\}`, \{ cwd: this\.cwd \}\);\n''',
    '      const { stdout } = await this._git(["notes", `--ref=${notesRef}`, "show", commit]);\n',
)
regex_once(
    "src/git-native/ReceiptWriter.mjs",
    r'''      const \{ stdout \} = await execAsync\(`git notes --ref=\$\{notesRef\} list`, \{ cwd: this\.cwd \}\);\n''',
    '      const { stdout } = await this._git(["notes", `--ref=${notesRef}`, "list"]);\n',
)
regex_once(
    "src/git-native/ReceiptWriter.mjs",
    r'''        const \{ stdout \} = await execAsync\(`git notes --ref=\$\{ref\} list`, \{ cwd: this\.cwd \}\);\n        const refCommits = stdout\.trim\(\)\.split\('\\n'\)\.filter\(Boolean\);\n        refCommits\.forEach\(commit => commits\.add\(commit\)\);\n''',
    '''        const { stdout } = await this._git(["notes", `--ref=${ref}`, "list"]);
        const refCommits = stdout.trim().split("\\n").filter(Boolean);
        refCommits.forEach((line) => {
          const target = line.trim().split(/\\s+/).at(-1);
          if (target) commits.add(target);
        });
''',
)
regex_once(
    "src/git-native/ReceiptWriter.mjs",
    r'''        await execAsync\(`git notes --ref=\$\{ref\} remove \$\{commit\}`, \{ cwd: this\.cwd \}\);\n''',
    '        await this._git(["notes", `--ref=${ref}`, "remove", commit], { identity: true });\n',
)
regex_once(
    "src/git-native/ReceiptWriter.mjs",
    r'''  async _getCurrentCommit\(\) \{\n    const \{ stdout \} = await execAsync\('git rev-parse HEAD', \{ cwd: this\.cwd \}\);\n    return stdout\.trim\(\);\n  \}\n''',
    '''  async _git(args, options = {}) {
    const identity = options.identity === true;
    const env = identity
      ? {
          ...process.env,
          GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || "GitVan Receipt",
          GIT_AUTHOR_EMAIL:
            process.env.GIT_AUTHOR_EMAIL || "receipts@gitvan.dev",
          GIT_COMMITTER_NAME:
            process.env.GIT_COMMITTER_NAME || "GitVan Receipt",
          GIT_COMMITTER_EMAIL:
            process.env.GIT_COMMITTER_EMAIL || "receipts@gitvan.dev",
          TZ: "UTC",
          LANG: "C",
        }
      : { ...process.env, TZ: "UTC", LANG: "C" };

    return execFileAsync("git", args, {
      cwd: this.cwd,
      env,
      encoding: "utf8",
      maxBuffer: 12 * 1024 * 1024,
    });
  }

  async _getCurrentCommit() {
    const { stdout } = await this._git(["rev-parse", "HEAD"]);
    return stdout.trim();
  }
''',
)
replace_once(
    "src/git-native/ReceiptWriter.mjs",
    "      const { stdout } = await execAsync('git branch --show-current', { cwd: this.cwd });\n",
    '      const { stdout } = await this._git(["branch", "--show-current"]);\n',
)

# Focused E2E tests: require actual trigger, consequence and durable receipts.
replace_once(
    "tests/knowledge-hooks-simple-verification.test.mjs",
    'import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";\n',
    'import {\n'
    "  mkdirSync,\n"
    "  writeFileSync,\n"
    "  readFileSync,\n"
    "  rmSync,\n"
    "  existsSync,\n"
    '} from "node:fs";\n',
)
replace_once(
    "tests/knowledge-hooks-simple-verification.test.mjs",
    "      evaluationTime: result.evaluationTime,\n",
    "      duration: result.duration,\n",
)
replace_once(
    "tests/knowledge-hooks-simple-verification.test.mjs",
    "    expect(result.workflowsExecuted).toBeGreaterThan(0);\n"
    "    expect(result.success).toBe(true);\n",
    "    expect(result.workflowsExecuted).toBeGreaterThan(0);\n"
    "    expect(result.workflowsSuccessful).toBeGreaterThan(0);\n"
    "    expect(result.success).toBe(true);\n",
)
replace_once(
    "tests/knowledge-hooks-simple-verification.test.mjs",
    '    const logContent = require("fs").readFileSync(logFile, "utf8");\n'
    '    expect(logContent).toContain("Simple hook triggered at");\n',
    '    const logContent = readFileSync(logFile, "utf8");\n'
    '    expect(logContent).toContain("Simple hook triggered at");\n\n'
    "    const receipt = execSync(\n"
    '      "git notes --ref=refs/notes/gitvan/hook-evaluations show HEAD",\n'
    '      { cwd: testDir, encoding: "utf8" }\n'
    "    );\n"
    '    expect(receipt).toContain(\'"hooksTriggered": 1\');\n'
    '    expect(receipt).toContain(\'"workflowsExecuted": 1\');\n\n'
    "    const executionReceipt = execSync(\n"
    '      "git notes --ref=refs/gitvan/notes show HEAD",\n'
    '      { cwd: testDir, encoding: "utf8" }\n'
    "    );\n"
    '    expect(executionReceipt).toContain("http://example.org/simple-hook");\n',
)
replace_once(
    "tests/knowledge-hooks-simple-verification.test.mjs",
    "    console.log(`   - Evaluation completed in ${result.evaluationTime}ms`);\n",
    "    console.log(`   - Evaluation completed in ${result.duration}ms`);\n",
)

system_path = Path("tests/knowledge-hooks-system.test.mjs")
system = system_path.read_text()
old_prefix = '@prefix op: <https://gitvan.dev/ontology#> .'
if system.count(old_prefix) != 2:
    raise SystemExit(
        f"system test expected two stale op prefixes, got {system.count(old_prefix)}"
    )
system = system.replace(old_prefix, '@prefix op: <https://gitvan.dev/op#> .')
old_ask_pipeline = '''ex:ask-pipeline rdf:type gh:Pipeline ;
    op:steps ex:ask-step .

ex:ask-step rdf:type gh:Step ;
    gh:actionType "log" ;
    gh:actionMessage "ASK predicate evaluated successfully" .'''
new_ask_pipeline = '''ex:ask-pipeline rdf:type op:Pipeline ;
    op:steps ex:ask-step .

ex:ask-step rdf:type gv:TemplateStep ;
    gv:text "ASK predicate evaluated successfully" ;
    gv:filePath "./ask-result.log" .'''
if system.count(old_ask_pipeline) != 1:
    raise SystemExit("system test ASK pipeline fixture drifted")
system = system.replace(old_ask_pipeline, new_ask_pipeline, 1)
vacuous = '''expect(result.hooksEvaluated).toBeGreaterThanOrEqual(0);
        expect(result.workflowsExecuted).toBeGreaterThanOrEqual(0);'''
strict = '''expect(result.hooksEvaluated).toBe(1);
        expect(result.hooksTriggered).toBe(1);
        expect(result.workflowsExecuted).toBe(1);
        expect(result.workflowsSuccessful).toBe(1);
        expect(result.success).toBe(true);'''
if system.count(vacuous) < 2:
    raise SystemExit("system test vacuous assertion anchors drifted")
system = system.replace(vacuous, strict, 1)
if system.count('it("should evaluate SELECT predicate hooks"') != 1:
    raise SystemExit("system test SELECT title drifted")
system = system.replace(
    'it("should evaluate SELECT predicate hooks"',
    'it("should evaluate SELECTThreshold predicate hooks"',
    1,
)
old_select_pred = '''ex:select-predicate rdf:type gh:SELECTPredicate ;
    gh:queryText """SELECT ?component ?complexity WHERE {
        ?component rdf:type gv:Component .
        ?component gv:complexity ?complexity .
      }""" .'''
new_select_pred = '''ex:select-predicate rdf:type gh:SELECTThreshold ;
    gh:queryText """SELECT (COUNT(?component) AS ?count) WHERE {
        ?component rdf:type gv:Component .
        ?component gv:complexity ?complexity .
        FILTER(?complexity >= 7)
      }""" ;
    gh:threshold 0 ;
    gh:operator ">" .'''
if system.count(old_select_pred) != 1:
    raise SystemExit("system test SELECT predicate fixture drifted")
system = system.replace(old_select_pred, new_select_pred, 1)
old_select_pipeline = '''ex:select-pipeline rdf:type gh:Pipeline ;
    op:steps ex:select-step .

ex:select-step rdf:type gh:Step ;
    gh:actionType "log" ;
    gh:actionMessage "SELECT predicate evaluated successfully" .'''
new_select_pipeline = '''ex:select-pipeline rdf:type op:Pipeline ;
    op:steps ex:select-step .

ex:select-step rdf:type gv:TemplateStep ;
    gv:text "SELECTThreshold predicate evaluated successfully" ;
    gv:filePath "./select-result.log" .'''
if system.count(old_select_pipeline) != 1:
    raise SystemExit("system test SELECT pipeline fixture drifted")
system = system.replace(old_select_pipeline, new_select_pipeline, 1)
system = system.replace(vacuous, strict, 1)
system_path.write_text(system)

print("FORTUNE5_REPAIR_APPLIED")
