// src/workflow/step-handlers/cli-step-handler.mjs

import { BaseStepHandler } from "./base-step-handler.mjs";
import { useTemplate } from "../../composables/template.mjs";
import { spawn } from "node:child_process";

export class CliStepHandler extends BaseStepHandler {
  getStepType() {
    return "cli";
  }

  validate(step) {
    if (!step.config) throw new Error("CLI step missing configuration");
    if (!step.config.command) throw new Error("CLI step missing command");
    return true;
  }

  async execute(step, inputs, context) {
    try {
      this.validate(step);
      const { command, cwd, timeout = 30000, env = {} } = step.config;
      const enterprise =
        context.enterprisePolicy?.enabled === true ||
        process.env.GITVAN_ENTERPRISE_MODE === "1";

      if (enterprise && !context.actuationBroker) {
        throw new Error("Enterprise CLI actuation requires an admitted actuation broker");
      }

      const template = await useTemplate();
      const processedCommand = Array.isArray(command)
        ? command.map((part) => template.renderString(String(part), inputs))
        : template.renderString(command, inputs);
      const workingDir = cwd || process.cwd();
      const executionEnv = enterprise
        ? context.enterpriseEnvironment
        : { ...process.env, ...env };

      if (enterprise && !executionEnv) {
        throw new Error("Enterprise CLI actuation requires an admitted environment");
      }

      const displayCommand = Array.isArray(processedCommand)
        ? processedCommand[0]
        : String(processedCommand).trim().split(/\s+/)[0];
      this.logger.info(`💻 Executing CLI command: ${displayCommand}`);

      const result = await this._executeCommand(processedCommand, {
        cwd: workingDir,
        timeout,
        env: executionEnv,
      });

      return this.createResult({
        command: enterprise ? displayCommand : processedCommand,
        cwd: workingDir,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        success: result.exitCode === 0,
        timestamp: new Date().toISOString(),
      }, result.exitCode === 0, result.exitCode === 0 ? null : `CLI exited with code ${result.exitCode}`);
    } catch (error) {
      this.logger.error(`❌ CLI command failed: ${error.message}`);
      return this.createResult(
        {
          command: context.enterprisePolicy?.enabled
            ? "redacted-enterprise-command"
            : step.config?.command || "unknown",
          cwd: step.config?.cwd || process.cwd(),
          stdout: "",
          stderr: error.stderr || error.message,
          exitCode: error.exitCode || 1,
          success: false,
          timestamp: new Date().toISOString(),
        },
        false,
        `CLI command failed: ${error.message}`
      );
    }
  }

  async _executeCommand(command, options) {
    return new Promise((resolve, reject) => {
      let cmd;
      let args = [];
      if (Array.isArray(command)) {
        [cmd, ...args] = command.map(String);
      } else {
        const parts = String(command).trim().split(/\s+/);
        [cmd, ...args] = parts;
      }

      const dangerousPattern = /[;|&`$()<>\\{}[\]]/;
      if (dangerousPattern.test(cmd)) {
        reject(Object.assign(new Error(`Command contains dangerous characters: ${cmd}`), {
          stderr: "Security: Shell operators and special characters not allowed in command name",
          exitCode: 1,
        }));
        return;
      }

      for (const arg of args) {
        if (dangerousPattern.test(arg)) {
          this.logger.warn(`⚠️ Argument contains special characters: ${arg}`);
        }
      }

      const child = spawn(cmd, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      });

      let stdout = "";
      let stderr = "";
      let settled = false;
      let timeoutId = null;

      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        fn(value);
      };

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      child.on("close", (code) => {
        finish(resolve, {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
        });
      });
      child.on("error", (error) => {
        error.stderr = stderr.trim();
        error.exitCode = 1;
        finish(reject, error);
      });

      if (options.timeout) {
        timeoutId = setTimeout(() => {
          child.kill("SIGTERM");
          const error = new Error("Command timed out");
          error.stderr = stderr.trim();
          error.exitCode = "TIMEOUT";
          finish(reject, error);
        }, options.timeout);
      }
    });
  }
}
