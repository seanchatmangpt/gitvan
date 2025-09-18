import { spawn } from "node:child_process";
import { join } from "pathe";
import consola from "consola";

/**
 * Start daemon in background process - completely non-blocking
 */
export async function startBackgroundDaemon(cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    consola.info("Starting GitVan daemon in background...");

    // Spawn daemon as completely detached process
    const daemonProcess = spawn("gitvan", ["daemon", "start"], {
      cwd: cwd,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    });

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

    const hookProcess = spawn("gitvan", ["ensure", "--init-config"], {
      cwd: cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    hookProcess.stdout?.on("data", (data) => {
      output += data.toString();
    });

    hookProcess.stderr?.on("data", (data) => {
      errorOutput += data.toString();
    });

    hookProcess.on("close", (code) => {
      if (code === 0) {
        consola.success("Git hooks installed successfully");
        resolve({ success: true, output });
      } else {
        consola.warn("Hook installation completed with warnings");
        resolve({ success: false, output, error: errorOutput });
      }
    });

    hookProcess.on("error", (error) => {
      consola.error("Failed to install hooks:", error.message);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!hookProcess.killed) {
        hookProcess.kill();
        consola.warn("Hook installation timed out");
        resolve({ success: false, error: "Timeout" });
      }
    }, 10000);
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
