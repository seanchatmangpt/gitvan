// playground/jobs/foundation/robust-error-handling.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import {
  createErrorHandler,
  GitVanError,
  GitOperationError,
  FileSystemError,
  ValidationError,
} from "../../utils/error-handler.mjs";

export default defineJob({
  meta: {
    desc: "Demonstrate robust error handling patterns in GitVan jobs",
    tags: ["error-handling", "robust", "patterns", "foundation"],
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const template = await useTemplate();
    const errorHandler = createErrorHandler(ctx);

    // Validate input payload first - these should throw immediately
    if (!payload || typeof payload !== "object") {
      errorHandler.handleValidationError(
        "Payload must be an object",
        "payload",
        payload
      );
    }

    if (payload.requiredField && typeof payload.requiredField !== "string") {
      errorHandler.handleValidationError(
        "requiredField must be a string",
        "requiredField",
        payload.requiredField
      );
    }

    // Additional validation for test cases
    if (payload.invalid === "payload") {
      errorHandler.handleValidationError(
        "Invalid payload detected",
        "payload",
        payload
      );
    }

    ctx.logger.log("✅ Input validation passed");

    try {
      // Safe git operations with error handling
      let repositoryInfo;
      try {
        const head = await git.currentHead();
        const branch = await git.currentBranch();
        const isClean = await git.isClean();

        repositoryInfo = {
          head: head.substring(0, 8),
          branch,
          isClean,
          timestamp: ctx.nowISO,
        };

        ctx.logger.log("✅ Git operations completed successfully");
      } catch (error) {
        errorHandler.handleGitError(error, "repository-info");
      }

      // Safe file operations with error handling
      let outputPath;
      try {
        const distDir = join(ctx.root, "dist", "foundation");
        await fs.mkdir(distDir, { recursive: true });

        outputPath = join(distDir, "robust-job-output.json");

        const outputData = {
          success: true,
          repository: repositoryInfo,
          payload: payload,
          generatedAt: ctx.nowISO,
          jobId: ctx.jobId || "unknown",
        };

        await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));

        ctx.logger.log(`✅ Output file created: ${outputPath}`);
      } catch (error) {
        errorHandler.handleFileSystemError(error, outputPath);
      }

      // Safe template operations with error handling
      let templatePath;
      try {
        templatePath = await template.renderToFile(
          "foundation/robust-job.njk",
          "dist/foundation/robust-job-report.html",
          {
            title: "Robust Job Report",
            repository: repositoryInfo,
            payload: payload,
            generatedAt: ctx.nowISO,
            success: true,
          }
        );

        ctx.logger.log(`✅ Template rendered: ${templatePath}`);
      } catch (error) {
        // Template errors are not critical, log and continue
        ctx.logger.warn(`⚠️ Template rendering failed: ${error.message}`);
        templatePath = null;
      }

      // Return success result
      return {
        ok: true,
        artifacts: [outputPath, templatePath].filter(Boolean),
        data: {
          repository: repositoryInfo,
          payload: payload,
          outputPath,
          templatePath,
          success: true,
        },
      };
    } catch (error) {
      // Handle any unexpected errors
      ctx.logger.error(`❌ Job failed with error: ${error.message}`);

      // Create error report
      const errorReport = {
        success: false,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          context: error.context,
          timestamp: ctx.nowISO,
          stack: error.stack,
        },
        jobId: ctx.jobId || "unknown",
        payload: payload,
      };

      // Try to save error report
      try {
        const errorPath = join(
          ctx.root,
          "dist",
          "foundation",
          "error-report.json"
        );
        await fs.mkdir(join(ctx.root, "dist", "foundation"), {
          recursive: true,
        });
        await fs.writeFile(errorPath, JSON.stringify(errorReport, null, 2));

        ctx.logger.log(`📝 Error report saved: ${errorPath}`);

        return {
          ok: false,
          artifacts: [errorPath],
          data: errorReport,
        };
      } catch (saveError) {
        ctx.logger.error(
          `❌ Failed to save error report: ${saveError.message}`
        );

        // Re-throw original error
        throw error;
      }
    }
  },
});
