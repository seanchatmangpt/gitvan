import { spawnSync } from "node:child_process";
import { useGitVan } from "./ctx.mjs";
import { useTemplate } from "./template.mjs";
import { join as joinPath } from "pathe";

export function useExec() {
  const gv = useGitVan();

  function cli(cmd, args = [], env = {}) {
    const res = spawnSync(cmd, args, {
      cwd: gv.root,
      stdio: "pipe",
      env: { ...process.env, ...gv.env, ...env },
    });
    return {
      ok: res.status === 0,
      code: res.status,
      stdout: s(res.stdout),
      stderr: s(res.stderr),
    };
  }

  async function js(modulePath, exportName = "default", input = {}) {
    const mod = await import(
      modulePath.startsWith("file:")
        ? modulePath
        : "file://" + joinPath(gv.root, modulePath)
    );
    const fn = exportName === "default" ? mod.default : mod[exportName];
    const out = await fn(input);
    return { ok: true, stdout: toStr(out), meta: { out } };
  }

  function tmpl({ template, out, data, autoescape, paths }) {
    const t = useTemplate({ autoescape, paths });
    if (out) {
      const r = t.renderToFile(template, out, v(data, gv));
      return { ok: true, artifact: r.path, meta: { bytes: r.bytes } };
    }
    const text = t.render(template, v(data, gv));
    return { ok: true, stdout: text };
  }

  async function llm({
    model,
    prompt,
    system,
    temperature = 0.7,
    maxTokens = 1000,
  }) {
    // Simple JSON-based LLM execution - no external dependencies
    const llmData = {
      model: model || "llama2",
      prompt: typeof prompt === "function" ? prompt({ git: gv }) : prompt,
      system: system || "You are a helpful assistant.",
      temperature,
      maxTokens,
      timestamp: Date.now(),
    };

    // Write LLM request to JSON file for processing
    const requestFile = joinPath(
      gv.root,
      ".gitvan",
      "llm-requests",
      `${Date.now()}.json`
    );
    const fs = await import("node:fs/promises");
    await fs.mkdir(joinPath(gv.root, ".gitvan", "llm-requests"), {
      recursive: true,
    });
    await fs.writeFile(requestFile, JSON.stringify(llmData, null, 2));

    // For now, return a simple response - can be enhanced with actual LLM integration
    const response = {
      content: `LLM request saved to ${requestFile}`,
      model: llmData.model,
      tokens: 0,
      requestId: Date.now().toString(),
    };

    return {
      ok: true,
      stdout: response.content,
      meta: { response, requestFile },
    };
  }

  async function job(jobName, input = {}) {
    // Simple JSON-based job execution - no external dependencies
    const jobData = {
      name: jobName,
      input: typeof input === "function" ? input({ git: gv }) : input,
      timestamp: Date.now(),
      status: "pending",
    };

    // Write job to JSON file for processing
    const jobFile = joinPath(
      gv.root,
      ".gitvan",
      "jobs",
      `${jobName}-${Date.now()}.json`
    );
    const fs = await import("node:fs/promises");
    await fs.mkdir(joinPath(gv.root, ".gitvan", "jobs"), { recursive: true });
    await fs.writeFile(jobFile, JSON.stringify(jobData, null, 2));

    // For now, return a simple response - can be enhanced with actual job processing
    const response = {
      jobId: Date.now().toString(),
      status: "queued",
      message: `Job ${jobName} queued for execution`,
    };

    return { ok: true, stdout: response.message, meta: { response, jobFile } };
  }

  return { cli, js, tmpl, llm, job };
}

/* helpers */
const s = (b) => (b ? b.toString() : "");
const toStr = (x) => (typeof x === "string" ? x : JSON.stringify(x));
const v = (d, gv) => (typeof d === "function" ? d({ git: gv }) : d || {});
