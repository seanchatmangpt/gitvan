// tests/output-step-handler.test.mjs
// Test suite for OutputStepHandler

import { describe, it, expect, beforeEach } from "vitest";
import { OutputStepHandler } from "../src/workflow/step-handlers/output-step-handler.mjs";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("OutputStepHandler", () => {
  let handler;
  let testDir;

  beforeEach(async () => {
    handler = new OutputStepHandler();
    testDir = resolve("./test-output-handler");

    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
    await mkdir(testDir, { recursive: true });
  });

  describe("getStepType", () => {
    it("should return 'output'", () => {
      expect(handler.getStepType()).toBe("output");
    });
  });

  describe("validate", () => {
    it("should validate a correct step configuration", () => {
      const step = {
        config: {
          template: "# Hello World",
          outputPath: "./test.md",
          format: "markdown",
        },
      };

      expect(() => handler.validate(step)).not.toThrow();
    });

    it("should throw error for missing template", () => {
      const step = {
        config: {
          outputPath: "./test.md",
          format: "markdown",
        },
      };

      expect(() => handler.validate(step)).toThrow(
        "Output step missing template or templatePath"
      );
    });

    it("should throw error for missing outputPath", () => {
      const step = {
        config: {
          template: "# Hello World",
          format: "markdown",
        },
      };

      expect(() => handler.validate(step)).toThrow(
        "Output step missing outputPath"
      );
    });

    it("should auto-detect format from outputPath", () => {
      const step = {
        config: {
          template: "# Hello World",
          outputPath: "./test.md",
        },
      };

      expect(() => handler.validate(step)).not.toThrow();
    });
  });

  describe("execute", () => {
    it("should generate markdown document", async () => {
      const step = {
        config: {
          template: "# Hello {{name}}\n\nThis is a test document.",
          outputPath: resolve(testDir, "test.md"),
          format: "markdown",
        },
      };

      const inputs = { name: "World" };
      const context = {};

      const result = await handler.execute(step, inputs, context);

      expect(result.success).toBe(true);
      expect(result.data.outputPath).toBe(resolve(testDir, "test.md"));
      expect(result.data.format).toBe("markdown");
      expect(result.data.contentLength).toBeGreaterThan(0);
      expect(existsSync(result.data.outputPath)).toBe(true);
    });

    it("should generate HTML document", async () => {
      const step = {
        config: {
          template: "# Hello {{name}}\n\nThis is a test document.",
          outputPath: resolve(testDir, "test.html"),
          format: "html",
        },
      };

      const inputs = { name: "World" };
      const context = {};

      const result = await handler.execute(step, inputs, context);

      expect(result.success).toBe(true);
      expect(result.data.format).toBe("html");
      expect(existsSync(result.data.outputPath)).toBe(true);
    });

    it("should generate LaTeX document", async () => {
      const step = {
        config: {
          template: "# Hello {{name}}\n\nThis is a test document.",
          outputPath: resolve(testDir, "test.tex"),
          format: "latex",
        },
      };

      const inputs = { name: "World" };
      const context = {};

      const result = await handler.execute(step, inputs, context);

      expect(result.success).toBe(true);
      expect(result.data.format).toBe("latex");
      expect(existsSync(result.data.outputPath)).toBe(true);
    });

    it("should generate Excel document", async () => {
      const step = {
        config: {
          template: "# Data Report",
          outputPath: resolve(testDir, "test.xlsx"),
          format: "excel",
        },
      };

      const inputs = {
        title: "Test Report",
        data: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 },
        ],
      };
      const context = {};

      const result = await handler.execute(step, inputs, context);

      expect(result.success).toBe(true);
      expect(result.data.format).toBe("excel");
      expect(existsSync(result.data.outputPath)).toBe(true);
    });

    it("should generate PowerPoint document", async () => {
      const step = {
        config: {
          template: "# Presentation",
          outputPath: resolve(testDir, "test.pptx"),
          format: "powerpoint",
        },
      };

      const inputs = {
        title: "Test Presentation",
        data: { key1: "value1", key2: "value2" },
      };
      const context = {};

      const result = await handler.execute(step, inputs, context);

      expect(result.success).toBe(true);
      expect(result.data.format).toBe("powerpoint");
      expect(existsSync(result.data.outputPath)).toBe(true);
    });

    it("should handle template from file", async () => {
      const templatePath = resolve(testDir, "template.md");
      await writeFile(templatePath, "# Hello {{name}}\n\nFrom template file.");

      const step = {
        config: {
          templatePath: templatePath,
          outputPath: resolve(testDir, "from-file.md"),
          format: "markdown",
        },
      };

      const inputs = { name: "World" };
      const context = {};

      const result = await handler.execute(step, inputs, context);

      expect(result.success).toBe(true);
      expect(result.data.templateUsed).toBe(templatePath);
      expect(existsSync(result.data.outputPath)).toBe(true);
    });

    it("should handle auto format detection", async () => {
      const step = {
        config: {
          template: "# Hello World",
          outputPath: resolve(testDir, "auto.html"),
        },
      };

      const inputs = {};
      const context = {};

      const result = await handler.execute(step, inputs, context);

      expect(result.success).toBe(true);
      expect(result.data.format).toBe("html");
    });

    it("should handle errors gracefully", async () => {
      const step = {
        config: {
          template: "# Hello World",
          outputPath: "/invalid/path/test.md",
          format: "markdown",
        },
      };

      const inputs = {};
      const context = {};

      const result = await handler.execute(step, inputs, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("format detection", () => {
    it("should detect markdown format", () => {
      expect(handler._getFormatFromPath("test.md")).toBe("markdown");
      expect(handler._getFormatFromPath("test.markdown")).toBe("markdown");
    });

    it("should detect HTML format", () => {
      expect(handler._getFormatFromPath("test.html")).toBe("html");
      expect(handler._getFormatFromPath("test.htm")).toBe("html");
    });

    it("should detect LaTeX format", () => {
      expect(handler._getFormatFromPath("test.tex")).toBe("latex");
      expect(handler._getFormatFromPath("test.latex")).toBe("latex");
    });

    it("should detect Excel format", () => {
      expect(handler._getFormatFromPath("test.xlsx")).toBe("xlsx");
      expect(handler._getFormatFromPath("test.xls")).toBe("xlsx");
    });

    it("should detect PowerPoint format", () => {
      expect(handler._getFormatFromPath("test.pptx")).toBe("pptx");
      expect(handler._getFormatFromPath("test.ppt")).toBe("pptx");
    });

    it("should detect Word format", () => {
      expect(handler._getFormatFromPath("test.docx")).toBe("docx");
      expect(handler._getFormatFromPath("test.doc")).toBe("docx");
    });

    it("should default to markdown for unknown extensions", () => {
      expect(handler._getFormatFromPath("test.unknown")).toBe("markdown");
    });
  });

  describe("utility methods", () => {
    it("should estimate pages correctly", () => {
      const shortContent = "Short content";
      const longContent = "A".repeat(10000);

      expect(handler._estimatePages(shortContent)).toBe(1);
      expect(handler._estimatePages(longContent)).toBeGreaterThan(1);
    });

    it("should count slides in HTML", () => {
      const htmlWithSlides =
        '<div class="slide"></div><div class="slide"></div>';
      const htmlWithoutSlides = '<div class="content"></div>';

      expect(handler._countSlides(htmlWithSlides)).toBe(2);
      expect(handler._countSlides(htmlWithoutSlides)).toBe(1);
    });

    it("should convert inputs to rows", () => {
      const arrayInput = [{ name: "John" }, { name: "Jane" }];
      const objectInput = { name: "John", age: 30 };

      expect(handler._convertInputsToRows(arrayInput)).toEqual(arrayInput);
      expect(handler._convertInputsToRows(objectInput)).toEqual([objectInput]);
    });
  });
});
