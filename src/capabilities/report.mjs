function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function observationsOf(receipt) {
  return Array.isArray(receipt?.observations) ? receipt.observations : [];
}

export function summarizeCapabilityReceipt(receipt) {
  const observations = observationsOf(receipt);
  const byStanding = {};
  let passed = 0;
  let failed = 0;
  for (const observation of observations) {
    byStanding[observation.standing] = (byStanding[observation.standing] || 0) + 1;
    if (observation.ok) passed += 1;
    else failed += 1;
  }
  return Object.freeze({
    schema: receipt?.schema || null,
    capability: receipt?.capability || null,
    standing: receipt?.standing || "UNKNOWN",
    hash: receipt?.hash || null,
    observations: observations.length,
    passed,
    failed,
    byStanding: Object.freeze(byStanding),
    subject: Object.freeze({ ...(receipt?.subject || {}) }),
  });
}

export function capabilityReport(receipts = [], options = {}) {
  const summaries = receipts.map(summarizeCapabilityReceipt);
  const byStanding = {};
  for (const summary of summaries) byStanding[summary.standing] = (byStanding[summary.standing] || 0) + 1;
  const standing = summaries.length > 0 && summaries.every(item => item.standing === "ALIVE")
    ? "ALIVE"
    : summaries.some(item => item.standing === "BUILD_BROKEN")
    ? "BUILD_BROKEN"
    : summaries.some(item => item.standing === "BLOCKED")
    ? "BLOCKED"
    : "PARTIAL_ALIVE";
  return Object.freeze({
    schema: "https://gitvan.dev/schemas/capability-report/v1",
    title: String(options.title || "GitVan capability verification"),
    generatedAt: options.generatedAt || null,
    standing,
    receipts: summaries.length,
    byStanding: Object.freeze(byStanding),
    summaries: Object.freeze(summaries),
  });
}

export function reportToMarkdown(report) {
  const lines = [
    `# ${report.title}`,
    "",
    `**Standing:** \`${report.standing}\``,
    `**Receipts:** ${report.receipts}`,
    "",
    "| Capability | Standing | Observations | Passed | Failed | Receipt |",
    "|---|---:|---:|---:|---:|---|",
  ];
  for (const summary of report.summaries) {
    lines.push(`| ${summary.capability || "batch"} | ${summary.standing} | ${summary.observations} | ${summary.passed} | ${summary.failed} | ${summary.hash || ""} |`);
  }
  lines.push("", "## Standing counts", "");
  for (const [standing, count] of Object.entries(report.byStanding).sort()) lines.push(`- ${standing}: ${count}`);
  return `${lines.join("\n")}\n`;
}

export function reportToJUnit(report) {
  const tests = report.summaries.length;
  const failures = report.summaries.filter(item => item.standing !== "ALIVE").length;
  const cases = report.summaries.map(summary => {
    const name = escapeXml(summary.capability || "batch");
    const properties = `<properties><property name="standing" value="${escapeXml(summary.standing)}"/><property name="receiptHash" value="${escapeXml(summary.hash || "")}"/></properties>`;
    const failure = summary.standing === "ALIVE"
      ? ""
      : `<failure message="${escapeXml(`Capability standing is ${summary.standing}`)}">${escapeXml(JSON.stringify(summary))}</failure>`;
    return `<testcase classname="gitvan.capability" name="${name}" assertions="${summary.observations}">${properties}${failure}</testcase>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${escapeXml(report.title)}" tests="${tests}" failures="${failures}">${cases.join("")}</testsuite>\n`;
}

export function reportToJSON(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderCapabilityReport(report, format = "json") {
  if (format === "json") return reportToJSON(report);
  if (format === "markdown" || format === "md") return reportToMarkdown(report);
  if (format === "junit" || format === "xml") return reportToJUnit(report);
  throw new TypeError(`Unsupported capability report format: ${format}`);
}
