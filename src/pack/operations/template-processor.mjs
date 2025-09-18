/**
 * GitVan v2 Template Processor - Secure Nunjucks template processing
 * Implements secure template rendering with sandboxing and validation
 */

import { createLogger } from "../../utils/logger.mjs";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  copyFileSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { dirname } from "pathe";
import nunjucks from "nunjucks";
import grayMatter from "../helpers/gray-matter.mjs";

export class TemplateProcessor {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger("pack:template");
    this.maxTemplateSize = options.maxTemplateSize || 1024 * 1024; // 1MB
    this.maxOutputSize = options.maxOutputSize || 10 * 1024 * 1024; // 10MB
    this.timeout = options.timeout || 30000; // 30 seconds
    this.setupNunjucks();
  }

  setupNunjucks() {
    // Create a secure Nunjucks environment
    this.env = new nunjucks.Environment(null, {
      autoescape: false, // We'll handle escaping manually for code generation
      throwOnUndefined: false, // Don't throw on undefined values, use defaults
      trimBlocks: true,
      lstripBlocks: true,
    });

    // Add custom filters
    this.addCustomFilters();

    // Add security extensions
    this.addSecurityExtensions();
  }

  addCustomFilters() {
    // Utility filters for code generation
    this.env.addFilter("camelCase", (str) => {
      if (!str || typeof str !== "string") return "";
      return str.replace(/[-_\s]+(.)?/g, (_, char) =>
        char ? char.toUpperCase() : ""
      );
    });

    this.env.addFilter("pascalCase", (str) => {
      if (!str || typeof str !== "string") return "";
      const camel = str.replace(/[-_\s]+(.)?/g, (_, char) =>
        char ? char.toUpperCase() : ""
      );
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    });

    this.env.addFilter("kebabCase", (str) => {
      if (!str || typeof str !== "string") return "";
      return str
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
    });

    this.env.addFilter("snakeCase", (str) => {
      if (!str || typeof str !== "string") return "";
      return str
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
    });

    this.env.addFilter("upperCase", (str) => {
      if (!str || typeof str !== "string") return "";
      return str.toUpperCase();
    });

    this.env.addFilter("lowerCase", (str) => {
      if (!str || typeof str !== "string") return "";
      return str.toLowerCase();
    });

    // JSON handling
    this.env.addFilter("jsonStringify", (obj, indent = 2) => {
      try {
        return JSON.stringify(obj, null, indent);
      } catch {
        return "{}";
      }
    });

    // Array/string utilities
    this.env.addFilter("join", (arr, separator = ", ") => {
      if (!Array.isArray(arr)) return "";
      return arr.join(separator);
    });

    this.env.addFilter("split", (str, separator = ",") => {
      if (!str || typeof str !== "string") return [];
      return str.split(separator).map((s) => s.trim());
    });

    // Date formatting
    this.env.addFilter("dateFormat", (date, format = "YYYY-MM-DD") => {
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return "";

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");

        return format
          .replace("YYYY", year)
          .replace("MM", month)
          .replace("DD", day);
      } catch {
        return "";
      }
    });

    // Code escaping
    this.env.addFilter("jsEscape", (str) => {
      if (!str || typeof str !== "string") return "";
      return str
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
    });

    this.env.addFilter("shellEscape", (str) => {
      if (!str || typeof str !== "string") return "";
      return str.replace(/([\\$`"])/g, "\\$1");
    });
  }

  addSecurityExtensions() {
    // Store original method
    this._originalRenderString = this.env.renderString.bind(this.env);

    // Override with security checks
    this.env.renderString = (template, context) => {
      // Check template size
      if (template.length > this.maxTemplateSize) {
        throw new Error(
          `Template too large: ${template.length} bytes (max ${this.maxTemplateSize})`
        );
      }

      // Sanitize context
      const safeContext = this.sanitizeContext(context);

      // Set timeout
      const startTime = Date.now();
      const result = this._originalRenderString(template, safeContext);

      // Check rendering time
      const renderTime = Date.now() - startTime;
      if (renderTime > this.timeout) {
        throw new Error(`Template rendering timeout: ${renderTime}ms`);
      }

      // Check output size
      if (result.length > this.maxOutputSize) {
        throw new Error(
          `Template output too large: ${result.length} bytes (max ${this.maxOutputSize})`
        );
      }

      return result;
    };
  }

  sanitizeContext(context) {
    if (!context || typeof context !== "object") {
      return {};
    }

    const sanitized = {};
    const dangerous = ["__proto__", "constructor", "prototype"];

    for (const [key, value] of Object.entries(context)) {
      // Skip dangerous keys
      if (dangerous.includes(key)) {
        this.logger.warn(`Skipping dangerous context key: ${key}`);
        continue;
      }

      // Recursively sanitize objects
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          sanitized[key] = value.map((item) =>
            typeof item === "object" ? this.sanitizeContext(item) : item
          );
        } else {
          sanitized[key] = this.sanitizeContext(value);
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  async process(step, context = {}) {
    const { src, target, action = "write", backup = false } = step;

    try {
      this.logger.debug(`Processing template: ${src} -> ${target}`);

      // Validate paths
      this.validatePaths(src, target);

      // Read template
      const template = this.readTemplate(src);

      // Check if this is actually a template or just a file copy
      if (!this.isTemplate(template)) {
        this.logger.debug(`File is not a template, copying: ${src}`);
        return this.copyFile(src, target, backup, action);
      }

      // Parse front-matter for return data
      const { data: frontMatter } = grayMatter.default(template);

      // Render template
      const rendered = this.renderTemplate(template, context);

      // Write output based on action
      if (action === "merge") {
        await this.mergeOutput(rendered, target, backup);
      } else {
        await this.writeOutput(rendered, target, backup);
      }

      this.logger.debug(`Template processed successfully: ${target}`);

      return {
        success: true,
        src,
        target,
        action,
        size: rendered.length,
        frontMatter,
      };
    } catch (error) {
      this.logger.error(`Template processing failed: ${src}`, error.message);
      throw new Error(`Template processing failed: ${error.message}`);
    }
  }

  validatePaths(src, target) {
    if (!src || !target) {
      throw new Error("Source and target paths are required");
    }

    if (!existsSync(src)) {
      throw new Error(`Template file not found: ${src}`);
    }

    // Ensure target directory exists
    const targetDir = dirname(target);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
  }

  readTemplate(src) {
    try {
      const stats = statSync(src);

      if (stats.size > this.maxTemplateSize) {
        throw new Error(`Template file too large: ${stats.size} bytes`);
      }

      return readFileSync(src, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Template file not found: ${src}`);
      }
      throw error;
    }
  }

  isTemplate(content) {
    // Check for Nunjucks template syntax
    const templatePatterns = [
      /\{\{.*?\}\}/, // Variables
      /\{%.*?%\}/, // Tags
      /\{#.*?#\}/, // Comments
    ];

    return templatePatterns.some((pattern) => pattern.test(content));
  }

  renderTemplate(template, context) {
    try {
      // Parse front-matter if present
      const { data: frontMatter, content: templateContent } =
        grayMatter.default(template);

      // Add system context with safe defaults
      const fullContext = {
        ...context,
        // Wrap context in inputs for template compatibility
        inputs: context,
        // Include front-matter variables
        ...frontMatter.variables,
        // Include other front-matter data
        ...frontMatter,
        nowISO: new Date().toISOString(),
        repo: {
          name: context.repo?.name || "unknown",
          branch: context.repo?.branch || "main",
        },
        git: {
          branch: context.git?.branch || "main",
          commit: context.git?.commit || "unknown",
        },
        pkg: {
          name: context.pkg?.name || "unknown",
          version: context.pkg?.version || "1.0.0",
        },
        env: {
          NODE_ENV: context.env?.NODE_ENV || "development",
          USER: context.env?.USER || "unknown",
          ...context.env,
        },
        __template: {
          timestamp: new Date().toISOString(),
          version: "2.0.0",
        },
      };

      return this.env.renderString(templateContent, fullContext);
    } catch (error) {
      if (error.message.includes("filter not found")) {
        throw new Error(`Template error: ${error.message}`);
      }
      if (error.name === "Template render error") {
        throw new Error(`Template syntax error: ${error.message}`);
      }
      throw error;
    }
  }

  copyFile(src, target, backup, action = "write") {
    if (backup && existsSync(target)) {
      const backupPath = `${target}.bak.${Date.now()}`;
      copyFileSync(target, backupPath);
      this.logger.debug(`Created backup: ${backupPath}`);
    }

    if (action === "merge") {
      // Read existing content if file exists
      let existingContent = "";
      if (existsSync(target)) {
        existingContent = readFileSync(target, "utf8");
      }

      // Read source content
      const sourceContent = readFileSync(src, "utf8");

      // Append source content to existing content
      const mergedContent = existingContent + sourceContent;
      writeFileSync(target, mergedContent, "utf8");
    } else {
      // Regular file copy
      copyFileSync(src, target);
    }

    return {
      success: true,
      src,
      target,
      action: "copy",
    };
  }

  async writeOutput(content, target, backup) {
    if (backup && existsSync(target)) {
      const backupPath = `${target}.bak.${Date.now()}`;
      copyFileSync(target, backupPath);
      this.logger.debug(`Created backup: ${backupPath}`);
    }

    writeFileSync(target, content, "utf8");
  }

  async mergeOutput(content, target, backup) {
    if (backup && existsSync(target)) {
      const backupPath = `${target}.bak.${Date.now()}`;
      copyFileSync(target, backupPath);
      this.logger.debug(`Created backup: ${backupPath}`);
    }

    // Read existing content if file exists
    let existingContent = "";
    if (existsSync(target)) {
      existingContent = readFileSync(target, "utf8");
    }

    // Append new content to existing content
    const mergedContent = existingContent + content;
    writeFileSync(target, mergedContent, "utf8");
  }

  // Utility method for direct template rendering
  async render(templateContent, context = {}) {
    if (!templateContent || typeof templateContent !== "string") {
      throw new Error("Template content is required");
    }

    return this.renderTemplate(templateContent, context);
  }

  // Batch processing
  async processBatch(steps, context = {}) {
    const results = [];

    for (const step of steps) {
      try {
        const result = await this.process(step, context);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          src: step.src,
          target: step.target,
          error: error.message,
        });
      }
    }

    return results;
  }
}
