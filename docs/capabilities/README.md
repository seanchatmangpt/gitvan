# GitVan capability manufacturing

GitVan capabilities are admitted as RDF in `ontology/gitvan-capabilities.ttl`, rendered by the ggen template in `templates/capabilities`, and consumed through `src/capabilities`.

```text
ontology → ggen extraction/render → generated manifest → registry closure → verifier execution → receipt → actuation admission
```

The generated manifest is a projection, not the editing surface. Change the ontology or template, run ggen, then verify the generated diff.

## Standing

`UNKNOWN`, `PARTIAL_ALIVE`, `ALIVE`, `BLOCKED`, `BUILD_BROKEN`, and `UNSUPPORTED` retain distinct meanings. A capability reaches `ALIVE` only when its exact verifier executes successfully and the resulting receipt passes replay verification.

## Invariants

- capability identifiers are unique;
- every dependency resolves;
- the dependency graph is acyclic;
- blocked, broken, and unsupported capabilities cannot execute;
- actuation requires an untampered `ALIVE` receipt;
- generator provenance is explicit.

## Verification

```bash
npm test -- --run test/capabilities/capability-system.test.mjs
npm run lint
npm run build
```

The generated file currently records `PARTIAL_ALIVE`; it must not be promoted from repository presence or static inspection alone.
