import { createEnvelope } from "../../src/swarm/gateway/envelope.mjs";

export const SHA_A = "a".repeat(40);
export const SHA_B = "b".repeat(40);
export const REPOSITORY = "seanchatmangpt/gitvan";
export const SUBJECT_A = REPOSITORY + "@" + SHA_A;
export const PROVENANCE_A = Object.freeze({
  repo: REPOSITORY,
  base: SHA_B,
  head: SHA_A,
  tool: "gitvan-test",
  task: "gateway-fixture",
});

export const OCEL_EMPTY = Object.freeze({
  objectTypes: [],
  eventTypes: [],
  objects: [],
  events: [],
});

export function makeEnvelopeLine(
  document = OCEL_EMPTY,
  subject = SUBJECT_A,
  provenance = PROVENANCE_A,
) {
  return JSON.stringify(createEnvelope({ subject, document, provenance }));
}

export function makeGit({
  remote = "git@github.com:seanchatmangpt/gitvan.git",
  note = makeEnvelopeLine(),
  noteError,
  appendError,
} = {}) {
  const calls = [];
  return {
    calls,
    async run(args) {
      calls.push(["run", args]);
      if (args[0] === "rev-parse") return args[2].replace("^{commit}", "");
      if (args.join(" ") === "config --get remote.origin.url") return remote;
      throw new Error("unexpected git.run: " + args.join(" "));
    },
    async noteShow(ref, commit) {
      calls.push(["noteShow", ref, commit]);
      if (noteError) throw noteError;
      return note;
    },
    async noteAppend(ref, message, commit) {
      calls.push(["noteAppend", ref, message, commit]);
      if (appendError) throw appendError;
    },
  };
}
