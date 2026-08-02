import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createProcessExecutor, resolveVerifierCommand } from "../../src/capabilities/index.mjs";

function childProcess() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn();
  return child;
}

describe("process verifier transport", () => {
  it("routes test files through the local Vitest binary", () => {
    const resolved = resolveVerifierCommand({ id: "x", verifier: "test/x.test.mjs" }, { cwd: "/repo" });
    expect(resolved.kind).toBe("vitest");
    expect(resolved.args).toContain("run");
    expect(resolved.args).toContain("test/x.test.mjs");
    expect(resolved.args[0]).toContain("node_modules/vitest/vitest.mjs");
  });

  it("captures successful verifier output and deterministic environment", async () => {
    const child = childProcess();
    const spawnImpl = vi.fn((_command, _args, options) => {
      queueMicrotask(() => {
        child.stdout.write("pass\n");
        child.stdout.end();
        child.emit("close", 0, null);
      });
      expect(options.env.TZ).toBe("UTC");
      expect(options.env.LANG).toBe("C");
      expect(options.env.LC_ALL).toBe("C");
      return child;
    });
    let now = 100;
    const execute = createProcessExecutor({ spawnImpl, now: () => now += 5 });
    const result = await execute({ id: "x", verifier: "scripts/verify.mjs" });

    expect(result.ok).toBe(true);
    expect(result.classification).toBe("VERIFIER_ALIVE");
    expect(result.stdout).toBe("pass\n");
    expect(result.durationMs).toBe(5);
  });

  it("classifies synchronous spawn failures", async () => {
    const execute = createProcessExecutor({ spawnImpl: () => { throw new Error("no runtime"); } });
    await expect(execute({ id: "x", verifier: "scripts/verify.mjs" })).resolves.toMatchObject({
      ok: false,
      classification: "SPAWN_FAILED",
      error: "no runtime",
    });
  });

  it("bounds captured output", async () => {
    const child = childProcess();
    const execute = createProcessExecutor({
      maxOutputBytes: 4,
      spawnImpl: () => {
        queueMicrotask(() => {
          child.stdout.write("abcdefgh");
          child.emit("close", 1, null);
        });
        return child;
      },
    });
    const result = await execute({ id: "x", verifier: "scripts/verify.mjs" });
    expect(result.stdout).toBe("abcd");
    expect(result.outputTruncated).toBe(true);
    expect(result.classification).toBe("VERIFIER_FAILED");
  });

  it("escalates timed-out verifiers from SIGTERM to SIGKILL before resolving", async () => {
    vi.useFakeTimers();
    try {
      const child = childProcess();
      const execute = createProcessExecutor({
        timeoutMs: 10,
        killGraceMs: 5,
        spawnImpl: () => child,
      });
      const pending = execute({ id: "x", verifier: "scripts/hung.mjs" });

      await vi.advanceTimersByTimeAsync(10);
      expect(child.kill).toHaveBeenCalledWith("SIGTERM");
      let resolved = false;
      pending.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(5);
      await expect(pending).resolves.toMatchObject({
        ok: false,
        signal: "SIGKILL",
        classification: "VERIFIER_TIMEOUT",
        error: "Verifier timed out after 10ms",
      });
      expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
    } finally {
      vi.useRealTimers();
    }
  });
});
