import { describe, expect, it } from "vitest";
import {
  classifyReadFailure,
  isMissingNoteError,
} from "../../src/swarm/gateway/transport.mjs";
import { SHA_A } from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway Git transport classification", () => {
  it("recognizes only Git's note-absence result as absence", () => {
    const error = new Error("error: No note found for object " + SHA_A + ".");
    expect(isMissingNoteError(error, SHA_A)).toBe(true);
    expect(classifyReadFailure(error, SHA_A)).toBe("note_absent");
  });

  it("does not collapse permission, repository, or transport failure to absence", () => {
    for (const message of [
      "fatal: could not read Username for https://github.com",
      "fatal: not a git repository",
      "fatal: unable to access remote: connection reset",
    ]) {
      expect(() => classifyReadFailure(new Error(message), SHA_A)).toThrowError(
        expect.objectContaining({ code: "git_note_read_failed" }),
      );
    }
  });
});
