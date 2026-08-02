# GitVan capability manufacturing

GitVan capabilities are admitted as RDF in `ontology/gitvan-capabilities.ttl`, constrained by SHACL, rendered by the ggen template in `templates/capabilities`, and executed through `src/capabilities`.

```text
ontology
→ SHACL admission
→ ggen extraction and rendering
→ generated manifest
→ dependency closure
→ deterministic plan
→ process verifier or bounded runtime probe
→ immutable receipt history
→ replay verification
→ receipt-backed claims
→ regression gate
→ actuation admission
```

The generated manifest is a projection, not the editing surface. Change the ontology or template, run ggen, then verify the generated diff with:

```bash
pnpm verify:capability-projection
```

## Standing

`UNKNOWN`, `PARTIAL_ALIVE`, `ALIVE`, `BLOCKED`, `BUILD_BROKEN`, and `UNSUPPORTED` retain distinct meanings. A capability reaches `ALIVE` only when its exact dependency closure executes successfully and every observation reports `ALIVE`. Process exit success does not override an explicitly weaker observation.

## Verification transports

### Process

Executes the ontology-declared Vitest file in an isolated child process with bounded output, timeout handling, and deterministic locale.

```bash
node src/cli.mjs capability verify gitvan.workflow.dag --transport process
```

### Probe

Imports the existing GitVan runtime and performs a bounded surface or behavioral probe. Surface mode cannot produce more than `PARTIAL_ALIVE`.

```bash
node src/cli.mjs capability probe gitvan.workflow.dag --mode behavior
node src/cli.mjs capability probe gitvan.workflow.dag --mode surface
```

## CLI

```bash
# Inventory and dependency graph
node src/cli.mjs capability list
node src/cli.mjs capability show gitvan.job.execution
node src/cli.mjs capability graph --format mermaid
node src/cli.mjs capability plan gitvan.template,gitvan.scheduler --format json

# Verification and batching
node src/cli.mjs capability verify gitvan.receipt --transport process
node src/cli.mjs capability verify-all --transport process --continue
node src/cli.mjs capability batch gitvan.template,gitvan.scheduler --transport probe --mode behavior
node src/cli.mjs capability cache-verify gitvan.receipt --sourceSha "$GITVAN_SHA"

# Evidence and release gates
node src/cli.mjs capability history gitvan.receipt
node src/cli.mjs capability report --format junit --output artifacts/capabilities/junit.xml
node src/cli.mjs capability claims --format toml --output artifacts/capabilities/claims.toml
node src/cli.mjs capability regression baseline.json candidate.json --assert

# Actuation admission
node src/cli.mjs capability admit gitvan.receipt --hash <receipt-hash>
```

## Evidence model

Latest receipts remain at:

```text
.gitvan/receipts/capabilities/<capability>.json
```

Immutable history is hash addressed:

```text
.gitvan/receipts/capabilities/history/<capability>/<sha256>.json
```

The evidence ledger is a SHA-256 chain that supports JSON and NDJSON replay. Verifier cache entries are reusable only when source, validator, toolchain, environment, configuration, capability, and transport identities match exactly.

## Invariants

- capability identifiers are unique;
- every dependency resolves;
- the dependency graph is acyclic;
- blocked, broken, and unsupported capabilities cannot execute;
- surface inspection never crowns `ALIVE`;
- actuation requires an untampered `ALIVE` receipt;
- generated projection drift fails verification;
- immutable receipt history is never overwritten;
- cached receipts require exact identity equivalence;
- claim standing is derived from admitted receipts, not declaration text;
- standing regressions and removed claims fail the regression gate.

## Repository commands

```bash
pnpm test:capabilities
pnpm verify:capability-projection
pnpm verify:capabilities
pnpm capability:graph
pnpm capability:claims
pnpm lint
pnpm build
```

The exact-head GitHub workflow is `.github/workflows/capability-verification.yml`. It emits projection reports, process receipts, graphs, plans, claims, Markdown, JSON, JUnit, and probe diagnostics as workflow artifacts.

## Generator lineage

The pack metadata records exact lineage to:

- `seanchatmangpt/ggen@8351af4c5bbbf60bd99ab8417752a1762c6ea4e3`
- `seanchatmangpt/ggen-legacy@70e599a599fedb7c62c965377cc2f80df1fa01ec`

`ggen` is the active generator. `ggen-legacy` is immutable lineage and replay evidence; it is not a second actuation path.
