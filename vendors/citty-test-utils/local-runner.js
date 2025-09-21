import { spawn } from "node:child_process";

export function runLocalCitty(
  args,
  { cwd = process.cwd(), json = false } = {}
) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", ["src/cli/cli.mjs", ...args], { cwd });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("close", (code) => {
      const result = {
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        args,
        cwd,
        json: json ? JSON.parse(stdout) : undefined,
      };
      if (code !== 0) return reject(result);
      resolve(result);
    });
  });
}
