import { spawn } from "node:child_process";
import { join } from "node:path";
import { CapabilityRefusal } from "./model.mjs";

export function resolveVerifierCommand(capability, options = {}) {
  if (!capability?.verifier) {
    throw new CapabilityRefusal(
      "UNADMITTED_EXECUTION_REFUSED",
      `Capability has no verifier: ${capability?.id || "unknown"}`,
      { capability: capability?.id || null },
    );
  }
  const cwd = options.cwd || process.cwd();
  const verifier = String(capability.verifier);
  const isVitest = /(?:^|\/)(?:test|tests)\/.*\.test\.[cm]?[jt]s$/.test(verifier);
  if (isVitest) {
    return Object.freeze({
      command: process.execPath,
      args: Object.freeze([
        options.vitestBin || join(cwd, "node_modules", "vitest", "vitest.mjs"),
        "run",
        verifier,
        "--reporter=basic",
      ]),
      kind: "vitest",
    });
  }
  return Object.freeze({ command: process.execPath, args: Object.freeze([verifier]), kind: "node" });
}

function appendBounded(current, chunk, maxOutputBytes) {
  if (current.length >= maxOutputBytes) return current;
  const remaining = maxOutputBytes - current.length;
  return current + String(chunk).slice(0, remaining);
}

export function createProcessExecutor(options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    timeoutMs = 120_000,
    killGraceMs = 2_000,
    maxOutputBytes = 1_000_000,
    spawnImpl = spawn,
    now = () => Date.now(),
  } = options;

  return async function execute(capability) {
    const resolved = resolveVerifierCommand(capability, { cwd, vitestBin: options.vitestBin });
    const startedAt = now();

    return await new Promise(resolve => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      let timeout = null;
      let killTimeout = null;
      let child;

      const finish = result => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        if (killTimeout) clearTimeout(killTimeout);
        resolve(Object.freeze({
          ...result,
          verifierKind: resolved.kind,
          command: resolved.command,
          args: resolved.args,
          durationMs: Math.max(0, now() - startedAt),
          stdout,
          stderr,
          output: stdout || stderr || null,
          outputTruncated: stdout.length + stderr.length >= maxOutputBytes,
        }));
      };

      try {
        child = spawnImpl(resolved.command, resolved.args, {
          cwd,
          env: { ...env, TZ: "UTC", LANG: "C", LC_ALL: "C" },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });
      } catch (error) {
        finish({ ok: false, exitCode: null, signal: null, error: error.message, classification: "SPAWN_FAILED" });
        return;
      }

      child.stdout?.setEncoding?.("utf8");
      child.stderr?.setEncoding?.("utf8");
      child.stdout?.on("data", chunk => { stdout = appendBounded(stdout, chunk, maxOutputBytes); });
      child.stderr?.on("data", chunk => { stderr = appendBounded(stderr, chunk, maxOutputBytes); });
      child.on("error", error => finish({
        ok: false,
        exitCode: null,
        signal: null,
        error: error.message,
        classification: "SPAWN_FAILED",
      }));
      child.on("close", (exitCode, signal) => finish({
        ok: exitCode === 0,
        exitCode,
        signal,
        error: exitCode === 0 ? null : `Verifier exited with code ${exitCode}${signal ? ` (${signal})` : ""}`,
        classification: exitCode === 0 ? "VERIFIER_ALIVE" : "VERIFIER_FAILED",
      }));

      timeout = setTimeout(() => {
        child.kill?.("SIGTERM");
        killTimeout = setTimeout(() => child.kill?.("SIGKILL"), killGraceMs);
        killTimeout.unref?.();
        finish({
          ok: false,
          exitCode: null,
          signal: "SIGTERM",
          error: `Verifier timed out after ${timeoutMs}ms`,
          classification: "VERIFIER_TIMEOUT",
        });
      }, timeoutMs);
      timeout.unref?.();
    });
  };
}
