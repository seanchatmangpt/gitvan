/**
 * FileStepHandler Individual Test
 * Tests the file step handler in isolation to ensure it properly handles file operations
 */

import { describe, it, expect } from "vitest";
import { FileStepHandler } from "../../src/workflow/step-handlers/file-step-handler.mjs";
import { withMemFSTestEnvironment } from "../../src/composables/test-environment.mjs";

describe("FileStepHandler", () => {
  it("should write file with content", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new FileStepHandler();

      // Define step
      const step = {
        id: "test-write",
        type: "file",
        config: {
          operation: "write",
          filePath: "output/test-file.txt",
          content: "Hello, World!\nThis is a test file.",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.operation).toBe("write");
      expect(result.data.filePath).toBe("output/test-file.txt");
      expect(result.data.contentLength).toBeGreaterThan(0);

      // Verify file was created
      const content = await env.files.read("output/test-file.txt");
      expect(content).toBe("Hello, World!\nThis is a test file.");
    });
  });

  it("should read file content", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create test file
      const testContent = "This is test content for reading.";
      await env.files.write("input/test-read.txt", testContent);

      // Create handler
      const handler = new FileStepHandler();

      // Define step
      const step = {
        id: "test-read",
        type: "file",
        config: {
          operation: "read",
          filePath: "input/test-read.txt",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.operation).toBe("read");
      expect(result.data.filePath).toBe("input/test-read.txt");
      expect(result.data.content).toBe(testContent);
      expect(result.data.contentLength).toBe(testContent.length);
    });
  });

  it("should copy file from source to destination", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create source file
      const sourceContent = "This is the source file content.";
      await env.files.write("source/original.txt", sourceContent);

      // Create handler
      const handler = new FileStepHandler();

      // Define step
      const step = {
        id: "test-copy",
        type: "file",
        config: {
          operation: "copy",
          sourcePath: "source/original.txt",
          targetPath: "destination/copied.txt",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.operation).toBe("copy");
      expect(result.data.sourcePath).toBe("source/original.txt");
      expect(result.data.targetPath).toBe("destination/copied.txt");

      // Verify file was copied
      const copiedContent = await env.files.read("destination/copied.txt");
      expect(copiedContent).toBe(sourceContent);

      // Verify original file still exists
      const originalContent = await env.files.read("source/original.txt");
      expect(originalContent).toBe(sourceContent);
    });
  });

  it("should move file from source to destination", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create source file
      const sourceContent = "This is the file to be moved.";
      await env.files.write("source/to-move.txt", sourceContent);

      // Create handler
      const handler = new FileStepHandler();

      // Define step
      const step = {
        id: "test-move",
        type: "file",
        config: {
          operation: "move",
          sourcePath: "source/to-move.txt",
          targetPath: "destination/moved.txt",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.operation).toBe("move");
      expect(result.data.sourcePath).toBe("source/to-move.txt");
      expect(result.data.targetPath).toBe("destination/moved.txt");

      // Verify file was moved
      const movedContent = await env.files.read("destination/moved.txt");
      expect(movedContent).toBe(sourceContent);

      // Verify original file no longer exists
      try {
        await env.files.read("source/to-move.txt");
        expect.fail("Original file should not exist after move");
      } catch (error) {
        // Expected - file should not exist
      }
    });
  });

  it("should delete file", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create file to delete
      const content = "This file will be deleted.";
      await env.files.write("temp/to-delete.txt", content);

      // Create handler
      const handler = new FileStepHandler();

      // Define step
      const step = {
        id: "test-delete",
        type: "file",
        config: {
          operation: "delete",
          filePath: "temp/to-delete.txt",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.operation).toBe("delete");
      expect(result.data.filePath).toBe("temp/to-delete.txt");

      // Verify file was deleted
      try {
        await env.files.read("temp/to-delete.txt");
        expect.fail("File should not exist after deletion");
      } catch (error) {
        // Expected - file should not exist
      }
    });
  });

  it("should render template content in write operation", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new FileStepHandler();

      // Define step with template content
      const step = {
        id: "test-template-write",
        type: "file",
        config: {
          operation: "write",
          filePath: "output/templated-file.txt",
          content:
            "Hello {{ name }}!\nYour project {{ project }} is {{ status }}.",
        },
      };

      // Define inputs
      const inputs = {
        name: "Developer",
        project: "GitVan",
        status: "active",
      };

      // Execute step
      const result = await handler.execute(step, inputs, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.operation).toBe("write");
      expect(result.data.rendered).toBe(true);

      // Verify file was created with rendered content
      const content = await env.files.read("output/templated-file.txt");
      expect(content).toBe("Hello Developer!\nYour project GitVan is active.");
    });
  });

  it("should create nested directories for write operation", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new FileStepHandler();

      // Define step with nested path
      const step = {
        id: "test-nested-write",
        type: "file",
        config: {
          operation: "write",
          filePath: "very/deeply/nested/path/file.txt",
          content: "Content in nested directory",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.filePath).toBe("very/deeply/nested/path/file.txt");

      // Verify file was created in nested directory
      const content = await env.files.read("very/deeply/nested/path/file.txt");
      expect(content).toBe("Content in nested directory");
    });
  });

  it("should handle read operation on non-existent file", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new FileStepHandler();

      // Define step
      const step = {
        id: "test-read-missing",
        type: "file",
        config: {
          operation: "read",
          filePath: "nonexistent/file.txt",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("ENOENT");
    });
  });

  it("should handle copy operation with non-existent source", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new FileStepHandler();

      // Define step
      const step = {
        id: "test-copy-missing",
        type: "file",
        config: {
          operation: "copy",
          sourcePath: "nonexistent/source.txt",
          targetPath: "destination/copied.txt",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("ENOENT");
    });
  });

  it("should handle unsupported operation", async () => {
    await withMemFSTestEnvironment({}, async (env) => {
      // Create handler
      const handler = new FileStepHandler();

      // Define step with unsupported operation
      const step = {
        id: "test-unsupported",
        type: "file",
        config: {
          operation: "unsupported",
          filePath: "test.txt",
        },
      };

      // Execute step
      const result = await handler.execute(step, {}, { files: env.files });

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Unknown file operation");
    });
  });
});
