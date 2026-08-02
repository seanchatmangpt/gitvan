const DEFAULT_DIMENSIONS = Object.freeze({
  frequency: 1,
  latencyReduction: 1,
  errorReduction: 1,
  reuse: 1,
  autonomy: 1,
  evidence: 1,
});

function positive(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function leverageScore(input = {}) {
  const dimensions = Object.freeze({
    frequency: positive(input.frequency),
    latencyReduction: positive(input.latencyReduction),
    errorReduction: positive(input.errorReduction),
    reuse: positive(input.reuse),
    autonomy: positive(input.autonomy),
    evidence: positive(input.evidence),
  });
  const gross = Object.values(dimensions).reduce((product, value) => product * value, 1);
  const cost = positive(input.cost);
  const authorityRisk = positive(input.authorityRisk);
  const irreversibility = positive(input.irreversibility);
  const denominator = cost * authorityRisk * irreversibility;
  return Object.freeze({
    dimensions,
    gross,
    denominator,
    score: gross / denominator,
    phase: gross / denominator >= 1000 ? "PHASE_CHANGE_1000X" : gross / denominator >= 100 ? "PLATFORM_100X" : gross / denominator >= 10 ? "LEVERAGE_10X" : "INCREMENTAL",
  });
}

export function rankLeveragePortfolio(candidates = [], options = {}) {
  const budget = Number.isFinite(Number(options.budget)) ? Number(options.budget) : Infinity;
  const ranked = candidates.map(candidate => Object.freeze({ ...candidate, leverage: leverageScore(candidate) }))
    .sort((a, b) => b.leverage.score - a.leverage.score || String(a.id).localeCompare(String(b.id)));
  const selected = [];
  let spent = 0;
  for (const candidate of ranked) {
    const cost = positive(candidate.cost);
    if (spent + cost > budget) continue;
    selected.push(candidate);
    spent += cost;
  }
  return Object.freeze({
    schema: "https://gitvan.dev/schemas/leverage-portfolio/v1",
    budget,
    spent,
    remaining: Number.isFinite(budget) ? budget - spent : null,
    phaseChangeCandidates: ranked.filter(item => item.leverage.phase === "PHASE_CHANGE_1000X").length,
    ranked: Object.freeze(ranked),
    selected: Object.freeze(selected),
  });
}

export function defaultVision2030Candidates() {
  return Object.freeze([
    Object.freeze({ id: "intent-to-receipt", title: "One-command intent to replayable receipt", frequency: 20, latencyReduction: 10, errorReduction: 5, reuse: 4, autonomy: 3, evidence: 2, cost: 6, authorityRisk: 1, irreversibility: 1 }),
    Object.freeze({ id: "doctor-auto-localize", title: "Automatic failed-transition localization", frequency: 12, latencyReduction: 15, errorReduction: 8, reuse: 5, autonomy: 2, evidence: 3, cost: 8, authorityRisk: 1, irreversibility: 1 }),
    Object.freeze({ id: "verified-pack-economy", title: "Portable verified capability packs", frequency: 8, latencyReduction: 8, errorReduction: 4, reuse: 20, autonomy: 3, evidence: 2, cost: 10, authorityRisk: 1, irreversibility: 1 }),
    Object.freeze({ id: "standing-digital-twin", title: "Live standing and regression digital twin", frequency: 30, latencyReduction: 6, errorReduction: 6, reuse: 6, autonomy: 2, evidence: 5, cost: 12, authorityRisk: 1, irreversibility: 1 }),
  ]);
}
