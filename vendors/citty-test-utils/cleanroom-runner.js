import { GenericContainer } from "testcontainers";

let singleton;

export async function setupCleanroom({
  rootDir = ".",
  nodeImage = "node:20-alpine",
} = {}) {
  if (!singleton) {
    const container = await new GenericContainer(nodeImage)
      .withCopyDirectoriesToContainer([{ source: rootDir, target: "/app" }])
      .withWorkingDir("/app")
      .withCommand(["sleep", "infinity"])
      .start();

    singleton = { container };
  }
  return singleton;
}

export async function runCitty(args, { json = false, cwd = "/app" } = {}) {
  if (!singleton)
    throw new Error("Cleanroom not initialized. Call setupCleanroom first.");

  const { exitCode, output } = await singleton.container.exec(
    ["node", "src/cli/cli.mjs", ...args],
    { workdir: cwd }
  );

  const result = {
    exitCode,
    stdout: output.trim(),
    stderr: "", // TODO: capture separately if needed
    args,
    cwd,
    json: json ? JSON.parse(output) : undefined,
  };

  // Wrap in expectations layer
  const { wrapExpectation } = await import("./assertions.js");
  return wrapExpectation(result);
}

export async function teardownCleanroom() {
  if (singleton) {
    await singleton.container.stop();
    singleton = null;
  }
}
