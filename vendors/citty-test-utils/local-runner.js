import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

export function runLocalCitty(
  args,
  { cwd = process.cwd(), json = false, timeout = 30000, env = {} } = {}
) {
  return new Promise((resolve, reject) => {
    // Find the GitVan project root by looking for package.json with "gitvan" name
    let projectRoot = cwd;
    while (projectRoot !== dirname(projectRoot)) {
      const packageJsonPath = join(projectRoot, "package.json");
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
          if (packageJson.name === "gitvan") {
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }
      projectRoot = dirname(projectRoot);
    }

    // Validate CLI path
    const cliPath = join(projectRoot, "src", "cli.mjs");
    if (!existsSync(cliPath)) {
      reject(new Error(`CLI not found at ${cliPath}`));
      return;
    }

    const proc = spawn("node", ["src/cli.mjs", ...args], {
      cwd: projectRoot,
      env: { ...process.env, ...env },
    });

    let stdout = "";
    let stderr = "";
    let timeoutId;

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    }

    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));

    proc.on("close", (code) => {
      if (timeoutId) clearTimeout(timeoutId);

      const result = {
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        args,
        cwd: projectRoot,
        json: json ? safeJsonParse(stdout) : undefined,
      };

      // Wrap in expectations layer
      import("./assertions.js").then(({ wrapExpectation }) => {
        const wrappedResult = wrapExpectation(result);
        resolve(wrappedResult);
      }).catch(error => {
        reject(new Error(`Failed to load assertions: ${error.message}`));
      });
    });

    proc.on("error", (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new Error(`Process spawn failed: ${error.message}`));
    });
  });
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (error) {
    return undefined; // Return undefined instead of throwing
  }
}
