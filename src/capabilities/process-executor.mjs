import { spawn } from "node:child_process";
import { CapabilityRefusal } from "./model.mjs";

export function createProcessExecutor(options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    timeoutMs = 120_000,
    spawnImpl = spawn,
  } = options;

  return async function execute(capability) {
    if (!capability?.verifier) {
      throw new CapabilityRefusal(
        "UNADMITTED_EXECUTION_REFUSED",
        `Capability has no verifier: ${capability?.id || "unknown"}`,
        { capability: capability?.id || null },
      );
    }

    const command = process.execPath;
    const args = [capability.verifier];
    const startedAt = Date.now();

    return await new Promise(resolve => {
      const child = spawnImpl(command, args, {
        cwd,
        env: { ...env, TZ: "UTC", LANG: "C" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const finish = result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          ...result,
          command,
          args,
          durationMs: Date.now() - startedAt,
          stdout,
          stderr,
          output: stdout || stderr || null,
        });
      };

      child.stdout?.setEncoding("utf8");
      child.stderr?.setEncoding("utf8");
      child.stdout?.on("data", chunk => { stdout += chunk; });
      child.stderr?.on("data", chunk => { stderr += chunk; });
      child.on("error", error => finish({ ok: false, exitCode: null, signal: null, error: error.message }));
      child.on("close", (exitCode, signal) => finish({ ok: exitCode === 0, exitCode, signal, error: null }));

      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        finish({ ok: false, exitCode: null, signal: "SIGTERM", error: `Verifier timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      timer.unref?.();
    });
  };
}
