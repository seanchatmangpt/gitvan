const SEVERITY = Object.freeze({ critical: 4, high: 3, medium: 2, low: 1, info: 0 });

function finding(id, severity, title, evidence, remediation, falsifier) {
  return Object.freeze({ id, severity, title, evidence: Object.freeze(evidence), remediation: Object.freeze(remediation), falsifier });
}

export function diagnoseCapabilities(input = {}) {
  const capabilities = input.capabilities || [];
  const receipts = input.receipts || [];
  const ledger = input.ledger || null;
  const expectedSubject = input.expectedSubject || null;
  const byReceipt = new Map(receipts.map(receipt => [receipt.capability, receipt]));
  const findings = [];

  for (const capability of capabilities) {
    const receipt = byReceipt.get(capability.id);
    if (["BUILD_BROKEN", "BLOCKED", "UNSUPPORTED"].includes(capability.state)) {
      findings.push(finding(
        `standing.${capability.id}`,
        capability.state === "BUILD_BROKEN" ? "critical" : "high",
        `${capability.id} cannot execute`,
        { declaredStanding: capability.state, verifier: capability.verifier || null },
        [
          { kind: "inspect", target: capability.verifier || capability.id },
          { kind: "verify", target: capability.id },
          { kind: "encode-guard", target: capability.id },
        ],
        `An exact-subject verifier run succeeds and replays as ALIVE for ${capability.id}`,
      ));
      continue;
    }
    if (!capability.verifier) {
      findings.push(finding(
        `verifier.${capability.id}`,
        "high",
        `${capability.id} has no verifier identity`,
        { capability: capability.id },
        [{ kind: "add-verifier", target: capability.id }],
        `${capability.id} has a deterministic verifier path and negative control`,
      ));
    }
    if (!receipt) {
      findings.push(finding(
        `receipt.${capability.id}`,
        "medium",
        `${capability.id} has no observed receipt`,
        { declaredStanding: capability.state },
        [{ kind: "verify", target: capability.id }],
        `Receipt history contains a replay-verifiable receipt for ${capability.id}`,
      ));
      continue;
    }
    if (receipt.standing !== "ALIVE") {
      const failed = (receipt.observations || []).find(item => item.ok !== true || item.standing !== "ALIVE");
      findings.push(finding(
        `execution.${capability.id}`,
        "high",
        `${capability.id} did not achieve ALIVE`,
        { receiptHash: receipt.hash, standing: receipt.standing, failedObservation: failed || null },
        [
          { kind: "locate-transition", target: failed?.capability || capability.id },
          { kind: "repair", target: failed?.verifier || capability.verifier },
          { kind: "replay", target: capability.id },
        ],
        `${capability.id} produces an ALIVE receipt without weakening admission or tests`,
      ));
    }
    if (expectedSubject) {
      const mismatches = Object.entries(expectedSubject).filter(([key, value]) => receipt.subject?.[key] !== value);
      if (mismatches.length) {
        findings.push(finding(
          `subject.${capability.id}`,
          "critical",
          `${capability.id} receipt belongs to a different subject`,
          { receiptHash: receipt.hash, mismatches },
          [{ kind: "reverify-exact-subject", target: capability.id }],
          `Receipt subject exactly matches ${JSON.stringify(expectedSubject)}`,
        ));
      }
    }
  }

  if (ledger && ledger.valid === false) {
    findings.push(finding(
      "ledger.chain",
      "critical",
      "Evidence ledger chain does not replay",
      { ledger },
      [{ kind: "quarantine-ledger", target: ledger.path || "ledger" }, { kind: "rebuild-ledger", target: "receipts" }],
      "Every journal entry hash and previousHash link verifies",
    ));
  }

  findings.sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity] || a.id.localeCompare(b.id));
  const bySeverity = Object.fromEntries(Object.keys(SEVERITY).map(key => [key, findings.filter(item => item.severity === key).length]));
  return Object.freeze({
    schema: "https://gitvan.dev/schemas/capability-doctor-report/v1",
    healthy: findings.every(item => SEVERITY[item.severity] < SEVERITY.high),
    findings: Object.freeze(findings),
    bySeverity: Object.freeze(bySeverity),
    nextAction: findings[0]?.remediation?.[0] || null,
  });
}

export function repairPlan(report, options = {}) {
  const maximum = Math.max(1, Number(options.maximum || 20));
  const actions = [];
  for (const finding of report.findings) {
    for (const action of finding.remediation) {
      if (actions.length >= maximum) break;
      actions.push(Object.freeze({
        order: actions.length + 1,
        finding: finding.id,
        severity: finding.severity,
        ...action,
        actuates: false,
        requiresReceipt: action.kind === "repair" || action.kind === "reverify-exact-subject",
      }));
    }
    if (actions.length >= maximum) break;
  }
  return Object.freeze({
    schema: "https://gitvan.dev/schemas/capability-repair-plan/v1",
    healthy: report.healthy,
    actions: Object.freeze(actions),
    invariant: "This plan constructs intents only; it does not actuate repairs.",
  });
}
