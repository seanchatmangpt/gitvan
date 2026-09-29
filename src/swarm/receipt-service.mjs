/**
 * Swarm receipt persistence.
 *
 * GitVan owns authenticated Git mutation. UNRDF owns OCEL semantics.
 * This layer deliberately performs only the minimum interchange checks needed
 * before storing an OCEL 2.0 document on an exact Git commit.
 */
import { useGit } from '../composables/git/index.mjs';

export const SWARM_OCEL_NOTES_REF = 'refs/notes/gitvan/ocel';

function assertReceiptRef(ref) {
  if (ref !== SWARM_OCEL_NOTES_REF && !ref.startsWith(`${SWARM_OCEL_NOTES_REF}/`)) {
    throw new Error(`Receipt ref must be under ${SWARM_OCEL_NOTES_REF}`);
  }
  return ref;
}

export function parseOcel2Document(value) {
  const document = typeof value === 'string' ? JSON.parse(value) : value;
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new TypeError('OCEL document must be a JSON object');
  }

  for (const key of ['objectTypes', 'eventTypes', 'objects', 'events']) {
    if (!Array.isArray(document[key])) {
      throw new TypeError(`OCEL 2.0 document requires array field ${key}`);
    }
  }

  return document;
}

async function resolveCommit(git, sha) {
  const resolved = await git.run(['rev-parse', sha]);
  return resolved.trim();
}

/**
 * Append one compact OCEL 2.0 document to the Git note attached to a commit.
 * Git notes do not mutate the commit they annotate.
 */
export async function appendSwarmOcelReceipt({
  document,
  sha = 'HEAD',
  ref = SWARM_OCEL_NOTES_REF,
} = {}) {
  const git = useGit();
  const parsed = parseOcel2Document(document);
  const notesRef = assertReceiptRef(ref);
  const commit = await resolveCommit(git, sha);

  await git.noteAppend(notesRef, JSON.stringify(parsed), commit);

  return {
    ok: true,
    commit,
    ref: notesRef,
    eventCount: parsed.events.length,
    objectCount: parsed.objects.length,
  };
}

/**
 * Read all OCEL documents attached to one commit.
 */
export async function readSwarmOcelReceipts({
  sha = 'HEAD',
  ref = SWARM_OCEL_NOTES_REF,
} = {}) {
  const git = useGit();
  const notesRef = assertReceiptRef(ref);
  const commit = await resolveCommit(git, sha);

  try {
    const raw = await git.noteShow(notesRef, commit);
    const documents = raw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => parseOcel2Document(line));

    return { commit, ref: notesRef, documents };
  } catch {
    return { commit, ref: notesRef, documents: [] };
  }
}
