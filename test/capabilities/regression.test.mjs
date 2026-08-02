import { describe, expect, it } from "vitest";
import {
  assertNoCapabilityRegression,
  compareCapabilityStanding,
  regressionToMarkdown,
} from "../../src/capabilities/index.mjs";

function summary(claims) {
  return { claims };
}

describe("capability standing regression", () => {
  it("classifies improvements, additions, removals, and regressions", () => {
    const report = compareCapabilityStanding(
      summary([
        { id: "a", standing: "PARTIAL_ALIVE" },
        { id: "b", standing: "ALIVE" },
        { id: "removed", standing: "ALIVE" },
      ]),
      summary([
        { id: "a", standing: "ALIVE" },
        { id: "b", standing: "BUILD_BROKEN" },
        { id: "added", standing: "UNKNOWN" },
      ]),
    );
    expect(report.ok).toBe(false);
    expect(report.improved).toEqual([{ id: "a", from: "PARTIAL_ALIVE", to: "ALIVE" }]);
    expect(report.regressed).toEqual([{ id: "b", from: "ALIVE", to: "BUILD_BROKEN" }]);
    expect(report.removed).toEqual([{ id: "removed", standing: "ALIVE" }]);
    expect(report.added).toEqual([{ id: "added", standing: "UNKNOWN" }]);
    expect(regressionToMarkdown(report)).toContain("ALIVE → BUILD_BROKEN");
    expect(() => assertNoCapabilityRegression(report)).toThrow(/Capability standing regression/);
  });

  it("passes equal and improved standing", () => {
    const report = compareCapabilityStanding(
      summary([{ id: "a", standing: "UNKNOWN" }]),
      summary([{ id: "a", standing: "PARTIAL_ALIVE" }]),
    );
    expect(report.ok).toBe(true);
    expect(assertNoCapabilityRegression(report)).toBe(report);
  });
});
