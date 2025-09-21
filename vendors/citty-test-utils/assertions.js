export function wrapExpectation(result) {
  return {
    result,
    expectExit(code) {
      if (result.exitCode !== code) {
        throw new Error(
          `Expected exit code ${code}, got ${result.exitCode}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}\n` +
            `Working directory: ${result.cwd}\n` +
            `Stdout: ${result.stdout}\n` +
            `Stderr: ${result.stderr}`
        );
      }
      return this;
    },
    expectOutput(match) {
      const ok =
        typeof match === "string"
          ? result.stdout.includes(match)
          : match.test(result.stdout);
      if (!ok)
        throw new Error(
          `Expected stdout to match ${match}, got: ${result.stdout}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      return this;
    },
    expectStderr(match) {
      const ok =
        typeof match === "string"
          ? result.stderr.includes(match)
          : match.test(result.stderr);
      if (!ok)
        throw new Error(
          `Expected stderr to match ${match}, got: ${result.stderr}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      return this;
    },
    expectJson(fn) {
      if (!result.json) throw new Error("No JSON output available");
      if (fn) fn(result.json);
      return this;
    },
    expectSuccess() {
      return this.expectExit(0);
    },
    expectFailure() {
      if (result.exitCode === 0) {
        throw new Error(
          `Expected command to fail, but it succeeded\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}\n` +
            `Output: ${result.stdout}`
        );
      }
      return this;
    },
    expectNoOutput() {
      if (result.stdout.trim()) {
        throw new Error(
          `Expected no output, got: ${result.stdout}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      }
      return this;
    },
    expectNoStderr() {
      if (result.stderr.trim()) {
        throw new Error(
          `Expected no stderr, got: ${result.stderr}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      }
      return this;
    },
    expectOutputLength(minLength, maxLength) {
      const length = result.stdout.length;
      if (length < minLength || (maxLength && length > maxLength)) {
        throw new Error(
          `Expected output length between ${minLength} and ${
            maxLength || "unlimited"
          }, got ${length}\n` + `Output: ${result.stdout}`
        );
      }
      return this;
    },
    expectStderrLength(minLength, maxLength) {
      const length = result.stderr.length;
      if (length < minLength || (maxLength && length > maxLength)) {
        throw new Error(
          `Expected stderr length between ${minLength} and ${
            maxLength || "unlimited"
          }, got ${length}\n` + `Stderr: ${result.stderr}`
        );
      }
      return this;
    },
    expectExitCodeIn(codes) {
      if (!Array.isArray(codes)) {
        throw new Error("Expected codes to be an array");
      }
      if (!codes.includes(result.exitCode)) {
        throw new Error(
          `Expected exit code to be one of [${codes.join(", ")}], got ${
            result.exitCode
          }\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}\n` +
            `Stdout: ${result.stdout}\n` +
            `Stderr: ${result.stderr}`
        );
      }
      return this;
    },
    expectOutputContains(text) {
      if (!result.stdout.includes(text)) {
        throw new Error(
          `Expected stdout to contain "${text}", got: ${result.stdout}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      }
      return this;
    },
    expectStderrContains(text) {
      if (!result.stderr.includes(text)) {
        throw new Error(
          `Expected stderr to contain "${text}", got: ${result.stderr}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      }
      return this;
    },
    expectOutputNotContains(text) {
      if (result.stdout.includes(text)) {
        throw new Error(
          `Expected stdout to not contain "${text}", got: ${result.stdout}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      }
      return this;
    },
    expectStderrNotContains(text) {
      if (result.stderr.includes(text)) {
        throw new Error(
          `Expected stderr to not contain "${text}", got: ${result.stderr}\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      }
      return this;
    },
    expectDuration(maxDuration) {
      if (result.duration && result.duration > maxDuration) {
        throw new Error(
          `Expected command to complete within ${maxDuration}ms, took ${result.duration}ms\n` +
            `Command: node src/cli.mjs ${result.args.join(" ")}`
        );
      }
      return this;
    },
  };
}
