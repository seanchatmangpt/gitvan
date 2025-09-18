import { spawn } from "node:child_process";
import { join } from "pathe";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import consola from "consola";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Start daemon in background process - completely non-blocking
 */
export async function startBackgroundDaemon(cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    consola.info("Starting GitVan daemon in background...");

    // Resolve the local CLI path - never spawn bare "gitvan"
    const cliPath = join(__dirname, "..", "..", "bin", "gitvan.mjs");

    // Spawn daemon as completely detached process using absolute Node + local CLI
    const daemonProcess = spawn(
      process.execPath,
      [cliPath, "daemon", "start"],
      {
        cwd: cwd,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_ENV: "production",
        },
      }
    );

    // Handle process events
    daemonProcess.on("error", (error) => {
      consola.error("Failed to start daemon:", error.message);
      reject(error);
    });

    daemonProcess.on("spawn", () => {
      consola.success("Daemon started successfully");
      // Unref to allow main process to exit
      daemonProcess.unref();
      resolve(daemonProcess);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!daemonProcess.killed) {
        consola.success("Daemon startup completed");
        daemonProcess.unref();
        resolve(daemonProcess);
      }
    }, 5000);
  });
}

/**
 * Install hooks asynchronously without blocking
 */
export async function installHooksAsync(cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    consola.info("Installing Git hooks...");

    // Resolve the hook setup script path directly
    const hookSetupPath = join(
      __dirname,
      "..",
      "..",
      "bin",
      "git-hooks-setup.mjs"
    );

    const hookProcess = spawn(process.execPath, [hookSetupPath, "setup"], {
      cwd: cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";
    let completed = false;

    hookProcess.stdout?.on("data", (data) => {
      output += data.toString();
    });

    hookProcess.stderr?.on("data", (data) => {
      errorOutput += data.toString();
    });

    hookProcess.on("close", (code) => {
      completed = true;
      if (code === 0) {
        consola.success("Git hooks installed successfully");
        resolve({ success: true, output });
      } else {
        consola.warn("Hook installation completed with warnings");
        resolve({ success: false, output, error: errorOutput });
      }
    });

    hookProcess.on("error", (error) => {
      completed = true;
      consola.error("Failed to install hooks:", error.message);
      reject(error);
    });

    // Timeout after 5 seconds (reduced from 10 since we're calling the script directly)
    setTimeout(() => {
      if (!completed && !hookProcess.killed) {
        hookProcess.kill();
        consola.warn("Hook installation timed out");
        resolve({ success: false, error: "Timeout" });
      }
    }, 5000);
  });
}

/**
 * Load packs lazily - only when needed
 */
export async function loadPacksLazy(cwd = process.cwd()) {
  return new Promise(async (resolve) => {
    consola.info("Loading packs (lazy mode)...");

    try {
      // Import lazy pack system only when needed
      const { LazyPackRegistry } = await import("../pack/lazy-registry.mjs");

      const registry = new LazyPackRegistry({
        cacheDir: join(cwd, ".gitvan", "cache"),
        registryUrl: "https://registry.gitvan.dev",
      });

      // Initialize registry but don't scan yet
      await registry.initialize();

      consola.success("Pack registry initialized (lazy loading enabled)");
      resolve({ success: true, registry });
    } catch (error) {
      consola.warn(
        "Pack loading failed, continuing without packs:",
        error.message
      );
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Complete background setup - all operations non-blocking
 */
export async function backgroundSetup(cwd = process.cwd()) {
  consola.start("Starting GitVan background setup...");

  const results = {
    daemon: null,
    hooks: null,
    packs: null,
  };

  try {
    // Start all operations in parallel
    const [daemonResult, hooksResult, packsResult] = await Promise.allSettled([
      startBackgroundDaemon(cwd),
      installHooksAsync(cwd),
      loadPacksLazy(cwd),
    ]);

    results.daemon =
      daemonResult.status === "fulfilled" ? daemonResult.value : null;
    results.hooks =
      hooksResult.status === "fulfilled" ? hooksResult.value : null;
    results.packs =
      packsResult.status === "fulfilled" ? packsResult.value : null;

    consola.success("Background setup completed");
    return results;
  } catch (error) {
    consola.error("Background setup failed:", error.message);
    return results;
  }
}
