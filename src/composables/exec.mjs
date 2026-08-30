import { spawnSync } from "node:child_process";
import { useGitVan } from "./ctx.mjs";
import { useTemplate } from "./template.mjs";
import { join as joinPath } from "pathe";
import {
  ActuationPolicyRefusal,
  createActuationBroker,
} from "../enterprise/actuation-broker.mjs";

/**
 * Execution composable for running commands, scripts, and jobs.
 *
 * In enterprise mode every externally consequential operation exposed by this
 * composable either routes through the actuation broker or fails closed.
 */
export function useExec() {
  const gv = useGitVan();
  const rootDir = gv.root || gv.cwd || process.cwd();
  const enterprise =
    gv.enterprisePolicy?.enabled === true ||
    process.env.GITVAN_ENTERPRISE_MODE === "1";
  const enterprisePolicy = enterprise
    ? {
        ...(gv.enterprisePolicy || {}),
        enabled: true,
        rootDir,
      }
    : null;

  function brokerStep(step) {
    const broker = createActuationBroker(step, enterprisePolicy || {});
    const admission = broker.admit();
    if (!admission.admitted) throw admission.error;
    return { broker, admission };
  }

  /**
   * Execute a CLI command synchronously.
   */
  function cli(cmd, args = [], env = {}) {
    let command = [String(cmd), ...args.map(String)];
    let cwd = rootDir;
    let executionEnv = { ...process.env, ...gv.env, ...env };
    let broker = null;

    if (enterprise) {
      const admitted = brokerStep({
        id: `useExec.cli:${command[0]}`,
        type: "cli",
        config: {
          command,
          cwd: rootDir,
          env: { ...(gv.env || {}), ...env },
        },
      });
      broker = admitted.broker;
      command = admitted.admission.step.config.command;
      cwd = admitted.admission.step.config.cwd;
      executionEnv = admitted.admission.runtime.environment;
    }

    const [executable, ...commandArgs] = command;
    const startedAt = performance.now();
    const res = spawnSync(executable, commandArgs, {
      cwd,
      stdio: "pipe",
      env: executionEnv,
      shell: false,
    });
    const ok = res.status === 0 && !res.error;

    if (broker) {
      broker.complete({
        success: ok,
        error: res.error?.message || null,
        exitCode: res.status,
        duration: performance.now() - startedAt,
      });
    }

    return {
      ok,
      standing: ok ? "EXECUTED" : "FAILED",
      code: res.status,
      stdout: s(res.stdout),
      stderr: s(res.stderr) || res.error?.message || "",
      ...(broker ? { receipts: broker.receipts() } : {}),
    };
  }

  /**
   * Execute a JavaScript module.
   *
   * Dynamic module execution is intentionally excluded from the Fortune-5
   * runtime profile. A module is executable code, not data, so file-path
   * admission is insufficient authority to call an exported function.
   */
  async function js(modulePath, exportName = "default", input = {}) {
    if (enterprise) {
      throw new ActuationPolicyRefusal(
        "DYNAMIC_MODULE_EXECUTION_REFUSED",
        "Enterprise mode does not admit dynamic JavaScript module execution",
        { exportName }
      );
    }

    const mod = await import(
      modulePath.startsWith("file:")
        ? modulePath
        : "file://" + joinPath(rootDir, modulePath)
    );
    const fn = exportName === "default" ? mod.default : mod[exportName];
    const out = await fn(input);
    return { ok: true, stdout: toStr(out), meta: { out } };
  }

  /**
   * Render a template to string or file.
   */
  function tmpl({ template, out, data, autoescape, paths }) {
    const t = useTemplate({ autoescape, paths });
    if (!out) {
      const text = t.render(template, v(data, gv));
      return { ok: true, stdout: text };
    }

    let broker = null;
    if (enterprise) {
      const admitted = brokerStep({
        id: "useExec.tmpl:write",
        type: "file",
        config: { operation: "write", filePath: out },
      });
      broker = admitted.broker;
      out = admitted.admission.step.config.filePath;
    }

    const startedAt = performance.now();
    try {
      const r = t.renderToFile(template, out, v(data, gv));
      if (broker) {
        broker.complete({ success: true, duration: performance.now() - startedAt });
      }
      return {
        ok: true,
        artifact: r.path,
        meta: {
          bytes: r.bytes,
          ...(broker ? { receipts: broker.receipts() } : {}),
        },
      };
    } catch (error) {
      if (broker) {
        broker.complete({
          success: false,
          error: error.message,
          duration: performance.now() - startedAt,
        });
      }
      throw error;
    }
  }

  /**
   * Manufacture an LLM request record.
   */
  async function llm({
    model,
    prompt,
    system,
    temperature = 0.7,
    maxTokens = 1000,
  }) {
    const llmData = {
      model: model || "llama2",
      prompt: typeof prompt === "function" ? prompt({ git: gv }) : prompt,
      system: system || "You are a helpful assistant.",
      temperature,
      maxTokens,
      timestamp: Date.now(),
    };

    let requestFile = joinPath(
      rootDir,
      ".gitvan",
      "llm-requests",
      `${Date.now()}.json`
    );
    const serialized = JSON.stringify(llmData, null, 2);
    let broker = null;

    if (enterprise) {
      const admitted = brokerStep({
        id: "useExec.llm:queue",
        type: "file",
        config: {
          operation: "write",
          filePath: requestFile,
          content: serialized,
        },
      });
      broker = admitted.broker;
      requestFile = admitted.admission.step.config.filePath;
    }

    const fs = await import("node:fs/promises");
    const startedAt = performance.now();
    try {
      await fs.mkdir(joinPath(rootDir, ".gitvan", "llm-requests"), {
        recursive: true,
      });
      await fs.writeFile(requestFile, serialized);
      if (broker) {
        broker.complete({ success: true, duration: performance.now() - startedAt });
      }
    } catch (error) {
      if (broker) {
        broker.complete({
          success: false,
          error: error.message,
          duration: performance.now() - startedAt,
        });
      }
      throw error;
    }

    const response = {
      content: `LLM request saved to ${requestFile}`,
      model: llmData.model,
      tokens: 0,
      requestId: Date.now().toString(),
    };

    return {
      ok: true,
      stdout: response.content,
      meta: {
        response,
        requestFile,
        ...(broker ? { receipts: broker.receipts() } : {}),
      },
    };
  }

  /**
   * Queue a job by manufacturing its state record.
   */
  async function job(jobName, input = {}) {
    const jobData = {
      name: jobName,
      input: typeof input === "function" ? input({ git: gv }) : input,
      timestamp: Date.now(),
      status: "pending",
    };

    let jobFile = joinPath(
      rootDir,
      ".gitvan",
      "jobs",
      `${jobName}-${Date.now()}.json`
    );
    const serialized = JSON.stringify(jobData, null, 2);
    let broker = null;

    if (enterprise) {
      const admitted = brokerStep({
        id: "useExec.job:queue",
        type: "file",
        config: {
          operation: "write",
          filePath: jobFile,
          content: serialized,
        },
      });
      broker = admitted.broker;
      jobFile = admitted.admission.step.config.filePath;
    }

    const fs = await import("node:fs/promises");
    const startedAt = performance.now();
    try {
      await fs.mkdir(joinPath(rootDir, ".gitvan", "jobs"), { recursive: true });
      await fs.writeFile(jobFile, serialized);
      if (broker) {
        broker.complete({ success: true, duration: performance.now() - startedAt });
      }
    } catch (error) {
      if (broker) {
        broker.complete({
          success: false,
          error: error.message,
          duration: performance.now() - startedAt,
        });
      }
      throw error;
    }

    const response = {
      jobId: Date.now().toString(),
      status: "queued",
      message: `Job ${jobName} queued for execution`,
    };

    return {
      ok: true,
      stdout: response.message,
      meta: {
        response,
        jobFile,
        ...(broker ? { receipts: broker.receipts() } : {}),
      },
    };
  }

  return { cli, js, tmpl, llm, job };
}

/* helpers */
const s = (b) => (b ? b.toString() : "");
const toStr = (x) => (typeof x === "string" ? x : JSON.stringify(x));
const v = (d, gv) => (typeof d === "function" ? d({ git: gv }) : d || {});
