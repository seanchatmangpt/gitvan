/**
 * GitVan v2 Safe Shell Execution Utilities
 * Executes shell commands with allowlist validation for security
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/**
 * Check if a command is allowed based on allowlist
 * @param {string} cmd - Command to check
 * @param {string[]} allowlist - Allowed command binaries
 * @returns {boolean} True if allowed
 */
function isAllowed(cmd, allowlist = []) {
  if (!allowlist.length) return false; // Deny by default if no allowlist
  const bin = String(cmd).trim().split(/\s+/)[0];
  return allowlist.includes(bin);
}

/**
 * Execute shell commands with allowlist validation
 * @param {string[]} cmds - Array of shell commands to execute
 * @param {Object} options - Execution options
 * @param {Object} options.config - GitVan configuration
 * @param {Object} options.context - Execution context
 * @returns {Promise<Array>} Array of execution results
 */
export async function runShellHooks(cmds = [], { config, context }) {
  const allowlist = config.templates?.shell?.allow || [];
  const results = [];

  for (const cmd of cmds) {
    if (!isAllowed(cmd, allowlist)) {
      results.push({
        cmd,
        status: "SKIPPED",
        reason: "Not on allowlist",
      });
      continue;
    }

    try {
      const [bin, ...args] = cmd.split(/\s+/);
      const { stdout, stderr } = await exec(bin, args, {
        cwd: context.root,
        env: {
          TZ: "UTC",
          LANG: "C",
          ...process.env,
          ...context.env,
        },
      });
      results.push({
        cmd,
        status: "OK",
        exitCode: 0,
        stdout,
        stderr,
      });
    } catch (e) {
      results.push({
        cmd,
        status: "ERROR",
        exitCode: e.code || 1,
        stderr: e.stderr || e.message,
      });
      // Fail fast: if a hook fails, stop the entire process
      throw new Error(`Shell hook failed: "${cmd}"\n${e.stderr || e.message}`);
    }
  }

  return results;
}
