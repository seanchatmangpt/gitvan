import { SwarmGatewayError } from "./errors.mjs";

export function isMissingNoteError(error, commit) {
  const source =
    typeof error?.stderr === "string" && error.stderr.trim()
      ? error.stderr
      : String(error?.message || error || "");
  const expected = new Set([
    ("error: no note found for object " + commit + ".").toLowerCase(),
    ("error: no note found for object " + commit).toLowerCase(),
    ("no note found for object " + commit + ".").toLowerCase(),
    ("no note found for object " + commit).toLowerCase(),
  ]);
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  const hasExpected = lines.some((line) => expected.has(line));
  const hasOtherGitFailure = lines.some(
    (line) =>
      /^(fatal:|error:)/.test(line) &&
      !expected.has(line),
  );
  return hasExpected && !hasOtherGitFailure;
}

export function classifyReadFailure(error, commit) {
  if (isMissingNoteError(error, commit)) return "note_absent";

  throw new SwarmGatewayError(
    "git_note_read_failed",
    "Git note read failed for a reason other than note absence",
    {
      cause: error,
      subject: commit,
      details: {
        message: String(error?.stderr || error?.message || error || ""),
      },
    },
  );
}

export function classifyWriteFailure(error, subject) {
  throw new SwarmGatewayError(
    "git_note_write_failed",
    "Git note append failed",
    {
      cause: error,
      subject,
      details: {
        message: String(error?.stderr || error?.message || error || ""),
      },
    },
  );
}
