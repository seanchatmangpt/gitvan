// playground/jobs/cicd/build-automation.mjs
import { defineJob } from "gitvan/define";
import { useGit } from "gitvan/useGit";
import { useTemplate } from "gitvan/useTemplate";
import { promises as fs } from "node:fs";
import { join } from "pathe";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default defineJob({
  meta: {
    desc: "Automated build process with environment-specific configuration",
    tags: ["cicd", "build", "automation", "cookbook"],
  },
  async run({ ctx, payload }) {
    const git = useGit();
    const template = await useTemplate();

    // Get build configuration
    const environment = payload?.environment || "development";
    const buildType = payload?.buildType || "production";
    const cleanBuild = payload?.cleanBuild !== false;

    // Get repository information
    const head = await git.currentHead();
    const branch = await git.currentBranch();
    const isClean = await git.isClean();

    if (!isClean && !payload?.allowDirty) {
      ctx.logger.warn(
        "⚠️ Repository has uncommitted changes, but continuing with build"
      );
    }

    const buildInfo = {
      environment,
      buildType,
      timestamp: ctx.nowISO,
      repository: {
        head: head.substring(0, 8),
        branch,
        isClean,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    ctx.logger.log(
      `🚀 Starting ${buildType} build for ${environment} environment`
    );

    // Clean build directory if requested
    if (cleanBuild) {
      const distDir = join(ctx.root, "dist", "cicd");
      try {
        await fs.rmdir(distDir, { recursive: true });
        ctx.logger.log("🧹 Cleaned build directory");
      } catch (error) {
        // Directory might not exist, that's okay
      }
    }

    // Create build directory
    const buildDir = join(ctx.root, "dist", "cicd", "build");
    await fs.mkdir(buildDir, { recursive: true });

    // Simulate build steps (since we don't have actual npm scripts)
    const buildSteps = [
      {
        name: "Validate Environment",
        command: "node",
        args: ["-e", "console.log('Environment validated')"],
      },
      {
        name: "Check Dependencies",
        command: "node",
        args: ["-e", "console.log('Dependencies checked')"],
      },
      {
        name: "Run Tests",
        command: "node",
        args: ["-e", "console.log('Tests passed')"],
      },
      {
        name: "Build Application",
        command: "node",
        args: ["-e", "console.log('Application built')"],
      },
    ];

    const buildResults = [];
    let buildSuccess = true;

    for (const step of buildSteps) {
      try {
        ctx.logger.log(`📦 Running: ${step.name}`);
        const startTime = Date.now();

        const result = await execFileAsync(step.command, step.args, {
          cwd: ctx.root,
          env: {
            ...process.env,
            NODE_ENV: environment,
            BUILD_TYPE: buildType,
          },
        });

        const duration = Date.now() - startTime;

        buildResults.push({
          step: step.name,
          command: `${step.command} ${step.args.join(" ")}`,
          success: true,
          duration,
          stdout: result.stdout,
          stderr: result.stderr,
        });

        ctx.logger.log(`✅ ${step.name} completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;

        buildResults.push({
          step: step.name,
          command: `${step.command} ${step.args.join(" ")}`,
          success: false,
          duration,
          error: error.message,
          stdout: error.stdout,
          stderr: error.stderr,
        });

        ctx.logger.error(`❌ ${step.name} failed: ${error.message}`);

        if (step.name === "Run Tests" || step.name === "Check Dependencies") {
          buildSuccess = false;
          break; // Stop on test or dependency failures
        }
      }
    }

    // Generate build report
    const buildReport = {
      ...buildInfo,
      success: buildSuccess,
      steps: buildResults,
      summary: {
        totalSteps: buildSteps.length,
        successfulSteps: buildResults.filter((r) => r.success).length,
        failedSteps: buildResults.filter((r) => !r.success).length,
        totalDuration: buildResults.reduce((sum, r) => sum + r.duration, 0),
      },
    };

    // Save build report
    const reportPath = join(buildDir, "build-report.json");
    await fs.writeFile(reportPath, JSON.stringify(buildReport, null, 2));

    // Generate HTML build report
    const htmlReportPath = await template.renderToFile(
      "cicd/build-report.njk",
      join(buildDir, "build-report.html"),
      buildReport
    );

    ctx.logger.log(
      `📊 Build ${buildSuccess ? "completed successfully" : "failed"}`
    );
    ctx.logger.log(`📝 Build report: ${reportPath}`);

    return {
      ok: buildSuccess,
      artifacts: [reportPath, htmlReportPath],
      data: buildReport,
    };
  },
});
