export default {
  name: "start-next-app",
  description: "Installs dependencies and starts Next.js development server",

  async run(ctx) {
    // Try to get project name from various sources
    const projectName =
      process.env.PROJECT_NAME ||
      process.argv
        .find((arg) => arg.startsWith("--projectName="))
        ?.split("=")[1] ||
      "my-nextjs-app";

    console.log(`🚀 Starting Next.js project: ${projectName}`);

    // Import Node.js modules
    const { execSync } = await import("node:child_process");
    const { join } = await import("node:path");
    const { existsSync } = await import("node:fs");

    const projectPath = join(process.cwd(), projectName);

    if (!existsSync(projectPath)) {
      console.error(`❌ Project directory not found: ${projectPath}`);
      return {
        status: "error",
        message: "Project directory not found. Run create-next-app first.",
        data: { projectPath },
      };
    }

    try {
      // Install dependencies
      console.log("📦 Installing dependencies...");
      execSync("npm install", {
        cwd: projectPath,
        stdio: "inherit",
      });

      // Start development server
      console.log("🌐 Starting Next.js development server...");
      console.log(`   📁 Project directory: ${projectPath}`);
      console.log("   🌐 Project will be available at: http://localhost:3000");

      // Start dev server in background
      execSync("npm run dev", {
        cwd: projectPath,
        stdio: "inherit",
        detached: true,
      });

      console.log("✅ Next.js development server started successfully!");

      return {
        status: "success",
        message: "Next.js project started successfully",
        data: {
          projectName,
          projectPath,
          url: "http://localhost:3000",
          status: "running",
        },
      };
    } catch (error) {
      console.error("❌ Failed to start Next.js project:", error.message);
      return {
        status: "error",
        message: `Failed to start Next.js project: ${error.message}`,
        data: {
          projectName,
          projectPath,
          error: error.message,
        },
      };
    }
  },
};
