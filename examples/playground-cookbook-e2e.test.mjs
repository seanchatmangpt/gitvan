import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe("GitVan Playground Cookbook E2E Tests", () => {
  let playgroundDir;
  let originalCwd;

  beforeEach(async () => {
    originalCwd = process.cwd();
    playgroundDir = join(process.cwd(), "playground");

    // Ensure we're in the playground directory
    process.chdir(playgroundDir);
  });

  afterEach(async () => {
    // Restore original working directory
    process.chdir(originalCwd);
  });

  describe("Foundation Recipes", () => {
    it("should discover all foundation jobs correctly", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.list())",
      ]);

      expect(result.stdout).toContain("foundation:basic-job-setup");
      expect(result.stdout).toContain("foundation:file-output-job");
      expect(result.stdout).toContain("foundation:template-greeting");
      expect(result.stdout).toContain("foundation:robust-error-handling");
      expect(result.stdout).toContain("foundation");
    });

    it("should execute basic job setup successfully", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('foundation:basic-job-setup'))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("🎉 Greeting generated successfully!");
      expect(result.stdout).toContain("Repository:");
      expect(result.stdout).toContain("Clean:");
    });

    it("should execute file output job successfully", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('foundation:file-output-job', {test: 'data'}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("Artifacts: 1");

      // Check that the file was created
      const reportPath = join(
        playgroundDir,
        "dist",
        "foundation",
        "greeting-report.json",
      );
      const reportExists = await fs
        .access(reportPath)
        .then(() => true)
        .catch(() => false);
      expect(reportExists).toBe(true);

      // Check file content
      const reportContent = await fs.readFile(reportPath, "utf-8");
      const reportData = JSON.parse(reportContent);
      expect(reportData.payload).toBeDefined();
      expect(reportData.repository).toBeDefined();
      expect(reportData.environment).toBeDefined();
    });

    it("should execute template greeting job successfully", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('foundation:template-greeting', {custom: 'value'}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("Artifacts: 1");

      // Check that the HTML file was created
      const htmlPath = join(
        playgroundDir,
        "dist",
        "foundation",
        "greeting-template.html",
      );
      const htmlExists = await fs
        .access(htmlPath)
        .then(() => true)
        .catch(() => false);
      expect(htmlExists).toBe(true);

      // Check HTML content
      const htmlContent = await fs.readFile(htmlPath, "utf-8");
      expect(htmlContent).toContain(
        "Hello from GitVan Cookbook Template System!",
      );
      expect(htmlContent).toContain("Custom");
      expect(htmlContent).toContain("value");
      expect(htmlContent).toContain("Repository Information");
      expect(htmlContent).toContain("Environment");
    });

    it("should handle robust error handling job with valid payload", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('foundation:robust-error-handling', {requiredField: 'test'}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("Input validation passed");
      expect(result.stdout).toContain("Git operations completed successfully");
      expect(result.stdout).toContain("Output file created");

      // Check that files were created
      const jsonPath = join(
        playgroundDir,
        "dist",
        "foundation",
        "robust-job-output.json",
      );
      const htmlPath = join(
        playgroundDir,
        "dist",
        "foundation",
        "robust-job-report.html",
      );

      const jsonExists = await fs
        .access(jsonPath)
        .then(() => true)
        .catch(() => false);
      const htmlExists = await fs
        .access(htmlPath)
        .then(() => true)
        .catch(() => false);

      expect(jsonExists).toBe(true);
      expect(htmlExists).toBe(true);
    });

    it("should handle robust error handling job with invalid payload", async () => {
      try {
        await execFileAsync("node", [
          "-e",
          "import('./dev.mjs').then(m=>m.run('foundation:robust-error-handling', {requiredField: 123}))",
        ]);
        expect.fail("Expected job to fail with validation error");
      } catch (error) {
        expect(error.stderr).toContain("Validation failed");
        expect(error.stderr).toContain("requiredField must be a string");
      }
    });
  });

  describe("Documentation Recipes", () => {
    it("should discover documentation jobs correctly", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.list())",
      ]);

      expect(result.stdout).toContain("documentation:advanced-changelog");
      expect(result.stdout).toContain("advanced-changelog");
    });

    it("should execute advanced changelog job successfully", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('documentation:advanced-changelog', {limit: 20}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("Advanced changelog generated");
      expect(result.stdout).toContain("Processed");
      expect(result.stdout).toContain("commits from");
      expect(result.stdout).toContain("authors");

      // Check that the changelog was created
      const changelogPath = join(
        playgroundDir,
        "dist",
        "documentation",
        "ADVANCED_CHANGELOG.md",
      );
      const changelogExists = await fs
        .access(changelogPath)
        .then(() => true)
        .catch(() => false);
      expect(changelogExists).toBe(true);

      // Check changelog content
      const changelogContent = await fs.readFile(changelogPath, "utf-8");
      expect(changelogContent).toContain(
        "# Advanced Changelog - Cookbook Recipe",
      );
      expect(changelogContent).toContain("## 📊 Statistics");
      expect(changelogContent).toContain("## 📝 Changes by Category");
      expect(changelogContent).toContain("## 📋 All Commits");
      expect(changelogContent).toContain(
        "*Generated by GitVan Jobs System - Cookbook Recipe: Advanced Changelog Generation*",
      );
    });

    it("should handle changelog job with custom parameters", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('documentation:advanced-changelog', {since: '1 week ago', includeStats: true}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("Advanced changelog generated");

      // Check that the changelog was created with custom parameters
      const changelogPath = join(
        playgroundDir,
        "dist",
        "documentation",
        "ADVANCED_CHANGELOG.md",
      );
      const changelogContent = await fs.readFile(changelogPath, "utf-8");
      expect(changelogContent).toContain("Generated from");
      expect(changelogContent).toContain("commits since 1 week ago");
    });
  });

  describe("CI/CD Recipes", () => {
    it("should discover CI/CD jobs correctly", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.list())",
      ]);

      expect(result.stdout).toContain("cicd:build-automation");
      expect(result.stdout).toContain("Automated build process");
    });

    it("should execute build automation job successfully", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('cicd:build-automation', {environment: 'development', allowDirty: true}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain(
        "Starting production build for development environment",
      );
      expect(result.stdout).toContain("Build completed successfully");
      expect(result.stdout).toContain("Build report:");

      // Check that build artifacts were created
      const jsonPath = join(
        playgroundDir,
        "dist",
        "cicd",
        "build",
        "build-report.json",
      );
      const htmlPath = join(
        playgroundDir,
        "dist",
        "cicd",
        "build",
        "build-report.html",
      );

      const jsonExists = await fs
        .access(jsonPath)
        .then(() => true)
        .catch(() => false);
      const htmlExists = await fs
        .access(htmlPath)
        .then(() => true)
        .catch(() => false);

      expect(jsonExists).toBe(true);
      expect(htmlExists).toBe(true);

      // Check build report content
      const reportContent = await fs.readFile(jsonPath, "utf-8");
      const reportData = JSON.parse(reportContent);
      expect(reportData.success).toBe(true);
      expect(reportData.environment).toBe("development");
      expect(reportData.buildType).toBe("production");
      expect(reportData.steps).toBeDefined();
      expect(reportData.summary).toBeDefined();
      expect(reportData.summary.totalSteps).toBeGreaterThan(0);
    });

    it("should handle build automation with different environments", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('cicd:build-automation', {environment: 'production', buildType: 'release', allowDirty: true}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("Starting release build");

      // Check build report content
      const jsonPath = join(
        playgroundDir,
        "dist",
        "cicd",
        "build",
        "build-report.json",
      );
      const reportContent = await fs.readFile(jsonPath, "utf-8");
      const reportData = JSON.parse(reportContent);
      expect(reportData.environment).toBe("production");
      expect(reportData.buildType).toBe("release");
    });

    it("should handle build automation with clean build", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('cicd:build-automation', {cleanBuild: true, allowDirty: true}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("Cleaned build directory");
    });
  });

  describe("Template System Integration", () => {
    it("should render foundation templates correctly", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('foundation:template-greeting'))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");

      // Check HTML template rendering
      const htmlPath = join(
        playgroundDir,
        "dist",
        "foundation",
        "greeting-template.html",
      );
      const htmlContent = await fs.readFile(htmlPath, "utf-8");

      expect(htmlContent).toContain("<!DOCTYPE html>");
      expect(htmlContent).toContain(
        "Hello from GitVan Cookbook Template System!",
      );
      expect(htmlContent).toContain("Repository Information");
      expect(htmlContent).toContain("Environment");
      expect(htmlContent).toContain("Foundation Recipe: Template System");
    });

    it("should render CI/CD templates correctly", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('cicd:build-automation', {allowDirty: true}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");

      // Check HTML template rendering
      const htmlPath = join(
        playgroundDir,
        "dist",
        "cicd",
        "build",
        "build-report.html",
      );
      const htmlContent = await fs.readFile(htmlPath, "utf-8");

      expect(htmlContent).toContain("<!DOCTYPE html>");
      expect(htmlContent).toContain("Build Report - Cookbook Recipe");
      expect(htmlContent).toContain("Build Steps");
      expect(htmlContent).toContain("Build Information");
    });

    it("should render documentation templates correctly", async () => {
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('documentation:advanced-changelog', {limit: 10}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");

      // Check Markdown template rendering
      const mdPath = join(
        playgroundDir,
        "dist",
        "documentation",
        "ADVANCED_CHANGELOG.md",
      );
      const mdContent = await fs.readFile(mdPath, "utf-8");

      expect(mdContent).toContain("# Advanced Changelog - Cookbook Recipe");
      expect(mdContent).toContain("## 📊 Statistics");
      expect(mdContent).toContain("## 📝 Changes by Category");
      expect(mdContent).toContain(
        "*Generated by GitVan Jobs System - Cookbook Recipe: Advanced Changelog Generation*",
      );
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle validation errors gracefully", async () => {
      try {
        await execFileAsync("node", [
          "-e",
          "import('./dev.mjs').then(m=>m.run('foundation:robust-error-handling', {invalid: 'payload'}))",
        ]);
        expect.fail("Expected job to fail with validation error");
      } catch (error) {
        expect(error.stderr).toContain("Validation failed");
        expect(error.stderr).toContain("Invalid payload detected");
      }
    });

    it("should handle build failures gracefully", async () => {
      // This test would require mocking the build steps to fail
      // For now, we'll test that the build system handles errors properly
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('cicd:build-automation', {environment: 'test', allowDirty: true}))",
      ]);

      // Even if some steps fail, the job should complete and generate a report
      expect(result.stdout).toContain("Build report:");

      const jsonPath = join(
        playgroundDir,
        "dist",
        "cicd",
        "build",
        "build-report.json",
      );
      const jsonExists = await fs
        .access(jsonPath)
        .then(() => true)
        .catch(() => false);
      expect(jsonExists).toBe(true);
    });
  });

  describe("Performance and Reliability", () => {
    it("should complete jobs within reasonable time", async () => {
      const startTime = Date.now();

      await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('foundation:basic-job-setup'))",
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it("should handle concurrent job discovery", async () => {
      const [result1, result2, result3] = await Promise.all([
        execFileAsync("node", ["-e", "import('./dev.mjs').then(m=>m.list())"]),
        execFileAsync("node", ["-e", "import('./dev.mjs').then(m=>m.list())"]),
        execFileAsync("node", ["-e", "import('./dev.mjs').then(m=>m.list())"]),
      ]);

      // All should return the same result
      expect(result1.stdout).toContain("foundation:basic-job-setup");
      expect(result2.stdout).toContain("foundation:basic-job-setup");
      expect(result3.stdout).toContain("foundation:basic-job-setup");
    });
  });

  describe("Integration with GitVan Core", () => {
    it("should use correct GitVan configuration", async () => {
      const configPath = join(playgroundDir, "gitvan.config.js");
      const configExists = await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false);
      expect(configExists).toBe(true);

      const configContent = await fs.readFile(configPath, "utf-8");
      expect(configContent).toContain(
        'templates: { engine: "nunjucks", dirs: ["templates"] }',
      );
      expect(configContent).toContain(
        'receipts: { ref: "refs/notes/gitvan/results" }',
      );
    });

    it("should integrate with all core systems", async () => {
      // Test that jobs can use all core systems
      const result = await execFileAsync("node", [
        "-e",
        "import('./dev.mjs').then(m=>m.run('foundation:template-greeting', {test: 'integration'}))",
      ]);

      expect(result.stdout).toContain("Status: SUCCESS");
      expect(result.stdout).toContain("Template greeting created");

      // Verify that the job used git, templates, and file system
      const htmlPath = join(
        playgroundDir,
        "dist",
        "foundation",
        "greeting-template.html",
      );
      const htmlContent = await fs.readFile(htmlPath, "utf-8");
      expect(htmlContent).toContain("Test");
      expect(htmlContent).toContain("integration");
    });
  });
});
