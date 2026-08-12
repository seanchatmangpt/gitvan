// src/workflow/step-handlers/file-step-handler.mjs

import { BaseStepHandler } from "./base-step-handler.mjs";

export class FileStepHandler extends BaseStepHandler {
  getStepType() {
    return "file";
  }

  validate(step) {
    if (!step.config || !step.config.operation) {
      throw new Error("File step missing operation configuration");
    }
    const validOperations = ["read", "write", "copy", "move", "delete"];
    if (!validOperations.includes(step.config.operation)) {
      throw new Error(`Invalid file operation: ${step.config.operation}`);
    }
    return true;
  }

  async execute(step, inputs, context) {
    const { operation, filePath, content, sourcePath, targetPath } = step.config;
    const enterprise =
      context.enterprisePolicy?.enabled === true ||
      process.env.GITVAN_ENTERPRISE_MODE === "1";

    if (enterprise && !context.actuationBroker) {
      return this.createResult(
        null,
        false,
        "Enterprise file actuation requires an admitted actuation broker"
      );
    }

    this.logger.info(`📁 Executing file operation: ${operation}`);
    try {
      const fs = context.files || (await import("node:fs").then((m) => m.promises));
      let result;
      switch (operation) {
        case "read":
          result = await this.executeRead(fs, filePath);
          break;
        case "write":
          result = await this.executeWrite(fs, filePath, content, inputs);
          break;
        case "copy":
          result = await this.executeCopy(fs, sourcePath, targetPath);
          break;
        case "move":
          result = await this.executeMove(fs, sourcePath, targetPath);
          break;
        case "delete":
          result = await this.executeDelete(fs, filePath);
          break;
        default:
          throw new Error(`Unknown file operation: ${operation}`);
      }
      const success = result?.success !== false;
      return this.createResult(result, success, success ? null : result?.error);
    } catch (error) {
      this.logger.error(`❌ File operation failed: ${error.message}`);
      return this.createResult(null, false, error.message);
    }
  }

  async executeRead(fs, filePath) {
    if (fs.read && typeof fs.read === "function") {
      const content = await fs.read(filePath);
      return {
        operation: "read",
        filePath,
        content,
        contentLength: content.length,
      };
    }
    const content = await fs.readFile(filePath, "utf8");
    const stats = await fs.stat(filePath);
    return {
      operation: "read",
      filePath,
      content,
      size: stats.size,
      modified: stats.mtime,
    };
  }

  async executeWrite(fs, filePath, content, inputs) {
    const { dirname } = await import("node:path");
    const dir = dirname(filePath);
    const testFs = fs.mkdir && fs.write && fs.read;
    if (dir !== "." && dir !== filePath) {
      if (testFs) await fs.mkdir(dir);
      else await fs.mkdir(dir, { recursive: true });
    }

    let finalContent = content;
    if (content && content.includes("{{")) {
      const { useTemplate } = await import("../../composables/template.mjs");
      const templateEngine = await useTemplate();
      finalContent = await templateEngine.renderString(content, inputs);
    }

    if (testFs) await fs.write(filePath, finalContent);
    else await fs.writeFile(filePath, finalContent, "utf8");

    return {
      operation: "write",
      filePath,
      contentLength: finalContent.length,
      rendered: content !== finalContent,
    };
  }

  async executeCopy(fs, sourcePath, targetPath) {
    const { dirname } = await import("node:path");
    const dir = dirname(targetPath);
    if (fs.read && typeof fs.read === "function") {
      const content = await fs.read(sourcePath);
      if (dir !== "." && dir !== targetPath) await fs.mkdir(dir);
      await fs.write(targetPath, content);
    } else {
      await fs.mkdir(dir, { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }
    return { operation: "copy", sourcePath, targetPath };
  }

  async executeMove(fs, sourcePath, targetPath) {
    const { dirname } = await import("node:path");
    const dir = dirname(targetPath);
    if (fs.read && typeof fs.read === "function") {
      const content = await fs.read(sourcePath);
      if (dir !== "." && dir !== targetPath) await fs.mkdir(dir);
      await fs.write(targetPath, content);
      if (fs.delete && typeof fs.delete === "function") {
        await fs.delete(sourcePath);
      } else {
        this.logger.warn("⚠️ Delete operation not supported in test environment");
      }
    } else {
      await fs.mkdir(dir, { recursive: true });
      await fs.rename(sourcePath, targetPath);
    }
    return { operation: "move", sourcePath, targetPath };
  }

  async executeDelete(fs, filePath) {
    if (fs.read && typeof fs.read === "function") {
      if (!fs.delete || typeof fs.delete !== "function") {
        return {
          operation: "delete",
          filePath,
          success: false,
          error: "Delete operation not supported in test environment",
        };
      }
      await fs.delete(filePath);
      return { operation: "delete", filePath, success: true };
    }
    await fs.unlink(filePath);
    return { operation: "delete", filePath, success: true };
  }
}
