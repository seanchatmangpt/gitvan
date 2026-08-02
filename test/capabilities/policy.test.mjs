import { describe, expect, it } from "vitest";
import { CapabilityPolicySet, CapabilityRefusal, defaultCapabilityPolicies } from "../../src/capabilities/index.mjs";

const capability = {
  id: "gitvan.example",
  title: "Example",
  state: "PARTIAL_ALIVE",
  verifier: "test/example.test.mjs",
  dependsOn: [],
};

describe("CapabilityPolicySet", () => {
  it("admits inspection and verification for a bounded capability", () => {
    const policies = new CapabilityPolicySet(defaultCapabilityPolicies());
    expect(policies.evaluate("inspect", capability).allowed).toBe(true);
    expect(policies.assert("verify", capability).allowed).toBe(true);
  });

  it.each(["BLOCKED", "BUILD_BROKEN", "UNSUPPORTED"])("refuses verification in %s", state => {
    const policies = new CapabilityPolicySet();
    expect(() => policies.assert("verify", { ...capability, state })).toThrow(CapabilityRefusal);
  });

  it("requires a verifier identity", () => {
    const policies = new CapabilityPolicySet();
    expect(() => policies.assert("verify", { ...capability, verifier: null })).toThrow(/verify refused/);
  });

  it("requires an ALIVE replay-verified receipt for actuation", () => {
    const policies = new CapabilityPolicySet();
    expect(() => policies.assert("actuate", capability, {
      receipt: { capability: capability.id, standing: "PARTIAL_ALIVE" },
      replayVerified: true,
    })).toThrow(/actuate refused/);

    expect(policies.assert("actuate", capability, {
      receipt: { capability: capability.id, standing: "ALIVE", subject: { sha: "abc" } },
      replayVerified: true,
    }).allowed).toBe(true);
  });

  it("enforces exact subject constraints", () => {
    const policies = new CapabilityPolicySet();
    expect(() => policies.assert("verify", capability, {
      expectedSubject: { repository: "seanchatmangpt/gitvan", sha: "abc" },
      subject: { repository: "seanchatmangpt/gitvan", sha: "def" },
    })).toThrow(/verify refused/);
  });
});
