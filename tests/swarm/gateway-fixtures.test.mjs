import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { admitAuthority } from "../../src/swarm/conformance/authority.mjs";
import { admitNotesRef } from "../../src/swarm/conformance/namespace.mjs";
import {
  createEnvelope,
  parseOcelDocument,
  verifyEnvelope,
} from "../../src/swarm/gateway/envelope.mjs";
import {
  normalizeRepositoryRemote,
  resolveExactSubject,
} from "../../src/swarm/gateway/subject.mjs";
import { admitGatewayToolInput } from "../../src/swarm/gateway/tool-contract.mjs";
import { classifyReadFailure } from "../../src/swarm/gateway/transport.mjs";
import {
  appendSwarmOcelReceipt,
  readSwarmOcelReceipts,
} from "../../src/swarm/receipt-service.mjs";
import {
  OCEL_EMPTY,
  REPOSITORY,
  SHA_A,
  SUBJECT_A,
  makeGit,
} from "../../test/support/swarm-gateway-fixture.mjs";

const dir = fileURLToPath(
  new URL("../../test/fixtures/swarm-gateway/", import.meta.url),
);

async function loadCases() {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(
    names.map(async (name) => ({
      name,
      value: JSON.parse(await readFile(new URL("../../test/fixtures/swarm-gateway/" + name, import.meta.url), "utf8")),
    })),
  );
}

async function execute(fixture) {
  switch (fixture.operation) {
    case "tool_input":
      return admitGatewayToolInput(fixture.input);
    case "remote":
      return normalizeRepositoryRemote(fixture.remote);
    case "namespace":
      return admitNotesRef(fixture.ref);
    case "authority":
      return admitAuthority(fixture.authority);
    case "ocel":
      return parseOcelDocument(
        Object.hasOwn(fixture, "rawJson") ? fixture.rawJson : fixture.document,
      );
    case "envelope": {
      let envelope = createEnvelope({ subject: SUBJECT_A, document: OCEL_EMPTY });
      if (fixture.mutation === "subject") {
        envelope = { ...envelope, subject: "other/repo@" + "b".repeat(40) };
      } else if (fixture.mutation === "documentDigest") {
        envelope = { ...envelope, documentDigest: "sha256:" + "0".repeat(64) };
      } else if (fixture.mutation === "envelopeDigest") {
        envelope = { ...envelope, envelopeDigest: "sha256:" + "0".repeat(64) };
      }
      return verifyEnvelope(envelope, SUBJECT_A);
    }
    case "transport":
      return classifyReadFailure(new Error(fixture.message), SHA_A);
    case "subject_resolution": {
      const git = makeGit({
        remote: fixture.remote,
        resolvedCommit: fixture.resolvedCommit,
        revParseError: fixture.revParseError ? new Error(fixture.revParseError) : undefined,
        remoteError: fixture.remoteError ? new Error(fixture.remoteError) : undefined,
      });
      return resolveExactSubject(git, SHA_A, REPOSITORY);
    }
    case "provenance_append": {\n      const provenance = { ...PROVENANCE_A, ...(fixture.patch || {}) };\n      if (fixture.omit) delete provenance[fixture.omit];\n      return appendSwarmOcelReceipt({\n        git: makeGit(),\n        document: OCEL_EMPTY,\n        repository: REPOSITORY,\n        commit: SHA_A,\n        provenance,\n      });\n    }\n    case "service_authority": {
      const git = makeGit();
      if (fixture.action === "append") {
        return appendSwarmOcelReceipt({
          git,
          document: OCEL_EMPTY,
          repository: REPOSITORY,
          commit: SHA_A,
          authority: fixture.authority,
        });
      }
      return readSwarmOcelReceipts({
        git,
        repository: REPOSITORY,
        commit: SHA_A,
        authority: fixture.authority,
      });
    }
    default:
      throw new Error("unknown gateway fixture operation: " + fixture.operation);
  }
}

describe("swarm gateway 40-case composed court", async () => {
  const cases = await loadCases();

  it("materializes exactly 32 distinct gateway cases", () => {
    expect(cases).toHaveLength(40);
    expect(new Set(cases.map(({ name }) => name)).size).toBe(40);
  });

  for (const { name, value } of cases) {
    it(name, async () => {
      if (value.expectCode) {
        await expect(Promise.resolve().then(() => execute(value))).rejects.toMatchObject({
          code: value.expectCode,
        });
        return;
      }

      const result = await execute(value);
      if (value.operation === "namespace") {
        expect(result.ok).toBe(value.expect === "ok");
      } else if (value.operation === "remote") {
        expect(result).toBe(value.expect);
      } else if (value.operation === "transport") {
        expect(result).toBe(value.expect);
      } else {
        expect(value.expect).toBe("ok");
        expect(result).toBeDefined();
      }
    });
  }
});
