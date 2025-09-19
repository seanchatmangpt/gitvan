export default {
  meta: {
    name: "dashboard-dev-server",
    desc: "Starts the Next.js dashboard development server with hot reloading",
  },
  async run(ctx) {
    const { payload } = ctx;
    const port = payload?.port || "3000";

    console.log(
      `🚀 Starting Next.js Dashboard development server on port ${port}...`
    );

    try {
      const { execFileAsync } = await import("node:child_process");

      // Install dependencies if needed
      console.log("📦 Installing dependencies...");
      const installResult = await execFileAsync("pnpm", ["install"], {
        cwd: process.cwd(),
        stdio: "inherit",
      });

      if (installResult.exitCode !== 0) {
        throw new Error("Failed to install dependencies");
      }

      // Start the development server
      console.log(`🌐 Starting development server on port ${port}...`);
      const devResult = await execFileAsync(
        "pnpm",
        ["run", "dev", "--", "--port", port],
        {
          cwd: process.cwd(),
          stdio: "inherit",
        }
      );

      return {
        status: "success",
        message: `Next.js Dashboard development server started on port ${port}.`,
        data: {
          port: port,
          url: `http://localhost:${port}`,
          startTime: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: "error",
        message: `Failed to start Next.js Dashboard dev server: ${error.message}`,
        error: error.message,
      };
    }
  },
};

