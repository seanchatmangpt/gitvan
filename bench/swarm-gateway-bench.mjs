import { performance } from "node:perf_hooks";
import {
  createEnvelope,
  verifyEnvelope,
} from "../src/swarm/gateway/envelope.mjs";

const sha = "a".repeat(40);
const provenance = {
  repo: "seanchatmangpt/gitvan",
  base: "b".repeat(40),
  head: sha,
  tool: "gateway-bench",
  task: "bench-1",
};
const subject = provenance.repo + "@" + sha;
const document = {
  objectTypes: [],
  eventTypes: [],
  objects: Array.from({ length: 100 }, (_, i) => ({ id: "o" + i })),
  events: Array.from({ length: 100 }, (_, i) => ({ id: "e" + i })),
};

const iterations = Number(process.env.GITVAN_SWARM_BENCH_ITERATIONS || 5_000);
const start = performance.now();
let last;
for (let i = 0; i < iterations; i += 1) {
  last = verifyEnvelope(
    createEnvelope({ subject, document, provenance }),
    subject,
  );
}
const elapsedMs = performance.now() - start;
process.stdout.write(
  JSON.stringify({
    benchmark: "swarm-gateway-envelope-roundtrip",
    iterations,
    elapsedMs,
    operationsPerSecond: Math.round((iterations * 1000) / elapsedMs),
    finalDigest: last.envelopeDigest,
  }) + "\n",
);
