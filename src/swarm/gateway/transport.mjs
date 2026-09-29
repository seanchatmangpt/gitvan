import { SwarmGatewayError } from "./errors.mjs";

export function isMissingNoteError(error, commit) {
  const message = String(error?.stderr || error?.message || error || "");
  return message.toLowerCase().includes(
    ("no note found for object " + commit).toLowerCase(),
  );
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
