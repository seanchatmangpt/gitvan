/**
 * Safe shell execution utilities.
 * Legacy mode preserves the existing template allowlist behavior.
 * Enterprise mode additionally requires broker admission and durable receipts.
 */

import { execFile } from "node:child_process";
import { createActuationBroker } from "../enterprise/actuation-broker.mjs";

function isAllowed(cmd, allowlist = []) {
  if (!allowlist.length) return false;
  const bin = String(cmd).trim().split(/\s+/)[0];
  return allowlist.includes(bin) || allowlist.includes(cmd);
}

export async function runShellHooks(cmds = [], { config, context }) {
  const allowlist = config.templates?.shell?.allow || [];
  const results = [];
  const enterprise =
    context?.enterprisePolicy?.enabled === true ||
    process.env.GITVAN_ENTERPRISE_MODE === "1";

  for (const cmd of cmds) {
    if (!isAllowed(cmd, allowlist)) {
      results.push({
        cmd,
        status: "SKIPPED",
        reason: "Not on allowlist",
      });
      continue;
    }

    const [bin, ...args] = String(cmd).trim().split(/\s+/);
    let broker = null;
    let admittedCommand = [bin, ...args];
    let admittedEnv = {
      TZ: "UTC",
      LANG: "C",
      ...process.env,
      ...context.env,
    };
    let admittedCwd = context.root;

    if (enterprise) {
      broker = createActuationBroker(
        {
          id: `shell-hook:${bin}`,
          type: "cli",
          config: {
            command: admittedCommand,
            cwd: context.root,
            env: context.env || {},
          },
        },
        {
          ...(context.enterprisePolicy || {}),
          enabled: true,
        }
      );
      const admission = broker.admit();
      if (!admission.admitted) {
        results.push({
          cmd: bin,
          status: "REFUSED",
          reason: admission.error.message,
          errorCode: admission.error.code,
          receipts: broker.receipts(),
        });
        throw admission.error;
      }
      admittedCommand = admission.step.config.command;
      admittedCwd = admission.step.config.cwd;
      admittedEnv = admission.runtime.environment;
    }

    const [admittedBin, ...admittedArgs] = admittedCommand;
    const startedAt = performance.now();
    try {
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        execFile(
          admittedBin,
          admittedArgs,
          { cwd: admittedCwd, env: admittedEnv },
          (error, stdout, stderr) => {
            if (error) {
              error.stdout = stdout;
              error.stderr = stderr;
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          }
        );
      });
      const duration = performance.now() - startedAt;
      if (broker) broker.complete({ success: true, exitCode: 0, duration });
      results.push({
        cmd: enterprise ? admittedBin : cmd,
        status: "OK",
        exitCode: 0,
        stdout,
        stderr,
        ...(broker ? { receipts: broker.receipts() } : {}),
      });
    } catch (error) {
      const duration = performance.now() - startedAt;
      if (broker) {
        broker.complete({
          success: false,
          error: error.message,
          exitCode: error.code || 1,
          duration,
        });
      }
      results.push({
        cmd: enterprise ? admittedBin : cmd,
        status: "ERROR",
        exitCode: error.code || 1,
        stderr: error.stderr || error.message,
        ...(broker ? { receipts: broker.receipts() } : {}),
      });
      throw new Error(
        `Shell hook failed: "${enterprise ? admittedBin : cmd}"\n${error.stderr || error.message}`
      );
    }
  }

  return results;
}
