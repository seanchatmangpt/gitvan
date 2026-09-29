import { describe, expect, it } from "vitest";
import {
  classifyReadFailure,
  isMissingNoteError,
} from "../../src/swarm/gateway/transport.mjs";
import { SHA_A } from "../../test/support/swarm-gateway-fixture.mjs";

describe("swarm gateway transport fuzz", () => {
  it("never downgrades a fatal edge merely because it also mentions note absence", () => {
    const fatalPrefixes = [
      "fatal: permission denied",
      "fatal: not a git repository",
      "fatal: connection reset",
      "error: repository unavailable",
    ];
    for (let i = 0; i < 256; i += 1) {
      const fatal = fatalPrefixes[i % fatalPrefixes.length] + " #" + i;
      const stderr =
        "error: No note found for object " + SHA_A + ".\n" + fatal;
      expect(isMissingNoteError({ stderr }, SHA_A)).toBe(false);
      expect(() => classifyReadFailure({ stderr }, SHA_A)).toThrowError();
    }
  });
});
