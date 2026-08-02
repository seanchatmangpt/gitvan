const STANDING_RANK = Object.freeze({
  UNSUPPORTED: -3,
  BUILD_BROKEN: -2,
  BLOCKED: -1,
  UNKNOWN: 0,
  PARTIAL_ALIVE: 1,
  ALIVE: 2,
});

function mapClaims(summary) {
  return new Map((summary?.claims || summary?.summaries || []).map(item => [item.id || item.capability, item]));
}

function standingOf(item) {
  return item?.standing || "UNKNOWN";
}

export function compareCapabilityStanding(baseline, candidate) {
  const before = mapClaims(baseline);
  const after = mapClaims(candidate);
  const ids = [...new Set([...before.keys(), ...after.keys()])].sort();
  const added = [];
  const removed = [];
  const improved = [];
  const regressed = [];
  const unchanged = [];

  for (const id of ids) {
    const previous = before.get(id);
    const next = after.get(id);
    if (!previous) {
      added.push(Object.freeze({ id, standing: standingOf(next) }));
      continue;
    }
    if (!next) {
      removed.push(Object.freeze({ id, standing: standingOf(previous) }));
      continue;
    }
    const previousStanding = standingOf(previous);
    const nextStanding = standingOf(next);
    const change = Object.freeze({ id, from: previousStanding, to: nextStanding });
    if ((STANDING_RANK[nextStanding] ?? 0) > (STANDING_RANK[previousStanding] ?? 0)) improved.push(change);
    else if ((STANDING_RANK[nextStanding] ?? 0) < (STANDING_RANK[previousStanding] ?? 0)) regressed.push(change);
    else unchanged.push(change);
  }

  return Object.freeze({
    schema: "https://gitvan.dev/schemas/capability-regression-report/v1",
    ok: regressed.length === 0 && removed.length === 0,
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    improved: Object.freeze(improved),
    regressed: Object.freeze(regressed),
    unchanged: Object.freeze(unchanged),
  });
}

export function assertNoCapabilityRegression(report) {
  if (!report?.ok) {
    const details = [
      ...report.regressed.map(item => `${item.id}:${item.from}->${item.to}`),
      ...report.removed.map(item => `${item.id}:removed`),
    ];
    const error = new Error(`Capability standing regression: ${details.join(", ")}`);
    error.report = report;
    throw error;
  }
  return report;
}

export function regressionToMarkdown(report) {
  const lines = [
    "# Capability standing regression report",
    "",
    `**Result:** ${report.ok ? "PASS" : "FAIL"}`,
    "",
  ];
  for (const [title, values] of [
    ["Regressed", report.regressed],
    ["Removed", report.removed],
    ["Improved", report.improved],
    ["Added", report.added],
  ]) {
    lines.push(`## ${title}`, "");
    if (!values.length) lines.push("None.");
    else for (const value of values) lines.push(`- ${value.id}: ${value.from ? `${value.from} → ${value.to}` : value.standing}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export { STANDING_RANK };
