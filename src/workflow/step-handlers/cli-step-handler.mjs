// src/workflow/step-handlers/cli-step-handler.mjs
// Command Line Interface step handler

import { BaseStepHandler } from "./base-step-handler.mjs";
import { useLog } from "../../composables/log.mjs";
import { useTemplate } from "../../composables/template.mjs";
import { spawn } from "node:child_process";
import { promisify } from "node:util";

/**
 * Handler for command line interface steps
 */
export class CliStepHandler extends BaseStepHandler {
  getStepType() {
    return "cli";
  }

  validate(step) {
    if (!step.config) {
      throw new Error("CLI step missing configuration");
    }

    if (!step.config.command) {
      throw new Error("CLI step missing command");
    }

    return true;
  }

  /**
   * Execute CLI command step
   * @param {object} step - Step definition
   * @param {object} inputs - Step inputs
   * @param {object} context - Execution context
   * @returns {Promise<object>} Step execution result
   */
  async execute(step, inputs, context) {
    try {
      // Validate step configuration
      this.validate(step);

      const { command, cwd, timeout = 30000, env = {} } = step.config;

      this.logger.info(`💻 Executing CLI command: ${command}`);

      // Use useTemplate for proper variable replacement
      const template = await useTemplate();
      const processedCommand = template.renderString(command, inputs);

      // Set working directory
      const workingDir = cwd || process.cwd();

      // Execute command using spawn for better control
      const result = await this._executeCommand(processedCommand, {
        cwd: workingDir,
        timeout,
        env: { ...process.env, ...env },
      });

      return this.createResult({
        command: processedCommand,
        cwd: workingDir,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        success: result.exitCode === 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`❌ CLI command failed: ${error.message}`);

      return this.createResult(
        {
          command: step.config?.command || "unknown",
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

  /**
   * Execute command using spawn
   *
   * SECURITY WARNING: This method executes user-provided commands.
   * - Commands must be validated to prevent injection attacks
   * - Shell operators (;, |, &, `, etc.) are rejected
   * - Commands run with shell: false to prevent shell expansion
   *
   * @param {string|Array} command - Command to execute (string or array)
   * @param {object} options - Execution options
   * @returns {Promise<object>} Command result
   */
  async _executeCommand(command, options) {
    return new Promise((resolve, reject) => {
      let cmd, args = [];

      // Parse command: support both string and array formats
      if (Array.isArray(command)) {
        [cmd, ...args] = command;
      } else {
        // For string commands: split on spaces (simple parsing)
        const parts = command.trim().split(/\s+/);
        [cmd, ...args] = parts;
      }

      // SECURITY: Validate command and args for dangerous shell operators
      // Reject commands containing shell metacharacters that could enable injection
      const dangerousPattern = /[;|&`$()<>\\{}[\]]/;

      if (dangerousPattern.test(cmd)) {
        return reject({
          message: `Command contains dangerous characters: ${cmd}`,
          stderr: "Security: Shell operators and special characters not allowed in command name",
          exitCode: 1,
        });
      }

      // Also check arguments for dangerous patterns
      for (const arg of args) {
        if (dangerousPattern.test(arg)) {
          this.logger.warn(`⚠️  Argument contains special characters: ${arg}`);
        }
      }

      // CRITICAL: Use shell: false to prevent shell injection attacks
      const child = spawn(cmd, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,  // SECURITY: Prevent shell expansion and injection
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
        });
      });

      child.on("error", (error) => {
        reject({
          message: error.message,
          stderr: stderr.trim(),
          exitCode: 1,
        });
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          child.kill("SIGTERM");
          reject({
            message: "Command timed out",
            stderr: stderr.trim(),
            exitCode: "TIMEOUT",
          });
        }, options.timeout);
      }
    });
  }
}
