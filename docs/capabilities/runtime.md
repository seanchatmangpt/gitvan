# Capability runtime

The runtime binds the generated capability graph to executable verifiers and durable receipts.

```js
import { createCapabilityRuntime } from "../../src/capabilities/index.mjs";

const runtime = createCapabilityRuntime({
  subject: {
    repository: "seanchatmangpt/gitvan",
    sha: process.env.GITHUB_SHA,
  },
});

const receipt = await runtime.verify("gitvan.workflow.dag");
const admission = await runtime.admitActuation("gitvan.workflow.dag", receipt);
```

`verify()` executes the complete dependency closure in deterministic order. `admitActuation()` accepts only an untampered receipt whose target capability reached `ALIVE`.

The default process executor invokes each capability's admitted verifier with Node.js, UTC, the C locale, a bounded timeout, and captured stdout/stderr. A verifier path is data, not ambient shell authority: the executor never evaluates a shell string.

Receipts are stored under `.gitvan/receipts/capabilities` unless a different root is explicitly supplied. Every read replays the receipt hash before returning it.
