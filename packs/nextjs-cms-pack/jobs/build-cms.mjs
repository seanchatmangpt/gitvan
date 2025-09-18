// Next.js CMS Build Job
export default {
  meta: {
    name: "build-cms",
    desc: "Builds the static CMS site",
  },
  async run(ctx) {
    console.log(`🚀 Building Next.js CMS site...`);

    try {
      const { execFileAsync } = await import("node:child_process");

      // Install dependencies if needed
      console.log("📦 Installing dependencies...");
      const installResult = await execFileAsync("npm", ["install"], {
        cwd: process.cwd(),
        stdio: "inherit",
      });

      if (installResult.exitCode !== 0) {
        throw new Error("Failed to install dependencies");
      }

      // Build the Next.js app
      console.log("🔨 Building Next.js app...");
      const buildResult = await execFileAsync("npm", ["run", "build"], {
        cwd: process.cwd(),
        stdio: "inherit",
      });

      if (buildResult.exitCode !== 0) {
        throw new Error("Failed to build Next.js app");
      }

      return {
        status: "success",
        message: "Successfully built static CMS site",
        data: {
          outputDir: "out",
          buildTime: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`❌ Build failed: ${error.message}`);
      return {
        status: "error",
        message: `Failed to build Next.js CMS site: ${error.message}`,
        error: error.message,
      };
    }
  },
};
