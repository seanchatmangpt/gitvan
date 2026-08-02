import { describe, expect, it } from "vitest";
import {
  capabilityReport,
  renderCapabilityReport,
  reportToJUnit,
  reportToMarkdown,
  summarizeCapabilityReceipt,
} from "../../src/capabilities/index.mjs";

const alive = {
  schema: "receipt",
  capability: "gitvan.receipt",
  standing: "ALIVE",
  hash: "a".repeat(64),
  subject: { sha: "abc" },
  observations: [{ capability: "gitvan.receipt", ok: true, standing: "ALIVE" }],
};

const partial = {
  schema: "receipt",
  capability: "gitvan.lock",
  standing: "PARTIAL_ALIVE",
  hash: "b".repeat(64),
  observations: [{ capability: "gitvan.lock", ok: true, standing: "PARTIAL_ALIVE" }],
};

describe("capability reports", () => {
  it("summarizes receipt observations", () => {
    expect(summarizeCapabilityReceipt(alive)).toMatchObject({
      capability: "gitvan.receipt",
      standing: "ALIVE",
      observations: 1,
      passed: 1,
      failed: 0,
    });
  });

  it("composes aggregate standing", () => {
    expect(capabilityReport([alive]).standing).toBe("ALIVE");
    expect(capabilityReport([alive, partial])).toMatchObject({
      standing: "PARTIAL_ALIVE",
      receipts: 2,
      byStanding: { ALIVE: 1, PARTIAL_ALIVE: 1 },
    });
  });

  it("renders Markdown, JUnit, and JSON", () => {
    const report = capabilityReport([alive, partial], { title: "Exact head" });
    expect(reportToMarkdown(report)).toContain("| gitvan.lock | PARTIAL_ALIVE |");
    expect(reportToJUnit(report)).toContain('<testsuite name="Exact head" tests="2" failures="1">');
    expect(reportToJUnit(report)).toContain("<failure");
    expect(JSON.parse(renderCapabilityReport(report, "json")).receipts).toBe(2);
    expect(renderCapabilityReport(report, "md")).toContain("# Exact head");
    expect(() => renderCapabilityReport(report, "pdf")).toThrow(/Unsupported/);
  });
});
