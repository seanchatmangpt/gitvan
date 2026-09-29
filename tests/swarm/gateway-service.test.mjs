import { describe, expect, it } from "vitest";
import {
  appendSwarmOcelReceipt,
  readSwarmOcelReceipts,
} from "../../src/swarm/receipt-service.mjs";
import {
  OCEL_EMPTY,
  REPOSITORY,
  SHA_A,
  makeEnvelopeLine,
  makeGit,
} from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm receipt gateway service", () => {
  it("appends one exact subject-bound envelope with receipt-only authority", async () => {
    const git = makeGit();
    const result = await appendSwarmOcelReceipt({
      git,
      document: OCEL_EMPTY,
      repository: REPOSITORY,
      commit: SHA_A,
    });

    expect(result).toMatchObject({
      ok: true,
      status: "APPENDED",
      repository: REPOSITORY,
      commit: SHA_A,
      subject: REPOSITORY + "@" + SHA_A,
    });
    expect(git.calls.some(([kind]) => kind === "noteAppend")).toBe(true);
  });

  it("returns empty only for the exact missing-note condition", async () => {
    const git = makeGit({
      noteError: new Error("error: No note found for object " + SHA_A + "."),
    });
    await expect(
      readSwarmOcelReceipts({ git, repository: REPOSITORY, commit: SHA_A }),
    ).resolves.toMatchObject({ status: "ABSENT", documents: [] });
  });

  it("propagates other Git failures as typed failures", async () => {
    const git = makeGit({ noteError: new Error("fatal: permission denied") });
    await expect(
      readSwarmOcelReceipts({ git, repository: REPOSITORY, commit: SHA_A }),
    ).rejects.toMatchObject({ code: "git_note_read_failed" });
  });

  it("refuses malformed note lines rather than hiding them", async () => {
    const git = makeGit({ note: makeEnvelopeLine() + "\nnot-json" });
    await expect(
      readSwarmOcelReceipts({ git, repository: REPOSITORY, commit: SHA_A }),
    ).rejects.toMatchObject({ code: "malformed_note" });
  });
});
