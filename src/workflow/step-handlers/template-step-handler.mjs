// src/workflow/step-handlers/TemplateStepHandler.mjs
// Template step handler using useTemplate composable

import { BaseStepHandler } from "./base-step-handler.mjs";
import { useTemplate } from "../../composables/template.mjs";

/**
 * Handler for template rendering steps
 */
export class TemplateStepHandler extends BaseStepHandler {
  getStepType() {
    return "template";
  }

  validate(step) {
    if (!step.config) {
      throw new Error("Template step missing configuration");
    }

    if (!step.config.template && !step.config.templatePath) {
      throw new Error("Template step missing template or templatePath");
    }

    if (!step.config.outputPath) {
      throw new Error("Template step missing outputPath");
    }

    return true;
  }

  /**
   * Execute template rendering step
   * @param {object} step - Step definition
   * @param {object} inputs - Step inputs
   * @param {object} context - Execution context
   * @returns {Promise<object>} Step execution result
   */
  async execute(step, inputs, context) {
    this.logger.info(`📝 Executing template step`);

    const { template, templatePath, outputPath, ...templateOptions } =
      step.config;

    try {
      // Initialize template engine
      const templateEngine = await useTemplate({
        paths: templateOptions.paths || ["./templates"],
        autoescape: templateOptions.autoescape !== false,
        noCache: templateOptions.noCache || false,
      });

      let renderedContent;

      if (template) {
        // Render inline template
        renderedContent = await templateEngine.renderString(template, inputs);
      } else if (templatePath) {
        // Render template from file
        renderedContent = await templateEngine.render(templatePath, inputs);
      } else {
        throw new Error("No template or templatePath provided");
      }

      // Write rendered content to output path
      // Use context's file system if available, otherwise fall back to Node.js fs
      const fs =
        context.files || (await import("node:fs").then((m) => m.promises));
      const { dirname } = await import("node:path");

      // Ensure output directory exists
      if (fs.mkdir) {
        // Test environment files API
        const dir = dirname(outputPath);
        if (dir !== "." && dir !== outputPath) {
          await fs.mkdir(dir);
        }
        await fs.write(outputPath, renderedContent);
      } else {
        // Node.js fs.promises API
        await fs.mkdir(dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, renderedContent, "utf8");
      }

      return this.createResult({
        outputPath,
        content: renderedContent,
        templateUsed: template ? "inline" : templatePath,
        contentLength: renderedContent.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`❌ Template step failed: ${error.message}`);
      return this.createResult(null, false, error.message);
    }
  }

  /**
   * Validate template syntax (basic validation)
   * @param {string} template - Template string
   * @returns {boolean} True if template appears valid
   */
  validateTemplate(template) {
    if (!template || typeof template !== "string") {
      return false;
    }

    // Basic template syntax validation
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;

    return openBraces === closeBraces;
  }
}
