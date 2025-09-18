// Next.js CMS Development Server Job
export default {
  meta: {
    name: "dev-cms",
    desc: "Starts the CMS development server",
  },
  async run(ctx) {
    const { payload } = ctx;
    const port = payload?.port || "3000";

    console.log(
      `🚀 Starting Next.js CMS development server on port ${port}...`
    );

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

      // Start the development server
      console.log(`🌐 Starting development server on port ${port}...`);
      const devResult = await execFileAsync(
        "npm",
        ["run", "dev", "--", "--port", port],
        {
          cwd: process.cwd(),
          stdio: "inherit",
        }
      );

      return {
        status: "success",
        message: `Next.js CMS development server started on port ${port}`,
        data: {
          port: port,
          url: `http://localhost:${port}`,
          startTime: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`❌ Dev server failed to start: ${error.message}`);
      return {
        status: "error",
        message: `Failed to start Next.js CMS dev server: ${error.message}`,
        error: error.message,
      };
    }
  },
};
