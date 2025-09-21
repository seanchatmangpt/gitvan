export function wrapExpectation(result) {
  return {
    result,
    expectExit(code) {
      if (result.exitCode !== code) {
        throw new Error(`Expected exit ${code}, got ${result.exitCode}`);
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
          `Expected stdout to match ${match}, got: ${result.stdout}`
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
          `Expected stderr to match ${match}, got: ${result.stderr}`
        );
      return this;
    },
    expectJson(fn) {
      if (!result.json) throw new Error("No JSON output available");
      if (fn) fn(result.json);
      return this;
    },
  };
}
